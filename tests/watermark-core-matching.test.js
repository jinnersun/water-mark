import { test } from 'node:test'
import assert from 'node:assert/strict'
import WatermarkCore from './helpers/load-watermark-core.js'

test('parseContext normalizes hostname and parses cookie pairs', () => {
  // 锁定现有行为：小写 hostname、保留 URL 组成部分并按分号拆分 Cookie；来源 src/watermark-core.js:33-54,119-129。
  const ctx = WatermarkCore.parseContext(
    'HTTPS://WWW.Example.COM:8443/a?b=c#d',
    ' env = staging ; token=a=b ',
  )

  assert.equal(ctx.hostname, 'www.example.com')
  assert.equal(ctx.protocol, 'https:')
  assert.equal(ctx.port, '8443')
  assert.equal(ctx.pathname, '/a')
  assert.equal(ctx.search, '?b=c')
  assert.equal(ctx.hash, '#d')
  assert.deepEqual(ctx.cookies, { env: 'staging', token: 'a=b' })
})

test('parseContext rejects malformed URLs', () => {
  // 锁定现有行为：URL 解析失败返回 null 而不是抛出异常；来源 src/watermark-core.js:34-42。
  assert.equal(WatermarkCore.parseContext('not a valid url'), null)
})

test('host-exact matches normalized full hosts but not subdomains', () => {
  // 锁定现有行为：精确域名规则要求 hostname 完全相等；来源 src/watermark-core.js:142-147。
  const ctx = WatermarkCore.parseContext('https://WWW.Example.com/path')
  const rule = { type: 'host-exact', value: ' https://www.example.COM:443/ ' }

  assert.deepEqual(WatermarkCore.matchRule(rule, ctx), {
    matched: true,
    score: 1015,
  })
  assert.deepEqual(
    WatermarkCore.matchRule(
      rule,
      WatermarkCore.parseContext('https://sub.www.example.com/'),
    ),
    { matched: false, score: 0 },
  )
})

test('host-suffix accepts the base domain and dotted subdomains only', () => {
  // 锁定现有行为：后缀规则同时匹配裸域和点分隔子域，拒绝字符串后缀撞名；来源 src/watermark-core.js:148-155。
  const rule = { type: 'host-suffix', value: '.example.com' }
  const base = WatermarkCore.parseContext('https://example.com/')
  const sub = WatermarkCore.parseContext('https://a.example.com/')
  const lookalike = WatermarkCore.parseContext('https://notexample.com/')

  assert.deepEqual(WatermarkCore.matchRule(rule, base), {
    matched: true,
    score: 511,
  })
  assert.deepEqual(WatermarkCore.matchRule(rule, sub), {
    matched: true,
    score: 511,
  })
  assert.deepEqual(WatermarkCore.matchRule(rule, lookalike), {
    matched: false,
    score: 0,
  })
})

test('ip-exact requires an IPv4 URL context and exact address equality', () => {
  // 锁定现有行为：IP 精确匹配拒绝普通域名和不同地址；来源 src/watermark-core.js:156-162。
  const rule = { type: 'ip-exact', value: '192.168.1.1' }

  assert.deepEqual(
    WatermarkCore.matchRule(
      rule,
      WatermarkCore.parseContext('http://192.168.1.1:8080/'),
    ),
    { matched: true, score: 900 },
  )
  assert.deepEqual(
    WatermarkCore.matchRule(
      rule,
      WatermarkCore.parseContext('http://192.168.1.2/'),
    ),
    { matched: false, score: 0 },
  )
  assert.deepEqual(
    WatermarkCore.matchRule(
      rule,
      WatermarkCore.parseContext('http://example.com/'),
    ),
    { matched: false, score: 0 },
  )
})

test('ip-cidr applies network masks and rejects invalid addresses', () => {
  // 锁定现有行为：CIDR 按掩码匹配 IPv4，越界地址返回不匹配；来源 src/watermark-core.js:95-115,163-168。
  const rule = { type: 'ip-cidr', value: '192.168.1.0/24' }

  assert.deepEqual(
    WatermarkCore.matchRule(
      rule,
      WatermarkCore.parseContext('http://192.168.1.99/'),
    ),
    { matched: true, score: 800 },
  )
  assert.deepEqual(
    WatermarkCore.matchRule(
      rule,
      WatermarkCore.parseContext('http://192.168.2.99/'),
    ),
    { matched: false, score: 0 },
  )
  assert.deepEqual(
    WatermarkCore.matchRule(
      { type: 'ip-cidr', value: '999.1.1.1/24' },
      WatermarkCore.parseContext('http://192.168.1.99/'),
    ),
    { matched: false, score: 0 },
  )
})

test('url-regex matches href and reports invalid or unsafe patterns', () => {
  // 锁定现有行为：正则匹配完整 href，非法/嵌套量词/超长表达式返回具体原因；来源 src/watermark-core.js:169-187,223-228。
  const ctx = WatermarkCore.parseContext('https://example.com/orders?id=42')

  assert.deepEqual(
    WatermarkCore.matchRule(
      { type: 'url-regex', value: '^https://example\\.com/orders\\?id=\\d+$' },
      ctx,
    ),
    { matched: true, score: 737 },
  )
  assert.deepEqual(
    WatermarkCore.matchRule({ type: 'url-regex', value: '[' }, ctx),
    { matched: false, score: 0, reason: 'invalid-regex' },
  )
  assert.deepEqual(
    WatermarkCore.matchRule({ type: 'url-regex', value: '(a+)+' }, ctx),
    { matched: false, score: 0, reason: 'regex-unsafe' },
  )
  assert.deepEqual(
    WatermarkCore.matchRule(
      { type: 'url-regex', value: 'a'.repeat(WatermarkCore.MAX_REGEX_SOURCE + 1) },
      ctx,
    ),
    { matched: false, score: 0, reason: 'regex-too-long' },
  )
})

test('cookie rules distinguish presence, exact value, and fragment matching', () => {
  // 锁定现有行为：Cookie 的三种运算符分别判断存在、全等、包含；来源 src/watermark-core.js:188-213。
  const ctx = WatermarkCore.parseContext(
    'https://example.com/',
    'env=staging; session=abc123; empty=',
  )

  assert.deepEqual(
    WatermarkCore.matchRule({ type: 'cookie', value: 'session' }, ctx),
    { matched: true, score: 557 },
  )
  assert.deepEqual(
    WatermarkCore.matchRule({ type: 'cookie', value: 'env=staging' }, ctx),
    { matched: true, score: 653 },
  )
  assert.deepEqual(
    WatermarkCore.matchRule({ type: 'cookie', value: 'session~=c12' }, ctx),
    { matched: true, score: 607 },
  )
  assert.deepEqual(
    WatermarkCore.matchRule({ type: 'cookie', value: 'env=stage' }, ctx),
    { matched: false, score: 0 },
  )
  assert.deepEqual(
    WatermarkCore.matchRule({ type: 'cookie', value: 'session~=xyz' }, ctx),
    { matched: false, score: 0 },
  )
})
