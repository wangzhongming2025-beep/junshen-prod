// 会员套餐与兑换码（服务端权威，防止码被无限复用）
// 环境变量 REDEEM_CODES 格式：CODE1=year,CODE2=month,CODE3=forever
//                        只写 CODE 不写套餐则默认 month
// 未配置 REDEEM_CODES 时，自动 fallback 到前端默认码池（默认月卡 30 天）
const db = require("./db");

const PLANS = {
  month: { days: 30, label: "月卡" },
  quarter: { days: 90, label: "季卡" },
  year: { days: 365, label: "年卡" },
  forever: { days: 0, label: "永久卡" },
};

// 与前端 waxue-clone/js/app.js 默认码池保持一致
const DEFAULT_CODES = [
  "HY2026-1001","HY2026-1002","HY2026-1003","HY2026-1004","HY2026-1005",
  "HY2026-2001","HY2026-2002","HY2026-2003","HY2026-2004","HY2026-2005",
];

function getCodesRaw() {
  const env = (process.env.REDEEM_CODES || "").trim();
  if (env) return env;
  return DEFAULT_CODES.map((c) => c + "=month").join(",");
}

function findPlan(code) {
  const target = String(code || "").trim().toUpperCase();
  if (!target) return null;
  const raw = getCodesRaw();
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
  return true; // 始终可兑换：环境变量优先，否则用默认码池
}

module.exports = { PLANS, findPlan, codesConfigured };
