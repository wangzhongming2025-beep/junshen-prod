# 硬核英语社 · 后端配置说明

站点前端：`/yingyu-she/`（纯静态，Vercel 托管）
后端接口：`/api/*`（Vercel Serverless 函数，零依赖 Node 运行时）
数据存储：Upstash Redis（REST 方式访问）
短信验证码：阿里云短信（Dysmsapi）

---

## 〇、先跑通最小可用（推荐路径，10 分钟搞定）

阿里云短信需要**实名认证 + 签名审核 + 模板审核**，个人主体往往要几天甚至过不了审。所以建议**分两步走**：先绕过短信把注册/云同步跑通，等短信资质下来再补。

### 第 1 步：只填这 4 个变量就能用

打开 Vercel → 项目 `junshen-prod` → **Settings → Environment Variables**，添加：

| 变量名 | 值 |
|---|---|
| `UPSTASH_REDIS_REST_URL` | 你 sighthealthpro 项目已在用的那个（建议给本站单独建一个库，别和护眼站混） |
| `UPSTASH_REDIS_REST_TOKEN` | 同上 |
| `AUTH_SECRET` | 随便一串 ≥32 位的随机字符，例如 `hy8Kd2mQ7pL4nR9sT1vX6zB3cF5gH0j` |
| `ALLOW_DEV_CODE` | `1` ← **关键**，填了它就不用配短信也能登录 |

> `ALLOW_DEV_CODE=1` 的效果：点「获取验证码」后，6 位验证码会**直接显示在弹窗里并自动填入**，不用真发短信。这是官方预留的联调开关，等你短信通了把它删掉即可。

### 第 2 步：Redeploy（最容易漏的一步）

Vercel → **Deployments** → 点最新一条右侧的 `⋯` → **Redeploy**。
不重新部署，环境变量不会生效。

### 第 3 步：验证

打开 `https://www.junshen.top/api/health`，应该看到：

```json
{ "ready": { "db": true, "sms": false, "auth": true, "redeemCodes": false }, "devCode": true }
```

`db` 和 `auth` 变 `true`、`devCode` 变 `true` 就成了。`sms` 仍是 `false` 没关系，第 4 步再补。

然后到站点点「登录 / 注册」，输入任意 11 位手机号 → 点获取验证码 → 验证码会自动出现 → 点登录。

### 第 4 步（以后）：补上短信和兑换码

短信资质下来后，再补这 5 个，然后把 `ALLOW_DEV_CODE` 删掉：

| 变量名 | 说明 |
|---|---|
| `ALIYUN_ACCESS_KEY_ID` | 阿里云 AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret |
| `ALIYUN_SMS_SIGN_NAME` | 审核通过的短信签名 |
| `ALIYUN_SMS_TEMPLATE_CODE` | 验证码模板 CODE（变量名必须是 `code`） |
| `REDEEM_CODES` | 兑换码池，格式 `码=套餐`，逗号分隔。套餐：`month`/`quarter`/`year`/`forever`。例如 `HY2026-1001=month,HY2026-1299=forever` |

---

## 一、完整环境变量清单

打开 Vercel → 项目 `junshen-prod` → **Settings → Environment Variables**，逐条添加（Environment 选 Production + Preview + Development 均可）：

| 变量名 | 必填 | 说明 | 示例 |
|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis 的 REST 地址 | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis 的 REST Token | `AXxx...` |
| `AUTH_SECRET` | ✅ | 登录令牌签名密钥，随便一串长随机字符（≥32 位） | `hy_9f3k2...随机串` |
| `ALIYUN_ACCESS_KEY_ID` | ✅ | 阿里云 AccessKey ID | `LTAI5t...` |
| `ALIYUN_ACCESS_KEY_SECRET` | ✅ | 阿里云 AccessKey Secret | `xxxx...` |
| `ALIYUN_SMS_SIGN_NAME` | ✅ | 短信签名名称（控制台审核通过的签名） | `硬核英语社` |
| `ALIYUN_SMS_TEMPLATE_CODE` | ✅ | 短信模板 CODE（验证码模板，变量名需为 `code`） | `SMS_123456789` |
| `REDEEM_CODES` | ✅ | 兑换码池，格式 `码=套餐`，逗号分隔；套餐取 `month`/`quarter`/`year`/`forever` | `HY2026-1001=month,HY2026-1002=year` |
| `ALLOW_DEV_CODE` | ⬜ | 填 `1` 时未配置短信也会把验证码回传（**仅本地联调用，生产务必不填**） | `1` |

> 说明：`REDEEM_CODES` 里的码和前端原来的码池一致即可（如 `HY2026-1001` ~ `HY2026-1005`、`HY2026-2001` ~ `HY2026-2005`）。不填套餐则默认月卡。

**配置完成后需要重新部署一次**（Vercel → Deployments → 最新一条 → Redeploy），环境变量才会生效。

---

## 二、验证后端是否就绪

浏览器直接打开：

```
https://www.junshen.top/api/health
```

返回示例（全部 `true` 即为就绪）：

```json
{
  "ok": true,
  "service": "yingyu-she-api",
  "ready": { "db": true, "sms": true, "auth": true, "redeemCodes": true },
  "devCode": false
}
```

- `db: false` → Upstash 两个变量没配好
- `sms: false` → 阿里云四个变量没配好
- `auth: false` → `AUTH_SECRET` 没配
- `redeemCodes: false` → `REDEEM_CODES` 没配

---

## 三、接口一览

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/health` | 配置自检 | 否 |
| POST | `/api/auth/send-code` | 发送验证码 `{phone}`（60 秒频控） | 否 |
| POST | `/api/auth/login` | 验证码登录/注册 `{phone, code}` → 返回 `{token, user, data}` | 否 |
| GET | `/api/user/state` | 拉取档案 + 学习数据 + 当日已用时长 | Bearer |
| POST | `/api/user/state` | 上传学习数据 `{data}` | Bearer |
| GET | `/api/user/usage` | 查询今日已用秒数 / 会员态 | Bearer |
| POST | `/api/user/usage` | 累加今日时长 `{seconds}` | Bearer |
| POST | `/api/member/redeem` | 兑换码开通会员 `{code}` | Bearer |
| POST | `/api/survey/submit` | 提交 1299 合伙人问卷 `{answers, advantage}` → 返回匹配度与建议 | Bearer |
| GET | `/api/survey/get` | 读取自己提交过的问卷 | Bearer |

鉴权方式：请求头 `Authorization: Bearer <token>`。

---

## 四、数据存储结构（Upstash）

| Key | 内容 | 过期 |
|---|---|---|
| `user:{uid}` | `{uid, phone, createdAt, vip, vipUntil, plan, data}`，`data` 存学习进度/易错本/手账等 | 永久 |
| `usage:{uid}:{YYYY-MM-DD}` | `{seconds, date}` 当日已用秒数，按日自动隔离 | 48 小时 |
| `smscode:{phone}` | `{code, at}` 验证码 | 5 分钟 |
| `smsrate:{phone}` | 发码频控标记 | 60 秒 |
| `redeem:{code}` | `{uid, at, plan}` 兑换码归属，防一码多号 | 永久 |
| `survey:{uid}` | 1299 合伙人问卷 `{answers, advantage, score, advice}` | 永久 |

---

## 五、业务规则

- **每日免费额度**：600 秒（10 分钟）。未注册用户按浏览器本地记账，注册用户按账号在后端记账（换设备不重置）。
- **门禁范围**：只在「开始练习」「只练易错」页拦截；浏览首页、课程广场等不受限。
- **会员**：兑换码开通后不限时，且学习数据自动云端保存。会员到期时间由服务端计算（月卡 30 天 / 季卡 90 天 / 年卡 365 天 / 永久卡）。
- **安全**：客户端上传的数据里 `vip`/`vipUntil`/`plan` 等字段会被服务端剔除，会员态只能由服务端兑换结果决定，无法伪造。
