// 获取当前登录用户的调查记录
const { handle, ok, fail, currentUser } = require("../../lib/http");
const survey = require("../../lib/survey");

module.exports = handle(async (req, res) => {
  if (req.method !== "GET") return fail(res, 405, "METHOD_NOT_ALLOWED");

  const me = currentUser(req);
  if (!me) return fail(res, 401, "LOGIN_REQUIRED");

  const rec = await survey.get(me.uid);
  if (!rec) return fail(res, 404, "SURVEY_NOT_FOUND");
  return ok(res, { survey: rec });
});
