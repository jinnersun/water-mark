(() => {
  const init = () => {
    const prompt = document.getElementById('review-prompt')
    const review = document.getElementById('review-prompt-review')
    const dismiss = document.getElementById('review-prompt-dismiss')
    if (!prompt || !review || !dismiss) return

    const hide = () => {
      prompt.hidden = true
    }
    review.addEventListener('click', hide)
    dismiss.addEventListener('click', hide)

    if (
      typeof chrome === 'undefined' ||
      !chrome.storage ||
      !chrome.storage.local
    ) {
      return
    }

    const storage = chrome.storage.local
    const hasLastError = () => !!(chrome.runtime && chrome.runtime.lastError)

    try {
      storage.get(
        { optionsVisitCount: 0, reviewPromptShown: false },
        (items) => {
          if (hasLastError() || items.reviewPromptShown === true) return

          const previousCount = items.optionsVisitCount
          const visitCount =
            Number.isInteger(previousCount) && previousCount >= 0
              ? previousCount + 1
              : 1
          if (visitCount > 3) return

          const nextState =
            visitCount === 3
              ? { optionsVisitCount: 3, reviewPromptShown: true }
              : { optionsVisitCount: visitCount }

          try {
            storage.set(nextState, () => {
              if (hasLastError()) return
              if (visitCount === 3) prompt.hidden = false
            })
          } catch {}
        },
      )
    } catch {}
  }

  window.WatermarkSupportPrompt = { init }
})()
