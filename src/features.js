// features.js
// 特性门控层：所有可能拆分为付费/未启用的功能都通过 Features.canUse(key) 查询是否可用。
//
// 现阶段（免费版）功能特性全部返回 true；multiLang 例外，先关闭，等中文版稳定后再开。
//
// 未来接入付费 / 灰度：修改这一个文件即可，业务代码不动。

// 默认可用（免费版全部开放）
const FREE_FEATURES = new Set([
  'hostRule',
  'urlRegex',
  'ipMatch',
  'immersiveBorder',
  'mouseFade',
  'iframeInject',
  'globalToggle',
  'badge',
])

// 未来可能移到付费；目前也返回 true
const PAID_FEATURES = new Set([
  'cookieMatch',
  'smartColor',
  'importExport',
  'unlimitedConfigs',
  'dynamicVars',
])

// 未启用的功能：字典和 UI 都保留，但当前不允许触发
// 现阶段：multiLang 关闭，所有 UI 强制中文，语言切换按钮隐藏
const DISABLED_FEATURES = new Set([
  'multiLang',
])

const Features = {
  canUse(key) {
    if (DISABLED_FEATURES.has(key)) return false
    if (FREE_FEATURES.has(key)) return true
    if (PAID_FEATURES.has(key)) return true
    return false
  },

  tierOf(key) {
    if (DISABLED_FEATURES.has(key)) return 'disabled'
    if (FREE_FEATURES.has(key)) return 'free'
    if (PAID_FEATURES.has(key)) return 'pro'
    return 'unknown'
  },

  currentPlan() {
    return 'free'
  },
}

if (typeof window !== 'undefined') window.Features = Features
if (typeof self !== 'undefined') self.Features = Features