// background.js
// 1) 点击工具栏图标 → 打开配置页
// 2) 工具栏图标 badge：当前 tab 命中哪条配置，在图标右下角显示短标签
//
// 注意：background 是 MV3 service worker，无 DOM。所有匹配逻辑都在 watermark-core.js 里。
// service worker 会被 Chrome 定期休眠，用 importScripts 加载依赖，代码本身要保持无状态。

try {
  importScripts('features.js', 'watermark-core.js')
} catch (e) {
  console.error('[watermark] failed to import scripts', e)
}

// 点击图标 → 打开设置页
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})

// ============ Badge ============

const BADGE_MAX_CHARS = 4 // Chrome 只显示前 4 个字符

// 取一个"短标签"：优先使用 config.shortLabel，否则回退到 config.name 前 N 字
const shortLabelOf = (config) => {
  const raw = (config.shortLabel || config.name || '').trim()
  if (!raw) return ''
  return raw.slice(0, BADGE_MAX_CHARS)
}

// 命中最精准的一条配置
const matchForUrl = (url, configs) => {
  const ctx = self.WatermarkCore.parseContext(url, '')
  if (!ctx) return null
  const matches = self.WatermarkCore.findMatches(configs, ctx)
  return matches[0] || null
}

const updateBadge = (tabId, url) => {
  if (!url || !url.startsWith('http')) {
    clearBadge(tabId)
    return
  }
  if (!self.Features || !self.Features.canUse('badge')) {
    clearBadge(tabId)
    return
  }
  chrome.storage.sync.get(
    { configs: [], globalEnabled: true },
    (items) => {
      if (items.globalEnabled === false) {
        clearBadge(tabId)
        return
      }
      const hit = matchForUrl(url, items.configs)
      if (!hit) {
        clearBadge(tabId)
        return
      }
      const label = shortLabelOf(hit.config)
      const color = hit.config.border && hit.config.border.color
        ? hit.config.border.color
        : (hit.config.color || '#ef4444')
      try {
        chrome.action.setBadgeText({ tabId, text: label })
        chrome.action.setBadgeBackgroundColor({ tabId, color })
        // Chrome 100+ 才支持 setBadgeTextColor，包一层 try 避免旧版 crash
        if (chrome.action.setBadgeTextColor) {
          chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' })
        }
      } catch (e) {
        // 忽略 tab 已关闭等错误
      }
    },
  )
}

const clearBadge = (tabId) => {
  try {
    chrome.action.setBadgeText({ tabId, text: '' })
  } catch (e) {}
}

// tab URL / 加载状态变化时刷新 badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    updateBadge(tabId, tab.url || changeInfo.url)
  }
})

// 切换 tab 时确保 badge 是最新的
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return
    updateBadge(tabId, tab.url)
  })
})

// 存储变化时（用户改了配置）刷新所有 tab 的 badge
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') return
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => updateBadge(tab.id, tab.url))
  })
})