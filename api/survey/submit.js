// 提交 1299 合伙人计划调查
const { handle, ok, fail, currentUser } = require("../../lib/http");
const survey = require("../../lib/survey");

module.exports = handle(async (req, res, body) => {
  if (req.method !== "POST") return fail(res, 405, "METHOD_NOT_ALLOWED");

  const me = currentUser(req);
  if (!me) return fail(res, 401, "LOGIN_REQUIRED");

  if (!body || typeof body.answers !== "object") {
    return fail(res, 400, "ANSWERS_REQUIRED");
  }

  try {
    const rec = await survey.save(me.uid, me.phone, {
      answers: body.answers,
      advantage: String(body.advantage || ""),
    });
    return ok(res, { survey: rec });
  } catch (e) {
    const msg = String((e && e.message) || "SAVE_FAILED");
    if (msg.indexOf("ANSWERS_INVALID") >= 0) return fail(res, 400, msg);
    throw e;
  }
});
