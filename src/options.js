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
} // ========== 弹窗与帮助面板（防御性版本） ==========
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
} // ---------- 弹窗 & 帮助面板 i18n ----------
const extraI18n = {
  'zh-CN': {
    confirmDeleteRuleTitle: '删除规则',
    confirmDeleteRule: '确定要删除这条规则吗？',
    confirmDeleteConfigTitle: '删除配置',
    confirmDeleteConfig: '确定要删除整个配置吗？此操作无法撤销。',
    helpTitle: '使用指南',
    helpQuickStart: '快速开始',
    helpStep1: '点击左上角「+」按钮新建一条水印配置',
    helpStep2: '在「匹配规则」Tab 设置触发条件（域名/URL/IP 等）',
    helpStep3: '在「外观」Tab 设置水印文字、颜色、字体、透明度等',
    helpRules: '匹配规则说明',
    ruleHostExact: '精确域名',
    ruleHostSuffix: '域名后缀',
    ruleUrlRegex: 'URL 正则',
    ruleIpExact: 'IP 精确',
    ruleIpCidr: 'IP 段 (CIDR)',
    ruleCookie: 'Cookie',
    helpTips: '小提示',
    helpTip1: '每条配置可设置多条规则，任一命中即生效',
    helpTip2: '多条配置命中时，按"最精确优先"原则选择',
    helpTip3: '短标签显示在浏览器工具栏图标右下角，最多 4 字符',
    helpTip4: '智能对比色自动根据网页背景反色显示',
  },
  en: {
    confirmDeleteRuleTitle: 'Delete Rule',
    confirmDeleteRule: 'Are you sure you want to delete this rule?',
    confirmDeleteConfigTitle: 'Delete Config',
    confirmDeleteConfig: 'Are you sure you want to delete this config? This cannot be undone.',
    helpTitle: 'Guide',
    helpQuickStart: 'Quick Start',
    helpStep1: 'Click + button in the top-left to create a new config',
    helpStep2: 'Go to Match Rules tab and set trigger conditions',
    helpStep3: 'Go to Style tab to customize watermark look',
    helpRules: 'Rule Types',
    ruleHostExact: 'Exact Host',
    ruleHostSuffix: 'Host Suffix',
    ruleUrlRegex: 'URL Regex',
    ruleIpExact: 'IP Exact',
    ruleIpCidr: 'IP CIDR',
    ruleCookie: 'Cookie',
    helpTips: 'Tips',
    helpTip1: 'Multiple rules per config, any match triggers the watermark',
    helpTip2: 'When multiple configs match, the most specific one wins',
    helpTip3: 'Short badge shows in the toolbar icon corner (max 4 chars)',
    helpTip4: 'Smart color inverts automatically against page background',
  }
} // 合并到翻译字典
Object.keys(extraI18n).forEach(lang => {
  if (!translations[lang]) translations[lang] = {}
  Object.assign(translations[lang], extraI18n[lang])
})
// ============ 工具 ============
const $ = (id) => document.getElementById(id)
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
const isDefaultName = (name) =>
  Object.values(translations).some(
    (d) => d.defaultConfigName === name || d.unnamed === name,
  )
const isDefaultText = (text) =>
  Object.values(translations).some((d) => d.defaultConfigText === text)
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
    applyLang(lang)
    bindStaticEvents()
    loadAll()
  })
})
window.onLangChanged = () => {
  renderConfigList()
  if (state.currentId) renderForm()
  updateGlobalToggleLabel()
  renderRulesList()
  runTester()
}
const bindStaticEvents = () => {
  // 语言（受 Features.multiLang 门控。字典和结构保留，未启用时隐藏切换按钮）
  const langBtn = $('lang-toggle')
  if (Features.canUse('multiLang')) {
    langBtn.style.display = ''
    langBtn.onclick = () => switchLang(langBtn.dataset.targetLang || 'en')
  } else {
    langBtn.style.display = 'none'
  }
  // 全局开关
  $('global-toggle').onchange = (e) => {
    state.globalEnabled = e.target.checked
    saveToStorage((err) => {
      if (err) return // 已由 saveToStorage 提示
      showToast(state.globalEnabled ? t('toastGlobalOn') : t('toastGlobalOff'))
    })
    updateGlobalToggleLabel()
  }
  // 顶部导入导出
  $('export-btn').onclick = onExport
  $('import-btn').onclick = () => $('import-file').click()
  $('import-file').onchange = onImportFile
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
        document.getElementById('modal-overlay').style.display = 'none'
      }
    })
  }
  // 侧栏
  $('add-config-btn').onclick = onAddConfig
  $('config-search').oninput = (e) => {
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
  $('copy-config-btn').onclick = onCopyConfig
  $('delete-config-btn').onclick = onDeleteConfig
  $('save-btn').onclick = onSave
  // Tab 切换
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.onclick = () => switchTab(tab.dataset.tab)
  })
  // 表单绑定：所有 input 变化写入内存中的 config
  const nameInput = $('config-name')
  nameInput.oninput = () => onFormField('name', nameInput.value)
  $('short-label').oninput = (e) => onFormField('shortLabel', e.target.value)
  $('enabled').onchange = (e) => onFormField('enabled', e.target.checked)
  // 添加规则（当无规则时点击也直接生效）
  $('add-rule-btn').onclick = () => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.rules = cfg.rules || []
    cfg.rules.push({
      type: 'host-exact',
      value: ''
    })
    renderRulesList()
    renderConfigList()
  }
  // 规则测试
  $('test-url').oninput = debounce(runTester, 150)
  $('test-cookie').oninput = debounce(runTester, 150)
  // 外观字段
  const bindRange = (id, key, cast) => {
    $(id).oninput = (e) => {
      const val = cast ? cast(e.target.value) : e.target.value
      onFormField(key, val)
      updateRangeLabels()
      renderPreview()
    }
  }
  $('text').oninput = (e) => {
    onFormField('text', e.target.value)
    renderPreview()
  }
  bindRange('fontsize', 'fontSize', (v) => parseInt(v, 10))
  bindRange('opacity', 'opacity', (v) => parseFloat(v))
  bindRange('density', 'density', (v) => parseInt(v, 10))
  bindRange('rotation', 'rotation', (v) => parseInt(v, 10))
  $('smartColor').onchange = (e) => {
    onFormField('smartColor', e.target.checked)
    updateSmartColorUI()
    renderPreview()
  }
  $('smartColorTone').onchange = (e) => {
    onFormField('smartColorTone', e.target.value)
    renderPreview()
  }
  // 提醒/交互
  $('border-enabled').onchange = (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.border = cfg.border || {}
    cfg.border.enabled = e.target.checked
    updateBorderUI()
  }
  $('border-color').oninput = (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.border = cfg.border || {}
    cfg.border.color = e.target.value
    $('border-color-hex').textContent = e.target.value.toUpperCase()
  }
  $('border-width').oninput = (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.border = cfg.border || {}
    cfg.border.width = parseInt(e.target.value, 10)
    $('border-width-val').textContent = e.target.value
  }
  $('mouse-fade-enabled').onchange = (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.mouseFade = cfg.mouseFade || {}
    cfg.mouseFade.enabled = e.target.checked
    updateFadeUI()
  }
  $('fade-opacity').oninput = (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.mouseFade = cfg.mouseFade || {}
    cfg.mouseFade.fadeOpacity = parseFloat(e.target.value)
    $('fade-opacity-val').textContent = e.target.value
  }
  $('fade-resume').oninput = (e) => {
    const cfg = currentConfig()
    if (!cfg) return
    cfg.mouseFade = cfg.mouseFade || {}
    cfg.mouseFade.resumeDelay = parseInt(e.target.value, 10)
    $('fade-resume-val').textContent = e.target.value
  }
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
      $('global-toggle').checked = state.globalEnabled
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
  $('color-hex').textContent = (cfg.color || '#ff0000').toUpperCase()
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
  $('border-color-hex').textContent = (border.color || '#ef4444').toUpperCase()
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
  $('color').style.opacity = on ? 0.4 : 1
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
const onImportFile = (e) => {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  if (!Features.canUse('importExport')) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      const list = Array.isArray(data) ?
        data :
        Array.isArray(data.configs) ?
        data.configs :
        null
      if (!list) throw new Error('bad-format')
      showModal(
        t('confirmImport'),
        t('confirmImport'),
        () => {
          const cleaned = list
            .map((raw) => sanitizeImportedConfig(raw))
            .filter(Boolean)
          cleaned.forEach((c) => {
            c.id = generateId()
            state.configs.push(c)
          })
          saveToStorage(() => {
            renderConfigList()
            if (state.currentId) renderForm()
            showToast(tf('toastImported', {
              n: cleaned.length
            }))
          })
        }
      )
      saveToStorage((err) => {
        if (err) return
        if (!state.currentId && state.configs.length) {
          state.currentId = state.configs[0].id
        }
        renderConfigList()
        if (state.currentId) renderForm()
        else showEmpty()
        showToast(tf('toastImported', {
          n: cleaned.length
        }))
      })
    } catch (err) {
      showToast(t('toastImportFailed'))
    }
  }
  reader.readAsText(file)
} // 过滤掉 file 里可能存在的多余字段 + 数值 clamp，防止畸形 JSON 污染 storage
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
