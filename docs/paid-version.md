# 付费版讨论文档

> 记录后续「免费 + Pro 买断制」方向的所有决策与待办。核心功能全部先做进免费版；本文档只讨论**未来如何拆分付费**、**后端如何搭建**、**收款如何做**。

## 当前架构对付费版的准备

代码里已经预留了一个特性门控层：`src/features.js`。所有未来可能拆分为 Pro 的功能都走它：

```js
if (Features.canUse('smartColor')) { ... }
```

现阶段 `Features.canUse(*)` 一律返回 `true`（免费版全解锁）。未来接入付费只需修改这一个文件：

- 读取本地 license 缓存
- 定期跟后端校验 license 是否有效
- 校验通过后允许 `canUse` 对付费键返回 `true`

各功能标记的默认归属（**待定**，等付费版启动时再确认）：

| 特性键                    | 位置                                    | 拟定归属 |
| ------------------------ | --------------------------------------- | ------- |
| `hostRule`               | 精确 / 后缀域名匹配                     | Free    |
| `urlRegex`               | URL 正则匹配                            | Free    |
| `ipMatch`                | IP / CIDR 匹配（前端 hostname 为 IP）    | Free    |
| `cookieMatch`            | Cookie 键值匹配                         | ⚠️ 见下 |
| `smartColor`             | mix-blend-mode 智能对比色               | ⚠️ 见下 |
| `immersiveBorder`        | 沉浸式边框提醒                          | Free    |
| `mouseFade`              | 鼠标操作时透明度渐隐                    | Free    |
| `iframeInject`           | 同源 iframe 打水印                      | Free    |
| `importExport`           | 配置一键导入/导出                       | ⚠️ 见下 |
| `unlimitedConfigs`       | 无限配置数（Free 版可能限 5 条）        | Pro（候选）|
| `dynamicVars`            | 水印文本变量：{user}/{date}/{host} 等   | Pro（候选）|
| `multiLang`              | 多语言切换                              | Free（v2.0 已启用）|
| `globalToggle`           | 全局总开关                              | Free    |
| `badge`                  | 工具栏短标签                            | Free    |

> 现阶段全部返回 `true`，只是打个"未来可以拆"的桩位。

> ⚠️ **归属冲突（需决策）**：`features.js` 目前把 `cookieMatch` / `smartColor` / `importExport` 放在 `PAID_FEATURES`，且这三项在 v2.0 已作为核心卖点写进 Chrome 商店描述草稿。
>
> **已决策**：上线前就加入付费限制（无历史用户，无差评风险）。**但商店描述文案必须同步修改** —— 详见下方「免费功能转收费：改动量评估」。


## 后端方向讨论

用户提议：Cloudflare Workers + D1。评估如下。

### 可行性
- **Workers**：全球边缘节点、免费额度 10 万请求/天，license 校验完全够用。冷启动 < 5ms。
- **D1**：SQLite 兼容、免费额度 5 GB 存储 / 500 万行读，存 license / 订单 / 用户表也够用。
- **KV**：用于缓存已激活的 license → 减少 D1 查询。
- **成本**：正常规模下**每月 $0**，超量后按用量线性收费。

### 建议架构（草案）
```
浏览器扩展
   ↓ POST /api/verify {license_key, device_fingerprint}
Cloudflare Worker
   ↓ 查 KV（快速） → miss 查 D1（准确）
   ↓ 返回 {valid, plan, expires_at, features:[...]}
扩展本地缓存 24h，超过再校验
```

### 关键决策待定
- **一次买断 vs 订阅**：沉浸式翻译走的是「买断 + 订阅并存」。个人建议先做**一次买断**，简单、无续费流失焦虑；后续再考虑加订阅版做云同步等增值。
- **设备数限制**：一般 3–5 台。用 device_fingerprint（浏览器指纹 + 扩展安装 ID）绑定。
- **离线宽限期**：断网时 license 缓存 7 天内有效，避免用户在飞机 / 内网被卡。
- **反破解强度**：不追求极致（客户端插件天然可被 dump）。只要不能"随便复制粘贴 key"、且有主动巡检（发现同一 key 大量设备使用就吊销），就足够。

## 收款方向讨论

参考「沉浸式翻译」（网站结账、扩展内跳转）。可选通道：

### 方案 A：Stripe / Paddle（面向海外用户）
- **Paddle** 是 Merchant of Record，自动处理全球税务、退款、发票。适合独立开发者。
- **Stripe** 更强大、费率低（2.9% + 0.3 USD），但税务要自己搞。
- 支持信用卡、Apple Pay、Google Pay 等。
- Chrome Web Store **不允许扩展内直接支付**，必须跳到外部网站。

### 方案 B：支付宝 / 微信（面向中国用户）
- 需要有营业执照的商户号，个人开发者门槛较高。
- 或者用**收款码 + 手动发 key**（早期极小规模可用）。
- 或者用**爱发电 / 用户来搞（yongmian）** 之类的平台代收，抽成 5–10%。

### 方案 C：Lemon Squeezy / Gumroad
- 类似 Paddle 的 MOR，界面更简单，独立开发者常用。
- Gumroad 手续费 10%（含支付通道）。

### 建议起步组合
- 目标海外：**Paddle**（省心） + Cloudflare Workers（做 license 签发接口，Paddle Webhook 回调）
- 目标国内：先用 **爱发电 / Gumroad** 代收，规模上来再申请商户号

### 沉浸式翻译的做法（可参考）
1. 扩展内有"升级到 Pro"按钮 → 打开外部结账页
2. 结账页支持多种通道（Stripe / Paddle / 支付宝 / 微信）
3. 支付成功后邮件下发 license key
4. 用户在扩展设置页粘贴 key 激活 → 扩展调后端校验 → 本地缓存 → 解锁功能

## 待办 / 下一步

### 技术栈：Supabase vs Cloudflare（认证能力调研结论）

你的关注点是「登录认证简单」。调研结果：

**Cloudflare 没有对标 Supabase Auth 的第一方消费级认证产品。**

| 选项 | 定位 | 是否适用 |
| --- | --- | --- |
| Cloudflare Access / Zero Trust | 企业内网 SSO，保护自己的应用入口 | ❌ 不是给终端用户注册登录用的 |
| D1 + better-auth / Lucia（第三方库） | 自建认证 | ⚠️ 可行，但邮箱验证、magic link、密码重置、OAuth 全要自己接，还得自己配邮件服务商（Resend 等） |
| Supabase Auth | 托管认证服务 | ✅ 上述全部开箱即用 |

**结论**：若看重认证省事，**Supabase 明显更优**。Cloudflare 的优势在边缘延迟与成本，但 license 校验是低频场景，两者都够用。

**建议**：
- v3.0 **要做云同步** → Supabase 一体化（认证 + 数据库 + 同步一套搞定）
- v3.0 **只做 license 校验**（云同步后推）→ 理论上可 Supabase 管认证 + Workers 做校验缓存，但为少一个供应商，直接 Supabase 全包更省心

> 你已有 Cloudflare 实践经验（EasyForm 用 Workers AI + Resend），若倾向复用现有栈，可考虑 D1 + better-auth；但要接受认证部分多写不少代码。

### 免费功能转收费：改动量评估

你提出「上线前就加入付费限制」。**这个判断是对的** —— 无历史用户，零差评风险。

但实测统计 `canUse()` 的**实际调用点**后发现一个重要事实：

| 特性键 | 实际调用点数 | 现状 |
| --- | --- | --- |
| `smartColor` | 2（`content.js:78`、`options.js:899`） | ✅ 已真实门控 |
| `importExport` | 2（`options.js:1019 / 1065`） | ✅ 已真实门控 |
| `multiLang` | 4 | ✅ 已真实门控 |
| `immersiveBorder` | 1 | ✅ 已真实门控 |
| `mouseFade` | 1 | ✅ 已真实门控 |
| `badge` | 1 | ✅ 已真实门控 |
| **`cookieMatch`** | **0** | ❌ 门控是**空壳**，规则照常生效 |
| **`unlimitedConfigs`** | **0** | ❌ 空壳 |
| `hostRule` / `urlRegex` / `ipMatch` / `iframeInject` / `globalToggle` / `dynamicVars` | **0** | ❌ 空壳 |

**关键结论**：把 key 从 `FREE_FEATURES` 挪到 `PAID_FEATURES` 对**半数特性是无效操作** —— `features.js` 只是声明，没有执行点。

具体改动量：

| 目标 | 改动 | 规模 |
| --- | --- | --- |
| `smartColor` 转 Pro | 逻辑层已拦住，只需补 UI（锁图标 + 点击提示升级） | **小** |
| `importExport` 转 Pro | 同上 | **小** |
| `cookieMatch` 转 Pro | 需新增 3 处：① `options.js` 规则类型下拉禁用 cookie 选项 ② `watermark-core.js` `matchRule` 里拦截 ③ 导入时降级已有 cookie 规则 | **中** |
| `unlimitedConfigs` 限 N 条 | 需新增 2 处：① 新建配置时计数校验 ② 导入时截断 + 超限提示 | **中** |

**真正的工作量在 license 基建**，不在门控本身：激活 UI、后端校验接口、本地缓存、离线宽限期、错误码提示。

> ⚠️ **强制约束**：`docs/store-assets/descriptions/` 下 4 份商店描述目前把「六种匹配规则」「智能对比色」「支持 JSON 导入导出」写成了核心卖点。**任何转为 Pro 的功能都必须同步从文案中删除或标注**，否则构成虚假宣传 —— 这是 Chrome 明确列出的拒审理由。

### 决策清单

**已明确倾向**
- [x] 技术栈倾向 **Supabase**（认证开箱即用；待确认云同步是否进首发）
- [x] 上线前就加入付费限制（无历史用户，可自由划分）

**待拍板**
- [ ] 云同步是否进 v3.0 首发（决定 Supabase 全包 vs 混搭）
- [ ] **收费范围**：`cookieMatch` / `smartColor` / `importExport` 具体收哪几个？
- [ ] **`unlimitedConfigs` 限制值**：Free 版限几条？（原草案 5 条）
- [ ] **付费门控进 v2.0 还是 v3.0**：进 v2.0 = 首发即有 Pro 入口，但需先做完 license 基建，会推迟上架；进 v3.0 = 先免费上架积累用户，但那时收回功能有差评风险
- [ ] **统一收款通道**：Paddle vs Lemon Squeezy vs 爱发电（国内）
- [ ] **统一定价**：$9.9 还是 $9–15 区间？人民币定价？
- [ ] **是否做 7 天试用**
- [ ] **买断 vs 订阅 vs 并存**
- [ ] 起草：**服务条款**（隐私政策已完成并挂 GitHub Pages）
- [ ] 后端骨架 + schema 设计
- [ ] 结账页原型（域名、UI、结账通道）
- [ ] 扩展端 license UI（激活输入框、状态显示、错误码提示）
- [ ] 设备数限制与离线宽限期的具体数值
- [ ] ⚠️ 同步修改 4 份商店描述文案（若收回已宣传的功能）

