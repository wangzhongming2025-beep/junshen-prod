// 兑换码开通会员（服务端校验，一码一账号，可叠加续期）
const { handle, ok, fail, currentUser } = require("../../lib/http");
const db = require("../../lib/db");
const user = require("../../lib/user");
const member = require("../../lib/member");

module.exports = handle(async (req, res, body) => {
  if (req.method !== "POST") return fail(res, 405, "METHOD_NOT_ALLOWED");

  const me = currentUser(req);
  if (!me) return fail(res, 401, "UNAUTHORIZED");

  if (!member.codesConfigured()) throw new Error("REDEEM_CODES_NOT_CONFIGURED");

  const code = String(body.code == null ? "" : body.code).trim().toUpperCase();
  if (!code) return fail(res, 400, "CODE_EMPTY");

  const def = member.findPlan(code);
  if (!def) return fail(res, 404, "CODE_INVALID", { hint: "兑换码无效，请联系 vip20213456 核实" });

  const used = await db.jget("redeem:" + def.code);
  if (used && used.uid && used.uid !== me.uid) {
    return fail(res, 409, "CODE_USED", { hint: "该兑换码已被使用" });
  }
  if (used && used.uid === me.uid) {
    return fail(res, 409, "CODE_ALREADY_ACTIVATED", { hint: "你已经开通过了" });
  }

  const u = await user.getUser(me.uid);
  if (!u) return fail(res, 404, "USER_NOT_FOUND");

  const now = Date.now();
  // 续期：已有会员且未过期则在其基础上叠加
  let base = now;
  if (user.isVip(u) && u.vipUntil) {
    const t = new Date(u.vipUntil).getTime();
    if (!isNaN(t) && t > now) base = t;
  }

  u.vip = true;
  u.plan = def.plan;
  u.vipUntil = def.days > 0 ? new Date(base + def.days * 86400000).toISOString() : null;
  u.activatedAt = new Date().toISOString();
  await user.saveUser(u);
  await db.jset("redeem:" + def.code, { uid: u.uid, at: u.activatedAt, plan: def.plan });

  return ok(res, {
    vip: true,
    plan: def.plan,
    planLabel: def.label,
    vipUntil: u.vipUntil,
  });
});
