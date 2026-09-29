// 每日免费额度记账（单位：秒）。默认每天 600 秒（10 分钟），会员不受限。
const { handle, ok, fail, currentUser } = require("../../lib/http");
const user = require("../../lib/user");

const FREE_LIMIT = 600; // 秒
const MAX_FLUSH = 3600; // 单次最多补记 1 小时，防异常刷量

module.exports = handle(async (req, res, body) => {
  const me = currentUser(req);
  if (!me) return fail(res, 401, "UNAUTHORIZED");

  const u = await user.getUser(me.uid);
  if (!u) return fail(res, 404, "USER_NOT_FOUND");

  const vip = user.isVip(u);

  if (req.method === "GET") {
    return ok(res, { seconds: await user.getUsage(u.uid), vip, freeLimit: FREE_LIMIT });
  }

  if (req.method === "POST") {
    const add = Number(body.seconds || 0);
    if (!isFinite(add) || add < 0) return fail(res, 400, "SECONDS_INVALID");
    const seconds = await user.addUsage(u.uid, Math.min(add, MAX_FLUSH));
    return ok(res, { seconds, vip, freeLimit: FREE_LIMIT });
  }

  return fail(res, 405, "METHOD_NOT_ALLOWED");
});
