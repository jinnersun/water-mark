#!/usr/bin/env node
// scripts/fix-screenshots.mjs
// 把 docs/store-assets/screenshots/ 下与 1280×800 差几像素的 PNG
// 强制调整为精确 1280×800：多出来裁掉、缺的补白。
//
// 用法：node scripts/fix-screenshots.mjs
//
// 依赖：pngjs（纯 JS 解 PNG，跨平台无 native 编译）

import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(__dirname, '..', 'docs', 'store-assets', 'screenshots')

const TARGET_W = 1280
const TARGET_H = 800
const FILES = [
  '01-main-panel.png',
  '02-real-scenario.png',
  '03-rules-config.png',
  '04-smart-color.png',
  '05-badge.png',
]

function fitTo(src, tw, th, bg = [255, 255, 255, 255]) {
  const dst = new PNG({ width: tw, height: th, filterType: -1 })
  // 填背景
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const i = (y * tw + x) * 4
      dst.data[i] = bg[0]
      dst.data[i + 1] = bg[1]
      dst.data[i + 2] = bg[2]
      dst.data[i + 3] = bg[3]
    }
  }
  // 居中拷贝：源比目标大→从中间裁；源比目标小→居中贴
  const copyW = Math.min(src.width, tw)
  const copyH = Math.min(src.height, th)
  const srcX = Math.floor((src.width - copyW) / 2)
  const srcY = Math.floor((src.height - copyH) / 2)
  const dstX = Math.floor((tw - copyW) / 2)
  const dstY = Math.floor((th - copyH) / 2)
  for (let y = 0; y < copyH; y++) {
    for (let x = 0; x < copyW; x++) {
      const si = ((srcY + y) * src.width + (srcX + x)) * 4
      const di = ((dstY + y) * tw + (dstX + x)) * 4
      dst.data[di] = src.data[si]
      dst.data[di + 1] = src.data[si + 1]
      dst.data[di + 2] = src.data[si + 2]
      dst.data[di + 3] = src.data[si + 3]
    }
  }
  return PNG.sync.write(dst)
}

let fixed = 0
let skipped = 0
for (const name of FILES) {
  const p = join(DIR, name)
  if (!existsSync(p)) { console.log(`  ${name}: SKIP (missing)`); skipped++; continue }
  const buf = readFileSync(p)
  const png = PNG.sync.read(buf)
  if (png.width === TARGET_W && png.height === TARGET_H) {
    console.log(`  ${name}: OK ${png.width}x${png.height}`)
    continue
  }
  const out = fitTo(png, TARGET_W, TARGET_H)
  writeFileSync(p, out)
  console.log(`  ${name}: fixed ${png.width}x${png.height} -> ${TARGET_W}x${TARGET_H}`)
  fixed++
}
console.log(`fix-screenshots: ${fixed} fixed, ${skipped} skipped`)
