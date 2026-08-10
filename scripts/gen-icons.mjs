#!/usr/bin/env node
// scripts/gen-icons.mjs
// 将 src/icons/source/*.svg 光栅化为多尺寸 PNG。
// 依赖：@resvg/resvg-js（纯 WASM，跨平台无 native 编译）。
//
// 用法：
//   node scripts/gen-icons.mjs                # 生成默认尺寸
//   node scripts/gen-icons.mjs --sizes=16,48,128,512  # 指定尺寸
//
// 特殊约定：
//   - 16 尺寸使用 icon-16.svg（pixel-hinted），其余用 icon.svg。
//   - 512 / 1024 用于商店主图 / 未来 Retina 场景，不自动装进扩展。
//
// 输出：src/icons/icon<SIZE>.png

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC_DIR = join(ROOT, 'src', 'icons', 'source')
const OUT_DIR = join(ROOT, 'src', 'icons')

const DEFAULT_SIZES = [16, 48, 128]
const STORE_SIZES = [512, 1024] // 仅当 --with-store 时导出

const argv = process.argv.slice(2)
const withStore = argv.includes('--with-store')
const sizesArg = argv.find((a) => a.startsWith('--sizes='))
const sizes = sizesArg
  ? sizesArg.slice('--sizes='.length).split(',').map((n) => Number.parseInt(n, 10)).filter(Boolean)
  : withStore
    ? [...DEFAULT_SIZES, ...STORE_SIZES]
    : DEFAULT_SIZES

const readSvg = (name) => {
  const p = join(SRC_DIR, name)
  if (!existsSync(p)) throw new Error(`missing svg source: ${p}`)
  return readFileSync(p, 'utf8')
}

const svgMain = readSvg('icon.svg')
const svg16 = readSvg('icon-16.svg')

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const render = (svg, size) => {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
    // 抗锯齿由 resvg 默认开启；对 16px 版本我们用 shape-rendering=crispEdges 抵消
    shapeRendering: 2, // geometricPrecision
    textRendering: 1,
    imageRendering: 0,
  })
  return resvg.render().asPng()
}

let ok = 0
for (const size of sizes) {
  const svg = size <= 20 ? svg16 : svgMain
  const png = render(svg, size)
  const out = join(OUT_DIR, `icon${size}.png`)
  writeFileSync(out, png)
  const kb = (png.byteLength / 1024).toFixed(1)
  console.log(`  wrote icon${size}.png  (${kb} KB)`)
  ok += 1
}

console.log(`gen-icons: ${ok} file(s) written to ${OUT_DIR}`)
