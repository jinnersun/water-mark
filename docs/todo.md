# 待办 & Roadmap

按优先级 / 归属方向记录后续要做的功能。已完成的 √ 掉即可。

## 🔴 发布阻塞 BUG（最高优先级）

### ✅ 鼠标渐隐不响应滚轮 —— 已修复（2026-08-10），待浏览器验证
- 修法：`installMouseFade` 补 `wheel` + `touchmove` 监听（含 dispose 清理），去抖逻辑不动
- 详见 `docs/v2-implementation-plan.md` 阶段 1-B

### ✅ Badge 无法显示 —— 已修复（2026-08-10 消息传递重构），待浏览器干净加载验证
- 根因：MV3 下 background 读不到 `tab.url`（无 tabs 权限 / host permission），旧 badge 逻辑全是死代码
- 修法：content script 算好命中结果后 `runtime.sendMessage` 上报，background 用 `sender.tab.id` 设 badge；零新增权限，顺带修复 cookie 规则 badge 失效
- 详见 `docs/v2-implementation-plan.md` 阶段 1-A

## 已决策记录

- ✅ **反馈入口**：保持使用 prompt 仓库 GitHub Issues。备选叠加自有 EasyForm（<https://www.easyform.dpdns.org/>）做非 GitHub 用户的反馈通道 —— 需单独做 `feedback.html` 挂 GitHub Pages（扩展内不能直接嵌 script），列为 v2.1 增强
- ✅ **商店 listing 语言**：不补 zh_TW / ja / es 描述，v2.0 只上中英两套
- ✅ **付费限制时机**：上线前就加入（无历史用户，可自由划分功能归属）
- ✅ **`promo-920x680.png`**：Chrome 已废弃该尺寸，不做
- 🔶 **付费技术栈**：倾向 Supabase（Cloudflare 无对标 Supabase Auth 的消费级认证产品，自建需接邮箱验证/OAuth/邮件服务商）。待确认云同步是否进首发

## UI 整体优化（按优先级）

### 高优先级（待修复）
- ✅ 开关样式崩坏：超长蓝条、滑块不在轨道内
- ⏳ 开关标签文字重叠（"前配置"文字和圆点挤在一起）
- ✅ 标签输入框视觉反馈（标准文本框 + 图标 + focus 高亮）（无边框、无hover、无label说明）
- ✅ 侧栏选中态左侧 3px 主色竖条
- ✅ 按钮组统一 32px 高度、间距紧凑
- ✅ 右上角导入/导出分组 + 分割线，视觉分离清晰
- ✅ 外观Tab实时预览水印tile渲染
- ✅ 实时预览文字展示不全 / 裁剪问题
- ✅ 智能对比色开关与标签对齐

### 中优先级（体验）
- Tab 下划线与文字对齐优化、hover 态增强
- 规则行删除按钮放大 + hover 红色反馈
- 所有 input / select 统一 focus 蓝边高亮
- Toast 圆角 / 阴影升级，与卡片风格统一

### 已完成 ✅
- ✅ 开关样式崩坏超长蓝条
- ✅ 实时预览文字裁切问题
- ✅ 帮助面板 DOM 缺失 + 事件绑定位置错误
- ✅ 规则删除 / 删除配置 二次确认居中模态框
- ✅ 导入确认居中模态框

### UI 优化（进行中）
- ✅ **颜色选择器优化**：已落地 `src/color-picker.js`，采用方案 C（8 个环境预设色块 4×2 + 最近使用 6 个 + 自定取色器）
- 🎯 **规则命中状态高亮**：当前访问页面命中某条规则时，该规则行高亮显示命中标签（**未实现**，代码里搜不到相关逻辑）

### 匹配逻辑（待单独开窗口讨论）
- 🔍 **规则去重与冲突检测**
  - 级别 A（必须做）：同配置内完全重复的 (type, value) 禁止重复添加
  - 级别 B（建议做）：同配置内添加新规则时检测「会被更精确规则覆盖」，给出警告
  - 级别 C（可选）：跨配置去重，检测某规则是否已存在于其他配置中
  - 导入去重策略：默认跳过重复，可切换为「完全追加 / 覆盖同名配置」
- 🔍 **匹配结果展示优化**
  - 规则测试器显示「命中了第 N 条规则」
  - 规则行上显示「✅ 当前命中」实时标签
- 🔍 **优先级确认**：现有 score 计算逻辑全场景验证

### 低优先级（细节）
- 开关 hover 态 阴影微变化
- range 滑块 hover 态 阴影扩散
- 所有按钮 active 态 0.98 缩放微反馈

## 高优先级（下一版）

> 以下三项（AI prompt、反馈入口、多语言）**已在 v2.0 完成**，保留原始设计记录备查，详见 `docs/v2-manifest.md`。

### ✅ 一键复制规则给 Agent（"让 AI 帮我写规则"）—— 已完成
**背景**：新用户面对 6 种规则类型 + Cookie 语法 + IP CIDR，可能懒得学；直接把「我们的规则说明」+「我想要的效果」丢给 ChatGPT / Claude / Codex 让 AI 输出一段规则，是最低门槛。

**最终实现：方案 A + 方案 B 都做了**

**方案 A：扩展内一键复制** ✅
- `options.html:335` `#copy-prompt-btn` → `options.js` `onCopyPrompt`
- 拼装内联 PROMPT（`options.js:72` 起）+ 当前配置快照 → 剪贴板 → toast
- `options.html:342` `#paste-clipboard-btn` → `onPasteFromClipboard`，复用 `sanitizeImportedConfig`
- `options.html:349` 「查看提示词源文件」链接

**方案 B：独立 Prompt 仓库** ✅
- <https://github.com/jinnersun/web-watermark-prompt>
- 已有 `PROMPT.md` / `PROMPT.zh_CN.md` / `EXAMPLES.md` / `EXAMPLES.zh_CN.md`

**Prompt 骨架草案**（先记这里，后期再抽取）：

```
You are helping the user configure the "Web Watermark Tool" Chrome extension.

The tool matches pages by rules and injects a customized watermark.
Rule types (each config has multiple rules, ANY match triggers, most-specific wins):

- host-exact:   Exact hostname, e.g. "app.example.com"
- host-suffix:  hostname === value OR hostname endsWith "." + value
- url-regex:    RegExp against full URL. Max 200 chars. Nested quantifiers like (a+)+ are rejected.
- ip-exact:     Only matches when browser hostname is an IPv4 literal
- ip-cidr:      IPv4 CIDR, e.g. "192.0.2.0/24"
- cookie:       "name" -> exists; "name=value" -> equals; "name~=fragment" -> contains

Watermark config fields (JSON):
{
  "name": "生产环境",
  "shortLabel": "PROD",       // <= 4 chars, shown on toolbar badge
  "enabled": true,
  "rules": [{ "type": "host-exact", "value": "app.example.com" }],
  "text": "生产环境 - 谨慎操作",
  "color": "#ef4444",
  "opacity": 0.15,
  "density": 300,
  "fontSize": 24,
  "rotation": -30,
  "smartColor": false,
  "smartColorTone": "light",
  "border": { "enabled": true, "color": "#ef4444", "width": 4 },
  "mouseFade": { "enabled": true, "fadeOpacity": 0.03, "resumeDelay": 2000 }
}

Task: The user will describe their scenario. Reply with a JSON array
of one or more configs, ready to paste into the extension's Import dialog.
```

### ✅ 反馈入口 —— 已完成
- 实现位置：帮助面板底部「反馈 / Bug 报告」卡片（`options.html:711-713`）
- 指向 <https://github.com/jinnersun/web-watermark-prompt/issues>
- i18n key `helpFeedbackTitle / helpFeedbackDesc / helpFeedbackLink`，5 语言齐全
- ✅ **已决策**：保持使用 prompt 仓库，不为扩展单开仓库
- 🔶 **v2.1 增强候选**：接入自有 EasyForm（<https://www.easyform.dpdns.org/>）作为非 GitHub 用户的反馈通道
  - 免费额度 100 次/月，含 AI 反垃圾 + AI 摘要，Resend 送信
  - 实现路径：GitHub Pages 上挂 `feedback.html` 内嵌 EasyForm script，扩展里链过去（扩展内不能直接嵌外部 script，CSP 限制）

## 中优先级

### ✅ 多语言支持正式启用 —— 已完成
- `src/features.js:18` `multiLang` 已在 `FREE_FEATURES`，`DISABLED_FEATURES` 为空
- 五语齐全：en / zh_CN / zh_TW / ja / es（`src/i18n-messages.js` + `src/_locales/`）
- ⏳ **遗留 QA**：五语的实际 UI 走查（尤其 ja / es 的长文案是否溢出布局）尚未做

### ✅ 从剪贴板导入 —— 已完成
- `options.html:342` `#paste-clipboard-btn` → `onPasteFromClipboard`，复用 `sanitizeImportedConfig`

### 配置拖拽排序
- 侧栏配置列表支持拖拽调整顺序（决定同分匹配时的优先级，也让用户能自主排列）
- 用 HTML5 draggable + 保存到 storage
- 状态：**未实现**（代码里无 `draggable`）

### 动态变量支持
- 水印文本支持占位符：`{user}` / `{date}` / `{time}` / `{host}` / `{path}`
- 需要在 options 里加"用户显示名"字段（存 storage.sync.userDisplay），因为浏览器拿不到系统账号
- 已在 `features.js` 标记为 `dynamicVars` PAID 候选
- 状态：**未实现**，但 5 语言的 `textHint` 已埋「未来将支持 {user} / {date} 等变量」文案 —— 这是对用户的隐性承诺，需要兑现或改文案

## 低优先级 / 长期

### 付费版落地
- 见 `docs/paid-version.md`
- ✅ **已决策**：上线前就加入付费限制（无历史用户）
- 🔶 技术栈倾向 Supabase（认证开箱即用）
- ⚠️ **重要发现**：`features.js` 里 `cookieMatch` / `unlimitedConfigs` / `dynamicVars` 等键的 `canUse()` **实际调用点为 0**，是空壳声明。挪 key 不产生任何效果，需真正写门控逻辑（`cookieMatch` 3 处、`unlimitedConfigs` 2 处）
- ⚠️ **强制约束**：任何转 Pro 的功能，必须同步删改 `docs/store-assets/descriptions/` 下 4 份商店文案里的对应卖点，否则构成虚假宣传（拒审理由）

### 字体家族可选
- 微软雅黑在 Mac / Linux 上没有会回退
- 提供"系统 UI / 等宽 / 衬线"三档下拉

### 更好的 badge
- 目前 badge 文本只支持 4 字符纯文本
- 未来可以做自定义 canvas 图标（`chrome.action.setIcon` 传 ImageData），支持任意样式
- 或多个 tab 分别不同颜色
- 图标源已是 SVG（`src/icons/source/icon.svg`），未来可以用 `OffscreenCanvas` + drawImage 组合出"当前环境色调 + 白 W"的动态图标，直接通过 `chrome.action.setIcon({ tabId, imageData })` 应用

### 可访问性
- 键盘导航（Tab / Enter / Esc）
- 高对比度主题
- 屏幕阅读器友好

### 单元测试规范化
- 现在的冒烟测试是临时脚本
- 迁到 `test/` 目录，用 `node --test` + `--experimental-vm-modules`（或加个极简 test 工具）
- 覆盖 watermark-core 的所有 matchRule 分支

### Options 页暗色主题
- 现在只有浅色

### iframe 里传递主页面 URL
- 跨源 iframe 无法读到主页面 URL；如果需要"某个第三方嵌入的支付页也打上主站的水印"，需要主站主动 postMessage 通知 iframe
- 或者 background 收集 tab.url 通过 chrome.tabs.sendMessage 广播给所有 frame
- 属于比较专业的场景，收到用户明确需求再做

### 数据同步限制预警
- chrome.storage.sync 单项 8 KB / 总量 100 KB，用户配置多 / 文本长时可能超限
- 目前有错误 toast，未来可以在编辑区实时估算存储占用条并提示

## 已完成 ✅

- v2.0 匹配规则重构（6 类）
- 智能对比色（mix-blend-mode）
- 沉浸式边框
- 鼠标交互渐隐
- 实时预览 + URL 测试器
- 全局总开关
- 导入 / 导出 JSON
- 侧栏搜索
- 特性门控层 `features.js`（预留付费拆分）
- iframe 独立匹配（`all_frames: true`）
- 工具栏图标 badge（shortLabel，短标签）
- 多语言字典完整（en / zh_CN / zh_TW / ja / es，跟随浏览器 + 手动切换）并正式启用
- 图标矢量化重制：SVG 单一源 (`src/icons/source/`) + `scripts/gen-icons.mjs` 一键导出 16/48/128（`npm run gen-icons`）；options logo 引用打包产物 `icons/icon48.png`（`source/` 仅为构建输入，不进 zip）
- 颜色选择器（`src/color-picker.js`）：8 环境预设色 + 最近使用 + 自定取色器
- 一键复制 AI 提示词 + 从剪贴板导入
- 反馈入口（帮助面板 → GitHub Issues）
- 上架素材：5 张 1280×800 截图、2 张 promo tile（440×280 / 1400×560）、中英文短/详描述、隐私政策挂 GitHub Pages
- 独立 prompt 仓库 <https://github.com/jinnersun/web-watermark-prompt>（PROMPT / EXAMPLES 中英双语）
