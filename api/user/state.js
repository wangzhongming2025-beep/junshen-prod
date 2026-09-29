// 用户数据云同步：GET 拉取（档案 + 学习数据 + 当日已用时长），POST 上传学习数据
// 注意：会员状态由服务端权威，客户端上传的 vip 相关字段会被剔除
const { handle, ok, fail, currentUser } = require("../../lib/http");
const user = require("../../lib/user");

const VIP_FIELDS = ["vip", "vipUntil", "plan", "activatedAt"];
const MAX_DATA_CHARS = 400000;

function sanitize(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return {};
  const out = Object.assign({}, d);
  VIP_FIELDS.forEach((k) => delete out[k]);
  return out;
}

module.exports = handle(async (req, res, body) => {
  const me = currentUser(req);
  if (!me) return fail(res, 401, "UNAUTHORIZED");

  const u = await user.getUser(me.uid);
  if (!u) return fail(res, 404, "USER_NOT_FOUND");

  if (req.method === "GET") {
    return ok(res, {
      user: user.publicUser(u),
      data: u.data || null,
      usage: await user.getUsage(u.uid),
      freeLimit: 600,
    });
  }

  if (req.method === "POST") {
    if (!body || typeof body.data !== "object") return fail(res, 400, "DATA_INVALID");
    if (JSON.stringify(body.data).length > MAX_DATA_CHARS) {
      return fail(res, 413, "DATA_TOO_LARGE");
    }
    u.data = sanitize(body.data);
    await user.saveUser(u);
    return ok(res, { saved: true, updatedAt: u.updatedAt });
  }

  return fail(res, 405, "METHOD_NOT_ALLOWED");
});
