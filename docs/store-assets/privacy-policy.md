# Privacy Policy for Web Watermark Tool

> **本文件是隐私政策的 markdown 源**。已发布的 HTML 版本位于
> `web-watermark-prompt/privacy-policy.html`，线上地址：
> <https://jinnersun.github.io/web-watermark-prompt/privacy-policy.html>
>
> ⚠️ **待决策**：下方 `activeTab` 权限说明与 `src/manifest.json` 实际申请的权限
> （目前只有 `storage`）不一致。需先按 `docs/publish-guide.md` 3.3 节实测
> badge 是否依赖该权限，再决定「删掉此段」或「manifest 补权限」。
> 两处必须保持一致，否则有拒审风险。

Last updated: 2026-07-14

## 1. Data Collection

Web Watermark Tool does NOT collect, transmit, or share any personal data,
usage data, or browsing history. All operations happen locally in your browser.

## 2. Data Storage

User configurations (rules, watermark text, colors, opacity, etc.) are stored
using `chrome.storage.sync`, which is Chrome's built-in sync mechanism scoped to
your Google account. Recently-used colors are stored in `chrome.storage.local`
and never leave your device. This data is:

- Encrypted in transit and at rest by Google
- Never accessible to us or any third party
- Only synchronized between your own logged-in Chrome instances
- Removable at any time via Chrome settings

## 3. Permissions Rationale

- `storage`: to persist your watermark configurations and preferences
- `activeTab`: to read the active tab's URL for updating the toolbar badge with
  the environment short label (e.g., `PROD`, `TEST`)

The content script's `<all_urls>` match pattern is used solely to inject the
watermark visual layer on any URL you choose to watermark via your own rules.
Page content is neither read nor transmitted.

## 4. Third-Party Services

None. This extension does not communicate with any external server. No CDN, no
remote script loading, no analytics (Google Analytics, Sentry, etc.), no ad SDK.

## 5. Children's Privacy

This extension is designed for developers and operations engineers. It does not
knowingly collect any information from anyone, including children under 13.

## 6. Changes

This policy may be updated. Check the published page for the latest version.

## 7. Contact

Report bugs or ask privacy-related questions via GitHub Issues:
<https://github.com/jinnersun/web-watermark-prompt/issues>
