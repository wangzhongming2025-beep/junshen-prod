// 阿里云短信服务（Dysmsapi）发送验证码 + 验证码存储校验
// 环境变量：ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET /
//          ALIYUN_SMS_SIGN_NAME / ALIYUN_SMS_TEMPLATE_CODE
// 调试用：ALLOW_DEV_CODE=1 时，未配置短信也会把验证码回传，便于本地联调（生产务必去掉）
const crypto = require("crypto");
const db = require("./db");

const AK = process.env.ALIYUN_ACCESS_KEY_ID || "";
const SK = process.env.ALIYUN_ACCESS_KEY_SECRET || "";
const SIGN_NAME = process.env.ALIYUN_SMS_SIGN_NAME || "";
const TEMPLATE_CODE = process.env.ALIYUN_SMS_TEMPLATE_CODE || "";
const DEV = process.env.ALLOW_DEV_CODE === "1";

function configured() {
  return !!(AK && SK && SIGN_NAME && TEMPLATE_CODE);
}

function devMode() {
  return DEV;
}

// 阿里云要求的 RFC3986 百分号编码（~ 不编码，空格为 %20）
function pct(str) {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

async function sendAliyun(phone, code) {
  const params = {
    AccessKeyId: AK,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    RegionId: "cn-hangzhou",
    SignName: SIGN_NAME,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: "1.0",
    TemplateCode: TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code: String(code) }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2017-05-25",
  };
  const keys = Object.keys(params).sort();
  const canonical = keys.map((k) => pct(k) + "=" + pct(params[k])).join("&");
  const stringToSign = "GET" + "&" + pct("/") + "&" + pct(canonical);
  const sig = crypto.createHmac("sha1", SK + "&").update(stringToSign).digest("base64");
  const url = "https://dysmsapi.aliyuncs.com/?" + canonical + "&Signature=" + pct(sig);

  const r = await fetch(url, { method: "GET" });
  let j = {};
  try {
    j = await r.json();
  } catch (e) {
    j = {};
  }
  if (j && j.Code === "OK") return { ok: true };
  return { ok: false, error: (j && (j.Message || j.Code)) || "SMS_SEND_FAILED" };
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendCode(phone) {
  const code = genCode();
  await db.setEx("smscode:" + phone, 300, { code, at: Date.now() });
  if (!configured()) {
    if (DEV) return { ok: true, dev: true, devCode: code };
    return { ok: false, error: "SMS_NOT_CONFIGURED" };
  }
  const r = await sendAliyun(phone, code);
  if (DEV && !r.ok) return { ok: true, dev: true, devCode: code, warning: r.error };
  return r;
}

async function checkCode(phone, code) {
  const rec = await db.jget("smscode:" + phone);
  const input = String(code == null ? "" : code).trim();
  if (!rec || !rec.code) return { ok: false, error: "CODE_EXPIRED" };
  if (String(rec.code) !== input) return { ok: false, error: "CODE_WRONG" };
  await db.del("smscode:" + phone);
  return { ok: true };
}

module.exports = { configured, devMode, sendCode, checkCode };
