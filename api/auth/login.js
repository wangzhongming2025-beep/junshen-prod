// 验证码登录 / 注册（首次登录自动建号），返回令牌与云端数据
const { handle, ok, fail } = require("../../lib/http");
const auth = require("../../lib/auth");
const sms = require("../../lib/sms");
const user = require("../../lib/user");

module.exports = handle(async (req, res, body) => {
  if (req.method !== "POST") return fail(res, 405, "METHOD_NOT_ALLOWED");

  const phone = user.normalizePhone(body.phone);
  const code = String(body.code == null ? "" : body.code).trim();

  if (!user.validPhone(phone)) return fail(res, 400, "PHONE_INVALID");
  if (!/^\d{6}$/.test(code)) return fail(res, 400, "CODE_INVALID", { hint: "验证码为 6 位数字" });

  const chk = await sms.checkCode(phone, code);
  if (!chk.ok) return fail(res, 401, chk.error);

  const u = await user.ensureUser(phone);
  const token = auth.issue(u.uid, u.phone);

  return ok(res, {
    token,
    user: user.publicUser(u),
    data: u.data || null,
    usage: await user.getUsage(u.uid),
    freeLimit: 600,
  });
});
