# Chrome Web Store 发布指南（v2.0 首次上架）

从"代码开发完"到"用户在商店能搜到并安装"的完整流程。你之前没发过，尽量按顺序走。

---

## 一、发布前置清单

### 1.1 代码层面（对齐 `docs/v2-manifest.md`）

- [ ] 颜色选择器优化完成
- [ ] 一键复制 prompt + 从剪贴板导入完成
- [ ] 反馈入口完成
- [ ] `src/manifest.json` 版本号改为 `"version": "2.0.0"`
- [ ] `src/features.js` 里 `multiLang` 从 `DISABLED_FEATURES` 移除（正式启用多语言切换）
- [ ] `git commit` 打 tag `v2.0.0`

### 1.2 素材准备（存放目录约定）

所有上架素材统一放在 `docs/store-assets/` 下，最终目录建议：

```
docs/store-assets/
├── icon-128.png                # 商店主图标，128×128（从 src/icons/icon128.png 拷过来）
├── screenshots/                # 商店截图，1280×800（也接受 640×400）
│   ├── 01-main-panel.png       # 主界面全景
│   ├── 02-real-scenario.png    # 真实网页上打红色 PROD 水印
│   ├── 03-rules-config.png     # 6 种规则类型全展开
│   ├── 04-smart-color.png      # 智能对比色浅底 vs 深底对比
│   └── 05-badge.png            # 工具栏 badge PROD/TEST 展示
├── promo/                      # 商店宣传图（可选但强烈建议）
│   ├── promo-440x280.png       # Small promo tile（现在已经有）
│   ├── promo-920x680.png       # 需要新做
│   └── promo-1400x560.png      # Marquee promo tile（现在已经有）
├── descriptions/
│   ├── zh_CN-short.txt         # 132 字符以内简短描述（中文）
│   ├── zh_CN-detail.txt        # ≤ 1000 字详细描述（中文）
│   ├── en-short.txt            # 132 字符以内简短描述（英文）
│   └── en-detail.txt           # ≤ 1000 字详细描述（英文）
└── privacy-policy.md           # 隐私政策文本（用于挂到 GitHub Pages / CF Pages）
```

**注意**：`src/icons/1024.png` 是"图标源图"，不上架用；`src/icons/chrome_watermark.zip` 和 `src/icons/Code_Generated_Image*.png` 建议 delete，跟发布无关。

### 1.3 截图脚本（每张要拍什么）

统一浏览器：**Chrome 最新版，1440×900 窗口，简洁书签栏，无插件干扰**（除本扩展）。截图后用图片编辑软件裁到 1280×800（Windows 自带 `画图 3D` / Snipaste 都行）。

**第 1 张 — 主界面全景**（`01-main-panel.png`）
- 内容：打开扩展 options 页，侧栏有 3-4 条配置（生产 / 准生产 / 测试 / 管理后台），主区显示其中一条的完整表单
- 目的：让用户 3 秒内看出"这是个能管理多环境水印配置的工具"
- 构图：侧栏在左约 30%，主区在右约 70%，右侧下方露一角实时预览

**第 2 张 — 真实场景**（`02-real-scenario.png`）
- 内容：打开你公司真实的 test / prod 页面截屏（可以脱敏 mask 掉客户数据），页面上明显打着红色 `生产环境 - 请谨慎操作` 水印 + 沉浸式红色边框
- 目的：直击痛点。让开发者一眼认出"我的问题就是这个"
- 构图：网页占满 1280×800，水印和边框清晰可见

**第 3 张 — 规则配置面板**（`03-rules-config.png`）
- 内容：主区切到"匹配规则"Tab，展开 6 种规则类型的下拉，可以在同一 config 下同时看到 `host-suffix` + `ip-cidr` + `cookie` 三种规则并存
- 目的：向技术型用户展示深度能力

**第 4 张 — 智能对比色对比**（`04-smart-color.png`）
- 内容：并排两个浏览器窗口，左边浅色主题的网页（水印显示为深色），右边深色主题的网页（水印显示为浅色），中间可以放一个 "自动反色" 的标注
- 目的：视觉溢价，让人愿意用
- 构图：左右各占约 50%，中间小箭头示意

**第 5 张 — badge 展示**（`05-badge.png`）
- 内容：Chrome 工具栏区域的 zoom-in 特写，扩展图标右下角显示 `PROD` 红色 badge
- 目的：小细节但很打人，让用户知道"不用打开页面就能知道当前在哪个环境"
- 构图：可以用图片编辑软件对工具栏区域做 200% 放大裁切

**顺序建议**：Chrome 商店截图会按顺序展示，第 1 张就是首图，选最直观的。上面这个顺序（全景 → 场景 → 深度 → 溢价 → 细节）是漏斗结构。

### 1.4 描述文案

**简短描述（zh_CN，≤ 132 字符）**：

```
按域名、URL、IP、Cookie 精准区分测试 / 生产环境，一眼分辨。支持智能对比色、沉浸式边框、工具栏标签，防误操作利器。
```

**简短描述（en，≤ 132 chars）**：

```
Distinguish production/test/dev environments at a glance. Rule-based watermarks by host, URL, IP, or cookie. Prevent mis-operation.
```

**详细描述（zh_CN，≤ 1000 字）** —— 我先起草，你再改：

```
【为什么需要这个扩展】
你是否遇到过：测试环境和生产环境使用同一个域名（比如 test.cust.example.com 和 cust.example.com）？或者内网管理后台通过 VPN 用 IP 访问，肉眼根本区分不出？

Web Watermark Tool（网页水印工具）通过灵活的匹配规则，为不同环境的网页自动叠加醒目水印和边框提醒，防止误操作、防止在生产环境跑测试脚本。

【六种匹配规则，覆盖真实场景】
• 精确域名 — app.example.com
• 域名后缀 — 匹配所有子域 *.example.com
• URL 正则 — 按路径匹配 /admin
• IP 精确 — VPN 内网 192.0.2.5
• IP 段（CIDR）— 整个 10.0.0.0/8 子网
• Cookie — 按后端灰度分流的 canary/prod cookie

【核心特色】
• 智能对比色 — 水印颜色自动跟随网页背景反色，浅底变深、深底变浅，永不看不清
• 沉浸式边框 — 视口四周实线边框，视觉神经对边缘颜色变化敏感，绝不脱敏
• 鼠标渐隐 — 检测到你在高强度操作时自动降低水印透明度，恢复后自动显示
• 工具栏标签 — 图标右下角显示 PROD / TEST，不打开页面也知道当前环境
• 跨 iframe 独立匹配 — 嵌入的第三方页面按自己的域名单独判断

【隐私承诺】
所有配置只存储在你自己的 Chrome 账号里（chrome.storage.sync），不经过任何第三方服务器，不收集任何数据，不上报使用行为。开源可查。

【适合谁】
• 前端 / 全栈开发者
• 测试工程师
• 运维 / SRE
• 任何需要在多个相似 URL 环境间频繁切换的开发者

【使用建议】
第一次使用点右上角 ? 按钮查看快速指南。所有配置支持 JSON 导入导出，方便在团队内共享或在多台设备间迁移。
```

**详细描述（en，≤ 1000 chars）**：

```
【Why you need this】
Ever confused test.cust.example.com with cust.example.com? Or accessed the admin panel via VPN IP without any visual clue about which environment you're on?

Web Watermark Tool overlays customized watermarks on web pages that match your rules, preventing catastrophic mis-operations.

【Six rule types】
• Exact host — app.example.com
• Host suffix — matches all subdomains
• URL regex — path-based routing like /admin
• Exact IP — VPN internal 192.0.2.5
• IP CIDR — entire subnets like 10.0.0.0/8
• Cookie — deploy=canary for canary rollouts

【Highlights】
• Smart contrast color — auto-inverts against page background
• Immersive border — solid inset frame around viewport
• Mouse fade — auto-dim during heavy interaction
• Toolbar badge — PROD/TEST label on the icon
• Cross-iframe matching — each frame evaluates independently

【Privacy】
All configs stored in your own Chrome account (chrome.storage.sync). No third-party servers. No data collection. No tracking.

【For】 Frontend / fullstack devs, QA engineers, SRE, anyone juggling multiple similar-looking environments.
```

### 1.5 隐私政策

**Chrome 强制要求**：即使不收集任何数据，也必须提供一个 HTTPS URL 指向隐私政策页。

推荐挂载位置（三选一）：

1. **GitHub Pages（推荐）** — 免费、快、你已经有 GitHub 账号
   - 在 `web-watermark-prompt` 仓库里新建一个 `privacy-policy.html`
   - 仓库 Settings → Pages → 开启 → 得到 `https://jinnersun.github.io/web-watermark-prompt/privacy-policy.html`
2. **Cloudflare Pages** — 免费、自定义域名方便
3. **你现有域名**（如果有的话）

**隐私政策文本模板**（存 `docs/store-assets/privacy-policy.md`，push 到 GitHub Pages 前转成 HTML）：

```
# Privacy Policy for Web Watermark Tool

Last updated: 2026-07-14

## 1. Data Collection
Web Watermark Tool does NOT collect, transmit, or share any personal data,
usage data, or browsing history. All operations happen locally in your browser.

## 2. Data Storage
User configurations (rules, watermark text, colors, etc.) are stored using
`chrome.storage.sync`, which is Chrome's built-in sync mechanism scoped to
your Google account. This data is:
- Encrypted in transit and at rest by Google
- Never accessible to us or any third party
- Only synchronized between your own logged-in Chrome instances

## 3. Permissions Rationale
- `storage`: to persist your watermark configurations
- `activeTab`: to display the toolbar badge based on the current tab

## 4. Third-Party Services
None. This extension does not communicate with any external server.

## 5. Contact
Report bugs or ask questions via GitHub Issues:
https://github.com/jinnersun/web-watermark-prompt/issues

## 6. Changes
This policy may be updated. Check this page for the latest version.
```

---

## 二、Chrome Web Store 开发者账号

### 2.1 注册开发者账号

1. 访问 https://chrome.google.com/webstore/devconsole
2. 用你的 Google 账号登录
3. **一次性缴纳 $5 注册费**（信用卡 / 支付宝有时能付，Google Pay 最稳）
4. 填写开发者名称、联系邮箱（会展示给用户）
5. 完成邮箱验证

### 2.2 开启商店发布相关设置

- Developer Publisher Verification（可选但强烈建议）：验证你的邮箱地址，扩展页面会显示"已验证"绿标
- Two-Step Verification（Google 账号 2FA）：**必须**开启，否则上传会被拒

---

## 三、打包扩展

### 3.1 清理无关文件

打包前确认 `src/` 下**只有**这些必要文件：

```
src/
├── manifest.json
├── background.js
├── content.js
├── watermark-core.js
├── features.js
├── i18n.js
├── options.html
├── options.css
├── options.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── _locales/
    ├── zh_CN/messages.json
    └── en/messages.json
```

**删除**（如果还在 `src/icons/` 下）：
- `1024.png`（图标源图）
- `chrome_watermark.zip`（旧打包）
- `Code_Generated_Image*.png`（AI 生成的候选图，未采用）

### 3.2 打包命令

Windows PowerShell（在项目根目录）：

```powershell
# 用 PowerShell 内置 Compress-Archive
Remove-Item web-watermark-tool-v2.0.0.zip -ErrorAction SilentlyContinue
Compress-Archive -Path src\* -DestinationPath web-watermark-tool-v2.0.0.zip
```

产物 zip 应该：
- 解压后**直接**看到 `manifest.json`（不能多套一层 `src/` 目录）
- 大小 < 500 KB（icons 是主要占用）

### 3.3 本地二次验证

打包前建议做一次干净加载测试：

1. `chrome://extensions/`
2. 打开"开发者模式"
3. **移除**你当前加载的开发版
4. 解压 `web-watermark-tool-v2.0.0.zip` 到一个临时目录
5. 点击"加载已解压的扩展程序"选中该临时目录
6. 完整走一遍：新建配置 → 添加 6 种规则 → 导入 / 导出 → 一键复制 prompt → 从剪贴板导入 → 反馈按钮 → 帮助面板
7. 检查工具栏 badge 是否显示
8. 检查 test / prod 页面水印是否正常

**如果这一步过了，才提交商店；不要图快提交后被拒回。**

---

## 四、提交商店审核

### 4.1 上传扩展

1. 打开 https://chrome.google.com/webstore/devconsole
2. 点击 **New item**
3. 上传刚打包的 `web-watermark-tool-v2.0.0.zip`
4. Chrome 会自动读取 `manifest.json` 里的 name / version / description

### 4.2 填写商店列表信息

**Store Listing 页**（每种语言分开填）：

- **Name**：网页水印工具 (中文) / Web Watermark Tool (英文)
- **Short description**：从 `descriptions/zh_CN-short.txt` 复制
- **Detailed description**：从 `descriptions/zh_CN-detail.txt` 复制
- **Category**：Productivity
- **Language**：Chinese (Simplified) + English
- **Screenshots**：上传 5 张 1280×800 截图
- **Small promo tile**（可选）：`promo-440x280.png`
- **Marquee promo tile**（可选）：`promo-1400x560.png`
- **Icon**：`icon-128.png`

### 4.3 隐私实践问卷（关键！）

Chrome 现在对隐私要求非常严，这一栏答错就上不了：

- **Single purpose description**：
  "This extension helps users visually distinguish different web environments (production, test, staging, VPN internal) that share similar URLs by overlaying customizable watermarks and border indicators."
- **Permission justification**（每一项都要写）：
  - `storage`: "To persist user-configured watermark rules and preferences across sessions."
  - `activeTab`: "To read the active tab's URL for real-time badge updates on the toolbar icon."
- **Are you handling user data**: **No**（因为你确实不收集）
- **Data collection disclosure**: 全选 "not being collected"
- **Privacy policy URL**: 填你的 GitHub Pages URL

### 4.4 分发设置

- **Visibility**：Public
- **Distribution**：All regions
- **Pricing**：Free

### 4.5 提交审核

- 点 **Submit for review**
- 首次审核 **1-3 个工作日**，忙起来可能一周
- 邮件会通知结果

### 4.6 常见拒审原因

- ❌ 隐私政策 URL 打不开或返回 404
- ❌ 权限过多（我们只用 `storage` + `activeTab`，没问题）
- ❌ 图标模糊或不是 PNG
- ❌ 截图分辨率不对
- ❌ Description 里含虚假承诺、比较其他扩展、含 "best" / "#1" 之类关键词
- ❌ Manifest V2（我们是 V3，没问题）
- ❌ Content script `matches: ["<all_urls>"]` 需要在 Store 说明里给理由 — 我们描述里已经提到"匹配任意 URL 上叠加水印"，够了

---

## 五、上线后

### 5.1 立即做的

- [ ] 在自己电脑 / 手机开着的 Chrome 上试装商店版本（不是开发版）
- [ ] 邀请 3-5 个同事装了给反馈
- [ ] 在你的 GitHub `web-watermark-prompt` README 里补上"Chrome Web Store 链接"

### 5.2 一周内做的

- [ ] 收集用户反馈，评估要不要发 v2.0.1 补丁
- [ ] 关注商店 Reviews & Ratings
- [ ] 关注 GitHub Issues

### 5.3 后续版本迭代

发新版流程：

1. `src/manifest.json` 版本号 bump 到 `2.0.1` / `2.1.0`
2. `git commit` + tag
3. 重新打包 zip
4. 商店 → 你的扩展 → **Package** → 上传新 zip
5. 提交审核（后续版本审核通常几小时到 1 天）

---

## 六、发布前最后 Checklist

复制这一段到你脑子里，逐项打勾：

- [ ] `manifest.json` version = 2.0.0
- [ ] `src/icons/` 只留 16/48/128 三个正式图标
- [ ] `src/` 用作打包源，无临时文件、无 `.DS_Store` / `Thumbs.db`
- [ ] 5 张截图完成，1280×800 PNG
- [ ] 中英文 description 完成
- [ ] 隐私政策挂在 GitHub Pages 且能访问
- [ ] 本地干净加载测试通过（第三章 3.3）
- [ ] Chrome Web Store 开发者账号 $5 已付
- [ ] `chrome.storage.sync` 存储在多个 Chrome profile 间同步验证通过
- [ ] `git tag v2.0.0` 已打

全部打勾就可以提交审核了。
