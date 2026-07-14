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
- 工具栏 badge 短标签（`shortLabel`，最多 4 字符，如 `PROD` / `TEST`）
- 跨 iframe 独立匹配（`content_scripts.all_frames: true`）

### 配置管理
- 侧栏配置列表 + 搜索
- 新建 / 复制 / 删除配置（删除有二次确认弹窗）
- 规则增删（删除有二次确认弹窗）
- 规则测试器（贴 URL + 可选 Cookie，实时高亮命中规则）
- 实时预览（浅底 / 深底 / 渐变底三种画布同步渲染）
- JSON 导入 / 导出

### 国际化
- 完整中英双语字典（`src/i18n.js`）
- 所有 UI 通过 `data-i18n / data-i18n-placeholder / data-i18n-title` 打标
- **v2.0 正式启用多语言切换**（`Features.multiLang` 从 `DISABLED_FEATURES` 挪出）
- 默认语言跟随浏览器 `chrome.i18n.getUILanguage()`，手动切换持久化到 storage

### 帮助与文档
- 页内帮助面板（右上角 `?` 按钮弹出居中抽屉）
- 6 种规则类型详解 + 使用小提示
- 键盘 Esc 关闭

### 上架材料相关
- 图标：16 / 48 / 128 三档
- 隐私政策：**不收集任何用户数据**（所有配置存 `chrome.storage.sync`，仅同步到用户自己的 Chrome 账号，不经过任何第三方服务器）

## v2.0 待完成清单（发布阻塞项）

按你确认的发布路线，以下 3 个是发版前必须做完的最后一批：

### 1. 颜色选择器优化 ⏳
- 当前原生 `<input type="color">` 视觉突兀
- 方案 C（环境预设色块 + 自定取色器）已在另开对话推进
- **单独窗口进行中**

### 2. 一键复制 prompt + 从剪贴板导入 ⏳
- **一键复制**：在"规则测试"卡片下方或顶部工具栏加按钮 `🤖 让 AI 帮我写规则`
  - 点击拼装：内联的 PROMPT 文本 + 当前配置快照 → 复制到剪贴板 → toast 成功提示
  - PROMPT 文本源：`https://github.com/jinnersun/web-watermark-prompt/blob/main/PROMPT.md`（内联版本随扩展打包，仓库版本作为独立入口）
- **从剪贴板导入**：顶部导入按钮旁加 `📋 从剪贴板导入` 按钮
  - 读 `navigator.clipboard.readText()` → JSON.parse → 复用现有 `sanitizeImportedConfig` → 展示"已成功导入 N 条配置"toast
  - 失败时提示"剪贴板内容不是有效的 JSON 配置"
- 附带 UI：加一个小链接 `📖 查看提示词源文件` 指向 `https://github.com/jinnersun/web-watermark-prompt/blob/main/PROMPT.md`

### 3. 反馈入口 ⏳
- 帮助面板底部或右上角加一个"反馈 / 建议"按钮
- 实现方式：链接到 `https://github.com/jinnersun/web-watermark-prompt/issues`（先临时用这个仓库的 issues，扩展本身仓库开好之后再改指向）
- 一行代码改动，一条 i18n key

## v3.0（付费版，本次不做）

以下功能**代码框架保留**（`features.js` 已声明为 `PAID_FEATURES`），**UI 不出现**：

- Supabase 邮箱认证 + 7 天免费试用 + 一次性买断 $9.9
- Lemon Squeezy 收款
- IP 匹配（真实服务器 IP，走 `chrome.webRequest.onCompleted`，需 `webRequest` 权限，v2.0 用的是 hostname IPv4 字面量匹配，不需要该权限）
- 云同步（Supabase 存储用户配置，跨设备）
- 团队共享配置
- 无限配置数量（v2.0 不设上限，v3.0 免费版将限 5 条，Pro 版无限）
- 动态变量 `{user}/{date}/{host}/{path}/{time}`
- 配置存储配额预警条
- 设置面板 + 暗色主题

## 版本号约定

- **v2.0.0** — 本次上架版本
- **v2.0.x** — 上架后基于用户反馈的 bug 修复 / 微调
- **v2.1.x** — 非破坏性小功能追加（如新增规则类型、UI 微调）
- **v3.0.0** — 付费版首发，破坏性升级到需登录的架构
