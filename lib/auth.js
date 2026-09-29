// 轻量令牌：HMAC-SHA256 签名的无状态 token（不依赖 JWT 库）
// 环境变量：AUTH_SECRET（务必设置为足够长的随机串）
const crypto = require("crypto");

const SECRET = process.env.AUTH_SECRET || "";
const TTL = 60 * 60 * 24 * 30; // 30 天

function b64u(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64uDecode(str) {
  const s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return Buffer.from(s + pad, "base64").toString("utf8");
}

function signature(body) {
  return b64u(crypto.createHmac("sha256", SECRET).update(body).digest());
}

function sign(payload) {
  if (!SECRET) throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  const body = b64u(Buffer.from(JSON.stringify(payload), "utf8"));
  return body + "." + signature(body);
}

function verify(token) {
  if (!SECRET) throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  if (typeof token !== "string" || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const body = parts[0];
  const sig = parts[1];
  const expect = signature(body);
  if (expect.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expect.length; i++) diff |= expect.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  let payload = null;
  try {
    payload = JSON.parse(b64uDecode(body));
  } catch (e) {
    return null;
  }
  if (!payload || !payload.uid) return null;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function issue(uid, phone) {
  const now = Math.floor(Date.now() / 1000);
  return sign({ uid, phone, iat: now, exp: now + TTL });
}

module.exports = { sign, verify, issue, TTL };
