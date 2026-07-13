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
| `cookieMatch`            | Cookie 键值匹配                         | Pro（候选）|
| `smartColor`             | mix-blend-mode 智能对比色               | Pro（候选）|
| `immersiveBorder`        | 沉浸式边框提醒                          | Free    |
| `mouseFade`              | 鼠标操作时透明度渐隐                    | Free    |
| `iframeInject`           | 同源 iframe 打水印                      | Free    |
| `importExport`           | 配置一键导入/导出                       | Pro（候选）|
| `unlimitedConfigs`       | 无限配置数（Free 版可能限 5 条）        | Pro（候选）|
| `dynamicVars`            | 水印文本变量：{user}/{date}/{host} 等   | Pro（候选）|

> 现阶段全部返回 `true`，只是打个"未来可以拆"的桩位。

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

- [ ] 决定：**买断 vs 订阅 vs 并存**
- [ ] 决定：**Free 版限制什么**（配置数？功能开关？）
- [ ] 决定：**Pro 定价**（推荐 $9–15 一次买断 / 或 ¥68–98）
- [ ] 起草：**服务条款 & 隐私政策**（Chrome 商店必需）
- [ ] Cloudflare Worker 骨架 + D1 schema 设计
- [ ] 结账页原型（域名、UI、结账通道）
- [ ] 扩展端 license UI（激活输入框、状态显示、错误码提示）