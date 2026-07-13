# 待办 & Roadmap

按优先级 / 归属方向记录后续要做的功能。已完成的 √ 掉即可。

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
- 🎯 **颜色选择器优化**：现有原生 <input type="color"> 体验差，需要视觉升级
  - 方案对比：
    - 方案 A：饼图（色轮）点击选色
    - 方案 B：6×6 正方形色彩矩阵 + 自定义取色器
    - 方案 C：行内 5-8 个环境预定义色块（红/橙/黄/绿/蓝/紫/灰/黑）+ 自定取色器 ⭐ 推荐
- 🎯 **规则命中状态高亮**：当前访问页面命中某条规则时，该规则行高亮显示命中标签

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

### 一键复制规则给 Agent（"让 AI 帮我写规则"）
**背景**：新用户面对 6 种规则类型 + Cookie 语法 + IP CIDR，可能懒得学；直接把「我们的规则说明」+「我想要的效果」丢给 ChatGPT / Claude / Codex 让 AI 输出一段规则，是最低门槛。

两种可选实现（**都可以做**，不冲突）：

**方案 A：扩展内一键复制**
- 在 options 页某处（比如"规则测试"卡片下方）加一个「让 AI 生成规则」按钮
- 点击后把下列内容拼装成一段 Markdown 复制到剪贴板：
  - 扩展的规则语法说明（6 种 type，各自 value 语法）
  - 当前配置的表单快照（作为 few-shot 示例）
  - 一个占位符提示："请在这里描述你的场景"
- 用户粘到任意 AI 对话里，AI 会输出 JSON 片段，用户再回到扩展"从剪贴板导入"即可
- 需要新增一个"从剪贴板导入"按钮，配合已有的 sanitizeImportedConfig

**方案 B：独立 Skill / Prompt（放 GitHub）**
- 在 <https://github.com/...> 开个仓库存 `SKILL.md` 或 `PROMPT.md`
- 内容：规则语法说明 + 示例输入输出 + 直接可粘贴的 system prompt
- 用户在 Claude / Codex / Cursor 里 import 这个 skill / 复制 prompt，之后随时问"帮我给 XX 网站生成水印配置"

**建议先做 B**（GitHub prompt 文件），零代码改动、门槛最低、可迭代；A 是等 prompt 沉淀后再做的糖衣。

**Prompt 骨架草案**（先记这里，后期再抽取）：

```
You are helping the user configure the "Web Watermark Tool" Chrome extension.

The tool matches pages by rules and injects a customized watermark.
Rule types (each config has multiple rules, ANY match triggers, most-specific wins):

- host-exact:   Exact hostname, e.g. "cust.example.com"
- host-suffix:  hostname === value OR hostname endsWith "." + value
- url-regex:    RegExp against full URL. Max 200 chars. Nested quantifiers like (a+)+ are rejected.
- ip-exact:     Only matches when browser hostname is an IPv4 literal
- ip-cidr:      IPv4 CIDR, e.g. "10.20.30.0/24"
- cookie:       "name" -> exists; "name=value" -> equals; "name~=fragment" -> contains

Watermark config fields (JSON):
{
  "name": "生产环境",
  "shortLabel": "PROD",       // <= 4 chars, shown on toolbar badge
  "enabled": true,
  "rules": [{ "type": "host-exact", "value": "cust.example.com" }],
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

### 反馈入口
- options 页顶部或侧边加一个"反馈 / 建议"入口
- 可选实现方案：
  1. mailto 链接（最简单，`?subject=[Web Watermark Feedback] ...`）
  2. GitHub Issues 链接（跳到仓库 issue 页）
  3. 自建表单（Cloudflare Workers + D1，未来跟 license 同一套后端）
- **建议先做 GitHub Issues 链接**，等仓库开好之后加一行就行

## 中优先级

### 多语言支持正式启用
- 现有代码已经全部走 i18n，字典完整
- 启用步骤：`src/features.js` 里把 `multiLang` 从 `DISABLED_FEATURES` 挪到 `FREE_FEATURES` 即可
- 启用后：语言切换按钮自动显示、`switchLang` 正常工作、`getStoredLang` 恢复自动检测
- 启用前 QA：确认所有 UI 都通过 `data-i18n / data-i18n-placeholder / data-i18n-title` 打了标签，动态渲染部分用 `t()` / `tf()`

### 配置拖拽排序
- 侧栏配置列表支持拖拽调整顺序（决定同分匹配时的优先级，也让用户能自主排列）
- 用 HTML5 draggable + 保存到 storage

### 动态变量支持
- 水印文本支持占位符：`{user}` / `{date}` / `{time}` / `{host}` / `{path}`
- 需要在 options 里加"用户显示名"字段（存 storage.sync.userDisplay），因为浏览器拿不到系统账号
- 已在 `features.js` 标记为 `dynamicVars` PAID 候选

### 从剪贴板导入
- 配合"一键复制规则给 Agent"使用；用户从 AI 复制 JSON → 一键导入
- 复用 sanitizeImportedConfig，UI 上加一个「粘贴 JSON 导入」按钮

## 低优先级 / 长期

### 付费版落地
- 见 `docs/paid-version.md`
- 涉及：Cloudflare Workers + D1 后端、Paddle/Gumroad 收款、license 校验、扩展内激活 UI

### 字体家族可选
- 微软雅黑在 Mac / Linux 上没有会回退
- 提供"系统 UI / 等宽 / 衬线"三档下拉

### 更好的 badge
- 目前 badge 文本只支持 4 字符纯文本
- 未来可以做自定义 canvas 图标（`chrome.action.setIcon` 传 ImageData），支持任意样式
- 或多个 tab 分别不同颜色

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
- 多语言字典完整保留 + 门控关闭