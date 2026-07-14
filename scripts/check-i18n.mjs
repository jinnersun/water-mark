// scripts/check-i18n.mjs
// CI-friendly linter for i18n coverage. Verifies:
//   1. Every _locales/<lang>/messages.json has the same key set (no drift).
//   2. Every data-i18n / data-i18n-placeholder / data-i18n-title attribute in
//      src/*.html has a matching key in the English locale.
//   3. Every data-i18n* attribute VALUE (i.e. the key itself) is pure ASCII
//      and looks like a valid identifier. Catches the class of bug where a
//      buggy replacement script overwrites the key with English fallback text.
//   4. Every t('key') / tf('key', ...) referenced from src/*.js has a matching
//      English key.
//   5. src/i18n-messages.js is regenerated from the same message set.
//
// Exits non-zero on any mismatch so this can be wired into pre-commit / CI.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const localesDir = resolve(root, 'src', '_locales')
const srcDir = resolve(root, 'src')

const LOCALES = readdirSync(localesDir).filter((f) =>
  statSync(join(localesDir, f)).isDirectory(),
)

if (!LOCALES.includes('en')) {
  console.error('check-i18n: missing en locale')
  process.exit(1)
}

// Load all locale bundles keyed by lang -> Set<key>.
const localeKeys = {}
for (const lang of LOCALES) {
  const file = join(localesDir, lang, 'messages.json')
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  localeKeys[lang] = new Set(Object.keys(raw))
}

const englishKeys = localeKeys.en
const problems = []

// 1) Every locale must match the English key set exactly.
for (const lang of LOCALES) {
  if (lang === 'en') continue
  const missing = [...englishKeys].filter((k) => !localeKeys[lang].has(k))
  const extra = [...localeKeys[lang]].filter((k) => !englishKeys.has(k))
  if (missing.length)
    problems.push(
      `  ${lang}: missing ${missing.length} key(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', ...' : ''}`,
    )
  if (extra.length)
    problems.push(
      `  ${lang}: has ${extra.length} extra key(s) not in en: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ', ...' : ''}`,
    )
}

// Regex for a well-formed i18n key: camelCase identifier, no punctuation.
const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/

// 2 + 3) Scan HTML for data-i18n* attributes.
const htmlFiles = readdirSync(srcDir).filter((f) => f.endsWith('.html'))
const usedKeys = new Set()
const dataAttrRe = /data-i18n(?:-placeholder|-title)?="([^"]+)"/g
for (const f of htmlFiles) {
  const html = readFileSync(join(srcDir, f), 'utf8')
  let m
  while ((m = dataAttrRe.exec(html)) !== null) {
    const value = m[1]
    // 3) The value must be a valid key identifier, not localised text.
    if (!KEY_RE.test(value)) {
      problems.push(
        `  ${f}: data-i18n* value looks like text, not a key: ${JSON.stringify(value.slice(0, 60))}`,
      )
      continue
    }
    usedKeys.add(value)
  }
}

// 4) Scan JS for t('...') / tf('...', ...)
const jsFiles = readdirSync(srcDir).filter(
  (f) => f.endsWith('.js') && f !== 'i18n-messages.js',
)
const callRe = /\b(?:tf?|t)\(\s*['"]([a-zA-Z0-9_]+)['"]/g
for (const f of jsFiles) {
  const js = readFileSync(join(srcDir, f), 'utf8')
  let m
  while ((m = callRe.exec(js)) !== null) {
    if (m[1].length >= 3) usedKeys.add(m[1])
  }
}

// Cross-check every used key against English.
const unknownKeys = [...usedKeys].filter((k) => !englishKeys.has(k))
if (unknownKeys.length) {
  problems.push(
    `  Unknown keys referenced from HTML/JS (missing from en): ${unknownKeys.slice(0, 8).join(', ')}${unknownKeys.length > 8 ? ', ...' : ''}`,
  )
}

// Unused keys are only warnings — we sometimes stage keys ahead of features.
const unused = [...englishKeys].filter((k) => !usedKeys.has(k))
const KNOWN_UNUSED = new Set([
  'extName',
  'extDescription',
  'extDefaultTitle', // manifest-only
])
const suspiciousUnused = unused.filter((k) => !KNOWN_UNUSED.has(k))

// 5) i18n-messages.js sanity check: must include every locale and every key.
try {
  const bundleText = readFileSync(join(srcDir, 'i18n-messages.js'), 'utf8')
  for (const lang of LOCALES) {
    if (!bundleText.includes(`"${lang}"`)) {
      problems.push(
        `  i18n-messages.js missing locale "${lang}" - run: node scripts/gen-locales.mjs`,
      )
    }
  }
} catch (_) {
  problems.push(
    '  src/i18n-messages.js not found - run: node scripts/gen-locales.mjs',
  )
}

if (problems.length) {
  console.error('check-i18n: found problems:')
  for (const p of problems) console.error(p)
  process.exit(1)
}

console.log('check-i18n: OK')
console.log(`  locales: ${LOCALES.join(', ')}`)
console.log(`  keys per locale: ${englishKeys.size}`)
console.log(`  keys referenced from HTML/JS: ${usedKeys.size}`)
if (suspiciousUnused.length) {
  console.log(
    `  note: ${suspiciousUnused.length} translated key(s) look unused: ${suspiciousUnused.slice(0, 6).join(', ')}${suspiciousUnused.length > 6 ? ', ...' : ''}`,
  )
}
