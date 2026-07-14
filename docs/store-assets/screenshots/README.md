# Chrome Web Store 截图拍摄指导

## 目标目录

所有截图放在**本目录**（`docs/store-assets/screenshots/`），文件名按下方约定，最终 5 张 PNG，尺寸统一 **1280 × 800**。

## 通用准备（一次性做完，5 张都能复用）

1. **浏览器**：Chrome 最新稳定版，一个**干净的独立用户目录**（避免个人扩展 / 书签露出）
   ```
   chrome.exe --user-data-dir="D:\tmp\cws-screenshot" --window-size=1440,900
   ```
2. **加载插件**：`chrome://extensions/` → 开发者模式 → 加载已解压的扩展 → 选择 `src/` 目录
3. **准备一份"演示配置"**（不要用你真实的公司配置）—— 打开扩展 options 页，删掉所有配置后按下面创建 4 条：

   | 名称        | shortLabel | 规则                                              | 颜色       | 边框    |
   |-------------|-----------|--------------------------------------------------|-----------|---------|
   | 生产环境    | PROD      | host-exact = `app.example.com`                   | `#ef4444` | 4px 红  |
   | 准生产      | STG       | host-exact = `staging.app.example.com`           | `#f59e0b` | off     |
   | 测试环境    | TEST      | host-exact = `test.app.example.com`              | `#10b981` | off     |
   | 内网管理    | ADMIN     | ip-exact = `192.0.2.5`                           | `#8b5cf6` | 3px 紫  |

4. **准备一个"真实网页 mockup"**：因为 `app.example.com` 不是真站点，用本地 HTML 文件模拟：
   - 新建 `D:\tmp\mock-prod.html`，内容随便（比如一个后台系统 mockup）
   - 把 host 改一下：用 `chrome --host-rules` 或直接改 hosts 文件把 `app.example.com` 指向 `127.0.0.1`，或者更简单：**直接在真实测试站上截，之后用 Photoshop / 图片工具 mask 掉左上角的地址栏和公司 logo**（见每张的 mask 清单）

5. **截图工具建议**：Snipaste（免费）或 Windows 自带 `Win+Shift+S`；导出后用画图 3D 或 [squoosh.app](https://squoosh.app/) 裁剪 / 缩放到 **1280 × 800**

## 5 张截图逐一说明

### 01-main-panel.png — 主界面全景（首图，最关键）
- **文件名**：`01-main-panel.png`
- **拍什么**：扩展 options 页全景，侧栏可见 4 条配置，主区选中"生产环境"，能看到规则、文字、颜色、实时预览
- **构图**：整个扩展窗口截屏，然后**缩到 1280 × 800**
- **Mask 清单**：无（这是演示配置，全部假域名，直接截）
- **注意**：右上角的语言选择器建议切到你目标用户的语言（中文商店 → 简体中文；英文商店 → English）

### 02-real-scenario.png — 真实场景痛点
- **文件名**：`02-real-scenario.png`
- **拍什么**：一个网页页面（可以是你真实的测试站，也可以是本地 mockup），页面正中**清晰可见红色 `生产环境 - 请谨慎操作` 水印 + 视口四周红色边框**
- **构图**：整个 Chrome 窗口，网页部分要占大面积
- **Mask 清单**（必看）：
  - ✅ 地址栏 URL — mask 掉真实域名，或用图片工具改成 `app.example.com`
  - ✅ 页面左上角公司 logo — mask 掉
  - ✅ 页面上的**客户名字 / 手机号 / 订单号 / 金额** — 全部 mask
  - ✅ 用户头像 / 姓名（如果登录了） — mask
  - ✅ 浏览器标签页标题 — 检查是否含公司名，含就 mask
- **推荐**：不确定的都马赛克掉，宁多勿少

### 03-rules-config.png — 6 种规则能力
- **文件名**：`03-rules-config.png`
- **拍什么**：options 页主区，选中"生产环境"配置，规则区**手动加满 6 条不同类型的规则**（host-exact / host-suffix / url-regex / ip-exact / ip-cidr / cookie 各一条），全部用**假域名**（PROMPT.md 里的 app.example.com、192.0.2.5、10.0.0.0/8）
- **构图**：主区规则卡片区域为主，侧栏可以露一点
- **Mask 清单**：无（全假域名）
- **小技巧**：加完规则后停留 2 秒截图，避免动画未完成

### 04-smart-color.png — 智能对比色（视觉溢价）
- **文件名**：`04-smart-color.png`
- **拍什么**：**并排两张**浏览器截图拼接
  - 左：浅色主题的页面（比如 GitHub 首页），水印显示为深灰色
  - 右：深色主题的页面（比如 GitHub 切 dark mode 或某个终端主题网页），同一条规则的水印自动变成浅灰色
- **构图**：左右各 640 × 800 拼成 1280 × 800，中间可留 1-2px 分隔线；顶部可以加一行小字"Same watermark, auto-inverts / 同一水印，自动反色"
- **Mask 清单**：如果拍的是 GitHub / 公开站点，无需 mask；如果拍公司页面就参考 02 的 mask 清单
- **拼接工具**：Windows 自带画图，或 [photopea.com](https://www.photopea.com/)（免费在线 PS）

### 05-badge.png — 工具栏 badge 细节（差异化）
- **文件名**：`05-badge.png`
- **拍什么**：Chrome 工具栏区域的**放大**特写，扩展图标右下角显示 `PROD` 红色 badge
- **构图**：先截整个工具栏（1440 宽），然后用图片工具把扩展图标那一小块放大到 400 × 400，再嵌到 1280 × 800 画布中央，四周留白 + 加一行小字"Toolbar badge — know your env without opening the tab / 工具栏标签一目了然"
- **Mask 清单**：其他扩展图标全部裁掉，只保留网页水印工具

## 命名总结

```
docs/store-assets/screenshots/
├── 01-main-panel.png       (1280×800)
├── 02-real-scenario.png    (1280×800)
├── 03-rules-config.png     (1280×800)
├── 04-smart-color.png      (1280×800)
└── 05-badge.png            (1280×800)
```

## 拍完后自检 checklist

对每一张：

- [ ] 尺寸严格 1280 × 800（Chrome 商店会拒非标准尺寸）
- [ ] PNG 格式，非 JPG
- [ ] 没有任何真实公司域名、客户信息、员工姓名 / 头像
- [ ] 语言与目标商店匹配（中文商店用中文 UI，英文商店用英文 UI；语言切换在扩展右上角）
- [ ] 截图中水印文字清晰可见，不被虚化

## 商店上传顺序

Chrome Web Store 会**按你上传的顺序**展示，第 1 张就是搜索结果里的首图。建议顺序：
1. `01-main-panel.png`（让用户看懂"这是什么"）
2. `02-real-scenario.png`（击中痛点）
3. `03-rules-config.png`（展示深度）
4. `04-smart-color.png`（视觉溢价）
5. `05-badge.png`（差异化细节）