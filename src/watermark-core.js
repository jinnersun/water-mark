// watermark-core.js
// 无副作用的核心逻辑：URL 解析、规则匹配、水印图片生成。
// 同时在 content script（注入水印）和 options 页（URL 测试 / 实时预览）中复用。
//
// 一条 rule 的形态：
//   { type: 'host-exact' | 'host-suffix' | 'url-regex' | 'ip-exact' | 'ip-cidr' | 'cookie',
//     value: string,
//     // cookie 专用：value 形如 "name=value" / "name~=fragment" / "name"
//   }
//
// 一条 config 的形态：
//   {
//     id, name, enabled,
//     rules: [rule, ...],
//     text, color, opacity, density, fontSize, rotation,
//     smartColor: boolean,               // 智能对比色
//     smartColorTone: 'light' | 'dark',  // 智能对比色基调
//     border: { enabled, color, width }, // 沉浸式边框
//     mouseFade: { enabled, fadeOpacity, resumeDelay },
//   }

;(function (global) {
  const WatermarkCore = {}

  // ============ 常量 ============

  // 正则规则的 value 最大长度上限（防 ReDoS 病态正则拖死主线程）
  const MAX_REGEX_SOURCE = 200

  // ============ URL / 上下文解析 ============

  // 从 Location 或字符串生成一个统一的匹配上下文
  WatermarkCore.parseContext = (input, cookieStr = '') => {
    let url
    try {
      url =
        typeof input === 'string'
          ? new URL(input)
          : new URL(input.href || String(input))
    } catch (e) {
      return null
    }
    const hostname = (url.hostname || '').toLowerCase()
    return {
      href: url.href,
      protocol: url.protocol,
      hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      isIP: isIP(hostname),
      cookies: parseCookies(cookieStr),
    }
  }

  // ============ IP 工具 ============

  const isIPv4 = (s) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s)
  const isIP = (s) => isIPv4(s) // IPv6 暂不处理

  // 从任意用户输入（可能是完整 URL / 带端口 / 前后空格 / 大小写混杂）
  // 提取出干净的 hostname 部分。
  //  - 传 'https://www.google.com/foo?a=b' → 'www.google.com'
  //  - 传 'WWW.Google.COM/'                 → 'www.google.com'
  //  - 传 'www.google.com:8080'             → 'www.google.com'
  //  - 传 '  test.app.example.com  '        → 'test.app.example.com'
  //  - 传 '192.168.1.1/24' → 返回原字符串（CIDR 场景由调用方判断）
  //  - 无法解析时返回 trim() 后的原字符串
  const sanitizeHostValue = (raw) => {
    if (raw == null) return ''
    let v = String(raw).trim()
    if (!v) return ''
    // 明显是 CIDR，别用 URL 解析，保留原样
    if (/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(v)) return v
    // 显式带 scheme：直接 new URL
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) {
      try {
        const u = new URL(v)
        return (u.hostname || '').toLowerCase()
      } catch (_) { /* fallthrough */ }
    }
    // 没 scheme 但形如 host[:port][/path]：套一个 http:// 再解析
    if (/^[^\s\/]+(:\d+)?(\/|$)/.test(v)) {
      try {
        const u = new URL('http://' + v)
        return (u.hostname || '').toLowerCase()
      } catch (_) { /* fallthrough */ }
    }
    // 去除首尾多余的点 / 斜杠 / 空格
    return v.replace(/^[\.\/\s]+|[\.\/\s]+$/g, '').toLowerCase()
  }


  const ipv4ToInt = (ip) => {
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255))
      return null
    return (
      ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
    )
  }

  const cidrMatch = (ip, cidr) => {
    if (!isIPv4(ip)) return false
    const [subnet, bitsStr] = cidr.split('/')
    const bits = parseInt(bitsStr, 10)
    if (!isIPv4(subnet) || isNaN(bits) || bits < 0 || bits > 32) return false
    const ipInt = ipv4ToInt(ip)
    const subInt = ipv4ToInt(subnet)
    if (ipInt === null || subInt === null) return false
    if (bits === 0) return true
    const mask = (0xffffffff << (32 - bits)) >>> 0
    return (ipInt & mask) === (subInt & mask)
  }

  // ============ Cookie 工具 ============

  const parseCookies = (cookieStr) => {
    const map = {}
    if (!cookieStr) return map
    cookieStr.split(';').forEach((part) => {
      const eq = part.indexOf('=')
      if (eq === -1) return
      const k = part.slice(0, eq).trim()
      const v = part.slice(eq + 1).trim()
      if (k) map[k] = v
    })
    return map
  }

  // ============ 规则匹配 ============

  // 返回：{ matched: boolean, score: number, reason?: string }
  // score 越大越精准（用于多规则并存时选最精准的一条）
  const matchRule = (rule, ctx) => {
    if (!rule || !rule.type || !rule.value) return { matched: false, score: 0 }
    const value = String(rule.value).trim()
    if (!value) return { matched: false, score: 0 }

    switch (rule.type) {
      case 'host-exact': {
        const target = sanitizeHostValue(value)
        return ctx.hostname === target
          ? { matched: true, score: 1000 + target.length }
          : { matched: false, score: 0 }
      }
      case 'host-suffix': {
        const target = sanitizeHostValue(value).replace(/^\./, '')
        const hit =
          ctx.hostname === target || ctx.hostname.endsWith('.' + target)
        return hit
          ? { matched: true, score: 500 + target.length }
          : { matched: false, score: 0 }
      }
      case 'ip-exact': {
        if (!ctx.isIP) return { matched: false, score: 0 }
        const target = sanitizeHostValue(value)
        return ctx.hostname === target
          ? { matched: true, score: 900 }
          : { matched: false, score: 0 }
      }
      case 'ip-cidr': {
        if (!ctx.isIP) return { matched: false, score: 0 }
        return cidrMatch(ctx.hostname, sanitizeHostValue(value))
          ? { matched: true, score: 800 }
          : { matched: false, score: 0 }
      }
      case 'url-regex': {
        // 病态正则可能导致主线程卡死（ReDoS），做双重保护：
        //   1) 拒绝超长 source
        //   2) 拒绝明显危险的嵌套量词模式，例如 (a+)+ / (a*)* / (a+)*
        if (value.length > MAX_REGEX_SOURCE) {
          return { matched: false, score: 0, reason: 'regex-too-long' }
        }
        if (isDangerousRegex(value)) {
          return { matched: false, score: 0, reason: 'regex-unsafe' }
        }
        try {
          const re = new RegExp(value)
          return re.test(ctx.href)
            ? { matched: true, score: 700 + Math.min(value.length, 100) }
            : { matched: false, score: 0 }
        } catch (e) {
          return { matched: false, score: 0, reason: 'invalid-regex' }
        }
      }
      case 'cookie': {
        // 形式：
        //   "name"            只判断存在
        //   "name=value"      判断相等
        //   "name~=fragment"  判断包含
        const tilde = value.indexOf('~=')
        const eq = value.indexOf('=')
        if (tilde !== -1) {
          const k = value.slice(0, tilde).trim()
          const v = value.slice(tilde + 2).trim()
          const got = ctx.cookies[k]
          return got !== undefined && got.includes(v)
            ? { matched: true, score: 600 + k.length }
            : { matched: false, score: 0 }
        } else if (eq !== -1) {
          const k = value.slice(0, eq).trim()
          const v = value.slice(eq + 1).trim()
          return ctx.cookies[k] === v
            ? { matched: true, score: 650 + k.length }
            : { matched: false, score: 0 }
        } else {
          const k = value.trim()
          return ctx.cookies[k] !== undefined
            ? { matched: true, score: 550 + k.length }
            : { matched: false, score: 0 }
        }
      }
      default:
        return { matched: false, score: 0 }
    }
  }

  // 危险正则的启发式判断：嵌套量词模式（catastrophic backtracking 的经典触发条件）
  //   例如：(a+)+  (.*)+  (\w*)*  (x+x+)+
  // 无法百分百覆盖所有 ReDoS，但能挡住大多数用户手滑写出来的病态正则。
  const isDangerousRegex = (src) => {
    // 匹配 "分组 + 量词 + 分组外量词" 结构
    // 例：(a+)+, (a*)*, (a+)*, (a*)+
    const nestedQuantifier = /\([^()]*[+*][^()]*\)[+*]/
    return nestedQuantifier.test(src)
  }

  WatermarkCore.matchRule = matchRule
  WatermarkCore.sanitizeHostValue = sanitizeHostValue
  WatermarkCore.MAX_REGEX_SOURCE = MAX_REGEX_SOURCE
  WatermarkCore.isDangerousRegex = isDangerousRegex

  // 对所有配置做匹配，返回排序后的命中列表
  // 返回：[{ config, rule, score }]
  WatermarkCore.findMatches = (configs, ctx) => {
    if (!ctx) return []
    const matches = []
    ;(configs || []).forEach((config) => {
      if (config.enabled === false) return
      const rules = Array.isArray(config.rules) ? config.rules : []
      let best = null
      rules.forEach((rule) => {
        const r = matchRule(rule, ctx)
        if (r.matched && (!best || r.score > best.score)) {
          best = { config, rule, score: r.score }
        }
      })
      if (best) matches.push(best)
    })
    matches.sort((a, b) => b.score - a.score)
    return matches
  }

  // ============ 水印图片生成 ============

  // 生成一张平铺水印 tile 的 dataURL
  // options: { text, color, opacity, density, fontSize, rotation, fontFamily }
  WatermarkCore.buildTile = (options) => {
    const {
      text,
      color = '#000000',
      opacity = 0.15,
      density = 300,
      fontSize = 20,
      rotation = -45,
      fontFamily = "'Microsoft YaHei', 'PingFang SC', 'Segoe UI', sans-serif",
    } = options
    if (!text) return null
    if (typeof document === 'undefined') return null // 仅在有 DOM 的环境使用

    const gap = Math.max(50, parseInt(density, 10) || 300)
    const dpr = Math.min(
      2,
      (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1,
    )
    const canvas = document.createElement('canvas')
    canvas.width = gap * dpr
    canvas.height = gap * dpr

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.fillStyle = color
    ctx.globalAlpha = parseFloat(opacity)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.translate(gap / 2, gap / 2)
    ctx.rotate((rotation * Math.PI) / 180)

    // 支持 \n 换行
    const lines = String(text).split('\n')
    const lineHeight = fontSize * 1.2
    const startY = -((lines.length - 1) * lineHeight) / 2
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, startY + i * lineHeight)
    })

    return { dataURL: canvas.toDataURL('image/png'), size: gap }
  }

  // ============ 默认配置 ============

  WatermarkCore.makeDefaultConfig = (id) => ({
    id: id || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: '',
    shortLabel: '',
    enabled: true,
    rules: [{ type: 'host-exact', value: '' }],
    text: '',
    color: '#ff0000',
    opacity: 0.15,
    density: 300,
    fontSize: 24,
    rotation: -30,
    smartColor: false,
    smartColorTone: 'light',
    border: { enabled: false, color: '#ef4444', width: 4 },
    mouseFade: { enabled: false, fadeOpacity: 0.03, resumeDelay: 2000 },
  })

  // ============ 数值 clamp（供导入等使用） ============

  WatermarkCore.CLAMP = {
    fontSize: [10, 80],
    density: [120, 600],
    opacity: [0.01, 1],
    rotation: [-180, 180],
    borderWidth: [1, 12],
    fadeOpacity: [0, 0.5],
    resumeDelay: [300, 8000],
  }
  WatermarkCore.clamp = (name, v) => {
    const range = WatermarkCore.CLAMP[name]
    if (!range) return v
    const num = Number(v)
    if (!isFinite(num)) return range[0]
    return Math.max(range[0], Math.min(range[1], num))
  }

  // 供外部使用
  global.WatermarkCore = WatermarkCore
})(typeof window !== 'undefined' ? window : self)