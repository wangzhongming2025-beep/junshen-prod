// 通用 HTTP 工具：CORS、JSON 读写、Bearer 令牌鉴权
const auth = require("./auth");
const db = require("./db");

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function json(res, status, body) {
  applyCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function ok(res, data) {
  json(res, 200, Object.assign({ ok: true }, data || {}));
}

function fail(res, status, msg, extra) {
  json(res, status, Object.assign({ ok: false, error: msg }, extra || {}));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1000000) req.destroy();
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === "object" ? parsed : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

// 解析 Authorization: Bearer <token>
function currentUser(req) {
  const h = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
  const m = /^Bearer\s+(.+)$/i.exec(String(h).trim());
  if (!m) return null;
  try {
    return auth.verify(m[1]);
  } catch (e) {
    return null;
  }
}

// 统一包装：OPTIONS 预检、异常兜底、配置缺失友好提示
function handle(fn) {
  return async (req, res) => {
    if (req.method === "OPTIONS") {
      applyCors(res);
      res.statusCode = 204;
      return res.end();
    }
    try {
      const body = req.method === "POST" ? await readBody(req) : {};
      return await fn(req, res, body || {});
    } catch (e) {
      const msg = String((e && e.message) || "SERVER_ERROR");
      if (msg.indexOf("NOT_CONFIGURED") >= 0) {
        return fail(res, 503, msg, { hint: "请在 Vercel 后台 → Settings → Environment Variables 配置对应变量" });
      }
      return fail(res, 500, msg);
    }
  };
}

module.exports = { applyCors, json, ok, fail, readBody, currentUser, handle, db };
