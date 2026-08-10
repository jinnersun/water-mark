# v2.0 Feature Manifest / v2.0 功能清单

发布 Chrome Web Store 前的最后一份"已完成 / 待完成"清单。用于对齐上架素材、README、隐私政策的表述。

## 版本定位

**Web Watermark Tool v2.0** — 免费全功能版。所有付费想法（v3.0 讨论中）在本版本**不启用**，付费门控仅在代码层预留（`src/features.js` 里的 `PAID_FEATURES` 与 `DISABLED_FEATURES`），UI 无任何"升级到 Pro"入口。

## 核心能力（已完成 ✅）

### 匹配规则 —— 6 种类型
- **host-exact** — 精确域名匹配（如 `app.example.com`）
- **host-suffix** — 域名后缀匹配（含子域，`example.com` 匹配 `a.example.com`）
- **url-regex** — URL 正则（最长 200 字符，防 ReDoS 嵌套量词校验）
- **ip-exact** — IPv4 精确匹配
- **ip-cidr** — IPv4 CIDR 网段匹配
- **cookie** — Cookie 存在 / 等值 / 包含（`name` / `name=value` / `name~=fragment`）

多规则命中"最精确者胜"策略：host-exact > ip-exact > url-regex > host-suffix > ip-cidr > cookie。

### 水印外观
- 自定义文字（支持 `\n` 换行）
- 颜色、透明度、密度（tile 间距）、字号、旋转角度
- **智能对比色** — `mix-blend-mode: difference`，浅色底自动变深、深色底自动变浅
- 明暗底色调提示（`smartColorTone: light | dark`）作为智能变色的补偿

### 提醒强化
- **沉浸式边框** — 视口四周固定像素级实线边框（inset box-shadow），生产环境高警觉
- **鼠标交互渐隐** — 检测到高频鼠标活动 / 输入焦点时水印透明度自动降低，静止后恢复

### 全局与工具栏
- 全局总开关（Storage sync 持久化）
- 工具栏 badge 短标签（`shortLabel`，最多 4 字符，如 `PROD` / `TEST`）—— 🔴 **当前有 BUG 无法显示，见下方权限章节**
- 跨 iframe 独立匹配（`content_scripts.all_frames: true`）


### 配置管理
- 侧栏配置列表 + 搜索
- 新建 / 复制 / 删除配置（删除有二次确认弹窗）
- 规则增删（删除有二次确认弹窗）
- 规则测试器（贴 URL + 可选 Cookie，实时高亮命中规则）
- 实时预览（浅底 / 深底 / 渐变底三种画布同步渲染）
- JSON 导入 / 导出
- **从剪贴板导入**（读 `navigator.clipboard.readText()` → 复用 `sanitizeImportedConfig`）
- **一键复制 AI 提示词**（内联 PROMPT + 当前配置快照 → 剪贴板）

### 颜色选择器（`src/color-picker.js`）
- 包裹隐藏的原生 `<input type="color">` 作为唯一数据源，数据模型零改动
- 8 个环境预设色（4×2）：生产红 / 预发橙 / 灰度琥珀 / 测试绿 / UAT 青 / 开发蓝 / 沙箱紫 / 其他石板灰
- 「最近使用」持久化到 `chrome.storage.local`（最多 6 个，去重，排除预设色）
- 「自定义…」按钮唤起系统取色对话框
- Popover 单例：打开第二个会关闭第一个

### 国际化
- 完整五语字典（`src/i18n-messages.js` + `src/_locales/`）：en / zh_CN / zh_TW / ja / es
- 所有 UI 通过 `data-i18n / data-i18n-placeholder / data-i18n-title` 打标
- **v2.0 正式启用多语言切换**（`multiLang` 已在 `FREE_FEATURES`，`DISABLED_FEATURES` 为空）
- 默认语言跟随浏览器 `chrome.i18n.getUILanguage()`，手动切换持久化到 storage

### 帮助与文档
- 页内帮助面板（右上角 `?` 按钮弹出居中抽屉）
- 6 种规则类型详解 + 使用小提示
- 键盘 Esc 关闭
- **反馈入口**：帮助面板底部「反馈 / Bug 报告」卡片 → GitHub Issues

### 上架材料相关
- 图标：SVG 单一源（`src/icons/source/`）+ `npm run gen-icons` 导出 16 / 48 / 128
- 隐私政策：**不收集任何用户数据**（所有配置存 `chrome.storage.sync`，仅同步到用户自己的 Chrome 账号，不经过任何第三方服务器）
- 已挂载：<https://jinnersun.github.io/web-watermark-prompt/privacy-policy.html>（中英双语）

## 权限清单（`src/manifest.json`）

v2.0 实际只申请 **一个** 权限：

| 权限 | 用途 |
| --- | --- |
| `storage` | 持久化用户配置（`chrome.storage.sync`）与最近使用颜色（`chrome.storage.local`） |

`content_scripts.matches: ["<all_urls>"]` 用于按用户自定义规则在任意页面叠加水印，不读取、不上传页面内容。

> 🔴 **Badge BUG（已实测确认，发布阻塞）**：`background.js:38` 依赖 `tab.url`，但 MV3 下读该字段需 `tabs` 权限**或**匹配的 host permission，而 `content_scripts.matches` **不授予** host permission。当前二者皆无 → `tab.url` 为 `undefined` → 第 39 行判断成立 → badge 永不显示。
>
> `activeTab` **不是解**：它只在用户点击图标后对当前页临时授权，而 badge 需在每次导航时无手势自动更新。
>
> 附带第二个 BUG：`background.js:32` 传空 cookie 串，导致 **cookie 类型规则的 badge 永久失效**，即使权限修好也一样。
>
> 修复方案对比与选型见 `docs/publish-guide.md` 第七节 #1。权限方案确定后需同步隐私政策（已上线版本声明了 `activeTab`，与 manifest 不一致）。


## v2.0 发布阻塞项 —— 已全部完成 ✅

原定发版前必须做完的最后一批，均已落地：

### 1. 颜色选择器优化 ✅
- `src/color-picker.js`（382 行）+ `options.css` 的 `.cp-*` 样式
- 采用方案 C：环境预设色块 + 最近使用 + 自定取色器

### 2. 一键复制 prompt + 从剪贴板导入 ✅
- `options.html:335` `#copy-prompt-btn` → `options.js` `onCopyPrompt`（内联 PROMPT 见 `options.js:72` 起）
- `options.html:342` `#paste-clipboard-btn` → `options.js` `onPasteFromClipboard`
- `options.html:349` 提示词源文件链接 → `web-watermark-prompt/blob/main/PROMPT.md`
- 空输入保护：prompt 内置指令要求 AI 先反问场景细节，不直接吐 JSON

### 3. 反馈入口 ✅
- `options.html:711-713` 帮助面板底部卡片 → GitHub Issues
- i18n key `helpFeedbackTitle / helpFeedbackDesc / helpFeedbackLink`，5 语言齐全

### 附带完成（原计划外）
- 图标矢量化重制：SVG 单一源 + `scripts/gen-icons.mjs`
- 上架素材：5 张 1280×800 截图、2 张 promo tile（440×280 / 1400×560）、中英文短/详描述

## v2.0 发布阻塞项（新）

### 🔴 Badge 无法显示 —— 实测确认的 BUG
- 根因与修复方案见上方「权限清单」注释 + `docs/publish-guide.md` 第七节 #1
- 附带：cookie 规则的 badge 永久失效（`background.js:32` 空 cookie 串）
- **必须修完才能上架**（badge 是商店截图 05 的卖点，也写进了描述文案）

## v2.0 待验证（非代码，发版前）

- [ ] 🔴 badge 修复后回归验证（含 cookie 规则）
- [ ] 五语 UI 走查（ja / es 长文案是否溢出布局）
- [ ] `chrome.storage.sync` 在多个 Chrome profile 间同步验证
- [ ] `git tag v2.0.0`
- [ ] Chrome Web Store 开发者账号 $5

## v3.0（付费版，本次不做）

> ⚠️ **范围可能变化**：你已提出「上线前就加入付费限制」，若采纳，下列部分功能会提前到 v2.0。改动量评估见 `docs/paid-version.md`。

以下功能**代码框架保留**（`features.js` 已声明为 `PAID_FEATURES`），**UI 不出现**：

- 云同步（跨设备存储用户配置）
- 团队共享配置
- IP 匹配（真实服务器 IP，走 `chrome.webRequest.onCompleted`，需 `webRequest` 权限；v2.0 用的是 hostname IPv4 字面量匹配，不需要该权限）
- 动态变量 `{user}/{date}/{host}/{path}/{time}`
- 配置存储配额预警条
- 设置面板 + 暗色主题
- 无限配置数量（v2.0 不设上限）

> **认证 / 收款 / 定价 / Free 版限制均未定案**。本文档早期草稿（Supabase + Lemon Squeezy + $9.9 买断）与 `docs/paid-version.md`（Cloudflare Workers + D1 + Paddle/爱发电，$9–15）曾互相冲突；**倾向已明确为 Supabase**（认证开箱即用），详见 `docs/paid-version.md`。

> ⚠️ **归属决策变更**：原建议「已免费功能永久免费」。你已提出**上线前收回**（无历史用户，零差评风险）。若采纳，**必须同步修改 `docs/store-assets/descriptions/` 下 4 份文案**，删除转为 Pro 的功能卖点，否则构成虚假宣传（明确拒审理由）。改动量评估见 `docs/paid-version.md`。

## 版本号约定

- **v2.0.0** — 本次上架版本
- **v2.0.x** — 上架后基于用户反馈的 bug 修复 / 微调
- **v2.1.x** — 非破坏性小功能追加（如新增规则类型、UI 微调）
- **v3.0.0** — 付费版首发，破坏性升级到需登录的架构
