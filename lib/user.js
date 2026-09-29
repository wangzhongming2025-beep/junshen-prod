// 用户与数据记录：以手机号为身份，数据存 Upstash
// key: user:{uid} → { uid, phone, createdAt, vip, vipUntil, plan, data }
// key: usage:{uid}:{YYYY-MM-DD} → { seconds, date }
const crypto = require("crypto");
const db = require("./db");

const PHONE_RE = /^1[3-9]\d{9}$/;

function normalizePhone(p) {
  return String(p == null ? "" : p).replace(/\D/g, "");
}

function validPhone(p) {
  return PHONE_RE.test(normalizePhone(p));
}

function uidOf(phone) {
  return "u_" + crypto.createHash("sha1").update("hy:" + normalizePhone(phone)).digest("hex").slice(0, 16);
}

function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

async function getUser(uid) {
  return (await db.jget("user:" + uid)) || null;
}

async function ensureUser(phone) {
  const uid = uidOf(phone);
  let u = await getUser(uid);
  if (!u) {
    const now = new Date().toISOString();
    u = {
      uid,
      phone: normalizePhone(phone),
      createdAt: now,
      updatedAt: now,
      vip: false,
      vipUntil: null,
      plan: null,
      activatedAt: null,
      data: null,
    };
    await db.jset("user:" + uid, u);
  }
  return u;
}

async function saveUser(u) {
  u.updatedAt = new Date().toISOString();
  await db.jset("user:" + u.uid, u);
  return u;
}

function isVip(u) {
  if (!u) return false;
  if (u.plan === "forever") return true;
  if (u.vipUntil) {
    const t = new Date(u.vipUntil).getTime();
    if (!isNaN(t) && t > Date.now()) return true;
    return false;
  }
  return !!u.vip;
}

function publicUser(u) {
  return {
    uid: u.uid,
    phone: u.phone,
    createdAt: u.createdAt,
    vip: isVip(u),
    vipUntil: u.vipUntil || null,
    plan: u.plan || null,
    updatedAt: u.updatedAt || null,
  };
}

// ---- 每日免费额度（秒）----
async function getUsage(uid) {
  const v = await db.jget("usage:" + uid + ":" + todayStr());
  if (typeof v === "number") return v;
  if (v && typeof v.seconds === "number") return v.seconds;
  return 0;
}

async function addUsage(uid, seconds) {
  const add = Math.round(Number(seconds) || 0);
  if (add <= 0) return getUsage(uid);
  const date = todayStr();
  const key = "usage:" + uid + ":" + date;
  const cur = await db.jget(key);
  const base = typeof cur === "number" ? cur : (cur && cur.seconds) || 0;
  const total = base + add;
  await db.jset(key, { seconds: total, date });
  await db.expire(key, 60 * 60 * 48);
  return total;
}

module.exports = {
  normalizePhone,
  validPhone,
  uidOf,
  todayStr,
  getUser,
  ensureUser,
  saveUser,
  isVip,
  publicUser,
  getUsage,
  addUsage,
};
