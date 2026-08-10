#!/usr/bin/env node
// scripts/gen-promo.mjs
// 生成 Chrome Web Store 用的两个宣传图（promo tiles）：
//   - promo-440x280.png  (Small promo tile)
//   - promo-1400x560.png (Marquee promo tile)
//
// 主视觉基于 src/icons/source/icon.svg 的品牌色（蓝 + 白色 W + 三色环境条），
// 通过 SVG 拼装 → @resvg/resvg-js 光栅化输出 PNG。
//
// 用法：node scripts/gen-promo.mjs
// 依赖：@resvg/resvg-js

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'docs', 'store-assets')

// ============ 品牌常量（跟 src/icons/source/icon.svg 一致） ============
const BRAND = {
  bg1: '#1e3a8a',
  bg2: '#2563eb',
  accent: '#60a5fa',
  white: '#ffffff',
  prod: '#ef4444',
  pre: '#f59e0b',
  test: '#10b981',
  admin: '#8b5cf6',
  ink: '#0f172a',
  mute: '#94a3b8',
}

// ============ 复用图标主体（W stamp） ============
function stampGroup(size, cx, cy) {
  const r = size * 0.16
  const w = size
  const half = w / 2
  const strokeW = size * 0.09
  // W 折线相对 (cx, cy) 中心：宽 0.6w、高 0.5w
  const bw = size * 0.6
  const bh = size * 0.5
  const p = (dx, dy) => `${(cx + dx).toFixed(2)},${(cy + dy).toFixed(2)}`
  const wpath = [
    p(-bw / 2, -bh / 2),
    p(-bw / 4, bh / 2),
    p(0, -bh / 8),
    p(bw / 4, bh / 2),
    p(bw / 2, -bh / 2),
  ].join(' L ')

  // 三色条
  const barY = cy + bh / 2 + size * 0.08
  const barW = size * 0.18
  const barH = size * 0.06
  const barR = barH / 2
  const barGap = size * 0.03
  const totalBarW = barW * 3 + barGap * 2
  const bar0x = cx - totalBarW / 2

  return `
    <rect x="${cx - half}" y="${cy - half}" width="${w}" height="${w}" rx="${r}" ry="${r}" fill="url(#stampGrad)"/>
    <rect x="${cx - half + 1}" y="${cy - half + 1}" width="${w - 2}" height="${w - 2}" rx="${r - 1}" ry="${r - 1}" fill="none" stroke="#0b1e57" stroke-opacity="0.35" stroke-width="1"/>
    <path d="M ${wpath}" fill="none" stroke="${BRAND.white}" stroke-width="${strokeW}" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="${bar0x}" y="${barY}" width="${barW}" height="${barH}" rx="${barR}" fill="${BRAND.prod}"/>
    <rect x="${bar0x + barW + barGap}" y="${barY}" width="${barW}" height="${barH}" rx="${barR}" fill="${BRAND.pre}"/>
    <rect x="${bar0x + (barW + barGap) * 2}" y="${barY}" width="${barW}" height="${barH}" rx="${barR}" fill="${BRAND.test}"/>
  `
}

// ============ Small promo 440×280 ============
// 布局：左侧图标（占 40%），右侧标题 + 副标题 + 三色小 badge
function smallPromo() {
  const W = 440, H = 280
  const iconSize = 128
  const iconCx = 100
  const iconCy = H / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
      <linearGradient id="stampGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${BRAND.bg2}"/>
        <stop offset="100%" stop-color="${BRAND.bg1}"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#1e3a8a" flood-opacity="0.25"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>

    <!-- Icon -->
    <g filter="url(#shadow)">
      ${stampGroup(iconSize, iconCx, iconCy)}
    </g>

    <!-- Text block -->
    <g font-family="-apple-system, 'Segoe UI', sans-serif">
      <text x="196" y="118" font-size="26" font-weight="700" fill="${BRAND.ink}" letter-spacing="-0.5">Env Watermark</text>
      <text x="196" y="146" font-size="13" font-weight="500" fill="#475569">Never mistake prod for test</text>

      <!-- three env pills -->
      <g transform="translate(196, 168)">
        <rect x="0"  y="0" width="52" height="22" rx="11" fill="${BRAND.prod}"/>
        <text x="26" y="15" font-size="11" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="0.5">PROD</text>

        <rect x="60" y="0" width="52" height="22" rx="11" fill="${BRAND.pre}"/>
        <text x="86" y="15" font-size="11" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="0.5">PRE</text>

        <rect x="120" y="0" width="52" height="22" rx="11" fill="${BRAND.test}"/>
        <text x="146" y="15" font-size="11" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="0.5">TEST</text>
      </g>

      <text x="196" y="216" font-size="11" fill="${BRAND.mute}">host · URL · IP · cookie</text>
    </g>
  </svg>`
}

// ============ Marquee promo 1400×560 ============
// 布局：左侧巨大品牌区（图标 + 大标题 + 副标题 + CTA），右侧模拟浏览器工具栏 + 徽章
function marqueePromo() {
  const W = 1400, H = 560
  const iconSize = 200
  const iconCx = 200
  const iconCy = H / 2 - 40

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#dbeafe"/>
      </linearGradient>
      <linearGradient id="stampGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${BRAND.bg2}"/>
        <stop offset="100%" stop-color="${BRAND.bg1}"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#1e3a8a" flood-opacity="0.28"/>
      </filter>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.08"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>

    <!-- ambient dots -->
    <circle cx="1180" cy="80" r="4" fill="${BRAND.accent}" opacity="0.4"/>
    <circle cx="1280" cy="480" r="6" fill="${BRAND.prod}" opacity="0.3"/>
    <circle cx="80" cy="480" r="5" fill="${BRAND.test}" opacity="0.35"/>

    <!-- LEFT: Icon + copy -->
    <g filter="url(#shadow)">
      ${stampGroup(iconSize, iconCx, iconCy)}
    </g>

    <g font-family="-apple-system, 'Segoe UI', sans-serif">
      <text x="340" y="200" font-size="56" font-weight="800" fill="${BRAND.ink}" letter-spacing="-1.5">Env Watermark</text>
      <text x="340" y="248" font-size="22" font-weight="500" fill="#334155">Rule-based watermarks by host, URL, IP, or cookie</text>
      <text x="340" y="284" font-size="18" fill="#64748b">Never mistake prod for staging again</text>

      <!-- three env pills -->
      <g transform="translate(340, 320)">
        <rect x="0"   y="0" width="90" height="34" rx="17" fill="${BRAND.prod}"/>
        <text x="45"  y="22" font-size="15" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="1">PROD</text>

        <rect x="100" y="0" width="90" height="34" rx="17" fill="${BRAND.pre}"/>
        <text x="145" y="22" font-size="15" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="1">PRE</text>

        <rect x="200" y="0" width="90" height="34" rx="17" fill="${BRAND.test}"/>
        <text x="245" y="22" font-size="15" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="1">TEST</text>

        <rect x="300" y="0" width="110" height="34" rx="17" fill="${BRAND.admin}"/>
        <text x="355" y="22" font-size="15" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="1">ADMIN</text>
      </g>
    </g>

    <!-- RIGHT: Simulated browser toolbar with our badge -->
    <g transform="translate(880, 180)" filter="url(#softShadow)">
      <rect x="0" y="0" width="460" height="220" rx="16" fill="#fff" stroke="#e2e8f0"/>

      <!-- traffic lights -->
      <circle cx="24" cy="30" r="6" fill="#ef4444"/>
      <circle cx="44" cy="30" r="6" fill="#f59e0b"/>
      <circle cx="64" cy="30" r="6" fill="#10b981"/>

      <!-- address bar -->
      <rect x="90" y="20" width="280" height="24" rx="12" fill="#f1f5f9"/>
      <text x="104" y="37" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="11" fill="#475569">app.example.com/admin</text>

      <!-- ext tray divider -->
      <line x1="382" y1="12" x2="382" y2="48" stroke="#e2e8f0"/>

      <!-- puzzle placeholder icon -->
      <rect x="392" y="18" width="24" height="24" rx="4" fill="#f1f5f9"/>
      <text x="404" y="35" font-size="11" fill="#94a3b8" text-anchor="middle">◆</text>

      <!-- our icon + badge (miniature stamp, using stampGroup 26px) -->
      <g transform="translate(432, 30)">
        ${stampGroup(24, 0, 0)}
        <rect x="9" y="9" width="26" height="12" rx="3" fill="#ef4444"/>
        <text x="22" y="19" font-size="9" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="0.5">PROD</text>
      </g>

      <!-- dashboard content -->
      <g transform="translate(24, 68)">
        <rect x="0" y="0" width="130" height="60" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
        <text x="12" y="20" font-family="-apple-system, sans-serif" font-size="10" fill="#64748b">Active Users</text>
        <text x="12" y="46" font-family="-apple-system, sans-serif" font-size="22" font-weight="700" fill="#10b981">12,847</text>

        <rect x="145" y="0" width="130" height="60" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
        <text x="157" y="20" font-family="-apple-system, sans-serif" font-size="10" fill="#64748b">Requests</text>
        <text x="157" y="46" font-family="-apple-system, sans-serif" font-size="22" font-weight="700" fill="#3b82f6">2.84M</text>

        <rect x="290" y="0" width="130" height="60" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
        <text x="302" y="20" font-family="-apple-system, sans-serif" font-size="10" fill="#64748b">Error Rate</text>
        <text x="302" y="46" font-family="-apple-system, sans-serif" font-size="22" font-weight="700" fill="#f59e0b">0.03%</text>
      </g>

      <!-- watermark overlay hint -->
      <g transform="translate(230, 175) rotate(-22)" opacity="0.35">
        <text font-family="-apple-system, sans-serif" font-size="24" font-weight="700" fill="#ef4444" text-anchor="middle">PRODUCTION</text>
      </g>
    </g>

    <!-- callout arrow pointing to badge -->
    <g stroke="#ef4444" stroke-width="2" fill="none" opacity="0.7">
      <path d="M 1300 240 Q 1330 220 1345 200" stroke-linecap="round"/>
      <path d="M 1340 195 L 1345 200 L 1340 208" stroke-linejoin="round" stroke-linecap="round"/>
    </g>
    <text x="1180" y="150" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#ef4444">Toolbar badge shows current env</text>
  </svg>`
}

// ============ 光栅化 ============
function renderPng(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(255,255,255,1)',
    shapeRendering: 2,
    textRendering: 1,
    imageRendering: 0,
    font: {
      loadSystemFonts: true,
    },
  })
  return resvg.render().asPng()
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const targets = [
  { name: 'promo-440x280.png',   svg: smallPromo(),   width: 440 },
  { name: 'promo-1400x560.png',  svg: marqueePromo(), width: 1400 },
]
for (const t of targets) {
  const png = renderPng(t.svg, t.width)
  writeFileSync(join(OUT, t.name), png)
  console.log(`  wrote ${t.name}  (${(png.byteLength/1024).toFixed(1)} KB)`)
}
console.log('gen-promo: done')
