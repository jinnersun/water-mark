// color-picker.js
// Options-page-only lightweight color picker. Wraps a hidden native
// <input type="color"> as the source of truth so no data-model changes are
// needed: `nativeInput.value` stays the single #rrggbb value we persist and
// existing input/change listeners (see src/options.js) still fire.
//
// Public API (attached to window.ColorPicker):
//   ColorPicker.attach(nativeInput, opts?) -> instance { refresh(), destroy() }
//   ColorPicker.PRESET_COLORS: readonly array of preset hex strings
//
// Design notes:
//   - Popover is a singleton: opening a second one closes the first.
//   - Preset row is 4x2, values are lowercased #rrggbb; display uppercases.
//   - "Recently used" persists in chrome.storage.local (up to 6, most recent
//     first, deduped, presets excluded).
//   - Custom... button clicks the (visually hidden) native <input> to trigger
//     the OS color dialog; the resulting value is fed back through the same
//     dispatchEvent path so existing bindings keep working.
;(function () {
  'use strict'

  const PRESET_COLORS = [
    '#ef4444', // presetProd - production red
    '#f97316', // presetPre  - pre-release orange
    '#f59e0b', // presetGray - gray release amber
    '#10b981', // presetTest - test green
    '#06b6d4', // presetUat  - UAT / staging cyan
    '#3b82f6', // presetDev  - dev blue
    '#8b5cf6', // presetSandbox - sandbox purple
    '#64748b', // presetOther - fallback slate
  ]
  const PRESET_TITLE_KEYS = [
    'presetProd', 'presetPre', 'presetGray', 'presetTest',
    'presetUat', 'presetDev', 'presetSandbox', 'presetOther',
  ]
  const RECENT_KEY = 'recentColors'
  const RECENT_MAX = 6
  const HEX_RE = /^#[0-9a-f]{6}$/i

  // ---------- helpers ----------
  const t = (key, fallback) => {
    const i18n = window.WatermarkI18n
    if (!i18n) return fallback
    const val = i18n.t(key)
    // t() falls back to the key itself when unknown; keep that behaviour but
    // let callers override with a friendlier fallback for early boots.
    return val === key && fallback ? fallback : val
  }

  const normaliseHex = (raw) => {
    if (typeof raw !== 'string') return null
    const s = raw.trim().toLowerCase()
    return HEX_RE.test(s) ? s : null
  }

  const PRESET_SET = new Set(PRESET_COLORS.map((c) => c.toLowerCase()))
  const isPreset = (hex) => PRESET_SET.has((hex || '').toLowerCase())

  // ---------- shared recent-colors store ----------
  let _recentCache = null // in-memory cache; loaded lazily.
  const _recentSubscribers = new Set()

  const _readRecent = (cb) => {
    if (_recentCache) return cb(_recentCache.slice())
    try {
      chrome.storage.local.get({ [RECENT_KEY]: [] }, (items) => {
        const arr = Array.isArray(items && items[RECENT_KEY]) ? items[RECENT_KEY] : []
        _recentCache = arr.filter((c) => HEX_RE.test(c)).map((c) => c.toLowerCase())
        cb(_recentCache.slice())
      })
    } catch (_e) {
      _recentCache = []
      cb([])
    }
  }

  const _writeRecent = (arr) => {
    _recentCache = arr.slice()
    try {
      chrome.storage.local.set({ [RECENT_KEY]: _recentCache })
    } catch (_e) { /* ignore */ }
    _recentSubscribers.forEach((fn) => {
      try { fn(_recentCache.slice()) } catch (_e) { /* ignore */ }
    })
  }

  const pushRecent = (hex) => {
    const norm = normaliseHex(hex)
    if (!norm || isPreset(norm)) return
    _readRecent((current) => {
      const next = [norm, ...current.filter((c) => c !== norm)].slice(0, RECENT_MAX)
      _writeRecent(next)
    })
  }

  const subscribeRecent = (fn) => {
    _recentSubscribers.add(fn)
    _readRecent(fn)
    return () => _recentSubscribers.delete(fn)
  }

  // ---------- singleton popup manager ----------
  let _openInstance = null
  const _outsideMouseDown = (e) => {
    if (!_openInstance) return
    if (_openInstance.root.contains(e.target)) return
    _openInstance.close()
  }
  document.addEventListener('mousedown', _outsideMouseDown, true)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _openInstance) {
      _openInstance.close(true)
    }
  })

  // ---------- instance ----------
  const attach = (nativeInput, opts) => {
    if (!nativeInput || nativeInput.__colorPickerAttached) {
      return nativeInput ? nativeInput.__colorPickerAttached : null
    }
    opts = opts || {}

    // Wrap the native input inside our shell if not already wrapped.
    let root = nativeInput.closest('[data-color-picker]')
    if (!root) {
      root = document.createElement('div')
      root.className = 'color-picker'
      root.setAttribute('data-color-picker', '')
      nativeInput.parentNode.insertBefore(root, nativeInput)
      root.appendChild(nativeInput)
    } else if (!root.classList.contains('color-picker')) {
      root.classList.add('color-picker')
    }
    // Native input becomes the hidden data-source. We keep it in the DOM so
    // options.js can go on reading/writing .value and firing events.
    nativeInput.setAttribute('tabindex', '-1')
    nativeInput.setAttribute('aria-hidden', 'true')

    // Build shell DOM.
    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'cp-trigger'
    trigger.setAttribute('aria-haspopup', 'dialog')
    trigger.setAttribute('aria-expanded', 'false')

    const swatch = document.createElement('span')
    swatch.className = 'cp-swatch'
    const hexLabel = document.createElement('code')
    hexLabel.className = 'cp-hex'
    const caret = document.createElement('span')
    caret.className = 'cp-caret'
    caret.setAttribute('aria-hidden', 'true')
    caret.textContent = '▾'
    trigger.appendChild(swatch)
    trigger.appendChild(hexLabel)
    trigger.appendChild(caret)

    const pop = document.createElement('div')
    pop.className = 'cp-pop'
    pop.setAttribute('role', 'dialog')
    pop.hidden = true

    const presetsHeader = document.createElement('div')
    presetsHeader.className = 'cp-section-title'
    presetsHeader.textContent = t('cpPresets', 'Presets')

    const presetsGrid = document.createElement('div')
    presetsGrid.className = 'cp-presets'
    const presetChips = PRESET_COLORS.map((hex, idx) => {
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.className = 'cp-chip'
      chip.dataset.color = hex
      chip.style.backgroundColor = hex
      const titleKey = PRESET_TITLE_KEYS[idx]
      chip.title = t(titleKey, hex.toUpperCase())
      chip.setAttribute('aria-label', chip.title + ' ' + hex.toUpperCase())
      presetsGrid.appendChild(chip)
      return chip
    })

    const recentHeader = document.createElement('div')
    recentHeader.className = 'cp-section-title cp-recent-title'
    recentHeader.textContent = t('cpRecent', 'Recently used')
    const recentGrid = document.createElement('div')
    recentGrid.className = 'cp-recent'

    const customBtn = document.createElement('button')
    customBtn.type = 'button'
    customBtn.className = 'cp-custom'
    customBtn.textContent = t('cpCustom', 'Custom…')

    pop.appendChild(presetsHeader)
    pop.appendChild(presetsGrid)
    pop.appendChild(recentHeader)
    pop.appendChild(recentGrid)
    pop.appendChild(customBtn)

    root.appendChild(trigger)
    root.appendChild(pop)

    // ---------- render helpers ----------
    const currentHex = () =>
      normaliseHex(nativeInput.value) || (opts.defaultColor && normaliseHex(opts.defaultColor)) || '#000000'

    const renderTrigger = () => {
      const hex = currentHex()
      swatch.style.backgroundColor = hex
      hexLabel.textContent = hex.toUpperCase()
      // Reflect selected preset via aria-pressed for a11y + selected-ring CSS.
      presetChips.forEach((chip) => {
        const on = chip.dataset.color.toLowerCase() === hex
        chip.setAttribute('aria-pressed', on ? 'true' : 'false')
        chip.classList.toggle('is-selected', on)
      })
      // Highlight recent chip if matching.
      recentGrid.querySelectorAll('.cp-chip').forEach((chip) => {
        const on = chip.dataset.color.toLowerCase() === hex
        chip.setAttribute('aria-pressed', on ? 'true' : 'false')
        chip.classList.toggle('is-selected', on)
      })
    }

    const renderRecent = (list) => {
      recentGrid.innerHTML = ''
      const items = (list || []).filter((c) => !isPreset(c))
      if (!items.length) {
        recentHeader.classList.add('cp-hidden')
        recentGrid.classList.add('cp-hidden')
        return
      }
      recentHeader.classList.remove('cp-hidden')
      recentGrid.classList.remove('cp-hidden')
      items.forEach((hex) => {
        const chip = document.createElement('button')
        chip.type = 'button'
        chip.className = 'cp-chip'
        chip.dataset.color = hex
        chip.style.backgroundColor = hex
        chip.title = hex.toUpperCase()
        chip.setAttribute('aria-label', hex.toUpperCase())
        recentGrid.appendChild(chip)
      })
      renderTrigger()
    }

    // ---------- writing back to the native input ----------
    const commitColor = (rawHex, opts2) => {
      const hex = normaliseHex(rawHex)
      if (!hex) return
      const changed = (nativeInput.value || '').toLowerCase() !== hex
      if (changed) {
        nativeInput.value = hex
        // Fire the same events the native input would; existing listeners in
        // options.js write cfg.color / cfg.border.color and call renderPreview.
        nativeInput.dispatchEvent(new Event('input', { bubbles: true }))
        nativeInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
      if (opts2 && opts2.remember) pushRecent(hex)
      renderTrigger()
    }

    // ---------- open / close ----------
    const isDisabled = () => nativeInput.disabled

    const open = () => {
      if (isDisabled()) return
      if (_openInstance && _openInstance !== instance) _openInstance.close()
      pop.hidden = false
      trigger.setAttribute('aria-expanded', 'true')
      _openInstance = instance
      // Focus the currently selected preset if any, else the first preset.
      const selected = presetChips.find((c) => c.classList.contains('is-selected'))
      ;(selected || presetChips[0]).focus()
    }

    const close = (returnFocus) => {
      if (pop.hidden) return
      pop.hidden = true
      trigger.setAttribute('aria-expanded', 'false')
      if (_openInstance === instance) _openInstance = null
      if (returnFocus) trigger.focus()
    }

    // ---------- keyboard navigation on the preset grid ----------
    const gridCols = 4
    const focusChipAt = (idx) => {
      const total = presetChips.length
      const clamped = ((idx % total) + total) % total
      presetChips[clamped].focus()
    }
    presetsGrid.addEventListener('keydown', (e) => {
      const idx = presetChips.indexOf(document.activeElement)
      if (idx < 0) return
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); focusChipAt(idx + 1); break
        case 'ArrowLeft':  e.preventDefault(); focusChipAt(idx - 1); break
        case 'ArrowDown':  e.preventDefault(); focusChipAt(idx + gridCols); break
        case 'ArrowUp':    e.preventDefault(); focusChipAt(idx - gridCols); break
      }
    })

    // ---------- events ----------
    trigger.addEventListener('click', () => {
      if (pop.hidden) open()
      else close(true)
    })
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        open()
      }
    })

    const onChipClick = (chip) => {
      commitColor(chip.dataset.color, { remember: false })
      close(true)
    }
    presetsGrid.addEventListener('click', (e) => {
      const chip = e.target.closest('.cp-chip')
      if (chip && presetsGrid.contains(chip)) onChipClick(chip)
    })
    recentGrid.addEventListener('click', (e) => {
      const chip = e.target.closest('.cp-chip')
      if (chip && recentGrid.contains(chip)) onChipClick(chip)
    })

    customBtn.addEventListener('click', () => {
      // The native input is hidden; .click() still opens the OS color dialog.
      // The change handler below records the new value and closes the popup.
      nativeInput.click()
    })
    // Fire when OS color dialog commits a value.
    nativeInput.addEventListener('change', (e) => {
      if (e && e.isTrusted === false) return // programmatic changes handled elsewhere
      commitColor(nativeInput.value, { remember: true })
      close(true)
    })
    // External code may set .value directly (renderForm switches configs).
    // 'input' event fires from external dispatchEvent; keep swatch in sync.
    nativeInput.addEventListener('input', () => renderTrigger())

    // Track disabled attribute changes (updateSmartColorUI toggles it).
    const disabledObserver = new MutationObserver(() => {
      const off = isDisabled()
      trigger.disabled = off
      trigger.setAttribute('aria-disabled', off ? 'true' : 'false')
      root.classList.toggle('is-disabled', off)
      if (off) close()
    })
    disabledObserver.observe(nativeInput, { attributes: true, attributeFilter: ['disabled'] })
    // Initial sync.
    trigger.disabled = isDisabled()
    root.classList.toggle('is-disabled', isDisabled())

    // Subscribe to recent list changes (shared across instances).
    const unsubscribeRecent = subscribeRecent(renderRecent)

    // Initial paint.
    renderTrigger()

    const instance = {
      root,
      open,
      close,
      refresh: renderTrigger,
      destroy() {
        disabledObserver.disconnect()
        unsubscribeRecent()
        if (_openInstance === instance) _openInstance = null
      },
    }
    nativeInput.__colorPickerAttached = instance
    return instance
  }

  window.ColorPicker = {
    attach,
    PRESET_COLORS: PRESET_COLORS.slice(),
    PRESET_TITLE_KEYS: PRESET_TITLE_KEYS.slice(),
  }
})();
