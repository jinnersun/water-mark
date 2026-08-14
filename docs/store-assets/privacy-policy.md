# Privacy Policy for Web Watermark Tool

> **本文件是隐私政策的 markdown 源**。已发布的 HTML 版本位于
> `watermask/privacy-policy.html`（独立站点仓库 jinnersun/watermask），线上地址：
> <https://www.webwatermark.dpdns.org/privacy-policy>
>
> 已与 `src/manifest.json` 核对一致：仅申请 `storage` 权限，无 `activeTab`。
> 工具栏 badge 由 content script 上报命中结果实现，不需要额外权限。

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

This is the **only** permission the extension requests. The environment short
label on the toolbar icon (e.g., `PROD`, `TEST`) is driven by the in-page
content script reporting its own match result, so no `activeTab` or additional
host permission is needed.

The content script's `<all_urls>` match pattern is used solely to inject the
watermark visual layer on any URL you choose to watermark via your own rules.
Page content is neither read nor transmitted.

## 4. Third-Party Services

None. This extension does not communicate with any external server. No CDN, no
remote script loading, no analytics (Google Analytics, Sentry, etc.), no ad SDK.

## 5. Children's Privacy

This extension is designed for developers and operations engineers. It does not
knowingly collect any information from anyone, including children under 13.

## 6. Website Feedback Form

The "Report a problem" form on this site sends your submission to EasyForm
(dpdns.org) so it can be forwarded to the author's inbox. Submissions are used
only to receive and act on feedback. You can also report via GitHub Issues.

## 7. Changes

This policy may be updated. Check the published page for the latest version.

## 8. Contact

Report bugs or ask privacy-related questions via GitHub Issues:
<https://github.com/jinnersun/watermask/issues>
