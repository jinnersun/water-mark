// options.js
// 负责：配置 CRUD、Tab 切换、规则编辑、URL 测试、实时预览、全局开关、导入导出。
// 所有可能付费的功能都走 Features.canUse 决定是否可用。
const state = {
  configs: [],
  currentId: null,
  globalEnabled: true,
  search: '',
  activeTab: 'rules',
}

// Expose the shared i18n helpers under the same names the rest of this file
// already uses (t, tf, applyLang, switchLang, getStoredLang). The i18n module
// publishes them on window.WatermarkI18n so the options page can be loaded in
// isolation for tests, and this indirection keeps the rest of options.js free
// of the WatermarkI18n prefix.
const _i18n = window.WatermarkI18n
const t = _i18n.t
const tf = _i18n.tf
const applyLang = _i18n.applyLang
const switchLang = _i18n.switchLang
const getStoredLang = _i18n.getStoredLang
const RULE_TYPES = [
  'host-exact',
  'host-suffix',
  'url-regex',
  'ip-exact',
  'ip-cidr',
  'cookie',
]
const RULE_PLACEHOLDER_KEY = {
  'host-exact': 'rulePlaceholderHostExact',
  'host-suffix': 'rulePlaceholderHostSuffix',
  'url-regex': 'rulePlaceholderUrlRegex',
  'ip-exact': 'rulePlaceholderIpExact',
  'ip-cidr': 'rulePlaceholderIpCidr',
  cookie: 'rulePlaceholderCookie',
}

// ============ v2.0: Agent prompt (inlined; full version at
//   https://github.com/jinnersun/web-watermark-prompt/blob/main/PROMPT.md
// ) ============
const AGENT_PROMPT_EN = [
  '# Web Watermark Tool — Config Generator Prompt',
  '',
  '> Full reference: https://github.com/jinnersun/web-watermark-prompt',
  '',
  '## Role',
  'You are a configuration generator for the Web Watermark Tool Chrome extension.',
  'Convert the user\'s natural-language description of their environments into a JSON',
  'array of watermark configs the extension can import.',
  '',
  '## Rule types (each config has multiple rules; ANY match triggers; most-specific wins)',
  '- host-exact:  Exact hostname, e.g. "app.example.com"',
  '- host-suffix: hostname === value OR endsWith "." + value',
  '- url-regex:   RegExp on full URL. Max 200 chars. Nested quantifiers rejected.',
  '- ip-exact:    Only matches when hostname is an IPv4 literal, e.g. "192.0.2.5"',
  '- ip-cidr:     IPv4 CIDR, e.g. "192.0.2.0/24"',
  '- cookie:      "name" (exists) | "name=value" (equals) | "name~=frag" (contains)',
  '',
  '## Config fields (JSON, camelCase, no comments)',
  '{',
  '  "name": string,                    // shown in sidebar',
  '  "shortLabel": string(<=4),         // toolbar badge, optional',
  '  "enabled": true,',
  '  "rules": [{"type": ..., "value": ...}],',
  '  "text": string,                    // watermark text; \\n for newline',
  '  "color": "#rrggbb",                // ignored when smartColor:true',
  '  "opacity": 0.15,                   // 0.01..1',
  '  "density": 300,                    // 100..800 (tile spacing px)',
  '  "fontSize": 24,                    // 10..80',
  '  "rotation": -30,                   // -90..90',
  '  "smartColor": false,               // mix-blend-mode auto contrast',
  '  "smartColorTone": "light"|"dark",',
  '  "border": {"enabled":true,"color":"#rrggbb","width":1..10},',
  '  "mouseFade": {"enabled":true,"fadeOpacity":0..1,"resumeDelay":ms}',
  '}',
  '',
  '## Recommended colors',
  '- prod: #ef4444 red-500 + border ON',
  '- pre-prod / staging: #f59e0b amber-500',
  '- test: #10b981 emerald-500',
  '- dev: #3b82f6 blue-500',
  '- admin / VPN: #8b5cf6 violet-500',
  '',
  '## Output contract',
  '1. Output ONLY a JSON array wrapped in a ```json fence, no prose before/after.',
  '2. No JSON comments. Escape backslashes in regex (\\\\. in JSON = \\. in regex).',
  '3. Strings in the user\'s language.',
  '4. Omit optional fields with default values.',
  '5. One config per environment.',
  '',
  '## Fallback: when the input is empty or missing info',
  'When the user input is empty, whitespace only, or only the placeholder text (no hostname / URL / IP / cookie is mentioned), DO NOT output JSON. Reply in the user\'s language (default English; switch to Chinese as soon as any Chinese character appears) with a short bulleted question list asking for: (1) how many environments, (2) the identifier for each (hostname / URL / IP / Cookie), (3) preferred watermark text and color or "use defaults", (4) any special needs (inset border, short badge label). Only after the user replies with concrete info, produce the JSON.',
  '',
  '## Task',
  'The user will describe their environments below. Reply with the JSON array.',
  '',
].join('\n')

const AGENT_PROMPT_ZH = [
  '# 网页水印工具 · 配置生成器提示词',
  '',
  '> 完整版本参见: https://github.com/jinnersun/web-watermark-prompt/blob/main/PROMPT.zh_CN.md',
  '',
  '## 角色',
  '你是网页水印工具（Web Watermark Tool）Chrome 扩展的配置生成器。',
  '把用户对环境的自然语言描述，转换成扩展可导入的 JSON 配置数组。',
  '',
  '## 规则类型 (每条配置可有多条规则；任一命中即触发；最精确者胜)',
  '- host-exact:  精确域名，如 "app.example.com"',
  '- host-suffix: hostname === value 或以 "." + value 结尾',
  '- url-regex:   完整 URL 正则。最长 200 字符。嵌套量词会被拒。',
  '- ip-exact:    hostname 必须是 IPv4 字面量，如 "192.0.2.5"',
  '- ip-cidr:     IPv4 CIDR，如 "192.0.2.0/24"',
  '- cookie:      "name"（存在）| "name=value"（等值）| "name~=frag"（包含）',
  '',
  '## 配置字段 (JSON, camelCase, 不能有注释)',
  '{',
  '  "name": string,                    // 侧栏显示的名称',
  '  "shortLabel": string(<=4),         // 工具栏 badge，可选',
  '  "enabled": true,',
  '  "rules": [{"type": ..., "value": ...}],',
  '  "text": string,                    // 水印文字；\\n 换行',
  '  "color": "#rrggbb",                // smartColor:true 时被忽略',
  '  "opacity": 0.15,                   // 0.01..1',
  '  "density": 300,                    // 100..800 (tile 间距 px)',
  '  "fontSize": 24,                    // 10..80',
  '  "rotation": -30,                   // -90..90',
  '  "smartColor": false,               // mix-blend-mode 自动对比',
  '  "smartColorTone": "light"|"dark",',
  '  "border": {"enabled":true,"color":"#rrggbb","width":1..10},',
  '  "mouseFade": {"enabled":true,"fadeOpacity":0..1,"resumeDelay":毫秒}',
  '}',
  '',
  '## 推荐颜色',
  '- 生产: #ef4444 (red-500) + 建议开边框',
  '- 准生产/staging: #f59e0b (amber-500)',
  '- 测试: #10b981 (emerald-500)',
  '- 开发: #3b82f6 (blue-500)',
  '- 内网/VPN: #8b5cf6 (violet-500)',
  '',
  '## 输出契约',
  '1. 只输出 ```json 代码块包裹的 JSON 数组，前后不加任何说明文字。',
  '2. JSON 里不能有注释。正则中的反斜杠要转义（JSON 里 \\\\. = 正则里 \\.）。',
  '3. 字符串使用用户的语言。',
  '4. 使用默认值的可选字段可省略。',
  '5. 每个环境一条配置。',
  '',
  '## 兜底：输入为空或信息不足时',
  '当用户输入为空、只有空白字符、只留了占位符原文（没提到任何 hostname / URL / IP / Cookie）时，不要输出 JSON。改为用**用户使用的语言**（默认英文；一旦出现中文字符即切中文）用简短的项目符号反问：(1) 需要区分几个环境；(2) 每个环境的标识（hostname / URL / IP / Cookie）；(3) 偏好的水印文字和颜色，或"用默认"；(4) 有无特殊需求（沉浸式边框、短标签）。等用户补齐具体信息后再输出 JSON。',
  '',
  '## 任务',
  '用户会在下方描述自己的环境。请返回 JSON 数组。',
  '',
].join('\n')

// 根据当前 UI 语言选择提示词版本（zh_CN / zh_TW 用中文，其它用英文）
const pickAgentPrompt = () => {
  try {
    const lang = _i18n.getCurrentDisplayLang && _i18n.getCurrentDisplayLang()
    return (lang === 'zh_CN' || lang === 'zh_TW') ? AGENT_PROMPT_ZH : AGENT_PROMPT_EN
  } catch (_) {
    return AGENT_PROMPT_EN
  }
}

// Return only a language-appropriate scenario placeholder block to append after
// the picked AGENT_PROMPT. Intentionally does NOT include any snapshot of the
// user's existing configs (which would leak real hostnames / IPs to third-party
// AI tools via clipboard).
const buildAgentContext = () => {
  let lang = 'en'
  try { lang = (_i18n.getCurrentDisplayLang && _i18n.getCurrentDisplayLang()) || 'en' } catch (_) {}
  const isZh = lang === 'zh_CN' || lang === 'zh_TW'

  const scenarioBlockEn =
    '\n## Your scenario\n\n<!--\nReplace the block below with your actual environments. For example:\n\n  I have 3 environments sharing the root domain \`app.example.com\`:\n  - \`app.example.com\` is production (red, PROD badge)\n  - \`test.app.example.com\` is test (green)\n  - \`staging.app.example.com\` is pre-production (amber)\n  I also access an admin panel at \`192.0.2.5\` over VPN; use violet with an "Admin" badge.\n-->\n\n(describe your production / test / staging / VPN environments here)\n'
  const scenarioBlockZh =
    '\n## 你的场景\n\n<!--\n把下面这段替换成你的实际情况。示例：\n\n  我有 3 个环境共用 \`app.example.com\` 这个根域名：\n  - \`app.example.com\` 是生产（红色，PROD 标签）\n  - \`test.app.example.com\` 是测试（绿色）\n  - \`staging.app.example.com\` 是准生产（橙色）\n  我还通过 VPN 用 \`192.0.2.5\` 访问一个管理后台，希望紫色 + "Admin" 标签。\n-->\n\n(在这里描述你的生产 / 测试 / 准生产 / VPN 环境)\n'

  return isZh ? scenarioBlockZh : scenarioBlockEn
}

let __confirmCallback = null

function showModal(title, message, onConfirm) {
  const overlay = document.getElementById('modal-overlay')
  const btnConfirm = document.getElementById('modal-confirm')
  const btnCancel = document.getElementById('modal-cancel')
  const btnClose = document.getElementById('modal-close')
  if (!overlay) {
    console.error('[水印工具] 找不到模态框 HTML 结构')
    return
  }
  document.getElementById('modal-title').textContent = title
  document.getElementById('modal-body').textContent = message
  // 先移除旧事件，防止重复绑定
  const newBtnConfirm = btnConfirm.cloneNode(true)
  btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm)
  const newBtnCancel = btnCancel.cloneNode(true)
  btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel)
  const newBtnClose = btnClose.cloneNode(true)
  btnClose.parentNode.replaceChild(newBtnClose, btnClose)
  const doClose = () => {
    overlay.style.display = 'none'
    __confirmCallback = null
  }
  __confirmCallback = onConfirm
  newBtnConfirm.onclick = () => {
    if (__confirmCallback) __confirmCallback()
    doClose()
  }
  newBtnCancel.onclick = doClose
  newBtnClose.onclick = doClose
  overlay.style.display = 'flex'
}

function openHelpPanel() {
  const overlay = document.getElementById('help-panel')
  if (!overlay) return
  overlay.style.display = 'block'
}

function closeHelpPanel() {
  const overlay = document.getElementById('help-panel')
  if (!overlay) return
  overlay.style.display = 'none'
}
// ============ 工具 ============
const $ = (id) => document.getElementById(id)
// Null-safe event binder: if the element is missing, log once and move on
// instead of throwing (which would abort the rest of bindStaticEvents and
// leave downstream buttons wired to nothing).
const on = (id, event, handler) => {
  const el = document.getElementById(id)
  if (!el) {
    if (!on._warned) on._warned = new Set()
    if (!on._warned.has(id)) {
      on._warned.add(id)
      console.warn('[水印工具] missing DOM element:', id)
    }
    return
  }
  el[event] = handler
}
const showToast = (msg) => {
  const toast = $('toast')
  toast.textContent = msg
  toast.classList.add('show')
  clearTimeout(showToast._t)
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2400)
}
const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
const debounce = (fn, ms) => {
  let t = null
  return (...args) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
const currentConfig = () =>
  state.configs.find((c) => c.id === state.currentId) || null
// Detect placeholder-style values that were persisted using the localized
// default names, so we re-render them in the current language instead of
// showing stale strings. We snapshot the current language's default labels
// whenever the language changes so users who created a config in one language
// still see a fresh default label after switching.
const DEFAULT_NAME_KEYS = ['defaultConfigName', 'unnamed']
const DEFAULT_TEXT_KEYS = ['defaultConfigText']
const _seenDefaultLabels = { name: new Set(), text: new Set() }
const _rememberDefaults = () => {
  for (const k of DEFAULT_NAME_KEYS) _seenDefaultLabels.name.add(t(k))
  for (const k of DEFAULT_TEXT_KEYS) _seenDefaultLabels.text.add(t(k))
}
const isDefaultName = (name) => _seenDefaultLabels.name.has(name)
const isDefaultText = (text) => _seenDefaultLabels.text.has(text)
const saveToStorage = (cb) =>
  chrome.storage.sync.set({
      configs: state.configs,
      globalEnabled: state.globalEnabled
    },
    () => {
      const err = chrome.runtime.lastError
      if (err) {
        // 常见原因：QUOTA_BYTES_PER_ITEM 超限。给用户可见提示。
        showToast(tf('toastStorageError', {
          msg: err.message || 'quota'
        }))
      }
      if (cb) cb(err)
    },
  )
const clamp = (name, v) =>
  window.WatermarkCore && window.WatermarkCore.clamp ?
  window.WatermarkCore.clamp(name, v) :
  Number(v) // ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  getStoredLang((lang) => {
    applyLang(lang).then(() => {
      _rememberDefaults()
      bindStaticEvents()
      loadAll()
    })
  })
})
window.onLangChanged = () => {
  _rememberDefaults()
  renderConfigList()
  if (state.currentId) renderForm()
  updateGlobalToggleLabel()
  renderRulesList()
  runTester()
}
const bindStaticEvents = () => {
  // Enhance the two color inputs with our preset+recent picker.
  // The native <input type="color"> stays in the DOM as the data source,
  // so existing input/change listeners and `.value`/`.disabled` writes keep working.
  if (window.ColorPicker) {
    if ($('color')) window.ColorPicker.attach($('color'))
    if ($('border-color')) window.ColorPicker.attach($('border-color'))
  }
  // Language picker (gated by Features.multiLang so we can dark-launch new
  // locales without exposing the switch UI).
  const langSelect = $('lang-select')
  if (langSelect) {
    if (Features.canUse('multiLang')) {
      if (langSelect.parentElement) langSelect.parentElement.style.display = ''
      chrome.storage.sync.get({ lang: '' }, (items) => {
        langSelect.value = items && typeof items.lang === 'string' ? items.lang : ''
      })
      langSelect.onchange = () => {
        switchLang(langSelect.value)
      }
    } else {
      // Hide the picker but keep the storage key intact so users who upgrade
      // to a Pro build later see their previous choice.
      if (langSelect.parentElement) langSelect.parentElement.style.display = 'none'
    }
  }
  // 全局开关
  on('global-toggle', 'onchange', (e) => {
    state.globalEnabled = e.target.checked
    saveToStorage((err) => {
      if (err) return // 已由 saveToStorage 提示
      showToast(state.globalEnabled ? t('toastGlobalOn') : t('toastGlobalOff'))
    })
    updateGlobalToggleLabel()
  })
  // 顶部导入导出
  on('export-btn', 'onclick', onExport)
  on('import-btn', 'onclick', () => { const f = document.getElementById('import-file'); if (f) f.click() })
  on('import-file', 'onchange', onImportFile)
  // v2.0: AI prompt + clipboard import
  const copyPromptBtn = $('copy-prompt-btn')
  if (copyPromptBtn) copyPromptBtn.onclick = onCopyPrompt
  const pasteBtn = $('paste-clipboard-btn')
  if (pasteBtn) pasteBtn.onclick = onPasteFromClipboard
  // ========== 帮助面板事件 ==========
  const helpBtn = $('help-btn')
  if (helpBtn) helpBtn.onclick = openHelpPanel
  const helpCloseBtn = $('help-close')
  if (helpCloseBtn) helpCloseBtn.onclick = closeHelpPanel
  const helpOverlay = $('help-panel')
  if (helpOverlay) {
    helpOverlay.onclick = (e) => {
      if (e.target.id === 'help-panel') closeHelpPanel()
    }
  }
  // ESC 键关闭帮助面板 + 模态框
  if (!window.__helpEscBound) {
    window.__helpEscBound = true
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeHelpPanel()
        const mo = document.getElementById('modal-overlay')
        if (mo) mo.style.display = 'none'
        __confirmCallback = null
      }
    })
  }
  // 侧栏
  on('add-config-btn', 'onclick', onAddConfig)
  const cfgSearch = $('config-search')
  if (cfgSearch) cfgSearch.oninput = (e) => {
    state.search = e.target.value.trim().toLowerCase()
    renderConfigList()
    // 如果当前选中的配置被过滤掉了，自动切换到过滤后第一条
    if (state.search) {
      const visible = getFilteredConfigs()
      if (visible.length && !visible.some((c) => c.id === state.currentId)) {
        state.currentId = visible[0].id
        renderConfigList()
        renderForm()
      }
    }
  }
  // 编辑区顶部
  on('copy-config-btn', 'onclick', onCopyConfig)
  on('delete-config-btn', 'onclick', onDeleteConfig)
  on('save-btn', 'onclick', onSave)
  // Tab 切换
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.onclick = () => switchTab(tab.dataset.tab)
  })
  // 表单绑定：所有 input 变化写入内存中的 config
  const nameInput = $('config-name')
  if (nameInput) nameInput.oninput = () => onFormField('name', nameInput.value)
  on('short-label', 'oninput', (e) => onFormField('shortLabel', e.target.value))
  on('enabled', 'onchange', (e) => onFormField('enabled', e.target.checked))
  // 添加规则（当无规则时点击也直接生效）
  on('add-rule-btn', 'onclick', () => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.rules = cfg.rules || []
    cfg.rules.push({
      type: 'host-exact',
      value: ''
    })
    renderRulesList()
    renderConfigList()
  })
  // 规则测试
  on('test-url', 'oninput', debounce(runTester, 150))
  on('test-cookie', 'oninput', debounce(runTester, 150))
  // 外观字段
  const bindRange = (id, key, cast) => {
    const el = $(id)
    if (!el) return
    el.oninput = (e) => {
      const val = cast ? cast(e.target.value) : e.target.value
      onFormField(key, val)
      updateRangeLabels()
      renderPreview()
    }
  }
  on('text', 'oninput', (e) => {
    onFormField('text', e.target.value)
    renderPreview()
  })
  bindRange('fontsize', 'fontSize', (v) => parseInt(v, 10))
  bindRange('opacity', 'opacity', (v) => parseFloat(v))
  bindRange('density', 'density', (v) => parseInt(v, 10))
  bindRange('rotation', 'rotation', (v) => parseInt(v, 10))
  on('smartColor', 'onchange', (e) => {
    onFormField('smartColor', e.target.checked)
    updateSmartColorUI()
    renderPreview()
  })
  on('smartColorTone', 'onchange', (e) => {
    onFormField('smartColorTone', e.target.value)
    renderPreview()
  })
  on('color', 'oninput', (e) => {
    onFormField('color', e.target.value)
    renderPreview()
  })
  // 提醒/交互
  on('border-enabled', 'onchange', (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.border = cfg.border || {}
    cfg.border.enabled = e.target.checked
    updateBorderUI()
  })
  on('border-color', 'oninput', (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.border = cfg.border || {}
    cfg.border.color = e.target.value
  })
  on('border-width', 'oninput', (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.border = cfg.border || {}
    cfg.border.width = parseInt(e.target.value, 10)
    const lbl = document.getElementById('border-width-val'); if (lbl) lbl.textContent = e.target.value
  })
  on('mouse-fade-enabled', 'onchange', (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.mouseFade = cfg.mouseFade || {}
    cfg.mouseFade.enabled = e.target.checked
    updateFadeUI()
  })
  on('fade-opacity', 'oninput', (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.mouseFade = cfg.mouseFade || {}
    cfg.mouseFade.fadeOpacity = parseFloat(e.target.value)
    const lbl = document.getElementById('fade-opacity-val'); if (lbl) lbl.textContent = e.target.value
  })
  on('fade-resume', 'oninput', (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.mouseFade = cfg.mouseFade || {}
    cfg.mouseFade.resumeDelay = parseInt(e.target.value, 10)
    const lbl = document.getElementById('fade-resume-val'); if (lbl) lbl.textContent = e.target.value
  })
}
const onFormField = (field, value) => {
  const cfg = currentConfig()
  if (!cfg) return
  cfg[field] = value
  if (field === 'name' || field === 'enabled') renderConfigList()
} // ============ Storage 装载 ============
const loadAll = () => {
  chrome.storage.sync.get({
      configs: [],
      globalEnabled: true,
      lang: ''
    },
    (items) => {
      state.configs = items.configs || []
      state.globalEnabled = items.globalEnabled !== false
      const gt = $('global-toggle'); if (gt) gt.checked = state.globalEnabled
      updateGlobalToggleLabel()
      if (state.configs.length > 0) {
        state.currentId = state.configs[0].id
        showEditor()
      } else {
        showEmpty()
      }
      renderConfigList()
    },
  )
}
const showEditor = () => {
  $('editor-view').style.display = ''
  $('empty-state').style.display = 'none'
}
const showEmpty = () => {
  $('editor-view').style.display = 'none'
  $('empty-state').style.display = ''
} // ============ 全局开关 ============
const updateGlobalToggleLabel = () => {
  $('global-toggle-label').textContent = state.globalEnabled ?
    t('globalOn') :
    t('globalOff')
} // ============ 侧栏列表 ============
const getFilteredConfigs = () =>
  state.configs.filter((c) => {
    if (!state.search) return true
    const hay = [c.name || '', ...(c.rules || []).map((r) => r.value || '')]
      .join(' ')
      .toLowerCase()
    return hay.includes(state.search)
  })
const renderConfigList = () => {
  const listEl = $('config-list')
  const emptyEl = $('sidebar-empty')
  listEl.innerHTML = ''
  const filtered = getFilteredConfigs()
  if (filtered.length === 0) {
    emptyEl.style.display = ''
    return
  }
  emptyEl.style.display = 'none'
  filtered.forEach((c) => {
    const li = document.createElement('li')
    if (c.id === state.currentId) li.classList.add('active')
    if (c.enabled === false) li.classList.add('disabled')
    const dot = document.createElement('span')
    dot.className = 'cfg-dot'
    li.appendChild(dot)
    const main = document.createElement('div')
    main.className = 'cfg-main'
    const nameEl = document.createElement('div')
    nameEl.className = 'cfg-name'
    const displayName =
      isDefaultName(c.name) || !c.name ? t('defaultConfigName') : c.name
    nameEl.textContent =
      displayName + (c.enabled === false ? ' ' + t('disabled') : '')
    main.appendChild(nameEl)
    const subEl = document.createElement('div')
    subEl.className = 'cfg-sub'
    subEl.textContent = summarizeRules(c)
    main.appendChild(subEl)
    li.appendChild(main)
    li.onclick = () => selectConfig(c.id)
    listEl.appendChild(li)
  })
}
const summarizeRules = (c) => {
  const rules = c.rules || []
  const first = rules.find((r) => r && r.value)
  if (!first) return t('noRule')
  const label = t(typeLabelKey(first.type))
  return `${label} · ${first.value}`
}
const typeLabelKey = (type) => {
  const map = {
    'host-exact': 'ruleTypeHostExact',
    'host-suffix': 'ruleTypeHostSuffix',
    'url-regex': 'ruleTypeUrlRegex',
    'ip-exact': 'ruleTypeIpExact',
    'ip-cidr': 'ruleTypeIpCidr',
    cookie: 'ruleTypeCookie',
  }
  return map[type] || 'noRule'
}
const selectConfig = (id) => {
  state.currentId = id
  renderConfigList()
  renderForm()
} // ============ 表单渲染 ============
const renderForm = () => {
  const cfg = currentConfig()
  if (!cfg) {
    showEmpty()
    return
  }
  showEditor()
  $('config-name').value =
    isDefaultName(cfg.name) || !cfg.name ? t('defaultConfigName') : cfg.name
  $('short-label').value = cfg.shortLabel || ''
  $('enabled').checked = cfg.enabled !== false
  // 外观
  $('text').value =
    isDefaultText(cfg.text) || !cfg.text ? t('defaultConfigText') : cfg.text
  $('color').value = cfg.color || '#ff0000'
  $('fontsize').value = cfg.fontSize ?? 24
  $('opacity').value = cfg.opacity ?? 0.15
  $('density').value = cfg.density ?? 300
  $('rotation').value = cfg.rotation ?? -30
  $('smartColor').checked = !!cfg.smartColor
  $('smartColorTone').value = cfg.smartColorTone || 'light'
  updateSmartColorUI()
  // 提醒
  const border = cfg.border || {}
  $('border-enabled').checked = !!border.enabled
  $('border-color').value = border.color || '#ef4444'
  $('border-width').value = border.width || 4
  $('border-width-val').textContent = String(border.width || 4)
  updateBorderUI()
  const fade = cfg.mouseFade || {}
  $('mouse-fade-enabled').checked = !!fade.enabled
  $('fade-opacity').value = fade.fadeOpacity ?? 0.03
  $('fade-opacity-val').textContent = String(fade.fadeOpacity ?? 0.03)
  $('fade-resume').value = fade.resumeDelay ?? 2000
  $('fade-resume-val').textContent = String(fade.resumeDelay ?? 2000)
  updateFadeUI()
  updateRangeLabels()
  // Programmatic .value writes above don't fire input events; nudge the
  // color-picker triggers to repaint their swatches.
  if (window.ColorPicker) {
    const cp1 = $('color') && $('color').__colorPickerAttached
    const cp2 = $('border-color') && $('border-color').__colorPickerAttached
    if (cp1) cp1.refresh()
    if (cp2) cp2.refresh()
  }
  renderRulesList()
  renderPreview()
  runTester()
}
const updateRangeLabels = () => {
  $('fontsize-val').textContent = $('fontsize').value
  $('opacity-val').textContent = $('opacity').value
  $('density-val').textContent = $('density').value
  $('rotation-val').textContent = $('rotation').value
}
const updateSmartColorUI = () => {
  const on = $('smartColor').checked
  $('smartColorTone').disabled = !on
  $('color').disabled = on
}
const updateBorderUI = () => {
  const on = $('border-enabled').checked
  document
    .querySelector('.border-controls')
    .setAttribute('data-disabled', on ? '0' : '1')
}
const updateFadeUI = () => {
  const on = $('mouse-fade-enabled').checked
  document
    .querySelector('.fade-controls')
    .setAttribute('data-disabled', on ? '0' : '1')
} // ============ 规则列表 ============
// 渲染函数不 mutate 状态：当 rules 为空时渲染一条"临时"空行 UI，
// 用户输入后才 push 到 cfg.rules。
const renderRulesList = () => {
  const cfg = currentConfig()
  const listEl = $('rules-list')
  if (!listEl) return
  listEl.innerHTML = ''
  if (!cfg) return
  const rules = Array.isArray(cfg.rules) ? cfg.rules : []
  if (rules.length === 0) {
    // 渲染一条纯 UI 的临时行
    appendRuleRow(listEl, {
      type: 'host-exact',
      value: ''
    }, -1, cfg, true)
    return
  }
  rules.forEach((rule, idx) => {
    appendRuleRow(listEl, rule, idx, cfg, false)
  })
}
const appendRuleRow = (listEl, rule, idx, cfg, isEphemeral) => {
  const tpl = $('rule-row-template').content.cloneNode(true)
  const row = tpl.querySelector('.rule-row')
  const select = row.querySelector('.rule-type')
  const input = row.querySelector('.rule-value')
  const remove = row.querySelector('.rule-remove')
  select.querySelectorAll('option').forEach((opt) => {
    const k = opt.dataset.i18n
    if (k) opt.textContent = t(k)
  })
  select.value = rule.type || 'host-exact'
  input.value = rule.value || ''
  input.placeholder = t(RULE_PLACEHOLDER_KEY[select.value])
  // ephemeral 行：用户改动前不进入 cfg.rules。
  // 用户改 select / 输入后立即固化。
  const materialize = () => {
    if (!isEphemeral) return
    cfg.rules = cfg.rules || []
    cfg.rules.push(rule)
    isEphemeral = false
    idx = cfg.rules.length - 1
  }
  select.onchange = () => {
    rule.type = select.value
    input.placeholder = t(RULE_PLACEHOLDER_KEY[select.value])
    materialize()
    renderConfigList()
    runTester()
  }
  input.oninput = () => {
    rule.value = input.value
    materialize()
    renderConfigList()
    runTester()
  }
  // 可见清洗：光标离开输入框时，如果规则类型是 host / ip 系列，
  // 把用户误粘贴的完整 URL / 大小写 / 端口清洗成纯 hostname，
  // 并回写到输入框和 rule.value，同时 toast 提示。
  input.onblur = () => {
    if (!window.WatermarkCore || !window.WatermarkCore.sanitizeHostValue) return
    const HOST_LIKE_TYPES = new Set(['host-exact', 'host-suffix', 'ip-exact', 'ip-cidr'])
    if (!HOST_LIKE_TYPES.has(rule.type)) return
    const cleaned = window.WatermarkCore.sanitizeHostValue(input.value)
    if (cleaned !== input.value.trim() && cleaned) {
      input.value = cleaned
      rule.value = cleaned
      showToast(t('toastRuleValueCleaned'))
      renderConfigList()
      runTester()
    }
  }
  remove.onclick = () => {
    if (isEphemeral) return // 空临时行没什么可删的，忽略
    showModal(
      t('confirmDeleteRuleTitle'),
      t('confirmDeleteRule'),
      () => {
        cfg.rules.splice(idx, 1)
        renderRulesList()
        renderConfigList()
        runTester()
      }
    )
  }
  listEl.appendChild(tpl)
} // ============ URL 测试器 ============
const runTester = () => {
  const cfg = currentConfig()
  const resultEl = $('test-result')
  if (!cfg || !resultEl) return
  const urlRaw = $('test-url').value.trim()
  const cookieStr = $('test-cookie').value.trim()
  if (!urlRaw) {
    resultEl.className = 'test-result'
    resultEl.textContent = ''
    return
  }
  // 缺 scheme：给明确提示，不要静默显示"未命中"
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(urlRaw)) {
    resultEl.className = 'test-result unmatched'
    resultEl.innerHTML =
      '<span class="test-badge no">' +
      escapeHtml(t('testUnmatched')) +
      '</span>' +
      '<span class="test-detail">' +
      escapeHtml(t('toastInvalidUrl')) +
      '</span>'
    return
  }
  const ctx = window.WatermarkCore.parseContext(urlRaw, cookieStr)
  if (!ctx) {
    resultEl.className = 'test-result unmatched'
    resultEl.innerHTML =
      '<span class="test-badge no">' +
      escapeHtml(t('testUnmatched')) +
      '</span>' +
      '<span class="test-detail">' +
      escapeHtml(t('toastInvalidUrl')) +
      '</span>'
    return
  }
  let bestRule = null
  let bestScore = 0
  const notes = [];
  (cfg.rules || []).forEach((rule) => {
    const r = window.WatermarkCore.matchRule(rule, ctx)
    if (r.matched && r.score > bestScore) {
      bestScore = r.score
      bestRule = rule
    }
    if (r.reason === 'regex-unsafe') notes.push(t('testUnsafeRegex'))
    if (r.reason === 'regex-too-long') {
      notes.push(
        tf('testRegexTooLong', {
          max: window.WatermarkCore.MAX_REGEX_SOURCE
        }),
      )
    }
  })
  if (bestRule) {
    resultEl.className = 'test-result matched'
    resultEl.innerHTML =
      '<span class="test-badge ok">' +
      escapeHtml(t('testMatched')) +
      '</span>' +
      '<span class="test-detail">' +
      escapeHtml(t('testMatchedBy')) +
      ' <code>' +
      escapeHtml(t(typeLabelKey(bestRule.type))) +
      ' → ' +
      escapeHtml(bestRule.value) +
      '</code></span>'
  } else {
    resultEl.className = 'test-result unmatched'
    const noteHtml = notes.length ?
      '<span class="test-detail">' + escapeHtml(notes.join(' · ')) + '</span>' :
      ''
    resultEl.innerHTML =
      '<span class="test-badge no">' +
      escapeHtml(t('testUnmatched')) +
      '</span>' +
      noteHtml
  }
}
const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c],
  ) // ============ 预览 ============
const renderPreview = () => {
  const cfg = currentConfig()
  if (!cfg) return
  const useSmart = cfg.smartColor && Features.canUse('smartColor')
  const drawColor = useSmart ?
    cfg.smartColorTone === 'dark' ?
    '#1f2937' :
    '#d1d5db' :
    cfg.color
  const previewText =
    isDefaultText(cfg.text) || !cfg.text ? t('defaultConfigText') : cfg.text
  const tile = window.WatermarkCore.buildTile({
    text: previewText,
    color: drawColor,
    opacity: useSmart ? 1 : cfg.opacity,
    density: cfg.density,
    fontSize: cfg.fontSize,
    rotation: cfg.rotation != null ? cfg.rotation : -30,
  })
  if (!tile) return
  // 每个预览背景单独处理：light / dark / gradient
  const renderPreviewBox = (id, bgColorOrGradient) => {
    const box = $(id)
    if (!box) return
    // 清空旧内容
    box.innerHTML = ''
    box.style.background = bgColorOrGradient
    box.style.position = 'relative'
    box.style.overflow = 'hidden'
    box.style.borderRadius = 'var(--radius-sm)'
    const tileEl = document.createElement('div')
    tileEl.style.position = 'absolute'
    tileEl.style.inset = '-50%' // 向外扩展，避免边缘裁剪
    tileEl.style.width = '200%'
    tileEl.style.height = '200%'
    tileEl.style.backgroundImage = `url(${tile.dataURL})`
    tileEl.style.backgroundRepeat = 'repeat'
    // 预览框缩小70% tile，便于在110px高的框内完整看到文字
    const previewTileSize = Math.round(tile.size * 0.7)
    tileEl.style.backgroundSize = `${previewTileSize}px ${previewTileSize}px`
    tileEl.style.opacity = useSmart ? String(cfg.opacity) : 1
    tileEl.style.mixBlendMode = useSmart ? 'difference' : 'normal'
    tileEl.style.pointerEvents = 'none'
    box.appendChild(tileEl)
  }
  renderPreviewBox('preview-light', '#ffffff')
  renderPreviewBox('preview-dark', '#0f172a')
  renderPreviewBox('preview-gradient', 'linear-gradient(135deg, #ffffff 0%, #94a3b8 45%, #0f172a 100%)')
} // ============ Tab 切换 ============
const switchTab = (name) => {
  state.activeTab = name
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === name)
  })
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === name)
  })
  if (name === 'style') renderPreview()
} // ============ 操作：新增/复制/删除/保存 ============
const onAddConfig = () => {
  const cfg = window.WatermarkCore.makeDefaultConfig(generateId())
  cfg.name = t('defaultConfigName')
  cfg.text = t('defaultConfigText')
  state.configs.push(cfg)
  state.currentId = cfg.id
  saveToStorage((err) => {
    if (err) return
    showEditor()
    renderConfigList()
    renderForm()
    showToast(t('toastAdded'))
    // 自动聚焦并全选名称输入框，用户直接输入即可替换掉"新配置"
    const nameEl = $('config-name')
    if (nameEl) {
      nameEl.focus()
      nameEl.select()
    }
  })
}
const onCopyConfig = () => {
  const cfg = currentConfig()
  if (!cfg) return showToast(t('toastCopyFailed'))
  const copy = JSON.parse(JSON.stringify(cfg))
  copy.id = generateId()
  copy.name = (cfg.name || t('defaultConfigName')) + t('copySuffix')
  const idx = state.configs.findIndex((c) => c.id === cfg.id)
  state.configs.splice(idx + 1, 0, copy)
  state.currentId = copy.id
  saveToStorage((err) => {
    if (err) return
    renderConfigList()
    renderForm()
    showToast(t('toastCopied'))
  })
}
const onDeleteConfig = () => {
  if (!currentConfig()) return
  const cfg = currentConfig()
  if (!cfg) return
  const name = cfg.name || t('defaultConfigName')
  showModal(
    t('confirmDeleteConfigTitle'),
    `${t('confirmDeleteConfig')}「${name}」`,
    () => {
      state.configs = state.configs.filter((c) => c.id !== state.currentId)
      state.currentId = state.configs.length ? state.configs[0].id : null
      saveToStorage(() => {
        renderConfigList()
        if (state.currentId) renderForm()
        else showEmpty()
        showToast(t('toastDeleted'))
      })
    }
  )
}
const onSave = () => {
  saveToStorage((err) => {
    if (err) return
    showToast(t('toastSaved'))
    renderConfigList()
  })
} // ============ 导入 / 导出 ============
const onExport = () => {
  if (!Features.canUse('importExport')) return
  const payload = {
    schema: 'watermark-tool@1',
    exportedAt: new Date().toISOString(),
    configs: state.configs,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `watermark-configs-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast(t('toastExported'))
}
// Shared helper: sanitize + append a list of configs to state, save, refresh UI.
// Returns the count of accepted configs.
const appendConfigs = (list) => {
  const cleaned = list.map((raw) => sanitizeImportedConfig(raw)).filter(Boolean)
  if (!cleaned.length) return 0
  cleaned.forEach((c) => {
    c.id = generateId()
    state.configs.push(c)
  })
  if (!state.currentId) state.currentId = cleaned[0].id
  saveToStorage((err) => {
    if (err) return
    renderConfigList()
    if (state.currentId) renderForm()
    else showEmpty()
    showToast(tf('toastImported', { n: cleaned.length }))
  })
  return cleaned.length
}

const onImportFile = (e) => {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  if (!Features.canUse('importExport')) return
  const reader = new FileReader()
  reader.onload = () => {
    let list
    try {
      const data = JSON.parse(reader.result)
      list = Array.isArray(data)
        ? data
        : Array.isArray(data.configs)
          ? data.configs
          : null
      if (!list) throw new Error('bad-format')
    } catch (err) {
      showToast(t('toastImportFailed'))
      return
    }
    showModal(
      t('confirmImport'),
      t('confirmImport'),
      () => {
        const n = appendConfigs(list)
        if (n === 0) showToast(t('toastImportFailed'))
      }
    )
  }
  reader.onerror = () => showToast(t('toastImportFailed'))
  reader.readAsText(file)
} // 过滤掉 file 里可能存在的多余字段 + 数值 clamp，防止畸形 JSON 污染 storage
// ============ v2.0: one-click AI prompt copy + clipboard import ============
const onCopyPrompt = async () => {
  const text = pickAgentPrompt() + buildAgentContext()
  try {
    await navigator.clipboard.writeText(text)
    showToast(t('toastPromptCopied'))
  } catch (err) {
    // Fallback for contexts where clipboard API is unavailable
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (ok) return showToast(t('toastPromptCopied'))
      showToast(t('toastPromptCopyFailed'))
    } catch (_) {
      showToast(t('toastPromptCopyFailed'))
    }
  }
}

// Read JSON from clipboard, sanitize, and append as new configs. Reuses the
// same validation path as file-based import.
const onPasteFromClipboard = async () => {
  let raw
  try {
    raw = await navigator.clipboard.readText()
  } catch (err) {
    showToast(t('toastClipboardReadFailed'))
    return
  }
  if (!raw || !raw.trim()) {
    showToast(t('toastClipboardEmpty'))
    return
  }
  // Strip an optional Markdown code fence (```json ... ```)
  let jsonText = raw.trim()
  const fenceMatch = jsonText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenceMatch) jsonText = fenceMatch[1]
  let data
  try {
    data = JSON.parse(jsonText)
  } catch (err) {
    showToast(t('toastClipboardInvalid'))
    return
  }
  const list = Array.isArray(data) ? data :
    Array.isArray(data.configs) ? data.configs :
    (data && typeof data === 'object' && data.name) ? [data] : null
  if (!list || !list.length) {
    showToast(t('toastClipboardInvalid'))
    return
  }
  const n = appendConfigs(list)
  if (n === 0) showToast(t('toastClipboardInvalid'))
}
const sanitizeImportedConfig = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const defaults = window.WatermarkCore.makeDefaultConfig('__tmp__')
  const clean = {
    ...defaults
  }
  if (typeof raw.name === 'string') clean.name = raw.name
  if (typeof raw.shortLabel === 'string') clean.shortLabel = raw.shortLabel.slice(0, 8)
  if (typeof raw.enabled === 'boolean') clean.enabled = raw.enabled
  if (typeof raw.text === 'string') clean.text = raw.text
  if (typeof raw.color === 'string' && /^#[0-9a-f]{6}$/i.test(raw.color))
    clean.color = raw.color
  if (raw.opacity != null) clean.opacity = clamp('opacity', raw.opacity)
  if (raw.density != null) clean.density = clamp('density', raw.density)
  if (raw.fontSize != null) clean.fontSize = clamp('fontSize', raw.fontSize)
  if (raw.rotation != null) clean.rotation = clamp('rotation', raw.rotation)
  if (typeof raw.smartColor === 'boolean') clean.smartColor = raw.smartColor
  if (raw.smartColorTone === 'light' || raw.smartColorTone === 'dark')
    clean.smartColorTone = raw.smartColorTone
  if (Array.isArray(raw.rules)) {
    clean.rules = raw.rules
      .filter((r) => r && RULE_TYPES.includes(r.type))
      .map((r) => ({
        type: r.type,
        value: String(r.value || '')
      }))
  }
  if (raw.border && typeof raw.border === 'object') {
    clean.border = {
      enabled: !!raw.border.enabled,
      color: typeof raw.border.color === 'string' &&
        /^#[0-9a-f]{6}$/i.test(raw.border.color) ?
        raw.border.color :
        '#ef4444',
      width: clamp('borderWidth', raw.border.width),
    }
  }
  if (raw.mouseFade && typeof raw.mouseFade === 'object') {
    clean.mouseFade = {
      enabled: !!raw.mouseFade.enabled,
      fadeOpacity: clamp('fadeOpacity', raw.mouseFade.fadeOpacity),
      resumeDelay: clamp('resumeDelay', raw.mouseFade.resumeDelay),
    }
  }
  return clean
}
