import { test } from 'node:test'
import assert from 'node:assert/strict'
import WatermarkCore from './helpers/load-watermark-core.js'

test('findMatches skips disabled configs and sorts each best rule by score', () => {
  // 锁定现有行为：禁用配置被排除，每个配置只保留最高分规则，结果按分数降序；来源 src/watermark-core.js:237-253。
  const exact = {
    name: 'exact',
    enabled: true,
    rules: [
      { type: 'host-suffix', value: 'example.com' },
      { type: 'host-exact', value: 'example.com' },
    ],
  }
  const suffix = {
    name: 'suffix',
    rules: [{ type: 'host-suffix', value: 'example.com' }],
  }
  const disabled = {
    name: 'disabled',
    enabled: false,
    rules: [{ type: 'host-exact', value: 'example.com' }],
  }
  const ctx = WatermarkCore.parseContext('https://example.com/')

  const matches = WatermarkCore.findMatches([suffix, disabled, exact], ctx)

  assert.deepEqual(
    matches.map(({ config, rule, score }) => ({ name: config.name, rule, score })),
    [
      {
        name: 'exact',
        rule: { type: 'host-exact', value: 'example.com' },
        score: 1011,
      },
      {
        name: 'suffix',
        rule: { type: 'host-suffix', value: 'example.com' },
        score: 511,
      },
    ],
  )
})

test('makeDefaultConfig keeps the supplied id and published defaults', () => {
  // 锁定现有行为：显式 id 被保留，水印、边框、鼠标渐隐配置使用既有默认值；来源 src/watermark-core.js:339-355。
  assert.deepEqual(WatermarkCore.makeDefaultConfig('baseline-id'), {
    id: 'baseline-id',
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
})

test('clamp enforces configured numeric limits and handles invalid input', () => {
  // 锁定现有行为：数值按各字段上下限截断，非有限数取下限，未知字段原样返回；来源 src/watermark-core.js:359-374。
  assert.equal(WatermarkCore.clamp('fontSize', 5), 10)
  assert.equal(WatermarkCore.clamp('fontSize', 90), 80)
  assert.equal(WatermarkCore.clamp('density', 100), 120)
  assert.equal(WatermarkCore.clamp('density', 700), 600)
  assert.equal(WatermarkCore.clamp('opacity', 0), 0.01)
  assert.equal(WatermarkCore.clamp('opacity', '0.5'), 0.5)
  assert.equal(WatermarkCore.clamp('rotation', -190), -180)
  assert.equal(WatermarkCore.clamp('rotation', 190), 180)
  assert.equal(WatermarkCore.clamp('resumeDelay', 'not-a-number'), 300)
  assert.equal(WatermarkCore.clamp('unknown', 42), 42)
})

test('shortLabelOf truncates ASCII and CJK labels by display units', () => {
  // 锁定现有行为：badge 标签最多 4 个宽度单位，非 ASCII 占 2 个单位且短标签优先；来源 src/watermark-core.js:304-325。
  assert.equal(WatermarkCore.shortLabelOf({ shortLabel: ' STAGE ', name: 'fallback' }), 'STAG')
  assert.equal(WatermarkCore.shortLabelOf({ name: '测试环境' }), '测试')
  assert.equal(WatermarkCore.shortLabelOf({ name: 'A测B' }), 'A测B')
  assert.equal(WatermarkCore.shortLabelOf(null), '')
})

test('resolveBadgeColor follows border, watermark, then fallback priority', () => {
  // 锁定现有行为：badge 背景色依次取边框色、水印色、红色兜底；来源 src/watermark-core.js:328-335。
  assert.equal(
    WatermarkCore.resolveBadgeColor({
      color: '#00ff00',
      border: { color: '#0000ff' },
    }),
    '#0000ff',
  )
  assert.equal(WatermarkCore.resolveBadgeColor({ color: '#00ff00' }), '#00ff00')
  assert.equal(WatermarkCore.resolveBadgeColor({}), '#ef4444')
})

test('buildTile returns null without text or a browser document', () => {
  // 锁定现有行为：空文本或无 DOM 环境不生成水印 tile；来源 src/watermark-core.js:260-272。
  assert.equal(WatermarkCore.buildTile({ text: '' }), null)
  assert.equal(WatermarkCore.buildTile({ text: 'STAGING' }), null)
})
