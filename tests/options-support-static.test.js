import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const OPTIONS_HTML = readFileSync(
  new URL('../src/options.html', import.meta.url),
  'utf8',
)
const context = { self: {} }
vm.runInNewContext(
  readFileSync(new URL('../src/i18n-messages.js', import.meta.url), 'utf8'),
  context,
)
const messages = context.self.WatermarkMessages

const getAttribute = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`))
  return match?.[1]
}

test('support footer links use the published destinations and locale keys', () => {
  const links = [
    {
      id: 'support-review',
      href: 'https://chromewebstore.google.com/detail/fgnehancpgnnbnbmpeimgjoaffjbapbi',
      key: 'supportReviewLink',
    },
    {
      id: 'support-issue',
      href: 'https://github.com/jinnersun/water-mark/issues/new',
      key: 'supportIssue',
    },
    {
      id: 'support-pr',
      href: 'https://github.com/jinnersun/water-mark/pulls',
      key: 'supportPR',
    },
  ]

  assert.match(OPTIONS_HTML, /data-i18n="supportPrompt"/)
  assert.match(OPTIONS_HTML, /data-i18n="supportContribute"/)
  for (const { id, href, key } of links) {
    const tag = OPTIONS_HTML.match(
      new RegExp(`<a\\b[^>]*\\bid="${id}"[^>]*>`),
    )?.[0]
    assert.ok(tag, `${id} must exist`)
    assert.equal(getAttribute(tag, 'href'), href, id)
    assert.equal(getAttribute(tag, 'target'), '_blank', id)
    assert.equal(getAttribute(tag, 'rel'), 'noopener', id)
    assert.equal(getAttribute(tag, 'data-i18n'), key, id)
  }
})

test('review prompt is hidden, non-blocking, and loaded before options.js', () => {
  const prompt = OPTIONS_HTML.match(
    /<div\b[^>]*\bid="review-prompt"[^>]*>/,
  )?.[0]
  assert.ok(prompt, 'review-prompt must exist')
  assert.equal(getAttribute(prompt, 'role'), 'status')
  assert.match(prompt, /\shidden(?:\s|>)/)
  assert.ok(
    OPTIONS_HTML.indexOf('id="review-prompt"') <
      OPTIONS_HTML.indexOf('<footer class="sidebar-support">'),
    'review prompt must be above the support footer',
  )
  assert.match(OPTIONS_HTML, /data-i18n="reviewPromptText"/)

  const review = OPTIONS_HTML.match(
    /<a\b[^>]*\bid="review-prompt-review"[^>]*>/,
  )?.[0]
  assert.ok(review, 'review-prompt-review must exist')
  assert.equal(
    getAttribute(review, 'href'),
    'https://chromewebstore.google.com/detail/fgnehancpgnnbnbmpeimgjoaffjbapbi',
  )
  assert.equal(getAttribute(review, 'target'), '_blank')
  assert.equal(getAttribute(review, 'rel'), 'noopener')
  assert.equal(getAttribute(review, 'data-i18n'), 'reviewPromptReview')

  const dismiss = OPTIONS_HTML.match(
    /<button\b[^>]*\bid="review-prompt-dismiss"[^>]*>/,
  )?.[0]
  assert.ok(dismiss, 'review-prompt-dismiss must exist')
  assert.equal(getAttribute(dismiss, 'type'), 'button')
  assert.equal(getAttribute(dismiss, 'data-i18n'), 'reviewPromptDismiss')

  const i18nScript = OPTIONS_HTML.indexOf('<script src="i18n.js"></script>')
  const promptScript = OPTIONS_HTML.indexOf(
    '<script src="options-support.js"></script>',
  )
  const optionsScript = OPTIONS_HTML.indexOf('<script src="options.js"></script>')
  assert.ok(i18nScript >= 0, 'i18n.js include must exist')
  assert.ok(promptScript > i18nScript, 'options-support.js must follow i18n.js')
  assert.ok(optionsScript > promptScript, 'options-support.js must precede options.js')
})

test('help feedback link uses the current repository issues page', () => {
  const tag = OPTIONS_HTML.match(
    /<a\b[^>]*\bclass="help-feedback-link"[^>]*>/,
  )?.[0]
  assert.ok(tag, 'help feedback link must exist')
  assert.equal(
    getAttribute(tag, 'href'),
    'https://github.com/jinnersun/water-mark/issues',
  )
  assert.ok(!OPTIONS_HTML.includes('https://github.com/jinnersun/watermask/issues'))
})

test('support and review prompt messages are nonempty in every locale', () => {
  const requiredKeys = [
    'supportPrompt',
    'supportReviewLink',
    'supportContribute',
    'supportIssue',
    'supportPR',
    'reviewPromptText',
    'reviewPromptReview',
    'reviewPromptDismiss',
  ]
  for (const lang of ['en', 'zh_CN', 'zh_TW', 'ja', 'es']) {
    for (const key of requiredKeys) {
      assert.equal(typeof messages[lang][key], 'string', `${lang}.${key}`)
      assert.ok(messages[lang][key].trim(), `${lang}.${key} must not be empty`)
    }
  }
})
