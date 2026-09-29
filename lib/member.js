// 会员套餐与兑换码（服务端权威，防止码被无限复用）
// 环境变量 REDEEM_CODES 格式：CODE1=year,CODE2=month,CODE3=forever
//                        只写 CODE 不写套餐则默认 month
const db = require("./db");

const PLANS = {
  month: { days: 30, label: "月卡" },
  quarter: { days: 90, label: "季卡" },
  year: { days: 365, label: "年卡" },
  forever: { days: 0, label: "永久卡" },
};

function findPlan(code) {
  const target = String(code || "").trim().toUpperCase();
  if (!target) return null;
  const raw = process.env.REDEEM_CODES || "";
  const parts = raw.split(",");
  for (const part of parts) {
    const seg = String(part || "").trim();
    if (!seg) continue;
    const bits = seg.split("=");
    const c = String(bits[0] || "").trim().toUpperCase();
    if (!c || c !== target) continue;
    const planKey = String(bits[1] || "month").trim();
    const def = PLANS[planKey] ? planKey : "month";
    return Object.assign({ code: c, plan: def }, PLANS[def]);
  }
  return null;
}

function codesConfigured() {
  return !!(process.env.REDEEM_CODES || "").trim();
}

module.exports = { PLANS, findPlan, codesConfigured };
