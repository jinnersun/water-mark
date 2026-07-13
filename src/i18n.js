// i18n.js
// 简易双语字典 + DOM 应用。
// 页面元素通过 data-i18n / data-i18n-placeholder / data-i18n-title 打标签。

const translations = {
  'zh-CN': {
    // 页面标题 & 品牌
    title: '网页水印工具 - 设置',
    brand: '网页水印工具',
    subtitle: '按域名、URL、Cookie、IP 精准区分环境水印',
    langToggleLabel: 'English',
    langSwitchTo: 'en',

    // 顶部工具条
    globalOn: '总开关（已开启）',
    globalOff: '总开关（已关闭）',
    importBtn: '导入',
    exportBtn: '导出',

    // 侧栏
    searchPlaceholder: '搜索配置...',
    addConfigTitle: '添加新配置',
    emptyList: '暂无配置',
    emptyListHint: '点击右上角 + 号，创建你的第一条配置',

    // 编辑区标题栏
    copyConfig: '复制',
    deleteConfig: '删除',
    saveBtn: '保存',
    unsaved: '有未保存的修改',

    // Tabs
    tabRules: '匹配规则',
    tabStyle: '外观',
    tabAlert: '提醒 / 交互',

    // 表单
    configName: '配置名称',
    namePlaceholder: '例如：生产环境',
    enabledLabel: '启用当前配置',
    // 图标 badge
    shortLabelPlaceholder: '标签',
    shortLabelHint: '将在浏览器工具栏图标上显示（最多 4 字符）',

    // 规则
    rulesTitle: '触发条件',
    rulesHint: '任一规则命中即生效；多条规则中匹配最精准的一条决定水印样式。',
    addRuleBtn: '添加规则',
    ruleTypeHostExact: '精确域名',
    ruleTypeHostSuffix: '域名后缀',
    ruleTypeUrlRegex: 'URL 正则',
    ruleTypeIpExact: 'IP 精确',
    ruleTypeIpCidr: 'IP 段（CIDR）',
    ruleTypeCookie: 'Cookie',
    rulePlaceholderHostExact: '例如：cust.example.com',
    rulePlaceholderHostSuffix: '例如：example.com（含所有子域）',
    rulePlaceholderUrlRegex: '例如：^https?://.*/admin(/.*)?$',
    rulePlaceholderIpExact: '例如：10.20.30.5',
    rulePlaceholderIpCidr: '例如：10.20.30.0/24',
    rulePlaceholderCookie: '例如：env=prod  或  env~=stage  或  仅键名',
    ruleHintCookie: '语法：name=value 精确匹配；name~=fragment 包含匹配；只填 name 检查存在。',
    ruleRemove: '删除',

    // URL 测试器
    testTitle: '规则测试',
    testUrlPlaceholder: '粘贴 URL 试试...',
    testCookiePlaceholder: '（可选）粘贴 cookie 字符串，如：sid=abc; env=prod',
    testMatched: '命中',
    testUnmatched: '未命中',
    testMatchedBy: '命中规则：',

    // 外观
    watermarkText: '水印文字',
    textPlaceholder: '例如：生产环境 / 机密资料',
    textHint: '支持换行；未来将支持 {user} / {date} 等变量。',
    textColor: '文字颜色',
    fontSize: '字体大小',
    opacity: '不透明度',
    density: '间距密度',
    densityHint: '数值越大水印越稀疏',
    rotation: '旋转角度',
    smartColor: '智能对比色',
    smartColorHint: '开启后自动根据网页背景反色显示，颜色选择器由基调决定。',
    smartColorTone: '基调',
    smartColorToneLight: '浅色（适合深色网页）',
    smartColorToneDark: '深色（适合浅色网页）',

    // 提醒 & 交互
    borderTitle: '沉浸式边框',
    borderEnabled: '启用边框提醒',
    borderHint: '在页面四周绘制粗边框，比水印更容易一眼识别。适合生产 / 强提醒场景。',
    borderColor: '边框颜色',
    borderWidth: '边框粗细',
    mouseFadeTitle: '鼠标交互时渐隐',
    mouseFadeEnabled: '启用鼠标 / 键盘交互时降低透明度',
    mouseFadeHint: '排查问题时短暂让水印几乎透明，停手后自动恢复。',
    mouseFadeOpacity: '渐隐后的透明度',
    mouseFadeResume: '停手后多久恢复',
    mouseFadeUnitMs: 'ms',

    // 预览
    previewTitle: '实时预览',
    previewHintLight: '浅色背景',
    previewHintDark: '深色背景',
    previewHintGradient: '渐变背景',

    // 空状态
    emptyTitle: '暂无配置',
    emptyDesc: '点击左上角按钮，创建你的第一个专属水印配置吧',

    // 默认值
    defaultConfigName: '新配置',
    defaultConfigText: '生产环境',
    unnamed: '未命名',
    disabled: '（已停用）',
    copySuffix: ' - 副本',
    noRule: '未设置规则',

    // Toast
    toastAdded: '已添加新配置',
    toastSaved: '保存成功',
    toastDeleted: '配置已删除',
    toastCopied: '已复制配置',
    toastCopyFailed: '复制失败：未找到当前配置',
    toastExported: '已导出',
    toastImported: '已导入 {n} 条配置',
    toastImportFailed: '导入失败：文件格式不正确',
    toastGlobalOn: '已开启全局水印',
    toastGlobalOff: '已关闭全局水印',
    toastInvalidUrl: '测试失败：请填写完整 URL（包含 http:// 或 https://）',
    toastStorageError: '保存失败：{msg}',
    testUnsafeRegex: '拒绝执行：疑似病态正则，可能导致页面卡死',
    testRegexTooLong: '拒绝执行：正则长度超过上限（{max} 字符）',    confirmDelete: '确定要删除这个配置吗？',
    confirmImport: '导入将追加到现有配置末尾。继续？',
  },
  en: {
    title: 'Web Watermark - Settings',
    brand: 'Web Watermark',
    subtitle: 'Precise environment badges by domain, URL, Cookie, or IP',
    langToggleLabel: '中文',
    langSwitchTo: 'zh-CN',

    globalOn: 'Global (On)',
    globalOff: 'Global (Off)',
    importBtn: 'Import',
    exportBtn: 'Export',

    searchPlaceholder: 'Search configs...',
    addConfigTitle: 'Add new config',
    emptyList: 'No configs',
    emptyListHint: 'Click the + button to create your first config',

    copyConfig: 'Copy',
    deleteConfig: 'Delete',
    saveBtn: 'Save',
    unsaved: 'Unsaved changes',

    tabRules: 'Rules',
    tabStyle: 'Style',
    tabAlert: 'Alerts',

    configName: 'Config name',
    namePlaceholder: 'e.g. Production',
    enabledLabel: 'Enable this config',
    // Badge
    shortLabelPlaceholder: 'Badge',
    shortLabelHint: 'Shows on the toolbar icon (max 4 chars)',

    rulesTitle: 'Match rules',
    rulesHint: 'Any matching rule triggers; the most specific rule wins.',
    addRuleBtn: 'Add rule',
    ruleTypeHostExact: 'Exact host',
    ruleTypeHostSuffix: 'Host suffix',
    ruleTypeUrlRegex: 'URL regex',
    ruleTypeIpExact: 'IP exact',
    ruleTypeIpCidr: 'IP CIDR',
    ruleTypeCookie: 'Cookie',
    rulePlaceholderHostExact: 'e.g. cust.example.com',
    rulePlaceholderHostSuffix: 'e.g. example.com (includes subdomains)',
    rulePlaceholderUrlRegex: 'e.g. ^https?://.*/admin(/.*)?$',
    rulePlaceholderIpExact: 'e.g. 10.20.30.5',
    rulePlaceholderIpCidr: 'e.g. 10.20.30.0/24',
    rulePlaceholderCookie: 'e.g. env=prod  or  env~=stage  or  just a name',
    ruleHintCookie: 'Syntax: name=value equals; name~=fragment contains; just name checks existence.',
    ruleRemove: 'Remove',

    testTitle: 'Rule tester',
    testUrlPlaceholder: 'Paste a URL to test...',
    testCookiePlaceholder: '(optional) cookie string, e.g. sid=abc; env=prod',
    testMatched: 'MATCH',
    testUnmatched: 'no match',
    testMatchedBy: 'Matched by:',

    watermarkText: 'Watermark text',
    textPlaceholder: 'e.g. Production / Confidential',
    textHint: 'Line breaks supported; variables like {user}/{date} coming later.',
    textColor: 'Text color',
    fontSize: 'Font size',
    opacity: 'Opacity',
    density: 'Tile spacing',
    densityHint: 'Larger = sparser',
    rotation: 'Rotation',
    smartColor: 'Smart color',
    smartColorHint: 'Auto-invert against page background. Color picker is replaced by tone.',
    smartColorTone: 'Tone',
    smartColorToneLight: 'Light (better on dark pages)',
    smartColorToneDark: 'Dark (better on light pages)',

    borderTitle: 'Immersive border',
    borderEnabled: 'Enable border alert',
    borderHint: 'A thick inset border around the viewport, spot at a glance. Great for production.',
    borderColor: 'Border color',
    borderWidth: 'Border width',
    mouseFadeTitle: 'Fade on activity',
    mouseFadeEnabled: 'Fade watermark during mouse/keyboard activity',
    mouseFadeHint: 'Temporarily hide the watermark while you inspect UI; restore after idle.',
    mouseFadeOpacity: 'Fade opacity',
    mouseFadeResume: 'Restore delay',
    mouseFadeUnitMs: 'ms',

    previewTitle: 'Live preview',
    previewHintLight: 'Light background',
    previewHintDark: 'Dark background',
    previewHintGradient: 'Gradient',

    emptyTitle: 'No configurations',
    emptyDesc: 'Click the + button on the top left to create your first watermark config',

    defaultConfigName: 'New config',
    defaultConfigText: 'Production',
    unnamed: 'Unnamed',
    disabled: '(disabled)',
    copySuffix: ' - Copy',
    noRule: 'no rule',

    toastAdded: 'Config added',
    toastSaved: 'Saved',
    toastDeleted: 'Config deleted',
    toastCopied: 'Config copied',
    toastCopyFailed: 'Copy failed: config not found',
    toastExported: 'Exported',
    toastImported: 'Imported {n} configs',
    toastImportFailed: 'Import failed: invalid file',
    toastGlobalOn: 'Global watermark ON',
    toastGlobalOff: 'Global watermark OFF',
    toastInvalidUrl: 'Invalid URL: include http:// or https://',
    toastStorageError: 'Save failed: {msg}',
    testUnsafeRegex: 'Blocked: pattern likely catastrophic, would freeze pages',
    testRegexTooLong: 'Blocked: regex source exceeds {max} chars',    confirmDelete: 'Delete this config?',
    confirmImport: 'Import will append to existing configs. Continue?',
  },
}

const DEFAULT_LANG = 'zh-CN'

const getStoredLang = (cb) => {
  // 多语言未启用时强制中文；等 Features.canUse('multiLang') 打开后再回到用户偏好 / 浏览器语言检测
  const multiLang =
    (typeof window !== 'undefined' &&
      window.Features &&
      window.Features.canUse('multiLang')) === true
  if (!multiLang) {
    cb(DEFAULT_LANG)
    return
  }
  chrome.storage.sync.get({ lang: '' }, (items) => {
    if (items.lang && translations[items.lang]) return cb(items.lang)
    const navLang = navigator.language || ''
    cb(navLang.startsWith('zh') ? 'zh-CN' : 'en')
  })
}

const getCurrentDisplayLang = () =>
  document.documentElement.lang || DEFAULT_LANG

const t = (key, lang) => {
  lang = lang || getCurrentDisplayLang()
  const dict = translations[lang] || translations[DEFAULT_LANG]
  return dict[key] || translations[DEFAULT_LANG][key] || key
}

const tf = (key, vars, lang) => {
  let s = t(key, lang)
  Object.keys(vars || {}).forEach((k) => {
    s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]))
  })
  return s
}

const applyLang = (lang) => {
  document.documentElement.lang = lang

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n
    if (key) el.textContent = t(key, lang)
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder
    if (key) el.placeholder = t(key, lang)
  })
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle
    if (key) el.title = t(key, lang)
  })

  const toggleBtn = document.getElementById('lang-toggle')
  if (toggleBtn) {
    toggleBtn.textContent = t('langToggleLabel', lang)
    toggleBtn.dataset.targetLang = t('langSwitchTo', lang)
  }
}

const switchLang = (lang) => {
  const multiLang =
    (typeof window !== 'undefined' &&
      window.Features &&
      window.Features.canUse('multiLang')) === true
  if (!multiLang) return // 门控关闭，忽略切换请求
  chrome.storage.sync.set({ lang }, () => {
    applyLang(lang)
    if (window.onLangChanged) window.onLangChanged(lang)
  })
}