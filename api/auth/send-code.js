// 发送短信验证码（60 秒频控，验证码 5 分钟有效）
const { handle, ok, fail } = require("../../lib/http");
const db = require("../../lib/db");
const sms = require("../../lib/sms");
const user = require("../../lib/user");

module.exports = handle(async (req, res, body) => {
  if (req.method !== "POST") return fail(res, 405, "METHOD_NOT_ALLOWED");

  const phone = user.normalizePhone(body.phone);
  if (!user.validPhone(phone)) return fail(res, 400, "PHONE_INVALID", { hint: "请填写 11 位中国大陆手机号" });

  // 频控：同一号码 60 秒内只能发一次（调试模式不限制）
  if (!sms.devMode()) {
    const rate = await db.jget("smsrate:" + phone);
    if (rate) return fail(res, 429, "TOO_FREQUENT", { hint: "请稍后再试" });
    await db.setEx("smsrate:" + phone, 60, { at: Date.now() });
  }

  const r = await sms.sendCode(phone);
  if (!r.ok) return fail(res, 502, r.error || "SMS_SEND_FAILED");

  const out = { sent: true };
  if (r.dev) {
    out.dev = true;
    out.devCode = r.devCode;
    if (r.warning) out.warning = r.warning;
  }
  return ok(res, out);
});
