# 手动截图指南

> 目标：产出 5 张 **1280×800 PNG** 截图到本目录，通过 `npm run check-screenshots` 验证后即可上架 Chrome Web Store。

## 准备工作

### 1. 加载扩展开发版

1. Chrome 打开 `chrome://extensions/`
2. 右上角开启「开发者模式」
3. 「加载已解压的扩展程序」→ 选 `src/` 目录
4. 记下扩展 ID（后面备用）

### 2. 导入样例配置

在 options 页顶部点「导入」按钮，选：

```
docs/store-assets/sample-configs.json
```

导入后侧栏应出现 4 条配置：**Production / Pre-production / Test / Admin Panel**。

### 3. 把 Chrome 窗口调整到 1280×800

**方法 A（推荐）**：Chrome 内置 DevTools。
1. F12 打开 DevTools
2. 点右上「⋮」→ Show device toolbar（`Ctrl+Shift+M`）
3. 顶部下拉选「Responsive」，输入 `1280 × 800`
4. **关闭 DevTools 前先截图** —— 或直接用 device toolbar 里的相机图标

**方法 B**：PowerShell 精确 resize 前台 Chrome。

```powershell
Add-Type -MemberDefinition @"
  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
"@ -Name Win -Namespace P
$hwnd = [P.Win]::GetForegroundWindow()
[P.Win]::SetWindowPos($hwnd, [IntPtr]::Zero, 100, 100, 1280, 800, 0x40) | Out-Null
```

**注意**：这个 resize 的是外框，实际视口会小一点（浏览器有 tab bar / URL bar 占位）。上架截图要的是**页面内容 1280×800**，所以务必用方法 A（device toolbar），或截图后用画图裁到精确尺寸。

## 依次拍 5 张

保存路径统一为 `docs/store-assets/screenshots/`。

### 01-main-panel.png — 主界面全景
- 打开扩展 options 页
- 侧栏选中「Pre-production」（第二条，规则最多，视觉最丰富）
- 主区显示「匹配规则」Tab，展开所有 2 条规则
- 确认右下角实时预览有内容
- 截图 → 保存为 `01-main-panel.png`

### 02-real-scenario.png — 真实业务场景
- 本地双击打开 `docs/store-assets/demo-site.html`（file:// 协议）
- 在 options 里为 Production 那条**新加一条规则**：
  - Type: `url-regex`
  - Value: `^file:///.*/demo-site\.html$`
  （这样 file:// 打开 demo 页时能触发水印；上架前记得把这条规则从 sample-configs.json 里去掉）
- 打开 demo 站点后，页面上应该看到红色 "Production - Caution" 水印 + 红色边框
- 截图 → 保存为 `02-real-scenario.png`

### 03-rules-config.png — 规则配置面板
- options 页侧栏选中「Admin Panel」（有 url-regex + ip-cidr 两条规则）
- 主区切到「匹配规则」Tab
- 点「添加规则」再手动加 3 条：`host-suffix` / `ip-exact` / `cookie`，把 6 种类型全展开
- 每条规则的下拉框展开状态清晰可见
- 截图 → 保存为 `03-rules-config.png`

### 04-smart-color.png — 智能对比色
- 侧栏选中「Test / Staging」
- 主区切到「外观」Tab
- 「智能对比色」开关打开
- 底部实时预览三个色底（浅/深/渐变）里水印分别显示为不同对比色
- 截图 → 保存为 `04-smart-color.png`

### 05-badge.png — 工具栏 badge 特写
最简单：本地拿一张 demo 页面截图 → 用画图 / Snipaste 把 Chrome 工具栏区域 zoom 200% 裁切成 1280×800 → 保存。

或者：新开一个空白页面，让扩展 badge 显示 PROD → 截整个浏览器窗口 → 裁掉大部分只保留工具栏（1280×800）。

## 验证

```powershell
npm run check-screenshots
```

看到 `check-screenshots: OK` 就可以上架了。任何一张不合规都会红字提示原因。

## 备注

- 上架前从 `sample-configs.json` 里删除临时加的 `file://` 规则
- 5 张截图**必须**是精确 1280×800 或 640×400，否则商店会拒审
- 文件名必须完全对应，检查器会按名字找
