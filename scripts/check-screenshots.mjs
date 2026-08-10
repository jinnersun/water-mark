#!/usr/bin/env node
// scripts/check-screenshots.mjs
// 验证 docs/store-assets/screenshots/ 下的截图是否满足 Chrome Web Store 要求：
//   - 文件名匹配约定
//   - 尺寸精确为 1280×800 或 640×400
//   - 文件是有效 PNG
//   - 大小合理（> 5 KB 且 < 2 MB）

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'docs', 'store-assets', 'screenshots')

const REQUIRED = [
  '01-main-panel.png',
  '02-real-scenario.png',
  '03-rules-config.png',
  '04-smart-color.png',
  '05-badge.png',
]

const ALLOWED_SIZES = [[1280, 800], [640, 400]]

// 从 PNG 文件读取宽高：PNG 头部 IHDR chunk 前 24 字节
function pngSize(buf) {
  if (buf.length < 24) return null
  // 8-byte signature
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return null
  // IHDR at offset 8: length(4) + "IHDR"(4) + width(4) + height(4)
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  return { width, height }
}

let hasError = false
const report = []

for (const name of REQUIRED) {
  const p = join(OUT, name)
  const row = { name, status: 'ok', notes: [] }
  if (!existsSync(p)) {
    row.status = 'MISSING'
    row.notes.push('file not found')
    hasError = true
    report.push(row)
    continue
  }
  const buf = readFileSync(p)
  const size = pngSize(buf)
  if (!size) {
    row.status = 'FAIL'
    row.notes.push('not a valid PNG')
    hasError = true
  } else {
    row.dims = `${size.width}x${size.height}`
    const dimOk = ALLOWED_SIZES.some(([w, h]) => w === size.width && h === size.height)
    if (!dimOk) {
      row.status = 'FAIL'
      row.notes.push(`bad dimensions ${size.width}x${size.height} (need 1280x800 or 640x400)`)
      hasError = true
    }
  }
  const kb = buf.byteLength / 1024
  row.size = `${kb.toFixed(1)} KB`
  if (kb < 5) {
    row.status = 'WARN'
    row.notes.push('file suspiciously small (<5 KB)')
  } else if (kb > 2048) {
    row.status = 'WARN'
    row.notes.push('file exceeds 2 MB, may be too large for store')
  }
  report.push(row)
}

console.log('check-screenshots:')
console.log('  target:', OUT)
console.log('')
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n)
console.log(`  ${pad('file', 26)} ${pad('status', 10)} ${pad('dims', 12)} ${pad('size', 12)}`)
console.log(`  ${'-'.repeat(26)} ${'-'.repeat(10)} ${'-'.repeat(12)} ${'-'.repeat(12)}`)
for (const r of report) {
  const line = `  ${pad(r.name, 26)} ${pad(r.status, 10)} ${pad(r.dims || '-', 12)} ${pad(r.size || '-', 12)}`
  console.log(line)
  for (const n of r.notes) console.log(`    - ${n}`)
}
console.log('')
if (hasError) {
  console.log('check-screenshots: FAIL. Fix the above before submitting to Chrome Web Store.')
  process.exit(1)
} else {
  console.log('check-screenshots: OK. All screenshots pass store dimension checks.')
}
