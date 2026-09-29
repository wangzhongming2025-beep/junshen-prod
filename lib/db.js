// Upstash Redis REST 封装 —— 零依赖，使用 Node 18+ 全局 fetch
// 环境变量：UPSTASH_REDIS_REST_URL、UPSTASH_REDIS_REST_TOKEN
const BASE = process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

function configured() {
  return !!(BASE && TOKEN);
}

async function cmd(args) {
  if (!configured()) throw new Error("DB_NOT_CONFIGURED");
  const r = await fetch(BASE, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error("DB_HTTP_" + r.status);
  let j = null;
  try {
    j = await r.json();
  } catch (e) {
    throw new Error("DB_BAD_RESPONSE");
  }
  if (j && j.error) throw new Error("DB_ERROR:" + j.error);
  return j ? j.result : null;
}

function parse(v) {
  if (v == null) return null;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch (e) {
    return null;
  }
}

async function jget(key) {
  return parse(await cmd(["GET", key]));
}

async function jset(key, val) {
  await cmd(["SET", key, JSON.stringify(val)]);
  return true;
}

async function setEx(key, seconds, val) {
  await cmd(["SETEX", key, String(seconds), JSON.stringify(val)]);
  return true;
}

async function del(key) {
  await cmd(["DEL", key]);
  return true;
}

async function expire(key, seconds) {
  await cmd(["EXPIRE", key, String(seconds)]);
  return true;
}

module.exports = { configured, cmd, jget, jset, setEx, del, expire };
