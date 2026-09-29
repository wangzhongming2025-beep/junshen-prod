/* ===== 硬核英语社 · 1299 永久卡 / 合伙人计划调查 ===== */
(function () {
  const QUESTIONS = [
    { key: "livestream", q: "你愿意学习直播，把学到的英语直接用来获客吗？" },
    { key: "editing", q: "你愿意学习基础剪辑，把自己的口播/学习过程做成视频吗？" },
    { key: "sales", q: "你愿意学习销售沟通技巧，把英语能力变成成交能力吗？" },
    { key: "copywriting", q: "你愿意学习简单文案创作，写出能打动人的内容吗？" },
    { key: "device", q: "你拥有平板或电脑，能保证稳定的学习/创作环境吗？" },
    { key: "english", q: "你愿意系统学习英语，而不是三天打鱼两天晒网？" },
    { key: "mission", q: "你认同「用真本事、帮普通人把英语变成赚钱工具」这个理念吗？" },
    { key: "time", q: "你每天能抽出 ≥1 小时，连续投入学习和行动吗？" },
  ];

  const PAY = (window.PAY && window.PAY.contact) ? window.PAY : { contact: "vip20213456", qr: "pay-qr.png" };

  function loadSurvey() {
    try {
      const s = localStorage.getItem("hy_survey");
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }
  function saveSurvey(s) {
    try { localStorage.setItem("hy_survey", JSON.stringify(s)); } catch (e) {}
  }

  function calcScore(a) {
    let yes = 0;
    QUESTIONS.forEach((q) => { if (a[q.key]) yes += 1; });
    return Math.round((yes / QUESTIONS.length) * 100);
  }
  function advice(a) {
    const s = calcScore(a);
    if (s >= 88) return "strong";
    if (s >= 63) return "fit";
    if (a.time && a.english && a.device) return "potential";
    return "month_first";
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function headerHTML() {
    return `
      <div class="sv-hero">
        <div class="sv-badge">1299 永久卡 · 合伙人计划</div>
        <h1 class="sv-title">先测一测，你是不是我要找的合伙人</h1>
        <div class="sv-host">
          <div class="sv-avatar">王</div>
          <div class="sv-host-info">
            <div class="sv-host-name">老王队长</div>
            <div class="sv-host-tag">退役老连长 · 部队 13 年 · 一人企业实战</div>
          </div>
        </div>
        <p class="sv-intro">
          我做「硬核英语社」，不是想卖你一套课就散伙。<br>
          我要找的是一批<span class="sv-highlight">愿意把英语真正用起来、拿它赚钱</span>的人。<br>
          1299 永久卡 = 永久学习权限 + 直播/剪辑/文案/销售实战路径 + 老王队长的合伙人社群。<br>
          8 道题，填完就知道你适不适合直接上 1299，还是先拿 39 元月卡试试手感。
        </p>
      </div>`;
  }

  function formHTML(saved) {
    const a = (saved && saved.answers) || {};
    const adv = (saved && saved.advantage) || "";
    const rows = QUESTIONS.map((q, i) => `
      <div class="sv-item" data-key="${q.key}">
        <div class="sv-q"><span class="sv-num">${i + 1}</span>${esc(q.q)}</div>
        <div class="sv-options">
          <label class="sv-opt ${a[q.key] === true ? "selected" : ""}">
            <input type="radio" name="${q.key}" value="yes" ${a[q.key] === true ? "checked" : ""}>
            <span>是</span>
          </label>
          <label class="sv-opt ${a[q.key] === false ? "selected" : ""}">
            <input type="radio" name="${q.key}" value="no" ${a[q.key] === false ? "checked" : ""}>
            <span>否</span>
          </label>
        </div>
      </div>
    `).join("");

    return `
      <div class="sv-form">
        ${rows}
        <div class="sv-textarea-wrap">
          <label class="sv-label">9. 个人优点介绍（老王队长会看）</label>
          <textarea id="svAdvantage" class="sv-textarea" rows="4" placeholder="比如：我敢卖、能坚持、有产品/有客户资源、每天能保证 2 小时……">${esc(adv)}</textarea>
        </div>
        <div class="sv-actions">
          <button class="btn-primary btn-lg" id="svSubmit">提交审核</button>
          <p class="sv-note">提交后自动生成匹配建议，老王队长会根据你的优点介绍优先通过。</p>
        </div>
      </div>`;
  }

  const ADVICE_TEXT = {
    strong: {
      title: "🎯 高度匹配 · 建议直接开通 1299 永久卡",
      desc: "你的条件非常符合合伙人画像：愿意学、有设备、有时间、认同理念。1299 一次买断，永久权限，最划算。",
      cta: "扫码付 1299，加 vip20213456 领兑换码",
      action: "pay",
    },
    fit: {
      title: "✅ 比较匹配 · 建议开通 1299 永久卡",
      desc: "大部分条件已经具备，只差一两个动作。1299 永久卡能帮你把这些动作补齐，不用再月月续费。",
      cta: "扫码付 1299，加 vip20213456 领兑换码",
      action: "pay",
    },
    potential: {
      title: "🌱 有潜力 · 建议先聊聊",
      desc: "你具备最核心的三样：时间、学英语的意愿、稳定的设备。建议先加 vip20213456，跟老王队长一对一沟通，看怎么起步最稳。",
      cta: "加 vip20213456，预约一对一沟通",
      action: "contact",
    },
    month_first: {
      title: "📅 建议先月卡体验",
      desc: "目前条件还不太成熟，或者还没想清楚要不要投入。别急着 1299，先花 39 元买一个月卡，练起来、感受起来，再决定要不要升永久卡。",
      cta: "先开 39 元月卡",
      action: "month",
    },
  };

  function resultHTML(saved) {
    const score = calcScore(saved.answers);
    const adv = advice(saved.answers);
    const cfg = ADVICE_TEXT[adv];
    const advantage = saved.advantage ? `<div class="sv-result-adv"><b>你写的优点：</b>${esc(saved.advantage)}</div>` : "";
    const payBlock = cfg.action === "pay" ? `
      <div class="sv-pay">
        <img src="${esc(PAY.qr)}" alt="收款码" class="sv-qr" onerror="this.style.display='none'">
        <div class="sv-pay-info">
          <div class="sv-price">¥1299</div>
          <div class="sv-pay-tip">扫码付款后，请加 <b>${esc(PAY.contact)}</b>，发送付款截图领取兑换码。</div>
          <button class="btn-primary" id="svCopyContact">复制微信号</button>
        </div>
      </div>
    ` : "";
    const contactBlock = cfg.action === "contact" ? `
      <div class="sv-contact-box">
        <div class="sv-pay-tip">请加 <b>${esc(PAY.contact)}</b>，备注「合伙人咨询」，老王队长会优先通过。</div>
        <button class="btn-primary" id="svCopyContact">复制微信号</button>
      </div>
    ` : "";
    const monthBlock = cfg.action === "month" ? `
      <div class="sv-month-box">
        <button class="btn-primary" id="svOpenMonth">去开通 39 元月卡</button>
        <p class="sv-note">月卡也能先体验全部课程，练满 10 分钟/天，觉得值再升级。</p>
      </div>
    ` : "";

    return `
      <div class="sv-result">
        <div class="sv-score-ring">
          <div class="sv-score-num">${score}%</div>
          <div class="sv-score-label">匹配度</div>
        </div>
        <h2 class="sv-result-title">${cfg.title}</h2>
        <p class="sv-result-desc">${cfg.desc}</p>
        ${advantage}
        ${payBlock}
        ${contactBlock}
        ${monthBlock}
        <div class="sv-result-actions">
          <button class="btn-ghost" id="svRetake">重新填写</button>
          <button class="btn-ghost" onclick="location.hash='#/courses'">去课程广场看看</button>
        </div>
      </div>`;
  }

  function bindForm() {
    document.querySelectorAll(".sv-options input").forEach((input) => {
      input.addEventListener("change", () => {
        const wrap = input.closest(".sv-item");
        wrap.querySelectorAll(".sv-opt").forEach((l) => l.classList.remove("selected"));
        input.closest(".sv-opt").classList.add("selected");
      });
    });

    const submitBtn = document.getElementById("svSubmit");
    if (!submitBtn) return;
    submitBtn.addEventListener("click", async () => {
      const answers = {};
      let missed = [];
      QUESTIONS.forEach((q) => {
        const checked = document.querySelector(`input[name="${q.key}"]:checked`);
        if (checked) answers[q.key] = checked.value === "yes";
        else missed.push(q.q);
      });
      if (missed.length) {
        window.toastMsg && window.toastMsg(`还有 ${missed.length} 道题没选`);
        return;
      }
      const advantage = document.getElementById("svAdvantage").value.trim();
      const rec = {
        answers,
        advantage,
        score: calcScore(answers),
        advice: advice(answers),
        updatedAt: new Date().toISOString(),
      };
      saveSurvey(rec);

      if (window.API && window.API.isLoggedIn()) {
        try {
          const r = await window.API.surveySubmit(answers, advantage);
          if (r.ok) {
            Object.assign(rec, r.survey || {});
            saveSurvey(rec);
          }
        } catch (e) {}
      }
      renderResult(rec);
    });
  }

  function bindResult(rec) {
    const copyBtn = document.getElementById("svCopyContact");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(PAY.contact).then(() => window.toastMsg("微信号已复制")).catch(() => window.toastMsg(PAY.contact));
      });
    }
    const monthBtn = document.getElementById("svOpenMonth");
    if (monthBtn) monthBtn.addEventListener("click", () => window.openCardModal && window.openCardModal());
    const retake = document.getElementById("svRetake");
    if (retake) retake.addEventListener("click", () => renderForm());
  }

  function renderForm() {
    const app = document.getElementById("app");
    if (!app) return;
    app.innerHTML = headerHTML() + formHTML(loadSurvey());
    bindForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderResult(rec) {
    const app = document.getElementById("app");
    if (!app) return;
    app.innerHTML = headerHTML() + resultHTML(rec);
    bindResult(rec);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function render() {
    const saved = loadSurvey();
    if (saved && saved.answers && saved.advice) renderResult(saved);
    else renderForm();
  }

  window.Survey = { render, QUESTIONS, calcScore, advice, loadSurvey };
})();
