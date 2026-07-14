// features.js
// 特性门控层：所有可能拆分为付费/未启用的功能都通过 Features.canUse(key) 查询是否可用。
//
// 现阶段（免费版）所有功能特性均返回 true。
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
  'multiLang',
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
const DISABLED_FEATURES = new Set([
  // (empty) — multiLang moved to FREE_FEATURES once the en/zh_CN/zh_TW/ja/es
  // locales landed. Add feature keys here to dark-launch future features.
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