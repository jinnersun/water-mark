// i18n.js
// Runtime i18n for the options page (and any other extension page that opts
// in via a <script src="i18n.js">). Manifest strings are served by Chrome
// from src/_locales/<lang>/messages.json; this file adds a runtime translator
// that ALSO reads those messages so we can offer a live language picker
// independent of the browser UI language.
//
// The module is wrapped in an IIFE so its private helpers do NOT create
// top-level `const t`, `const tf`, etc. — otherwise a sibling <script>
// (options.js) declaring `const t = window.WatermarkI18n.t` would throw
// `Identifier 't' has already been declared` because classic scripts share
// the same top-level lexical scope.
//
// Message source of truth: src/_locales/<lang>/messages.json.
// Regenerate the sibling runtime bundle (src/i18n-messages.js) via
//   node scripts/gen-locales.mjs
// which reads the same TRANSLATIONS table used to write the JSON.
//
// Storage key `lang` (chrome.storage.sync):
//   ""                                        -> follow browser UI language
//   "en" | "zh_CN" | "zh_TW" | "ja" | "es"    -> forced override
//
// Placeholder interpolation ({name}) is handled by tf() below; we intentionally
// do NOT use Chrome's native $NAME$ mechanism so the same message table works
// for both manifest text and our runtime formatter.

(function () {
  const SUPPORTED_LANGS = ['en', 'zh_CN', 'zh_TW', 'ja', 'es']
  const DEFAULT_LANG = 'en'

  // Populated from src/i18n-messages.js which loads before this file.
  const _messages =
    (typeof self !== 'undefined' && self.WatermarkMessages) || {}

  // Normalise navigator/browser tags ("zh-CN", "zh-Hant-HK", "es-419")
  // to our supported set. Falls back to DEFAULT_LANG.
  const normaliseLang = (raw) => {
    if (!raw) return DEFAULT_LANG
    const tag = String(raw).replace(/_/g, '-').toLowerCase()
    if (tag.startsWith('zh')) {
      if (
        tag.includes('tw') ||
        tag.includes('hk') ||
        tag.includes('mo') ||
        tag.includes('hant')
      ) {
        return 'zh_TW'
      }
      return 'zh_CN'
    }
    if (tag.startsWith('ja')) return 'ja'
    if (tag.startsWith('es')) return 'es'
    if (tag.startsWith('en')) return 'en'
    return DEFAULT_LANG
  }

  // Detect the browser UI language via chrome.i18n when available, falling back
  // to navigator.language for non-extension contexts (tests, previews).
  const detectBrowserLang = () => {
    try {
      if (
        typeof chrome !== 'undefined' &&
        chrome.i18n &&
        chrome.i18n.getUILanguage
      ) {
        return normaliseLang(chrome.i18n.getUILanguage())
      }
    } catch (_) {
      // ignore: fall through to navigator
    }
    if (typeof navigator !== 'undefined')
      return normaliseLang(navigator.language)
    return DEFAULT_LANG
  }

  // Track which language is currently active so subsequent t()/tf() calls
  // resolve without another lookup.
  let activeLang = DEFAULT_LANG
  let activeDict = _messages[DEFAULT_LANG] || {}
  const fallbackDict = _messages[DEFAULT_LANG] || {}

  // Resolve the language to actually render. Honours the user-set override in
  // chrome.storage.sync.lang (Features.canUse('multiLang') must be true), then
  // falls back to the browser UI language, then DEFAULT_LANG.
  const getStoredLang = (cb) => {
    const multiLang =
      typeof window !== 'undefined' &&
      window.Features &&
      window.Features.canUse('multiLang') === true

    const finish = (lang) =>
      cb(SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG)

    if (!multiLang) {
      return finish(detectBrowserLang())
    }

    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
      return finish(detectBrowserLang())
    }
    chrome.storage.sync.get({ lang: '' }, (items) => {
      const stored = items && items.lang
      if (stored && SUPPORTED_LANGS.includes(stored)) return finish(stored)
      finish(detectBrowserLang())
    })
  }

  const getCurrentDisplayLang = () => activeLang

  // t(key): return the localised message; falls back to the English dictionary
  // and finally to the raw key so missing entries stay visible for QA.
  const t = (key) => {
    if (!key) return ''
    if (activeDict[key]) return activeDict[key]
    if (fallbackDict[key]) return fallbackDict[key]
    return key
  }

  // tf(key, vars): t() + {name} interpolation. Used for toast messages such as
  // "Imported {n} configs" and "Save failed: {msg}".
  const tf = (key, vars) => {
    let s = t(key)
    if (vars) {
      for (const k of Object.keys(vars)) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]))
      }
    }
    return s
  }

  // Apply the active dictionary to the DOM. Runs against every element tagged
  // with data-i18n / data-i18n-placeholder / data-i18n-title, so pages don't
  // need to hard-code strings in HTML. Returns a Promise for API symmetry with
  // the earlier async loader implementation.
  const applyLang = (lang) => {
    const normalised = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG
    activeLang = normalised
    activeDict = _messages[normalised] || fallbackDict

    if (typeof document !== 'undefined') {
      // Chrome's <html lang="..."> expects BCP-47 tags (zh-CN, not zh_CN).
      document.documentElement.lang = normalised.replace('_', '-')

      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.dataset.i18n
        if (key) el.textContent = t(key)
      })
      document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.dataset.i18nPlaceholder
        if (key) el.placeholder = t(key)
      })
      document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const key = el.dataset.i18nTitle
        if (key) el.title = t(key)
      })
    }

    return Promise.resolve(normalised)
  }

  // switchLang(lang): persist the user's language choice and re-render.
  // Pass "" to clear the override and fall back to the browser UI language.
  const switchLang = (lang) => {
    const multiLang =
      typeof window !== 'undefined' &&
      window.Features &&
      window.Features.canUse('multiLang') === true
    if (!multiLang) return

    const target =
      lang === ''
        ? detectBrowserLang()
        : SUPPORTED_LANGS.includes(lang)
          ? lang
          : DEFAULT_LANG

    const done = () => {
      applyLang(target).then(() => {
        if (
          typeof window !== 'undefined' &&
          typeof window.onLangChanged === 'function'
        ) {
          window.onLangChanged(target)
        }
      })
    }

    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      // Store the raw picker value ("" means "follow browser") so the user's
      // intent survives future browser language changes.
      chrome.storage.sync.set({ lang: lang === '' ? '' : target }, done)
    } else {
      done()
    }
  }

  if (typeof window !== 'undefined') {
    window.WatermarkI18n = {
      SUPPORTED_LANGS,
      DEFAULT_LANG,
      t,
      tf,
      applyLang,
      switchLang,
      getStoredLang,
      detectBrowserLang,
      getCurrentDisplayLang,
    }
  }
})()
