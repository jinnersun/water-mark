# v2.0 实施计划（修复记录留档）

> 状态：**已完结**。付费相关阶段（2-4）已**否决**（2026-08-13），本文件保留已完成修复的记录与当时决策。
> 决策基线：2026-08-03 对话；2026-08-10 补充鼠标渐隐滚轮优化。

## 结论（2026-08-13）

- **不做付费功能**，所有功能全部免费（见 `docs/paid-version.md` 决策记录）。
- 阶段 2（门控层 + 试用期）、阶段 3（文案同步）、阶段 4（Supabase 后端 + License + 云同步 + 隐私政策重写）**全部取消**，代码与文案无需改动。
- `src/features.js` 的 `PAID_FEATURES` / `tierOf` / `currentPlan` 保留为桩位，当前全返回 `true`，不产生限制。

## 已完成的修复（阶段 1）

### A. Badge 无法显示 → 方案 A（消息传递）✅

**根因**：`background.js:38` 依赖 `tab.url`；MV3 下读 `tab.url` 需 `tabs` 权限或匹配的 host permission，而 `content_scripts.matches` 不授予 host permission。manifest 只有 `storage` → `tab.url === undefined` → badge 永不显示。附带 BUG：`background.js:32` 传空 cookie 串，cookie 规则 badge 永久失效。

**修法**：content script 算好命中结果后 `runtime.sendMessage` 上报，background 用 `sender.tab.id` 设 badge；零新增权限，顺带修复 cookie 规则 badge。详见 `docs/publish-guide.md` 第七节 #1 方案 A。

**二轮修复记录（2026-08-10，用户实测反馈驱动）**

- **问题 1：badge 显示一会儿就消失**。根因：`onUpdated` 的 `changeInfo.url`（History API 同文档导航 replaceState 也触发）与 `status:'loading'`（延迟 subframe）在上报之后迟到清除。最终事件表：

  | 事件 | 行为 |
  | --- | --- |
  | `status:'loading'` | 清（新文档预清；若被 subframe 误清，complete ping 修好） |
  | `changeInfo.url` 且 scheme 非 http(s) | 清（chrome:// 等 content 不运行的地方；replaceState 不改 scheme，安全） |
  | `changeInfo.url` 且 http(s) | 忽略（replaceState 洞堵上） |
  | `status:'complete'` | ping 该 tab（`wm:request-badge`），content 用缓存的重报 |

  content 侧：`__wmLastBadge` 缓存 + `onMessage` 响应 ping（顶层 frame 守卫）。

- **问题 2：CJK badge 被 Chrome 按像素裁出半个字**。`shortLabelOf` 改为宽度单位截断：半角=1、全角=2、预算 4。`shortLabelHint` 五语文案更新并渲染（此前文案存在但从未渲染）；AGENT_PROMPT 的 shortLabel 说明同步为宽度规则 + ASCII 推荐。

### B. 鼠标渐隐不响应滚轮 → 补 wheel + touchmove ✅

`installMouseFade` 补 `wheel` + `touchmove` 监听（含 dispose 清理），去抖逻辑不动。不加 `scroll`（滚动条拖拽已触发 mousemove，键盘滚动已触发 keydown，wheel 已覆盖滚轮场景）。

### 验证

- `node --check` 三个改动文件、`tmp/smoke-badge.mjs` 冒烟 ALL PASS、`npm run check-i18n` OK、监听器 add/remove 成对。
- 用户实测二轮修正，最终事件表见上。

## 商店文案与素材

- 4 份描述（zh_CN/en × short/detail）**无任何付费表述**，与全免费决策一致，无需改动。
- 截图 5 张 1280×800 + 2 张 promo tile 已就绪。

## 版本号约定

- **v2.0.0** — 本次上架版本
- **v2.0.x** — 上架后基于用户反馈的 bug 修复 / 微调
- **v2.1.x** — 非破坏性小功能追加
