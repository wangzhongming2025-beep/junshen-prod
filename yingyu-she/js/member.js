/* ===== 硬核英语社 · 会员 / 登录 / 每日免费额度 / 云同步 ===== */
(function () {
  const FREE_LIMIT = 600; // 每日免费 10 分钟（秒）

  let timer = null;
  let pending = 0;      // 待上报的秒数
  let used = 0;         // 今日已用秒数
  let loaded = false;   // 今日额度是否已初始化
  let cdTimer = null;   // 验证码倒计时

  // ---------- 小工具 ----------
  function todayKey() {
    const d = new Date();
    return "hy_usage_" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function guestLoad() {
    try { return Number(localStorage.getItem(todayKey()) || 0) || 0; } catch (e) { return 0; }
  }
  function guestSave(v) {
    try { localStorage.setItem(todayKey(), String(v)); } catch (e) {}
  }
  function isPracticeHash() {
    const h = (location.hash || "").replace("#/", "");
    const seg = h.split("/")[0];
    return seg === "practice" || (seg === "weak" && h.split("/")[1] === "practice");
  }
  function mmss(sec) {
    const s = Math.max(0, Math.round(sec));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  // ---------- 顶栏入口 ----------
  function refreshNav() {
    const el = document.getElementById("navLogin");
    const u = API.getUser();
    const vip = Store.isVip();
    if (el) {
      if (u && u.phone) {
        el.textContent = (vip ? "👑 " : "👤 ") + u.phone.slice(0, 3) + "****" + u.phone.slice(-4);
        el.classList.add("logged");
      } else {
        el.textContent = "登录 / 注册";
        el.classList.remove("logged");
      }
    }
    const cardBtn = document.getElementById("navOpenCard");
    if (cardBtn) {
      if (vip) { cardBtn.textContent = "会员已开通 ✓"; cardBtn.classList.add("vip-on"); }
      else { cardBtn.textContent = "开通学习卡"; cardBtn.classList.remove("vip-on"); }
    }
  }

  // ---------- 每日免费额度 ----------
  function usageBarEl() {
    let el = document.getElementById("usageBar");
    if (!el) {
      el = document.createElement("div");
      el.id = "usageBar";
      el.className = "usage-bar";
      document.body.appendChild(el);
    }
    return el;
  }
  function updateUsageBar() {
    const el = usageBarEl();
    if (Store.isVip()) {
      el.textContent = "👑 会员不限时";
      el.className = "usage-bar vip";
      el.style.display = "";
      return;
    }
    const left = Math.max(0, FREE_LIMIT - used);
    el.textContent = "今日免费剩余 " + mmss(left);
    el.className = "usage-bar" + (left <= 60 ? " warn" : "");
    el.style.display = isPracticeHash() ? "" : "none";
  }

  async function loadUsed() {
    if (API.isLoggedIn()) {
      const r = await API.getUsage();
      if (r.ok && typeof r.seconds === "number") {
        used = Math.max(guestLoad(), r.seconds);
        if (r.vip) Store.setVip(true); // 云端开通过会员 → 本地同步（只升级不降级）
        loaded = true;
        return;
      }
      if (typeof r.vip === "boolean" && r.vip) Store.setVip(true);
    }
    used = guestLoad();
    loaded = true;
  }

  function flush() {
    if (pending <= 0) return;
    const p = pending;
    pending = 0;
    if (API.isLoggedIn()) API.addUsage(p);
  }

  function tick() {
    used += 1;
    pending += 1;
    if (!API.isLoggedIn()) guestSave(used);
    updateUsageBar();
    if (pending >= 20) flush();
    if (used >= FREE_LIMIT && !Store.isVip()) syncTimer();
  }

  function startTimer() {
    if (timer) return;
    timer = setInterval(tick, 1000);
  }
  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
    flush();
  }

  // ---------- 额度门禁 ----------
  function isBlocked() {
    return !Store.isVip() && used >= FREE_LIMIT;
  }
  function gateEl() {
    let mask = document.getElementById("gateMask");
    if (!mask) {
      mask = document.createElement("div");
      mask.className = "modal-mask";
      mask.id = "gateMask";
      mask.innerHTML = `
        <div class="modal gate-modal">
          <div class="gate-icon">⏳</div>
          <h3>今日免费 10 分钟已用完</h3>
          <p class="modal-sub">每天可免费练习 10 分钟。开通学习卡后<b>不限时练习</b>，并且注册后学习进度、易错本、手账会<b>自动云端保存</b>，换设备也不丢。</p>
          <div class="gate-actions">
            <button class="btn-green" id="gateOpenCard">开通学习卡</button>
            <button class="btn-ghost" id="gateLogin">登录 / 注册</button>
            <button class="btn-ghost" id="gateHome">返回首页</button>
          </div>
        </div>`;
      document.body.appendChild(mask);
      mask.querySelector("#gateOpenCard").addEventListener("click", () => window.openCardModal());
      mask.querySelector("#gateLogin").addEventListener("click", () => openLoginModal());
      mask.querySelector("#gateHome").addEventListener("click", () => { location.hash = "#/home"; });
    }
    return mask;
  }
  function showGate() {
    const mask = gateEl();
    const loginBtn = mask.querySelector("#gateLogin");
    if (loginBtn) loginBtn.style.display = API.isLoggedIn() ? "none" : "";
    mask.classList.add("show");
  }
  function hideGate() {
    const mask = document.getElementById("gateMask");
    if (mask) mask.classList.remove("show");
  }

  function syncTimer() {
    // 仅在练习页拦截；浏览首页/课程广场等不受限
    if (isBlocked() && isPracticeHash()) { stopTimer(); showGate(); updateUsageBar(); return; }
    hideGate();
    if (isPracticeHash()) {
      if (!loaded) {
        // 异步拉回云端/本地额度后要重新判定一次，否则已超限不会立刻拦住
        loadUsed().then(() => {
          updateUsageBar();
          if (isBlocked()) syncTimer();
        });
      }
      startTimer();
    } else {
      stopTimer();
    }
    updateUsageBar();
  }

  // ---------- 登录弹窗 ----------
  function openLoginModal() {
    let mask = document.getElementById("loginMask");
    if (!mask) {
      mask = document.createElement("div");
      mask.className = "modal-mask";
      mask.id = "loginMask";
      mask.innerHTML = `
        <div class="modal login-modal">
          <h3>登录 / 注册</h3>
          <p class="modal-sub">用手机号注册后，学习进度、易错本、打卡与手账会<b>自动保存到云端</b>，换手机也不丢。</p>
          <div class="login-row">
            <input id="loginPhone" class="code-input" type="tel" maxlength="11" placeholder="请输入手机号" autocomplete="off" />
          </div>
          <div class="login-row">
            <input id="loginCode" class="code-input" type="text" maxlength="6" placeholder="6 位验证码" autocomplete="off" />
            <button class="btn-ghost" id="loginSend">获取验证码</button>
          </div>
          <div id="loginMsg" class="redeem-msg"></div>
          <div style="text-align:right;margin-top:14px">
            <button class="btn-ghost" id="loginClose">关闭</button>
          </div>
        </div>`;
      document.body.appendChild(mask);
      mask.addEventListener("click", (e) => { if (e.target === mask) mask.classList.remove("show"); });
      mask.querySelector("#loginClose").addEventListener("click", () => mask.classList.remove("show"));

      const msgEl = mask.querySelector("#loginMsg");
      const sendBtn = mask.querySelector("#loginSend");
      const phoneEl = mask.querySelector("#loginPhone");
      const codeEl = mask.querySelector("#loginCode");

      sendBtn.addEventListener("click", async () => {
        const phone = (phoneEl.value || "").replace(/\D/g, "");
        if (!/^1[3-9]\d{9}$/.test(phone)) {
          msgEl.className = "redeem-msg err"; msgEl.textContent = "请填写正确的 11 位手机号";
          return;
        }
        sendBtn.disabled = true; sendBtn.textContent = "发送中…";
        const r = await API.sendCode(phone);
        if (r.ok) {
          msgEl.className = "redeem-msg ok";
          msgEl.textContent = r.devCode
            ? "验证码已发送（测试环境直接显示：" + r.devCode + "）"
            : "验证码已发送，请查收短信";
          if (r.devCode) codeEl.value = r.devCode;
          let n = 60;
          sendBtn.textContent = n + "s 后重发";
          clearInterval(cdTimer);
          cdTimer = setInterval(() => {
            n -= 1;
            if (n <= 0) { clearInterval(cdTimer); sendBtn.disabled = false; sendBtn.textContent = "获取验证码"; }
            else sendBtn.textContent = n + "s 后重发";
          }, 1000);
        } else {
          sendBtn.disabled = false; sendBtn.textContent = "获取验证码";
          msgEl.className = "redeem-msg err";
          msgEl.textContent = ({
            PHONE_INVALID: "手机号格式不正确",
            TOO_FREQUENT: "发送太频繁，请稍后再试",
            SMS_NOT_CONFIGURED: "短信服务未配置，请联系站长",
            DB_NOT_CONFIGURED: "服务尚未开通，请联系站长（vip20213456）",
            AUTH_SECRET_NOT_CONFIGURED: "服务尚未开通，请联系站长（vip20213456）",
            NETWORK_ERROR: "网络异常，请检查网络后重试",
          })[r.error] || ("发送失败：" + (r.error || "未知错误"));
        }
      });

      codeEl.addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
      async function doLogin() {
        const phone = (phoneEl.value || "").replace(/\D/g, "");
        const code = (codeEl.value || "").trim();
        if (!/^1[3-9]\d{9}$/.test(phone)) { msgEl.className = "redeem-msg err"; msgEl.textContent = "请填写正确的手机号"; return; }
        if (!/^\d{6}$/.test(code)) { msgEl.className = "redeem-msg err"; msgEl.textContent = "请输入 6 位验证码"; return; }
        msgEl.className = "redeem-msg"; msgEl.textContent = "登录中…";
        const r = await API.login(phone, code);
        if (!r.ok || !r.token) {
          msgEl.className = "redeem-msg err";
          msgEl.textContent = ({
            CODE_WRONG: "验证码错误",
            CODE_EXPIRED: "验证码已过期，请重新获取",
            NETWORK_ERROR: "网络异常，请检查网络后重试",
          })[r.error] || ("登录失败：" + (r.error || "未知错误"));
          return;
        }
        API.setToken(r.token);
        API.setUser(r.user);
        mask.classList.remove("show");
        await afterLogin();
      }
      // 暴露给「登录」按钮
      mask._doLogin = doLogin;
      const lb = document.createElement("button");
      lb.className = "btn-green"; lb.style.marginRight = "8px"; lb.textContent = "登录";
      lb.addEventListener("click", doLogin);
      mask.querySelector("#loginClose").parentNode.insertBefore(lb, mask.querySelector("#loginClose"));
    }
    mask.classList.add("show");
  }

  // ---------- 云同步 ----------
  let pushTimerId = null;
  let suppressPush = false;

  function schedulePush() {
    if (!API.isLoggedIn()) return;
    clearTimeout(pushTimerId);
    pushTimerId = setTimeout(push, 2500);
  }
  async function push() {
    if (!API.isLoggedIn()) return;
    if (suppressPush) { suppressPush = false; return; }
    await API.putState(Store.get());
  }

  async function afterLogin() {
    // 本地已兑换过的码 → 补登记到云端（避免老用户掉会员）
    const st = Store.get();
    if (st.redeemedCodes && st.redeemedCodes.length) {
      for (const c of st.redeemedCodes) {
        const r = await API.redeem(c);
        if (r.ok) Store.setVip(true);
      }
    }
    const r = await API.getState();
    if (r.ok) {
      API.setUser(r.user);
      if (r.user && r.user.vip) Store.setVip(true);
      if (r.data && Object.keys(r.data).length) {
        suppressPush = true;
        Store.replaceAll(r.data);
      } else {
        suppressPush = true;
        await API.putState(Store.get());
      }
    }
    loaded = false; // 重新按云端额度初始化
    refreshNav();
    syncTimer();
    try { window.toastMsg && window.toastMsg("已登录，数据将自动云端保存"); } catch (e) {}
  }

  function logout() {
    if (!window.confirm("退出登录后本机数据仍保留，确定退出？")) return;
    API.logout();
    refreshNav();
    syncTimer();
  }

  // ---------- 绑定 ----------
  function bind() {
    const el = document.getElementById("navLogin");
    if (el) {
      el.addEventListener("click", () => {
        if (API.isLoggedIn()) logout();
        else openLoginModal();
      });
    }
    window.addEventListener("hashchange", syncTimer);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { if (timer) { clearInterval(timer); timer = null; } flush(); }
      else syncTimer();
    });
    window.addEventListener("beforeunload", flush);
    if (typeof Store.onChange === "function") Store.onChange(schedulePush);
  }

  // ---------- 启动 ----------
  function boot() {
    bind();
    used = guestLoad();   // 先用本地额度初始化，保证进入练习页就能判定
    refreshNav();
    if (API.isLoggedIn()) afterLogin();
    syncTimer();
  }

  window.Member = {
    refresh() {
      refreshNav();
      loaded = false;
      syncTimer();
      updateUsageBar();
    },
    openLogin: openLoginModal,
    logout,
    isBlocked,
    remaining: () => Math.max(0, FREE_LIMIT - used),
    FREE_LIMIT,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
