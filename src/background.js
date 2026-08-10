// background.js
// 1) 点击工具栏图标 → 打开配置页
// 2) 工具栏图标 badge：content script 命中配置后通过 runtime.sendMessage
//    把短标签上报上来，background 只负责绘制到对应 tab 的图标上。
//
// 为什么不用 chrome.tabs.onUpdated 读 tab.url 自己匹配（旧实现，已实测不工作）：
// MV3 下没有 "tabs" 权限或匹配该 URL 的 host permission 时，tab.url 会被
// 剥离为 undefined——而 content_scripts.matches 并不授予 host permission。
// 消息传递方案零新增权限，且 content 侧有真实 document.cookie，
// 顺带修复了 cookie 规则 badge 永远失效的问题。
//
// 注意：background 是 MV3 service worker，无 DOM。代码保持无状态。

try {
  importScripts('features.js')
} catch (e) {
  console.error('[watermark] failed to import scripts', e)
}

// 点击图标 → 打开设置页
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})

// ============ Badge ============

const setBadge = (tabId, label, color) => {
  try {
    chrome.action.setBadgeText({ tabId, text: label || '' })
    if (label) {
      chrome.action.setBadgeBackgroundColor({ tabId, color: color || '#ef4444' })
      // Chrome 100+ 才支持 setBadgeTextColor，包一层 try 避免旧版 crash
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' })
      }
    }
  } catch (e) {
    // 忽略 tab 已关闭等错误
  }
}

// content script 上报命中结果：{ type: 'wm:badge', label, color }
// label 为空串表示清除（未命中 / 全局开关关闭）。
// iframe 已由 content 侧过滤（仅顶层上报），这里再用 sender.frameId 兜底。
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'wm:badge') return
  if (!sender || !sender.tab || sender.frameId) return
  if (!self.Features || !self.Features.canUse('badge')) {
    setBadge(sender.tab.id, '', '')
    return
  }
  setBadge(sender.tab.id, msg.label, msg.color)
})

// 导航生命周期处理。badge 的最终事实源是 content script，这里只做三件事：
//
// 1. status === 'loading'：新文档开始，先清旧 badge 防跨页残留。
//    （即使该事件被子框架等延迟触发误清，下面的 complete ping 也会修好）
// 2. changeInfo.url 且 scheme 非 http(s)：chrome:// / about: / 扩展页等
//    content script 不会运行的地方，必须主动清。只看 scheme 是安全的：
//    SPA 的同文档导航（pushState / replaceState）永远不改 scheme，
//    不会再误清——这正是上一版「PRE 页 badge 显示后消失」的根因之一。
// 3. status === 'complete'：ping content 重报一遍，兜住所有事件时序。
//
// http(s) 的 url 变化（含 replaceState）一律忽略，不做任何清除。
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    setBadge(tabId, '', '')
    return
  }
  if (typeof changeInfo.url === 'string' && !/^https?:/i.test(changeInfo.url)) {
    setBadge(tabId, '', '')
    return
  }
  if (changeInfo.status === 'complete') {
    try {
      const ret = chrome.tabs.sendMessage(tabId, { type: 'wm:request-badge' })
      // 该 tab 没有 content script（chrome:// 等）时 sendMessage 会 reject，吞掉
      if (ret && typeof ret.catch === 'function') ret.catch(() => {})
    } catch (_) {
      // 同上，忽略
    }
  }
})
