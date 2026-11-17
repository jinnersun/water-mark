# env-watermark (water-mark) AGENTS.md

## 项目概述

Env Watermark — Chrome 扩展（Manifest V3），按域名 / URL 正则 / IP / Cookie 给页面打环境水印，避免把测试环境当成生产环境。技术栈：原生 JS（ESM，无运行时依赖），Node 脚本仅用于资源生成与校验。目录职责：

- `src/`：扩展源码（manifest.json、background/content/options/i18n/watermark-core 等），通过 Chrome「加载已解压扩展」直接加载
- `src/_locales/`、`src/i18n-messages.js`：多语言文案
- `src/icons/`：生成的图标产物（由 `npm run gen-icons` 产出，不要手改）
- `scripts/`：资源生成与一致性校验脚本（icons / promo / locales / i18n / screenshots）
- 仓库根：`package.json`、`package-lock.json`、`README.md`、`README.zh-CN.md`

CI：本仓库无 `.github/workflows/`，不存在 push 即上线的自动链路。

## 构建、测试、lint

- 构建：无构建步骤（纯 ESM 源码，Chrome 直接加载 `src/`）。需要重新生成资源时：
  - 图标：`npm run gen-icons`（含商店素材：`npm run gen-icons:all`）
  - 宣传图：`npm run gen-promo`
  - `_locales`：`npm run gen-locales`
- 测试：`npm test`（即 `node --test tests/*.test.js`，显式 glob 发现全部测试文件）或直跑单文件 `node --test tests/<name>.test.js`；零新增依赖，退出码 0 即通过。**禁止用裸 `node --test tests/` 目录参数当全量依据**——它只跑 `tests/index.js` 显式 import 的子集且退出码仍为 0，会静默漏掉未挂 index.js 的新增 `.test.js`（node v22 目录参数走模块入口、与无参/glob 的命名发现是两套机制）。新增测试文件只要放进 `tests/` 且以 `.test.js` 结尾即被 glob 自动纳入，无需改 index.js。
- Lint / Typecheck：
  - `npm run check-i18n`（校验 `src/i18n-messages.js` 与 `src/_locales/*/messages.json` 的 key 一致性，退出码 0 即通过）
  - `npm run check-screenshots`（校验 Chrome Web Store 上架截图是否齐备；日常开发截图未生成时退出码为 1，属预期，**上架前才需要让它通过**，可用 `npm run fix-screenshots` 重新生成）
  - 无独立 eslint / tsc 命令

## Do not（禁区）

- `.agent/`：内部状态目录，只读不改；如需了解背景仅查看
- `src/icons/`、`src/_locales/*/messages.json`：由 `scripts/gen-icons.mjs` / `scripts/gen-locales.mjs` 生成，手改会被下次生成覆盖；改文案请改 `src/i18n-messages.js` 后跑 `npm run gen-locales`
- `src/watermark-core.js`、`src/content.js`、`src/background.js`、`src/features.js`：扩展核心运行逻辑，改动需任务契约明确授权
- `manifest.json`：MV3 清单，涉及权限/内容脚本注入范围，未经任务明确不得调整
- 不引入运行时依赖（`dependencies` 当前为空，保持为空）；dev 依赖仅在确有需求时新增

## When stuck

- 先用 `grep` / `rg` 在 `src/` 搜关键字，读相邻模块（如改 `watermark-core.js` 先看 `content.js` 怎么调用它）
- 查 `README.md` / `README.zh-CN.md` 的目录与功能描述
- 看 `.agent/PRD-*`、`.agent/DESIGN-*`（如存在）
- 实在不确定 → 在任务约定的 `STATUS.json` 写 `NEED_DECISION` 信号，不要猜
