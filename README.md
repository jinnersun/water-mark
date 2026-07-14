# Env Watermark — Web Watermark Tool

[English](README.md) · [简体中文](README.zh-CN.md)

Chrome extension (Manifest V3) that stamps precise per-environment watermarks on any page by **domain / URL regex / IP / cookie**, so you never mistake staging for production again.

## Highlights

- **Multi-dimensional match rules** (any hit within a config triggers it):
  - `Exact host` — `cust.example.com` → this hostname only
  - `Host suffix` — `example.com` → every subdomain
  - `URL regex` — `^https?://.*/admin(/.*)?$` → path/query targeting
  - `IP exact / CIDR` — `10.20.30.5` / `10.20.30.0/24` → covers VPN‑style access
  - `Cookie` — `env=prod` / `env~=stage` / just a name → covers same‑domain gateway routing
- **Smart contrast color** (`mix-blend-mode: difference`): watermark inverts against light, dark, or gradient backgrounds without disappearing.
- **Immersive border**: 4px inset shadow, spot the environment at a glance.
- **Fade on activity**: watermark eases to near‑transparent while the mouse or keyboard is busy, restores after 2 seconds of idle.
- **Independent per‑iframe match** (`all_frames: true`): each frame checks its own URL/hostname.
- **Live preview** across light / dark / gradient backgrounds.
- **Rule tester**: paste a URL + cookie string to see whether it triggers and which rule wins.
- **Import / export** JSON — easy to share configs across a team or between machines.
- **Global kill switch** in the top‑right of the options page.
- **Config search** in the sidebar.
- **Toolbar badge** — the matched config's short label appears in the icon corner (e.g. `PROD`).
- **Multi-language UI** — English, 简体中文, 繁體中文, 日本語, Español, with a "Follow browser" option. Manifest strings served natively via `_locales/*`.

## Directory layout

```
├── src/                        # Extension source (load unpacked)
│   ├── manifest.json           # MV3 manifest, default_locale=en
│   ├── background.js           # Service worker
│   ├── content.js              # Content script: inject watermark + observe URL changes
│   ├── watermark-core.js       # Pure logic: URL parsing, rule matching, image generation
│   ├── features.js             # Feature-flag layer (free vs. reserved paid)
│   ├── options.html/.css/.js   # Options page
│   ├── i18n.js                 # Runtime translator with live language switch
│   ├── i18n-messages.js        # Auto-generated bundle used by i18n.js at runtime
│   ├── _locales/               # Manifest and runtime i18n resources
│   │   ├── en/                 # default_locale
│   │   ├── zh_CN/
│   │   ├── zh_TW/
│   │   ├── ja/
│   │   └── es/
│   └── icons/                  # 16 / 48 / 128 icons
├── scripts/
│   ├── gen-locales.mjs         # Rebuild _locales/**/messages.json + i18n-messages.js
│   └── check-i18n.mjs          # Lint locale drift, unused/unknown keys
├── docs/
│   ├── paid-version.md         # Notes for the future Pro build
│   └── todo.md                 # Roadmap
├── README.md                   # English (this file)
├── README.zh-CN.md             # Chinese
└── .gitignore
```

## Local development

1. Open `chrome://extensions/`.
2. Toggle **Developer mode** in the top-right.
3. **Load unpacked** → pick the `src/` directory.
4. Edit any file under `src/`, then click the reload icon on the extension card.
5. Click the toolbar icon to open the options page.

## Data storage

- Uses `chrome.storage.sync`, so configs follow the user's Google account.
- Keys:
  - `configs: Config[]` — every watermark config.
  - `globalEnabled: boolean` — global kill switch.
  - `lang: '' | 'en' | 'zh_CN' | 'zh_TW' | 'ja' | 'es'` — language override. `''` means "follow browser".

## Match rule reference

| Type          | Semantics                                                   | Example                                    | Notes                                  |
| ------------- | ----------------------------------------------------------- | ------------------------------------------ | -------------------------------------- |
| `host-exact`  | hostname equals value (recommended for distinguishing same-domain environments) | `cust.example.com`     | **Default**                            |
| `host-suffix` | hostname equals value or ends with `.<value>` (all subdomains) | `example.com`                           | Compatible with older coarse matching  |
| `url-regex`   | Full-URL regex                                              | `^https?://.*/admin(/.*)?$`                | For path / query targeting             |
| `ip-exact`    | When hostname is an IP, exact match                         | `10.20.30.5`                               | Only attempted when hostname is IP-shaped |
| `ip-cidr`     | When hostname is an IP, CIDR match                          | `10.20.30.0/24`                            | IPv4 CIDR only                         |
| `cookie`      | Key/value match against `document.cookie`                   | `env=prod` / `env~=stage` / just `sid`     | `=` equals, `~=` contains, name-only checks existence |

**Conflict handling**: when multiple rules hit within a config, or multiple configs hit at once, the one with the highest score wins. Approximate priority: `host-exact` > `ip-exact` > `ip-cidr` > `url-regex` > `cookie` > `host-suffix`; ties break on value length.

## Working with translations

- Edit `scripts/gen-locales.mjs` — it is the single source of truth for every locale.
- Run `node scripts/gen-locales.mjs` to regenerate `_locales/*/messages.json` and `src/i18n-messages.js`.
- Run `node scripts/check-i18n.mjs` to lint for drift between locales and unknown keys referenced from HTML/JS.
- The runtime picker lives in `src/i18n.js` (`WatermarkI18n.switchLang(lang)`).

## Paid ("Pro") plan

See `docs/paid-version.md`. All features are free today; the `Features.canUse(key)` gate in `src/features.js` is in place for future licence checks, so the business code doesn't need to change.

## Permissions

- `storage` — persists configs and preferences via `chrome.storage.sync`.
- `activeTab` — reserved.
- `<all_urls>` content script — evaluates the match rules on every page, but only actually draws the watermark on matched ones.
- `all_frames: true` — each (cross-origin) iframe matches its own URL / hostname. Cross-origin iframes cannot see the top page's URL by design.

## Version

`2.0.0` — Rule-based match rewrite, UI overhaul, smart contrast color, immersive border, import/export, global kill switch, full multi-language support.
