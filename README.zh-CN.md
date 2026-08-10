# 网页水印工具（Web Watermark Tool）

一个 Chrome 扩展（Manifest V3）：按 **域名 / URL 正则 / IP / Cookie** 精准打水印，用于区分生产 / 预发 / 测试等环境，避免"我以为在测试环境结果操作了生产库"这种事故。

## 核心特性

- **多维匹配规则**（每条配置可组合多条规则，任一命中即生效）
  - `精确域名`：`app.example.com` → 只命中生产
  - `域名后缀`：`example.com` → 命中所有子域
  - `URL 正则`：`^https?://.*/admin(/.*)?$` → 只命中管理后台路径
  - `IP 精确 / CIDR`：`192.0.2.5` / `192.0.2.0/24` → 覆盖 VPN 里按 IP 访问的内网系统
  - `Cookie`：`env=prod` / `env~=stage` / 仅 `sid` → 覆盖同域名靠网关分流的场景
- **智能对比色**（`mix-blend-mode: difference`）：无论网页是白底、黑底、渐变，水印自动反色显示，不再"看不见"
- **沉浸式边框**：4px 血红 `inset box-shadow`，一眼看出当前是生产环境
- **鼠标交互时渐隐**：鼠标移动 / 键盘输入时水印自动降到几乎透明，停手 2 秒恢复
- **iframe 独立匹配**（`all_frames: true`）：每个 frame 按自己的 URL / hostname 匹配
- **实时预览**：编辑区实时显示水印在浅色 / 深色 / 渐变背景下的效果
- **URL 匹配测试器**：粘贴 URL + Cookie 立刻显示是否命中，命中哪条规则
- **配置导入 / 导出**：JSON 格式，方便在团队 / 多机之间迁移
- **全局总开关**：右上角一键停用所有水印
- **配置搜索**：侧栏搜索框，配置多时秒定位
- **工具栏图标 badge**：命中的配置在插件图标右下角显示短标签（例 PROD）
- **多语言支持**：中英字典已完整预留，测试稳定后一键开启（切换 src/features.js 里 multiLang 归属即可）

## 目录结构

```
├── src/                        # 扩展源码（用于「加载已解压的扩展程序」）
│   ├── manifest.json           # MV3 清单
│   ├── background.js           # 后台 service worker
│   ├── content.js              # 内容脚本：注入水印 + 监听变化
│   ├── watermark-core.js       # 纯逻辑核心：URL 解析、规则匹配、水印图片生成（options / content 共用）
│   ├── features.js             # 特性门控层（预留付费拆分）
│   ├── options.html/.css/.js   # 配置页面
│   ├── i18n.js                 # 运行时字典 + 语言即时切换
│   ├── i18n-messages.js        # 自动生成的字典包（供 i18n.js 运行时使用）
│   ├── color-picker.js         # 预设色 + 最近使用色选择器
│   ├── _locales/               # manifest 中 __MSG_*__ 用到的多语言资源（en / zh_CN / zh_TW / ja / es）
│   └── icons/                  # 16 / 48 / 128 PNG（打包用）+ source/*.svg（构建输入，不打包）
├── scripts/
│   ├── gen-locales.mjs         # 重新生成 _locales/**/messages.json + i18n-messages.js
│   ├── check-i18n.mjs          # 校验各语言漂移、未使用/未知 key
│   ├── gen-icons.mjs           # 由 src/icons/source/*.svg 光栅化出 PNG
│   ├── gen-promo.mjs           # 生成 Chrome 商店宣传图
│   ├── check-screenshots.mjs   # 校验商店截图尺寸
│   └── fix-screenshots.mjs     # 裁切/补白到精确 1280x800
├── docs/
│   ├── paid-version.md         # 付费版方案讨论（后端 / 收款 / license）
│   ├── publish-guide.md        # Chrome 商店上架指南
│   ├── v2-manifest.md          # v2.0 功能清单
│   ├── v2-implementation-plan.md  # 分阶段实施计划
│   ├── todo.md                 # 待办 & Roadmap
│   └── store-assets/           # 图标、截图、宣传图、商店描述
├── README.md
├── README.zh-CN.md
└── .gitignore
```

## 本地调试

1. `chrome://extensions/`
2. 打开右上角「开发者模式」
3. 「加载已解压的扩展程序」→ 选 `src/` 目录
4. 修改任意 `src/*` 文件后，回扩展页点插件卡片的「刷新」图标即可生效
5. 点击浏览器工具栏中的插件图标 → 打开配置页

## 数据存储

- 使用 `chrome.storage.sync`，配置随 Google 账号同步
- 键：
  - `configs: Config[]` — 所有水印配置
  - `globalEnabled: boolean` — 全局总开关
  - `lang: 'zh-CN' | 'en'` — 语言偏好

## 匹配规则详解

| 类型         | 语义                                                        | 例子                                     | 备注                                  |
| ------------ | ----------------------------------------------------------- | ---------------------------------------- | ------------------------------------- |
| `host-exact` | hostname 完全相等（推荐用于区分同基域名的多环境）           | `app.example.com`                        | **默认使用这个**                      |
| `host-suffix`| hostname 相等或以 `.<domain>` 结尾（含所有子域）             | `example.com`                             | 兼容旧粗粒度匹配                      |
| `url-regex`  | 完整 URL 正则匹配                                            | `^https?://.*/admin(/.*)?$`               | 用于按路径 / query 区分               |
| `ip-exact`   | 当 hostname 是 IP 时精确匹配                                 | `192.0.2.5`                              | 只在 hostname 为 IP 时才尝试匹配      |
| `ip-cidr`    | 当 hostname 是 IP 时按 CIDR 匹配                             | `192.0.2.0/24`                           | 支持 IPv4 CIDR                        |
| `cookie`     | `document.cookie` 中的键值匹配                               | `env=prod` / `env~=stage` / `admin_token` | `=` 精确、`~=` 包含、仅键名 → 检查存在 |

**冲突处理**：一条配置内多规则命中时，选 score 最高的一条；多条配置命中时也一样。score 大致规则：`host-exact` > `ip-exact` > `ip-cidr` > `url-regex` > `cookie` > `host-suffix`，同类型按 value 长度。

## 付费版（Pro）预留

参见 `docs/paid-version.md`。当前**所有功能全部免费**开放；架构上已经通过 `src/features.js` 的 `Features.canUse(key)` 打好门控桩位，未来接入 license 校验只需修改这一个文件。

## 权限说明

- `storage`：使用 `chrome.storage.sync` 保存配置和语言偏好
- `<all_urls>` content script：全站注入水印判定逻辑，只有命中规则的页面才实际绘制
- `all_frames: true`：所有 frame（含跨源 iframe）都会独立注入 content script 并按 iframe 自己的 URL / hostname 匹配规则；如果需要在跨源 iframe 里显示"主页面的"水印，浏览器不支持穿透（安全模型层面限制）

以上即完整权限清单（`manifest.json` 中仅声明 `"permissions": ["storage"]`）。扩展没有 `activeTab`，除 content script 匹配范围外没有任何主机权限，也不发起任何网络请求。

## 版本

`2.0.0` — 匹配规则重构 / UI 重做 / 智能变色 / 沉浸式边框 / 导入导出 / 全局开关 等