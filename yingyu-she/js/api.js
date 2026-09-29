/* ===== 硬核英语社 · 后端接口封装 ===== */
(function () {
  const BASE = window.API_BASE || "/api";   // 与站点同域，Vercel Serverless 函数
  const TOKEN_KEY = "hy_token";
  const USER_KEY = "hy_user";

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  }

  function getToken() { return ls(TOKEN_KEY) || ""; }
  function setToken(t) { ls(TOKEN_KEY, t || null); }
  function getUser() {
    try { return JSON.parse(ls(USER_KEY) || "null"); } catch (e) { return null; }
  }
  function setUser(u) { ls(USER_KEY, u ? JSON.stringify(u) : null); }

  async function request(path, opts) {
    opts = opts || {};
    const method = opts.method || "GET";
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (opts.auth !== false && token) headers.Authorization = "Bearer " + token;
    let res = null;
    try {
      res = await fetch(BASE + path, {
        method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
    } catch (e) {
      return { ok: false, offline: true, error: "NETWORK_ERROR" };
    }
    let j = {};
    try { j = await res.json(); } catch (e) { j = { ok: false, error: "BAD_RESPONSE" }; }
    if (res.status === 401) { setToken(""); setUser(null); }
    return Object.assign({ ok: !!j.ok, status: res.status }, j);
  }

  window.API = {
    getToken, setToken,
    getUser, setUser,
    isLoggedIn() { return !!getToken(); },
    logout() { setToken(""); setUser(null); },

    health: () => request("/health", { auth: false }),
    sendCode: (phone) => request("/auth/send-code", { method: "POST", body: { phone }, auth: false }),
    login: (phone, code) => request("/auth/login", { method: "POST", body: { phone, code }, auth: false }),
    getState: () => request("/user/state"),
    putState: (data) => request("/user/state", { method: "POST", body: { data } }),
    getUsage: () => request("/user/usage"),
    addUsage: (seconds) => request("/user/usage", { method: "POST", body: { seconds } }),
    redeem: (code) => request("/member/redeem", { method: "POST", body: { code } }),
  };
})();
