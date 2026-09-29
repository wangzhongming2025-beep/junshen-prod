// 健康检查：确认后端与各项环境变量是否就绪（不泄露密钥）
const { handle, ok, db } = require("../lib/http");
const sms = require("../lib/sms");
const member = require("../lib/member");

module.exports = handle(async (req, res) => {
  ok(res, {
    service: "yingyu-she-api",
    time: new Date().toISOString(),
    ready: {
      db: db.configured(),
      sms: sms.configured(),
      auth: !!(process.env.AUTH_SECRET || ""),
      redeemCodes: member.codesConfigured(),
    },
    devCode: sms.devMode(),
  });
});
