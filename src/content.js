// content.js
// 只做三件事：
//   1) 读配置 + 上下文 → 计算命中 → 渲染水印 / 边框
//   2) 监听存储变化，实时刷新
//   3) MutationObserver 防止水印被页面脚本移除
//
// 匹配、绘制等纯逻辑放在 watermark-core.js。
// 全局开关：storage.sync.globalEnabled === false 时不渲染任何东西。

const WATERMARK_ID = '__wm_overlay__'
const BORDER_ID = '__wm_border__'
const STYLE_ID = '__wm_style__'
const OWN_IDS = new Set([WATERMARK_ID, BORDER_ID, STYLE_ID])

let __wmObserver = null
let __wmMouseFadeState = null
let __wmCurrentConfig = null

// 防御：若 features.js 未按预期加载，退化为"全部可用"避免整个脚本崩溃
const canUse = (key) =>
  typeof window !== 'undefined' && window.Features
    ? window.Features.canUse(key)
    : true

// ============ 主流程 ============

// 本页最近一次上报的 badge 状态，供 background 在 top-level 加载完成时
// ping（wm:request-badge）回来重发，兜住一切"上报后又被清"的时序问题。
let __wmLastBadge = null // { label, color } | null

const sendBadge = (label, color) => {
  __wmLastBadge = label ? { label, color } : null
  try {
    const ret = chrome.runtime.sendMessage({ type: 'wm:badge', label, color })
    // MV3 下 sendMessage 返回 Promise；扩展被更新/卸载的瞬间会 reject，吞掉避免噪音
    if (ret && typeof ret.catch === 'function') ret.catch(() => {})
  } catch (_) {
    // 扩展上下文失效，忽略
  }
}

// 向 background 上报当前页面的 badge 信息。
// MV3 下 background 没有 tabs 权限 / host permission 时读不到 tab.url
// （content_scripts.matches 不授予 host permission），无法自己匹配，
// 因此由算好结果的 content script 主动上报，零新增权限。
// 只有顶层 frame 上报：badge 反映主页面，iframe（all_frames: true 也会注入）不覆盖。
const reportBadge = (config) => {
  try {
    if (window.top !== window) return
  } catch (_) {
    // 极端沙箱场景下 window.top 不可读，按顶层处理
  }
  const label = config ? window.WatermarkCore.shortLabelOf(config) : ''
  const color = config ? window.WatermarkCore.resolveBadgeColor(config) : ''
  sendBadge(label, color)
}

const init = () => {
  chrome.storage.sync.get(
    { configs: [], globalEnabled: true },
    (items) => {
      cleanup()

      let matchedConfig = null
      if (items.globalEnabled !== false) {
        const ctx = window.WatermarkCore.parseContext(
          window.location,
          document.cookie || '',
        )
        const matches = window.WatermarkCore.findMatches(items.configs, ctx)
        if (matches.length > 0) matchedConfig = matches[0].config
      }

      reportBadge(matchedConfig)

      if (!matchedConfig) return
      __wmCurrentConfig = matchedConfig
      renderConfig(matchedConfig)
    },
  )
}

// ============ 渲染 ============

const renderConfig = (config) => {
  ensureStyle()

  // z-index 说明：
  //   BORDER 必须在 OVERLAY 之上，否则智能变色（mix-blend-mode: difference）会把边框像素也参与差值，
  //   血红色被算歪甚至看不见。
  const overlay = buildOverlay(config)
  if (overlay) attach(overlay)

  if (
    config.border &&
    config.border.enabled &&
    canUse('immersiveBorder')
  ) {
    const border = buildBorder(config.border)
    if (border) attach(border)
  }

  if (
    config.mouseFade &&
    config.mouseFade.enabled &&
    canUse('mouseFade')
  ) {
    installMouseFade(config, overlay)
  }
}

const buildOverlay = (config) => {
  const useSmart = config.smartColor && canUse('smartColor')

  // 智能变色模式下：颜色由 tone 决定，因为要走 mix-blend-mode: difference
  //   - light 基调：填浅灰，在深色背景上偏浅、在浅色背景上偏深
  //   - dark 基调：填深灰
  const drawColor = useSmart
    ? config.smartColorTone === 'dark'
      ? '#1f2937'
      : '#d1d5db'
    : config.color

  const tile = window.WatermarkCore.buildTile({
    text: config.text,
    color: drawColor,
    opacity: useSmart ? 1 : config.opacity, // difference 模式下用 CSS 透明度控制
    density: config.density,
    fontSize: config.fontSize,
    rotation: config.rotation != null ? config.rotation : -30,
  })
  if (!tile) return null

  const overlay = document.createElement('div')
  overlay.id = WATERMARK_ID
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    pointerEvents: 'none',
    // 留 1 个层级给 border（下方 BORDER 用 max）
    zIndex: '2147483646',
    backgroundImage: `url(${tile.dataURL})`,
    backgroundRepeat: 'repeat',
    backgroundSize: `${tile.size}px ${tile.size}px`,
    opacity: useSmart ? String(config.opacity) : '1',
    mixBlendMode: useSmart ? 'difference' : 'normal',
    transition: 'opacity 0.4s ease',
  })
  return overlay
}

const buildBorder = (border) => {
  const width = Math.max(1, parseInt(border.width, 10) || 4)
  const color = border.color || '#ef4444'
  const el = document.createElement('div')
  el.id = BORDER_ID
  Object.assign(el.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    pointerEvents: 'none',
    // border 必须在 overlay 之上（overlay 用 2147483646），避免被 difference 反色
    zIndex: '2147483647',
    boxShadow: `inset 0 0 0 ${width}px ${color}`,
    transition: 'opacity 0.4s ease',
  })
  return el
}

const ensureStyle = () => {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  // 保底样式：防止某些站点 * { transition } / * { animation } 影响水印
  style.textContent = `
    #${WATERMARK_ID}, #${BORDER_ID} {
      animation: none !important;
      transform: none !important;
    }
  `
  document.documentElement.appendChild(style)
}

const attach = (el) => {
  // 优先挂在 documentElement 上，成功率比 body 高（body 未就绪 / 被替换 都不影响）
  const root = document.documentElement || document.body
  if (root) root.appendChild(el)
}

// ============ 鼠标交互渐隐 ============

const installMouseFade = (config, overlay) => {
  if (__wmMouseFadeState) uninstallMouseFade()
  if (!overlay) return

  const fadeOpacity = Math.max(
    0,
    Math.min(1, config.mouseFade.fadeOpacity || 0.03),
  )
  const resumeDelay = Math.max(
    300,
    parseInt(config.mouseFade.resumeDelay, 10) || 2000,
  )
  const normalOpacity = String(config.opacity)
  let timer = null

  const toFade = () => {
    overlay.style.opacity = String(fadeOpacity)
  }
  const toNormal = () => {
    overlay.style.opacity = normalOpacity
  }
  const onActivity = () => {
    toFade()
    if (timer) clearTimeout(timer)
    timer = setTimeout(toNormal, resumeDelay)
  }

  document.addEventListener('mousemove', onActivity, { passive: true })
  document.addEventListener('keydown', onActivity, { passive: true })
  // 滚轮滚动也算活跃交互（包括滚到边界滚不动的情况，与用户确认过）
  document.addEventListener('wheel', onActivity, { passive: true })
  // 触屏拖动
  document.addEventListener('touchmove', onActivity, { passive: true })

  __wmMouseFadeState = {
    dispose() {
      document.removeEventListener('mousemove', onActivity)
      document.removeEventListener('keydown', onActivity)
      document.removeEventListener('wheel', onActivity)
      document.removeEventListener('touchmove', onActivity)
      if (timer) clearTimeout(timer)
    },
  }
}

const uninstallMouseFade = () => {
  if (__wmMouseFadeState) {
    __wmMouseFadeState.dispose()
    __wmMouseFadeState = null
  }
}

// ============ 清理 ============

const cleanup = () => {
  ;[WATERMARK_ID, BORDER_ID].forEach((id) => {
    const el = document.getElementById(id)
    if (el) el.remove()
  })
  uninstallMouseFade()
  __wmCurrentConfig = null
}

// ============ 防移除 Observer ============

const setupObserver = () => {
  if (__wmObserver) return
  const target = document.documentElement || document.body
  if (!target) return

  let pending = false
  __wmObserver = new MutationObserver((records) => {
    // 忽略"由我们自己引起的 mutation"：例如 mouseFade 改 overlay 自己的 style.opacity
    // 只关注 childList（节点被移除）或非我们节点的 attributes 变化
    let relevant = false
    for (const rec of records) {
      if (rec.type === 'childList') {
        for (const n of rec.removedNodes) {
          if (n && n.id && OWN_IDS.has(n.id)) {
            relevant = true
            break
          }
        }
        // 只有我们自己的节点被删掉时才触发重渲；页面其它 DOM 变化不理，
        // 交给 rAF 合并 + reapply 的兜底路径。
      } else if (rec.type === 'attributes') {
        if (rec.target && rec.target.id && OWN_IDS.has(rec.target.id)) {
          continue // 是自己变化，忽略
        }
        relevant = true
      }
      if (relevant) break
    }
    if (!relevant) return
    if (pending) return
    pending = true
    requestAnimationFrame(() => {
      pending = false
      if (!__wmCurrentConfig) return
      const overlay = document.getElementById(WATERMARK_ID)
      const needBorder =
        __wmCurrentConfig.border && __wmCurrentConfig.border.enabled
      const border = document.getElementById(BORDER_ID)
      if (!overlay || (needBorder && !border)) {
        cleanup()
        renderConfig(__wmCurrentConfig)
      }
    })
  })

  __wmObserver.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  })
}

// ============ 事件绑定 ============

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') return
  init()
})

// background 在 top-level 加载完成（onUpdated complete）时 ping 本页重发 badge，
// 兜住"上报之后又被延迟事件清掉"的一切时序问题。
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== 'wm:request-badge') return
  try {
    if (window.top !== window) return
  } catch (_) {
    // 同 reportBadge：极端沙箱场景按顶层处理
  }
  sendBadge(
    __wmLastBadge ? __wmLastBadge.label : '',
    __wmLastBadge ? __wmLastBadge.color : '',
  )
})

// 初次运行
init()
setupObserver()