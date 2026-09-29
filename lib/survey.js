// 1299 永久卡 / 合伙人计划 调查数据
// key: survey:{uid} → { uid, phone, answers, advantage, score, advice, createdAt, updatedAt }
const db = require("./db");
const user = require("./user");

const QUESTION_KEYS = [
  "livestream",
  "editing",
  "sales",
  "copywriting",
  "device",
  "english",
  "mission",
  "time",
];

function validAnswers(a) {
  if (!a || typeof a !== "object") return false;
  return QUESTION_KEYS.every((k) => a[k] === true || a[k] === false);
}

function scoreAnswers(a) {
  let yes = 0;
  QUESTION_KEYS.forEach((k) => { if (a[k]) yes += 1; });
  return Math.round((yes / QUESTION_KEYS.length) * 100);
}

function advice(a) {
  const s = scoreAnswers(a);
  if (s >= 88) return "strong";
  if (s >= 63) return "fit";
  if (a.time && a.english && a.device) return "potential";
  return "month_first";
}

async function get(uid) {
  return (await db.jget("survey:" + uid)) || null;
}

async function save(uid, phone, payload) {
  if (!validAnswers(payload.answers)) throw new Error("ANSWERS_INVALID");
  const now = new Date().toISOString();
  const rec = {
    uid,
    phone: user.normalizePhone(phone || ""),
    answers: payload.answers,
    advantage: String(payload.advantage || "").slice(0, 500),
    score: scoreAnswers(payload.answers),
    advice: advice(payload.answers),
    createdAt: now,
    updatedAt: now,
  };
  const old = await get(uid);
  if (old) rec.createdAt = old.createdAt;
  await db.jset("survey:" + uid, rec);
  return rec;
}

module.exports = {
  QUESTION_KEYS,
  validAnswers,
  scoreAnswers,
  advice,
  get,
  save,
};
