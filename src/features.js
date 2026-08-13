// features.js
// 特性门控层：所有功能都通过 Features.canUse(key) 查询是否可用。
//
// 【当前状态】所有功能全部免费开放，canUse(*) 一律返回 true。
// PAID_FEATURES / tierOf / currentPlan 仅为未来可能的付费拆分或灰度保留的
// 桩位，当前不产生任何限制。已决策（2026-08-13）：v2.0 不设付费功能。
//
// 未来若要做付费 / 灰度：修改这一个文件即可，业务代码不动。

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

// 付费桩位（保留为未来可能拆分，当前全部免费，canUse 对它们也返回 true）
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