import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import WatermarkCore from './helpers/load-watermark-core.js'

const CONTENT_SOURCE = readFileSync(
  new URL('../src/content.js', import.meta.url),
  'utf8',
)

class StubElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase()
    this.id = ''
    this.style = {}
    this.textContent = ''
    this.children = []
    this.parentNode = null
  }

  appendChild(child) {
    if (child.parentNode) child.remove()
    this.children.push(child)
    child.parentNode = this
    return child
  }

  remove() {
    if (!this.parentNode) return
    const siblings = this.parentNode.children
    siblings.splice(siblings.indexOf(this), 1)
    this.parentNode = null
  }
}

const createConfig = () => ({
  id: 'staging',
  name: 'Staging',
  shortLabel: 'STG',
  enabled: true,
  rules: [{ type: 'host-exact', value: 'example.com' }],
  text: 'STAGING',
  color: '#ff0000',
  opacity: 0.15,
  density: 300,
  fontSize: 24,
  rotation: -30,
  smartColor: false,
  smartColorTone: 'light',
  border: { enabled: true, color: '#ef4444', width: 4 },
  mouseFade: { enabled: true, fadeOpacity: 0.03, resumeDelay: 2000 },
})

const loadContent = ({ topFrame }) => {
  let createdElements = 0
  const listeners = new Map()
  const observers = []
  const animationFrames = []
  const documentElement = new StubElement('html')
  const document = {
    cookie: '',
    documentElement,
    body: new StubElement('body'),
    createElement(tagName) {
      createdElements += 1
      return new StubElement(tagName)
    },
    getElementById(id) {
      const visit = (node) => {
        if (node.id === id) return node
        for (const child of node.children) {
          const match = visit(child)
          if (match) return match
        }
        return null
      }
      return visit(documentElement)
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(listener)
    },
    removeEventListener(type, listener) {
      if (listeners.has(type)) listeners.get(type).delete(listener)
    },
  }
  const window = {
    document,
    location: { href: 'https://example.com/' },
    WatermarkCore: {
      ...WatermarkCore,
      buildTile: () => ({ dataURL: 'data:image/png;base64,', size: 300 }),
    },
  }
  window.top = topFrame ? window : {}
  const chrome = {
    storage: {
      sync: {
        get(defaults, callback) {
          callback({ configs: [createConfig()], globalEnabled: true })
        },
      },
      onChanged: { addListener() {} },
    },
    runtime: {
      sendMessage() {},
      onMessage: { addListener() {} },
    },
  }

  class MutationObserver {
    constructor(callback) {
      this.callback = callback
      observers.push(this)
    }

    observe() {}
  }

  vm.runInNewContext(CONTENT_SOURCE, {
    window,
    document,
    chrome,
    MutationObserver,
    requestAnimationFrame(callback) {
      animationFrames.push(callback)
    },
    setTimeout,
    clearTimeout,
  })

  return {
    document,
    listenerCount(type) {
      return listeners.has(type) ? listeners.get(type).size : 0
    },
    createdElementCount() {
      return createdElements
    },
    mutate(records) {
      for (const observer of observers) observer.callback(records)
      while (animationFrames.length > 0) animationFrames.shift()()
    },
  }
}

test('iframe renders border without overlay or mouse fade handlers', () => {
  const env = loadContent({ topFrame: false })

  assert.equal(env.document.getElementById('__wm_overlay__'), null)
  assert.ok(env.document.getElementById('__wm_border__'))
  for (const type of ['mousemove', 'keydown', 'wheel', 'touchmove']) {
    assert.equal(env.listenerCount(type), 0)
  }
})

test('top frame keeps overlay, border, and mouse fade handlers', () => {
  const env = loadContent({ topFrame: true })

  assert.ok(env.document.getElementById('__wm_overlay__'))
  assert.ok(env.document.getElementById('__wm_border__'))
  for (const type of ['mousemove', 'keydown', 'wheel', 'touchmove']) {
    assert.equal(env.listenerCount(type), 1)
  }
})

test('iframe observer ignores overlay-only removal', () => {
  const env = loadContent({ topFrame: false })
  const overlay = env.document.getElementById('__wm_overlay__')
  if (overlay) overlay.remove()
  const border = env.document.getElementById('__wm_border__')
  const createdBeforeMutation = env.createdElementCount()

  assert.doesNotThrow(() => {
    env.mutate([
      { type: 'childList', removedNodes: [{ id: '__wm_overlay__' }] },
    ])
  })

  assert.equal(env.createdElementCount(), createdBeforeMutation)
  assert.strictEqual(env.document.getElementById('__wm_border__'), border)
  assert.equal(env.document.getElementById('__wm_overlay__'), null)
})

test('iframe observer restores a removed border', () => {
  const env = loadContent({ topFrame: false })
  const border = env.document.getElementById('__wm_border__')
  border.remove()

  assert.doesNotThrow(() => {
    env.mutate([{ type: 'childList', removedNodes: [border] }])
  })

  assert.ok(env.document.getElementById('__wm_border__'))
  assert.notStrictEqual(env.document.getElementById('__wm_border__'), border)
})

test('iframe observer ignores non-own attribute mutations without re-render', () => {
  const env = loadContent({ topFrame: false })
  const border = env.document.getElementById('__wm_border__')
  const createdBeforeMutation = env.createdElementCount()

  // A page node's class/style change takes the observer's attributes branch
  // (the more common empty-spin driver than a synthetic overlay removal).
  assert.doesNotThrow(() => {
    env.mutate([
      { type: 'attributes', target: { id: 'some-page-node' } },
    ])
  })

  assert.equal(env.createdElementCount(), createdBeforeMutation)
  assert.strictEqual(env.document.getElementById('__wm_border__'), border)
  assert.equal(env.document.getElementById('__wm_overlay__'), null)
})
