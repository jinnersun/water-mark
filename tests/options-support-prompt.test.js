import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const SOURCE_URL = new URL('../src/options-support.js', import.meta.url)
const STORAGE_DEFAULTS = {
  optionsVisitCount: 0,
  reviewPromptShown: false,
}

const createElement = () => ({
  hidden: true,
  handlers: {},
  addEventListener(type, handler) {
    this.handlers[type] = handler
  },
})

const createScenario = (options = {}) => {
  const prompt = createElement()
  const review = createElement()
  const dismiss = createElement()
  const elements = {
    'review-prompt': prompt,
    'review-prompt-review': review,
    'review-prompt-dismiss': dismiss,
  }
  const getCalls = []
  const setCalls = []
  const lastErrorReads = []
  let activeCallback = ''
  let lastError
  let deferredSet

  const runtime = {}
  Object.defineProperty(runtime, 'lastError', {
    get() {
      lastErrorReads.push(activeCallback)
      return lastError
    },
  })

  const runCallback = (type, failed, callback) => {
    activeCallback = type
    lastError = failed ? { message: `${type} failed` } : undefined
    try {
      callback()
    } finally {
      activeCallback = ''
      lastError = undefined
    }
  }

  const local = {
    get(defaults, callback) {
      getCalls.push(defaults)
      if (options.getThrows) throw new Error('storage unavailable')
      runCallback('get', options.getError, () => {
        callback({ ...STORAGE_DEFAULTS, ...options.stored })
      })
    },
    set(value, callback) {
      setCalls.push(value)
      if (options.setThrows) throw new Error('storage unavailable')
      const run = () => runCallback('set', options.setError, callback)
      if (options.deferSet) {
        deferredSet = run
      } else {
        run()
      }
    },
  }

  const window = {
    open() {
      throw new Error('prompt must not open a window')
    },
  }
  const context = {
    window,
    document: {
      getElementById(id) {
        return elements[id] || null
      },
    },
  }
  if (options.chrome !== false) {
    context.chrome = { runtime }
    if (options.storage !== false) {
      context.chrome.storage = {
        local,
        sync: {
          get() {
            throw new Error('prompt must use local storage')
          },
          set() {
            throw new Error('prompt must use local storage')
          },
        },
      }
    }
  }

  vm.runInNewContext(readFileSync(SOURCE_URL, 'utf8'), context, {
    filename: SOURCE_URL.pathname,
  })

  return {
    window,
    prompt,
    review,
    dismiss,
    getCalls,
    setCalls,
    lastErrorReads,
    init() {
      window.WatermarkSupportPrompt.init()
    },
    flushSet() {
      assert.equal(typeof deferredSet, 'function', 'set callback must be pending')
      deferredSet()
    },
    click(element) {
      assert.equal(typeof element.handlers.click, 'function')
      let defaultPrevented = false
      element.handlers.click({
        preventDefault() {
          defaultPrevented = true
        },
      })
      return defaultPrevented
    },
  }
}

test('first visit stores one and keeps the prompt hidden', () => {
  const scenario = createScenario()
  scenario.init()

  assert.deepEqual({ ...scenario.getCalls[0] }, STORAGE_DEFAULTS)
  assert.equal(scenario.getCalls.length, 1)
  assert.equal(scenario.setCalls.length, 1)
  assert.deepEqual({ ...scenario.setCalls[0] }, { optionsVisitCount: 1 })
  assert.equal(scenario.prompt.hidden, true)
  assert.deepEqual(Object.keys(scenario.window.WatermarkSupportPrompt), ['init'])
})

test('second visit stores two and keeps the prompt hidden', () => {
  const scenario = createScenario({ stored: { optionsVisitCount: 1 } })
  scenario.init()

  assert.equal(scenario.setCalls.length, 1)
  assert.deepEqual({ ...scenario.setCalls[0] }, { optionsVisitCount: 2 })
  assert.equal(scenario.prompt.hidden, true)
})

test('third visit reveals only after the successful state write', () => {
  const scenario = createScenario({
    stored: { optionsVisitCount: 2 },
    deferSet: true,
  })
  scenario.init()

  assert.equal(scenario.setCalls.length, 1)
  assert.deepEqual({ ...scenario.setCalls[0] }, {
    optionsVisitCount: 3,
    reviewPromptShown: true,
  })
  assert.equal(scenario.prompt.hidden, true)

  scenario.flushSet()
  assert.equal(scenario.prompt.hidden, false)
})

test('an already shown prompt returns without another count write', () => {
  const scenario = createScenario({
    stored: { optionsVisitCount: 3, reviewPromptShown: true },
  })
  scenario.init()

  assert.equal(scenario.setCalls.length, 0)
  assert.equal(scenario.prompt.hidden, true)
})

for (const [label, optionsVisitCount] of [
  ['negative', -1],
  ['non-integer', 2.5],
  ['wrong type', '2'],
  ['null', null],
  ['infinite', Infinity],
]) {
  test(`invalid ${label} stored count restarts at one`, () => {
    const scenario = createScenario({ stored: { optionsVisitCount } })
    scenario.init()

    assert.equal(scenario.setCalls.length, 1)
    assert.deepEqual({ ...scenario.setCalls[0] }, { optionsVisitCount: 1 })
    assert.equal(scenario.prompt.hidden, true)
  })
}

test('a storage get failure is silent and does not show or write', () => {
  const scenario = createScenario({
    stored: { optionsVisitCount: 2 },
    getError: true,
  })

  assert.doesNotThrow(scenario.init)
  assert.equal(scenario.setCalls.length, 0)
  assert.equal(scenario.prompt.hidden, true)
  assert.deepEqual(scenario.lastErrorReads, ['get'])
})

test('a third-visit storage set failure is silent and stays hidden', () => {
  const scenario = createScenario({
    stored: { optionsVisitCount: 2 },
    setError: true,
  })

  assert.doesNotThrow(scenario.init)
  assert.equal(scenario.setCalls.length, 1)
  assert.equal(scenario.prompt.hidden, true)
  assert.deepEqual(scenario.lastErrorReads, ['get', 'set'])
})

for (const [label, options] of [
  ['missing chrome', { chrome: false }],
  ['missing local storage', { storage: false }],
  ['throwing get', { getThrows: true }],
  ['throwing set', { stored: { optionsVisitCount: 2 }, setThrows: true }],
]) {
  test(`unavailable storage with ${label} is silent and stays hidden`, () => {
    const scenario = createScenario(options)

    assert.doesNotThrow(scenario.init)
    assert.equal(scenario.prompt.hidden, true)
  })
}

test('review click hides the prompt without preventing navigation', () => {
  const scenario = createScenario({ stored: { optionsVisitCount: 2 } })
  scenario.init()
  assert.equal(scenario.prompt.hidden, false)

  const defaultPrevented = scenario.click(scenario.review)
  assert.equal(scenario.prompt.hidden, true)
  assert.equal(defaultPrevented, false)
})

test('dismiss click hides the visible prompt', () => {
  const scenario = createScenario({ stored: { optionsVisitCount: 2 } })
  scenario.init()
  assert.equal(scenario.prompt.hidden, false)

  scenario.click(scenario.dismiss)
  assert.equal(scenario.prompt.hidden, true)
})
