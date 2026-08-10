# v2.0 完整实施计划（含阶段 4 后端）

> 状态：**待批准**。基于实际代码逐项核实，非猜测。
> 决策基线：2026-08-03 对话；2026-08-10 补充鼠标渐隐滚轮优化。
> 当前 `git log`：HEAD = `0377977 fix(options): stop rewriting user-entered name/text across languages`。
> 当前 `git status`：docs / icons / options.html 等有未提交修改；素材清理未提交；仓库无 remote。

## 当前待办（本轮先做，需先对齐）

| # | 类型 | 项 | 状态 |
| --- | --- | --- | --- |
| A | BUG | 工具栏 badge 完全不显示 → 方案 A（消息传递）修复 | ✅ 代码已实施（2026-08-10），待浏览器干净加载验证 |
| B | 优化 | 鼠标渐隐只响应 mousemove / keydown，**滚轮滚动不触发** → 补 `wheel` + `touchmove` 事件 | ✅ 代码已实施（2026-08-10），待浏览器验证 |

两项均为小改动、互相独立、不阻塞其他阶段。详见阶段 1。
已通过的验证：`node --check` 三个改动文件、`tmp/smoke-badge.mjs` 冒烟（shortLabelOf / resolveBadgeColor / cookie 匹配）ALL PASS、`npm run check-i18n` OK、监听器 add/remove 成对。

### 二轮修复记录（2026-08-10，用户实测反馈驱动）

**问题 1：badge 显示一会儿就消失；多开 SKA+PRE 时后开的 PRE 消失后刷新/保存都救不回来**

根因（闭集枚举确认）：清 badge 的代码路径只有两条——content 上报空串（PRE 命中，排除）、background 的 `onUpdated` 清除。保存后 content 重报设上 badge、随后又消失，证明 `onUpdated` 在**上报之后**再次触发清除。两个会迟到的事件：
- `changeInfo.url`：**History API 同文档导航（SPA 的 pushState/replaceState）也触发**——PRE 应用加载后调 replaceState → 误清；保存重设后下一次 replaceState 又清，故"保存也救不回"
- `status:'loading'`：部分页面延迟 subframe 也会触发

最终事件表（`background.js`）：

| 事件 | 行为 |
| --- | --- |
| `status:'loading'` | 清（新文档预清；若被 subframe 误清，complete ping 修好） |
| `changeInfo.url` 且 scheme 非 http(s) | 清（chrome:// 等 content 不运行的地方；replaceState 不改 scheme，安全） |
| `changeInfo.url` 且 http(s) | **忽略**（replaceState 洞堵上） |
| `status:'complete'` | ping 该 tab（`wm:request-badge`），content 用缓存的最近状态重报 |

content 侧：`__wmLastBadge` 缓存 + `onMessage` 响应 ping（顶层 frame 守卫）。

**问题 2：CJK badge 被 Chrome 按像素裁出半个字**

- `shortLabelOf` 改为宽度单位截断：半角=1、全角=2、预算 4。`数科` 保留、`示例A`→`数科`、`SKA`→SKA
- 用户实测 `SKA` 清晰，确认引导方向为 ASCII 简写
- `shortLabelHint` 五语文案更新并在输入框下方渲染（此前文案存在但从未渲染）：「显示在工具栏角标；建议英文简写如 PROD / TEST / PRE（最多 4 个半角或 2 个全角字符）」；硬编码中文 `title` 改 `data-i18n-title`
- AGENT_PROMPT 的 shortLabel 说明同步为宽度规则 + ASCII 推荐
- badge 字号/尺寸 Chrome 无 API 可调，不做"缩小中文字号"；不硬性禁止中文

**问题 3（同期修复）：鼠标渐隐不响应滚轮** —— `installMouseFade` 补 `wheel` + `touchmove`。

## 决策摘要

| 项 | 决策 |
| --- | --- |
| Badge 修复 | **方案 A**：content → background 消息传递 |
| 鼠标渐隐 | 补 `wheel` 事件（滚轮滚动也触发渐隐） |
| 云同步 | **Supabase**（Auth + Postgres + RLS） |
| License 校验 | **Supabase Edge Functions**（与云同步同栈） |
| 付费门控时机 | **进 v2.0**，阶段 4 阻塞首发 |
| Pro 范围 | **2 项**：`unlimitedConfigs` + `cookieMatch` |
| 保持免费 | `smartColor`、`importExport`（视觉/功能卖点） |
| Free 配置上限 | **5 条** |
| 试用模式 | **限时全功能试用 14 天**（本地记 `installedAt`） |
| 隐私政策 | 阶段 4 完成后**重写**（从「零收集」改为「声明收集项」） |
| 云同步边界 | Pro 走 Supabase；Free 继续 `chrome.storage.sync` |

## 阶段 4 阻塞确认

**阶段 1-4 全部完成 → 一次性首发**。Supabase 项目、license 流程、隐私政策重写、商店问卷更新都在阶段 4 内闭环。

---

## 仓库现状速览（已核实）

```
仓库根: D:\item\chrome插件\djimnchdlbbedppeedlcmebbmehcloeb
git:  本地仓库，无 remote
HEAD: 0377977
已有:  src/manifest.json version=2.0.0；src/icons/ 已清理（仅 16/48/128 + source/）
       docs/store-assets/screenshots/ 5 张 1280×800 已就绪
       docs/store-assets/descriptions/ 中英 short+detail 已就绪
       docs/store-assets/icon-128.png ✅ 已拷入
       docs/store-assets/privacy-policy.md ✅ 已回填
       docs/store-assets/promo-440x280.png / promo-1400x560.png ✅
       web-watermark-prompt/ 静态站（GitHub Pages 已挂，含隐私政策）
未做:  扩展无 remote
       阶段 1-4 全部未实施
       badge 仍坏
       i18n 基线 158 keys / 5 locales，check-i18n OK
       门控层空壳
       无后端
       隐私政策仍是「零收集」版
```

## 真实代码事实（与原计划差异）

| 项 | 原假设 | 实际 |
| --- | --- | --- |
| `canUse` 调用点 | 多处 | **11 处**（smartColor 2 / importExport 2 / multiLang 4 / immersiveBorder 1 / mouseFade 1 / badge 1） |
| `unlimitedConfigs` 拦截位置 | 2 处 | **3 处**：`onAddConfig:954`、`onCopyConfig:974`（原计划遗漏）、`appendConfigs:1043` |
| `cookieMatch` 拦截位置 | 1-3 处 | **3 处**：`appendRuleRow:726`（下拉）、`watermark-core.js:190`（`matchRule`，但 core 当前无 Features 依赖）、`sanitizeImportedConfig:1175` |
| 剪贴板导入门控 | 有 | **❌ 漏了**：`onPasteFromClipboard:1123` 绕过 `importExport` 检查 |
| 试用需 storage | 异步 | 是。需 `Features.init()` 预加载，保持 `canUse` 同步 |
| `watermark-core.js` 依赖 | 无 | 确认无 Features 依赖，三处共用（content/background/options） |
| i18n 编辑流程 | 直接改 | **必须**改 `scripts/gen-locales.mjs`（944 行单一源），再 `npm run gen-locales` |
| 隐私政策位置 | 2 处 | **3 处**：`web-watermark-prompt/privacy-policy.html`（已上线）、`docs/store-assets/privacy-policy.md`、商店问卷 |
| 商店描述 | 4 份 | 确认 4 份：zh_CN/en 各 short+detail |

---

## 阶段 1：立即修复（A. Badge + B. 鼠标渐隐滚轮）

两项独立小改动，同一轮提交。

### A. Badge 修复（消息传递）

#### A.1 根因

- `background.js:38` 依赖 `tab.url`
- MV3 下读 `tab.url` 需 `tabs` 权限**或**匹配的 host permission
- `content_scripts.matches` **不授予** host permission
- manifest 只有 `storage` 权限 → `tab.url === undefined` → badge 不显示
- 附 BUG：`background.js:32` `parseContext(url, '')` 空 cookie → cookie 规则 badge 永久失效

#### A.2 改动

**`src/content.js`**
- `init()` 末尾（line 45 后）增加：无论是否命中，向 background 发送 `{ type: 'wm:badge', label, color }` 或 `{ type: 'wm:badge', label: '' }`
- 顶层 frame 守卫：`if (window.top !== window) return`
- `shortLabelOf` 逻辑迁移/共享：抽到 `watermark-core.js`，content/background 共用（消除重复）
- 命中颜色优先级：border.color > color > '#ef4444'（沿用 background.js:60-62）

**`src/background.js`**
- 删除 `matchForUrl`（31-36）、`updateBadge`（38-75）里的 storage 查询与匹配逻辑
- 删除 `chrome.tabs.onUpdated`（84-88）、`onActivated`（91-96）、`storage.onChanged`（99-104）
- 新增 `chrome.runtime.onMessage` 监听，用 `sender.tab.id` 设 badge
- 保留 `chrome.action.onClicked`（15-17）、`clearBadge`、`Features.canUse('badge')` 检查
- `importScripts` 改为仅 `features.js`（`watermark-core.js` 不再需要）

**`src/watermark-core.js`**
- 新增 `WatermarkCore.shortLabelOf(config)` 与 `WatermarkCore.resolveBadgeColor(config)`（常量从 background.js 搬过来）

**`src/manifest.json`**
- **无改动**。方案 A 不加任何权限。

### B. 鼠标渐隐滚轮优化

#### B.1 现状（`content.js:162-199` `installMouseFade`）

- 监听事件：`mousemove` + `keydown`（均 `{ passive: true }`）
- 触发后：overlay 降到 `fadeOpacity`（默认 0.03），静止 `resumeDelay`（默认 2000ms）后恢复
- **缺口**：用户只转滚轮、不动鼠标指针时，`mousemove` 不触发 → 水印不渐隐，挡视线
- `wheel` 事件在指针不动、仅转动滚轮时照常冒泡到 document，可直接补

#### B.2 改动

**`src/content.js` `installMouseFade`**
- `document.addEventListener('wheel', onActivity, { passive: true })`（滚轮滚动，含滚到边界滚不动的情况 —— 已与用户确认：空转触发渐隐可接受）
- `document.addEventListener('touchmove', onActivity, { passive: true })`（触屏拖动 —— 用户要求加上）
- `dispose()` 里对应 removeEventListener
- 现有的 clearTimeout + setTimeout 去抖逻辑**不动**（wheel/touchmove 高频触发天然被吸收）

**不做**（YAGNI）：
- 不加 `scroll` 事件 —— 滚动条拖拽已触发 mousemove，键盘滚动已触发 keydown，wheel 已覆盖滚轮场景

#### B.3 验证清单

**Badge（A）**
- [ ] 干净加载，访问命中 host 规则页面 → badge 显示
- [ ] 访问命中 **cookie 规则** 页面 → badge 显示（旧代码必失败）
- [ ] 切换 tab → badge 跟随
- [ ] 关闭全局开关 → badge 消失
- [ ] 改配置 → badge 实时更新
- [ ] 含 iframe 的页面 → badge 不被 iframe 覆盖
- [ ] `chrome://` / 应用商店 / PDF → 无 badge（预期）

**鼠标渐隐（B）**
- [ ] 开启 mouseFade，指针不动仅转滚轮 → 水印渐隐
- [ ] 停止滚动 `resumeDelay` 后 → 透明度恢复
- [ ] 连续滚动 → 持续保持渐隐不闪烁
- [ ] 关闭 mouseFade 开关 → 无残留监听（切换配置后重绑定正常）
- [ ] iframe 内页面同样生效（content script `all_frames: true`）


---

## 阶段 2：本地门控层 + 试用期

### 2.1 `src/features.js` 重构

**新形状**：

```js
const FREE_FEATURES = new Set([
  'hostRule', 'urlRegex', 'ipMatch',                // 6 种规则中免费
  'smartColor', 'immersiveBorder', 'mouseFade',     // 视觉特色免费
  'importExport',                                   // 决策：免费
  'iframeInject', 'globalToggle', 'badge',
  'multiLang',                                      // 决策：免费
])

const PAID_FEATURES = new Set([
  'unlimitedConfigs',                               // Pro
  'cookieMatch',                                    // Pro
  'cloudSync', 'teamShare', 'dynamicVars',          // 预留
])

const FREE_CONFIG_LIMIT = 5
const TRIAL_DAYS = 14

// 模块内缓存
let _installedAt = 0          // Date.now() 或 storage 值
let _licenseValid = false     // 阶段 4 接 Supabase 后才用
let _initPromise = null

const Features = {
  async init() { /* 读 storage.local.installedAt / license 缓存 */ },
  canUse(key) {
    if (DISABLED_FEATURES.has(key)) return false
    if (FREE_FEATURES.has(key)) return true
    if (PAID_FEATURES.has(key)) return _licenseValid || isTrialActive()
    return false
  },
  currentPlan() { /* 'free' | 'trial' | 'pro' */ },
  trialDaysLeft() { /* 计算剩余 */ },
  isTrialActive() { /* _installedAt + 14d > Date.now() */ },
  configLimit() { /* return 5 or Infinity */ },
  configCount(stateConfigs) { /* stateConfigs.length */ },
  canAddConfig(stateConfigs) { /* return stateConfigs.length < configLimit() */ },
}
```

**调用方适配**：3 个入口文件都需 `await Features.init()` 后再渲染：
- `content.js`：用 `init()` 包 `init()` 主流程
- `background.js`：在 `importScripts` 后用 `chrome.runtime.onInstalled` 触发 `init()`
- `options.js`：在 `bindStaticEvents` 前用 `init()` 包

### 2.2 `unlimitedConfigs` 门控（3 处）

| 位置 | 行为 |
| --- | --- |
| `options.js:954 onAddConfig` | `if (!Features.canAddConfig(state.configs)) { toast; return }` |
| `options.js:974 onCopyConfig` | 同上（**原计划遗漏补回**） |
| `options.js:1043 appendConfigs` | 计算 `canAccept = limit - state.configs.length`；`cleaned.slice(0, canAccept)`；若截断则 toast 告知数量 |

### 2.3 `cookieMatch` 门控（3 处）

| 位置 | 行为 |
| --- | --- |
| `options.js:726 appendRuleRow` | select 里 cookie option 加 `disabled` + 锁图标（CSS）；已有 cookie 规则的行显示「Pro」小标签 |
| `watermark-core.js:190 matchRule` | **保持纯函数，不引 Features**。cookie 规则在 `findMatches` 调用方（content / options tester）做二次过滤 |
| `options.js:1175 sanitizeImportedConfig` | 导入前若 `!Features.canUse('cookieMatch')`，过滤掉 cookie 规则并 toast 告知 |

**实现调整**：
- `content.js:38 findMatches` 后加 `if (!Features.canUse('cookieMatch')) matches = matches.filter(m => m.rule.type !== 'cookie')`
- `options.js:805 runTester` 同理

### 2.4 修复 `onPasteFromClipboard` 漏检

`options.js:1123` 开头加 `if (!Features.canUse('importExport')) { toast; return }`。
（虽然决策免费，但属于修齐避免未来回归。）

### 2.5 Pro UI

- **帮助面板**（`options.html:711-713` 反馈卡片上方）加：计划状态卡
  - Free 态：「免费版 · 已用 3/5 配置」+「升级 Pro」按钮（暂指向 `#` 或 `?` 弹 placeholder，阶段 4 接结账）
  - 试用态：「试用中 · 剩余 12 天 全功能解锁」+「升级 Pro」
  - Pro 态：「Pro 已激活」
- 锁图标样式：复用 `.help-feedback-link` 风格，加 `.pro-locked-badge`
- 超限 toast 文案：4 个键

### 2.6 i18n（必经生成器）

预估新增 12-16 键 × 5 语。流程：
1. `scripts/gen-locales.mjs`：
   - `KEY_ORDER` 末尾追加新键
   - `TRANSLATIONS.en` 加英文
   - `OVERRIDES.zh_CN/zh_TW/ja/es` 各加译文
   - `DESCRIPTIONS` 加 Chrome manifest description（仅 manifest 用的键）
2. `npm run gen-locales`
3. `npm run check-i18n` 必须 OK

新键清单（命名沿用 camelCase 风格）：
| 键 | 用途 |
| --- | --- |
| `planCardTitle` | 计划状态卡标题 |
| `planStatusFree` / `planStatusTrial` / `planStatusPro` | 计划状态文案 |
| `planUpgradeButton` | 升级按钮文案 |
| `planTrialDaysLeft` | 试用剩余天数（带占位符 `{n}`） |
| `planConfigUsage` | 配置使用量（带占位符 `{used} / {limit}`） |
| `toastConfigLimitReached` | 超限提示 |
| `toastConfigImportTruncated` | 导入截断（带 `{n}`） |
| `toastCookieLocked` | cookie 锁提示 |
| `ruleTypeCookieLockedHint` | cookie 选项 disabled 时的 tooltip |
| `proBadge` | 「Pro」小标签 |

### 2.7 验证清单

- [ ] `npm run check-i18n` OK
- [ ] 全新安装 → 试用期激活，Pro 功能可用，显示「试用中 · 剩 14 天」
- [ ] 改 `installedAt` 到 15 天前 → 降级 Free，cookie/6+ 锁住
- [ ] Free 态建到第 6 条 → 拦住
- [ ] Free 态复制配置到第 6 条 → 拦住
- [ ] Free 态导入 10 条（已有 3 条）→ 入 2 条，告知截断 8 条
- [ ] Free 态 cookie 规则：下拉禁用、tester 不匹配、导入被过滤
- [ ] Free 态 `smartColor` / `importExport` 仍可用
- [ ] 5 语 UI 走查无溢出
- [ ] 帮助面板显示计划卡

---

## 阶段 3：商店文案与素材同步

### 3.1 描述文案

⚠️ **Cookie 出现在多份描述里**，逐处决策：

| 文件:行 | 现内容 | 改动 |
| --- | --- | --- |
| `descriptions/zh_CN-detail.txt:6` | 列表首句「【六种匹配规则，覆盖真实场景】」 | 改为「【五种匹配规则，免费版完全够用】」 |
| `descriptions/zh_CN-detail.txt:12` | 「• Cookie — 按后端灰度分流的 canary / prod cookie」 | 删除该行（属 Pro） |
| `descriptions/zh_CN-detail.txt:14` | 「【核心特色】」列表 | 不变（视觉/功能卖点全部免费） |
| `descriptions/zh_CN-detail.txt:33` | 「使用建议」段 | 末尾追加「免费版可建 5 条配置；解锁 Pro 享受无限配置与 Cookie 规则」 |
| `descriptions/zh_CN-short.txt:1` | 「按域名 / URL / IP / Cookie 精准区分」 | 改为「按域名 / URL / IP 精准区分」 |
| `descriptions/en-detail.txt` | 同步 3 处 | 同步改 |
| `descriptions/en-short.txt:1` | 「host, URL, IP, or cookie」 | 改为「host, URL, or IP」 |

### 3.2 截图复核

- `screenshots/05-badge.png` —— 阶段 1 修复后需确认
- `screenshots/03-rules-config.png` —— 若加锁图标可能需重拍
- `screenshots/01-main-panel.png` —— 若帮助面板加了计划卡可能需重拍

### 3.3 验证清单

- [ ] 4 份描述不再把 Pro 功能当免费卖点
- [ ] 4 份描述明确点出 Free 5 条配置限制
- [ ] 截图仍反映实际行为

---

## 阶段 4：Supabase 后端 + License + 云同步 + 隐私政策重写

### 4.1 仓库与项目结构

**新增仓库 / 目录**（**待决策**：在当前仓库子目录还是新仓库？）

| 选项 | 优点 | 缺点 |
| --- | --- | --- |
| **A. 当前仓库 `supabase/` 子目录** | 单一仓库管理、PR 易追踪 | 仓库里混入非 Chrome 代码 |
| B. 新仓库 `web-watermark-backend` | 干净分离 | 两仓协同麻烦（API 改动需双向 PR） |

**建议 A**。当前仓库本来就有 `web-watermark-prompt/` 静态站子目录、`scripts/` 工具目录，
加一个 `supabase/` 子目录风格一致。

### 4.2 Supabase 项目配置

```sql
-- schema 草案（实施时再细化）
create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan text not null check (plan in ('pro')),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,           -- null = 永久
  paddle_order_id text unique,      -- 或 lemon_squeezy_order_id
  revoked boolean not null default false
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid references public.licenses(id) on delete cascade,
  fingerprint text not null,        -- 扩展生成的设备指纹
  last_seen_at timestamptz not null default now(),
  unique(license_id, fingerprint)
);

create table public.user_configs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  configs jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.licenses enable row level security;
alter table public.devices enable row level security;
alter table public.user_configs enable row level security;

create policy "user sees own license" on public.licenses
  for select using (auth.uid() = user_id);
create policy "user sees own devices" on public.devices
  for select using (license_id in (
    select id from public.licenses where user_id = auth.uid()
  ));
create policy "user reads/writes own configs" on public.user_configs
  for all using (auth.uid() = user_id);
```

### 4.3 扩展端新文件

```
src/
├── lib/
│   ├── supabase.js     # 封装 @supabase/supabase-js
│   ├── license.js      # 激活 / 校验 / 缓存
│   ├── fingerprint.js  # 设备指纹（hash chrome.runtime.id + 一随机持久 ID）
│   └── cloud-sync.js   # 同步策略（后写覆盖 / 手动选择 / 时间戳）
├── ui/
│   ├── license-panel.js   # 激活输入框、状态、错误码
│   └── plan-card.js       # 计划状态卡
```

### 4.4 扩展端新依赖

**首次引入 npm 依赖**。原 `package.json` 的 `devDependencies` 只有构建工具（resvg/pngjs），不打包进扩展。新增：

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x"
  }
}
```

⚠️ 扩展**不能用 ES modules 引入 npm 包**。两种方案：
- **A. 打包**（推荐）：用 `esbuild` 把 `supabase.js + 扩展 lib/` 打成一个 `vendor.js` 加进 `manifest`
- **B. 全局 UMD**：supabase-js 提供 `dist/umd/supabase.js`，直接拷贝到 `src/vendor/`

**建议 A**：保持代码风格一致；打包后体积增 ~50KB（gzip 后），Chrome 商店限制是 50MB 不在边缘。

新增 `scripts/build-vendor.mjs` 用 esbuild 打包 → 加 npm script `build:vendor`。
改 `package.json` 加 esbuild 到 devDependencies。

### 4.5 manifest 新权限

⚠️ **会触发新安装警告**：

```json
{
  "host_permissions": [
    "https://<your-supabase-project>.supabase.co/*"
  ]
}
```

Chrome 显示「Read and change your data on auth-related domains」警告。
需在隐私政策与商店问卷中说明用途。

### 4.6 业务流程

**4.6.1 注册 / 登录**
- options 加新 Tab 或 modal：「升级到 Pro」
- 邮箱 + magic link 登录（**不**自建密码）
- magic link 落地页：`https://jinnersun.github.io/web-watermark-prompt/auth-callback.html`
  - 解析 `access_token` / `refresh_token` 存 localStorage
  - 跳转 chrome-extension://<id>/options.html?license=pending
  - 扩展检测 `license=pending` 参数 → 跳激活流程

**4.6.2 付款** ⚠️ **待你决策**
- Paddle / Lemon Squeezy / 爱发电
- 需在 `paid-version.md` 已列的选项里定一个
- 决策前阶段 4.6.2 起无法实施

**4.6.3 License 激活**
- 用户付款后收到 license key
- 扩展内粘贴 → `POST /functions/v1/activate` { license_key, fingerprint }
- 函数校验：
  1. 查 license 是否存在且 `revoked = false`
  2. 已绑定设备数 < limit → 绑定新设备
  3. 已满 → 返回 `{ ok: false, error: 'device_limit' }`
- 成功 → 返回 license 详情 → 扩展缓存到 `storage.local.licenseCache`
- 失败 → 错误码 toast

**4.6.4 校验 / 续期**
- 启动时若 `licenseCache` 存在且未过期（24h），不调远端
- 超 24h 调 `POST /functions/v1/verify` { license_key, fingerprint }
- 网络失败 → 进入离线宽限（7 天），每启动 toast 提示「离线校验，到期后需联网」
- 校验失败 → 清缓存 + 降级 Free

**4.6.5 云同步**
- 写：每次 `saveToStorage` 后 1s debounce 调 `PUT /rest/v1/user_configs`（Supabase REST）
- 读：扩展启动时 `GET`，与本地 `storage.sync` 比 `updated_at`
- 冲突策略：默认「后写覆盖」，加设置项「手动选择」（v2.1 再做）
- 错误处理：写失败 toast + retry 1 次；3 次失败后停止同步（避免烦扰）

### 4.7 隐私政策重写（**必须**）

**当前声明**（`web-watermark-prompt/privacy-policy.html`）：「不收集任何数据」。
**阶段 4 完成后**必须改为：

| 收集项 | 用途 | 存储位置 | 保留期 |
| --- | --- | --- | --- |
| 邮箱 | 账户标识、magic link 登录 | Supabase Auth | 账户删除前 |
| 配置数据（云同步） | 跨设备同步 | Supabase Postgres | 账户删除前 |
| 设备指纹 | license 设备数限制 | Supabase Postgres | 解绑或 license 撤销 |
| 付款凭证（订单 ID） | license 与付款关联 | Supabase Postgres | 永久 |
| 试用时间戳 | 14 天试用判定 | `chrome.storage.local` | 永久（首次运行时） |

**改动**：
- `web-watermark-prompt/privacy-policy.html`：重写数据收集章节（中英两段）
- `docs/store-assets/privacy-policy.md`：同步重写
- **删除顶部待决策警告**（方案 A 已确认）
- **删除零收集声明**

### 4.8 商店隐私问卷更新

**从「不收集」改为「收集并声明」**：

- **Are you handling user data**: `Yes`（之前 No）
- **Data collection disclosure**：
  - Personal info: `Yes, collected`（email）
  - Website content: `No`（仍不读）
  - User activity: `No`（仍不上报）
  - Authentication info: `Yes, stored securely`（Supabase 加密）
- **Single purpose description** 不变
- **Permission justification**：
  - `storage`：不变
  - `host_permissions: https://*.supabase.co/*`：用于云同步与 license 校验

⚠️ **会触发人工审核**（从通常几小时 → 1-3 天）。这是正常的，不算阻塞。

### 4.9 阶段 4 验证清单

- [ ] Supabase 项目创建、schema 部署、RLS 测试
- [ ] Edge Function 部署 + CORS
- [ ] 扩展端：登录、激活、校验、离线宽限全流程跑通
- [ ] 云同步：两端同时改配置的冲突处理
- [ ] 设备数限制、超额降级
- [ ] 退款 / license 撤销流程
- [ ] 隐私政策重写上线（GitHub Pages 自动部署）
- [ ] 商店问卷更新
- [ ] 跨浏览器 profile 验证

### 4.10 阶段 4 子顺序

1. Supabase 项目创建 + schema 部署（**依赖**外部账号）
2. Edge Function 骨架 + 激活/校验接口
3. 扩展 `lib/supabase.js` + `lib/license.js`（vendor 打包）
4. 扩展 `license-panel.js` + `plan-card.js`（UI）
5. 扩展接 logic 校验
6. **付款通道决策**（**阻塞** 4.6.2）
7. 端到端联调
8. 隐私政策重写
9. 商店问卷更新
10. 联调回归

---

## 阶段依赖图

```
阶段 1 (Badge 修复)
  └─ 独立

阶段 2 (门控层 + 试用期)
  ├─ 独立
  └─ 不依赖阶段 1

阶段 3 (文案素材)
  ├─ 不依赖阶段 1 / 2（Cookie 在描述里早已是卖点）
  └─ 与阶段 1 / 2 并行

阶段 4 (Supabase + License)
  ├─ 依赖阶段 2（features.canUse 需就绪）
  ├─ 依赖阶段 3（隐私政策重写）
  └─ 阻塞 4.6.2：付款通道决策（待你拍）
```

---

## 提交节奏

| 序号 | 提交 | 内容 |
| --- | --- | --- |
| 1 | `fix: badge 无法显示（消息传递）` | 阶段 1 |
| 2 | `feat: features 门控层 + 14 天本地试用` | 阶段 2.1 |
| 3 | `feat: 配置数与 cookie 规则门控 + Pro UI` | 阶段 2.2-2.6 |
| 4 | `docs: 商店文案 + 隐私政策待改项标出` | 阶段 3（先标不重写） |
| 5 | `chore: supabase 项目骨架 + schema` | 阶段 4.1-4.2 |
| 6 | `feat: license 激活与校验（前端 + Edge Function）` | 阶段 4.3-4.6 |
| 7 | `feat: 云同步 + 设备指纹` | 阶段 4.6.5 |
| 8 | `docs: 隐私政策重写（零收集 → 声明收集项）` | 阶段 4.7 |
| 9 | `release: v2.0.0` | 打包 + tag |

---

## 待你拍板的 6 项

1. **试用天数 = 14 天**？或要 7 / 21 / 30？
2. **后端代码位置**：当前仓库 `supabase/` 子目录 vs 新仓库？
3. **vendor 打包方案**：esbuild 引入（~50KB gzip）vs 拷 UMD（更直接但脏）？
4. **设备指纹方案**：扩展 ID（每次重新加载变）+ 持久随机 ID（防换号）？还是用 `chrome.storage.local` 存首次安装 UUID？
5. **付款通道**：Paddle / Lemon Squeezy / 爱发电？**这是阶段 4.6.2 硬阻塞**
6. **云同步冲突策略默认值**：后写覆盖（自动） vs 永远手动选择？

**附：阶段 4 之前可并行起步**（不阻塞决策 1-6）：
- 阶段 1 badge 修复可立刻开始
- 阶段 2 features.js 重构可立刻开始
- 阶段 3 描述文案可立刻开始

---

## 仍需你确认的策略

**Supabase 部署位置**：
- Supabase 项目放哪个 region？建议 US East（Cloudflare 之外最便宜） 或 Singapore（亚洲延迟好）
- **建议 Singapore**，你在国内，Cloudflare 实践也用类似区域

**离线宽限期**：
- 默认 7 天，是否调整？

**license 设备数**：
- 3 / 5 / 10？影响隐私政策的「设备指纹收集」声明的具体性

确认上述 6 项 + 这 3 项策略后，我开始阶段 1。
