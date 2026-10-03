/* ===== 硬核英语社 · 应用逻辑 ===== */
(function () {
  const app = document.getElementById("app");
  const nav = document.getElementById("mainnav");
  const toastEl = document.getElementById("toast");

  // ---------- 工具 ----------
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }
  window.toastMsg = toast;
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function normalize(s) {
    return s.trim().toLowerCase().replace(/[.,!?;:'"()]/g, "").replace(/\s+/g, " ");
  }
  // ---------- 句子拆解 / 单词卡片 ----------
  function cleanWord(w) {
    return String(w || "").replace(/[.,!?;:'"()]/g, "").trim().toLowerCase();
  }
  function parseSentence(en) {
    return String(en || "").replace(/[.,!?;:'"()]/g, "").split(/\s+/).filter(Boolean);
  }
  function getWordDetail(raw) {
    const w = cleanWord(raw);
    if (!w) return { pos: "unknown", phonetic: "", mean: "" };
    if (typeof WORD_DETAIL !== "undefined" && WORD_DETAIL[w]) return WORD_DETAIL[w];
    // fallback：根据词尾/常见规则推断词性
    if (/^(i|you|he|she|it|we|they|me|him|her|us|them|my|your|his|our|their|this|that|these|those|what|which|who)$/i.test(w)) return { pos: "pronoun", phonetic: "", mean: "" };
    if (/^(a|an|the)$/i.test(w)) return { pos: "article", phonetic: "", mean: "" };
    if (/^(and|but|or|because|if|when|where|while|although)$/i.test(w)) return { pos: "conjunction", phonetic: "", mean: "" };
    if (/^(in|on|at|to|for|with|from|of|about|by|into|out|off|over|under|before|after|between)$/i.test(w)) return { pos: "preposition", phonetic: "", mean: "" };
    if (/^(very|really|too|so|not|no|now|then|here|there|today|tomorrow|yesterday|often|always|never|sometimes|usually|still|already|just|only|also|even|again|back|away|down|up)$/i.test(w)) return { pos: "adverb", phonetic: "", mean: "" };
    if (/^(is|am|are|was|were|be|been|being|have|has|had|do|does|did|done|can|could|will|would|shall|should|may|might|must)$/i.test(w)) return { pos: "verb", phonetic: "", mean: "" };
    if (/ing$|ed$|s$/.test(w) && w.length > 3) return { pos: "verb", phonetic: "", mean: "" };
    if (/ful$|ive$|ous$|able$|ible$|less$|al$|ic$|ish$/.test(w)) return { pos: "adjective", phonetic: "", mean: "" };
    if (/ly$/.test(w)) return { pos: "adverb", phonetic: "", mean: "" };
    if (/tion$|sion$|ment$|ness$|ity$|er$|or$|ist$|ism$/.test(w)) return { pos: "noun", phonetic: "", mean: "" };
    return { pos: "noun", phonetic: "", mean: "" };
  }
  function posClass(pos) {
    const map = {
      pronoun: "pos-pronoun", verb: "pos-verb", "aux verb": "pos-aux", adverb: "pos-adverb",
      noun: "pos-noun", adjective: "pos-adj", preposition: "pos-prep", article: "pos-article", conjunction: "pos-conj"
    };
    return map[pos] || "pos-default";
  }
  function posLabel(pos) {
    const map = {
      pronoun: "代词", verb: "动词", "aux verb": "助动词", adverb: "副词",
      noun: "名词", adjective: "形容词", preposition: "介词", article: "冠词", conjunction: "连词", unknown: ""
    };
    return map[pos] || pos;
  }
  function renderWordCards(words) {
    return words.map((w) => {
      const d = getWordDetail(w);
      return `
        <div class="word-card">
          <span class="pos-tag ${posClass(d.pos)}">${esc(posLabel(d.pos))}</span>
          <span class="en">${esc(w)}</span>
          ${d.phonetic ? `<span class="phonetic">${esc(d.phonetic)}</span>` : ""}
          ${d.mean ? `<span class="mean">${esc(d.mean)}</span>` : ""}
        </div>`;
    }).join("");
  }
  // ---------- 语音嗓音切换 ----------
  let VOICES = [];
  let currentVoiceURI = "";
  try { currentVoiceURI = localStorage.getItem("hy_voice_uri") || ""; } catch (e) {}
  function loadVoices() {
    try { VOICES = (window.speechSynthesis.getVoices() || []).filter((v) => /^en/i.test(v.lang)); }
    catch (e) { VOICES = []; }
    return VOICES;
  }
  loadVoices();
  if ("speechSynthesis" in window) {
    speechSynthesis.onvoiceschanged = () => {
      loadVoices();
      const sel = document.getElementById("voiceSel");
      if (sel) fillVoiceSelect(sel);
    };
  }
  function fillVoiceSelect(sel) {
    if (!sel) return;
    sel.innerHTML = "";
    // 永远保留“系统默认嗓音”在最前，避免选中了无声嗓音后无法退回
    const def = document.createElement("option");
    def.textContent = "系统默认嗓音"; def.value = ""; sel.appendChild(def);
    VOICES.forEach((v) => {
      const o = document.createElement("option");
      o.value = v.voiceURI;
      o.textContent = `${v.name} · ${v.lang}`;
      if (v.voiceURI === currentVoiceURI) o.selected = true;
      sel.appendChild(o);
    });
  }
  function bindVoiceSelect() {
    const sel = document.getElementById("voiceSel");
    if (!sel) return;
    fillVoiceSelect(sel);
    sel.onchange = () => {
      currentVoiceURI = sel.value;
      try { localStorage.setItem("hy_voice_uri", currentVoiceURI); } catch (e) {}
      speak("Hello, how are you today?", "en-US"); // 切换后试听一句
    };
  }
  function speak(text, lang) {
    try {
      if (!("speechSynthesis" in window)) return;
      if (!VOICES.length) loadVoices();          // voices 未加载完时先尝试刷新
      try { window.speechSynthesis.resume(); } catch (e) {}
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || "en-US";
      u.rate = 0.96;
      let usedVoice = false;
      if (currentVoiceURI) {
        const v = VOICES.find((x) => x.voiceURI === currentVoiceURI);
        if (v) { u.voice = v; usedVoice = true; }
      }
      // 选中的嗓音播不出 → 自动回退系统默认，并清掉坏的持久化选择
      u.onerror = () => {
        if (!usedVoice) return;
        try { localStorage.removeItem("hy_voice_uri"); } catch (e) {}
        currentVoiceURI = "";
        try {
          const fb = new SpeechSynthesisUtterance(text);
          fb.lang = lang || "en-US"; fb.rate = 0.96;
          window.speechSynthesis.speak(fb);
        } catch (e) {}
      };
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function fmt(n) { return (n || 0).toLocaleString("en-US"); }

  // ---------- 路由 ----------
  const routes = {
    home: renderHome,
    courses: renderCourses,
    course: renderCourseDetail,
    practice: renderPractice,
    challenge: renderChallenge,
    weak: renderWeakBook,
    weakPractice: renderWeakReview,
    leaderboard: renderLeaderboard,
    journal: renderJournal,
    partner: () => window.Survey && window.Survey.render(),
  };
  let statRange = "total";
  function route() {
    if (window.__challengeCleanup) { try { window.__challengeCleanup(); } catch (e) {} window.__challengeCleanup = null; }
    const full = location.hash.replace("#/", "") || "home";
    const parts = full.split("/");
    const r = parts[0];
    Object.values(nav.querySelectorAll("a")).forEach((a) => {
      a.classList.toggle("active", a.dataset.route === r);
    });
    // 二级路由：#/weak/practice 走「只练易错」复习
    if (r === "weak" && parts[1] === "practice") { routes.weakPractice(); return; }
    // 合伙人计划别名
    if (r === "partner-plan") { routes.partner(); return; }
    (routes[r] || renderHome)();
  }
  window.addEventListener("hashchange", route);

  // ---------- 首页 ----------
  function statCardsHTML(range) {
    const s = Store.getStatsByRange(range);
    const st = Store.getStats();
    const c = Store.getCheckin();
    const rangeLabel = range === "total" ? "累计" : range === "today" ? "今日" : range === "week" ? "本周" : "本月";
    return `
      <div class="stat-card"><div class="n green">${fmt(s.sentences)}</div><div class="l">完成句子数量</div>
        <div class="sub">句子错题本：不熟悉 <b>${st.sentenceWrong.unfamilar}</b> · 已掌握 <b>${st.sentenceWrong.mastered}</b></div></div>
      <div class="stat-card"><div class="n orange">${fmt(s.words)}</div><div class="l">完成单词数量</div>
        <div class="sub">单词错题本：不熟悉 <b>${st.wordWrong.unfamilar}</b> · 已掌握 <b>${st.wordWrong.mastered}</b></div></div>
      <div class="stat-card"><div class="n">${fmt(s.minutes)}</div><div class="l">学习时长（分钟）</div>
        <div class="sub">${rangeLabel} <b>${fmt(s.minutes)}</b> 分钟</div></div>
      <div class="stat-card"><div class="n green">${c.current}</div><div class="l">打卡统计（连续）</div>
        <div class="sub">当前连续 <b>${c.current}</b> · 最高 <b>${c.max}</b> · 累计 <b>${c.total}</b></div></div>
    `;
  }
  // 首页独立练习统计（与 practice 页 session 分开）
  let homeSession = { correct: 0, wrong: 0, combo: 0, bestCombo: 0, xp: 0 };
  function renderHome() {
    const course = COURSES.find((c) => c.id === pstate.courseId) || COURSES[0];
    if (!pstate.courseId) { pstate.courseId = course.id; savePracticeMeta(); }
    const idx = Math.min(Math.max(pstate.idx || 0, 0), course.lessons.length - 1);
    pstate.idx = idx;
    const item = course.lessons[idx];
    const words = parseSentence(item.en);
    const options = COURSES.map((c) => `<option value="${c.id}" ${c.id === course.id ? "selected" : ""}>${c.emoji} ${esc(c.title)}</option>`).join("");
    const weakStats = Store.getWeakStats();
    app.innerHTML = `
      <div class="studio-page">
        <div class="studio-nav">
          <a href="#/practice">📝 练习模式</a>
          <a href="#/challenge">⚔️ 竞技挑战</a>
          <a href="#/courses">📚 课程广场</a>
          <a href="#/weak">📒 易错本${weakStats.weak ? ` (${weakStats.weak})` : ""}</a>
          <a href="#/leaderboard">🏆 排行榜</a>
        </div>
        <div class="studio-head">
          <div class="studio-title">当前课程：<b>${esc(course.title)}</b> · 第 ${idx + 1}/${course.lessons.length} 句</div>
          <select class="course-picker" id="homeCoursePicker">${options}</select>
        </div>
        <div class="studio-card" id="studioCard">
          <div class="sentence-zh-big">${esc(item.zh)}</div>
          <div class="word-flow">${renderWordCards(words)}</div>
          <div class="studio-input">
            <div class="studio-input-label">看中文，在横线上敲出每个英文单词</div>
            <div id="homeSlotBox"></div>
          </div>
          <div class="studio-feedback" id="homeFb"></div>
          <div class="studio-actions">
            <button class="btn-green" id="homeSubmit">提交</button>
            <button class="btn-ghost" id="homeSpeak">🔊 听发音</button>
            <button class="btn-ghost" id="homeSkip">不会，看答案</button>
          </div>
          <div class="studio-tipbox" id="homeTipBox">${tipBlockHTML(learnText(course.id, item.en, false), "讲讲这句的语法")}</div>
        </div>
        <div style="text-align:center;margin-top:22px;">
          <div class="studio-stats">
            <div class="s"><b>${fmt(Store.getStats().sentencesDone)}</b><span>完成句子</span></div>
            <div class="s ok"><b id="homeCorrect">${homeSession.correct}</b><span>已答对</span></div>
            <div class="s err"><b id="homeWrong">${homeSession.wrong}</b><span>已答错</span></div>
            <div class="s"><b id="homeCombo">${homeSession.combo}</b><span>当前连击</span></div>
          </div>
        </div>
      </div>
    `;
    bindTip(app);
    const slots = buildWordSlots(app.querySelector("#homeSlotBox"), words.length, { words, showIndex: true, onEnter: homeSubmit });
    setTimeout(() => slots.focus(0), 50);
    setTimeout(() => speak(item.en), 350);
    app.querySelector("#homeSpeak").addEventListener("click", () => speak(item.en));
    app.querySelector("#homeCoursePicker").addEventListener("change", (e) => {
      pstate.courseId = e.target.value;
      pstate.idx = 0;
      setProg(pstate.courseId, pstate.mode, 0);
      savePracticeMeta();
      homeSession = { correct: 0, wrong: 0, combo: 0, bestCombo: 0, xp: 0 };
      renderHome();
    });
    const fb = app.querySelector("#homeFb");
    function homeAward(correct, anchor) {
      if (correct) {
        homeSession.correct += 1; homeSession.combo += 1;
        if (homeSession.combo > homeSession.bestCombo) homeSession.bestCombo = homeSession.combo;
        const xp = Math.round(10 * (1 + Math.min(Math.max(homeSession.combo - 1, 0), 5) * 0.2));
        homeSession.xp += xp; Store.addXp(xp); Store.bumpCombo(homeSession.bestCombo);
        FX.Sound.correct(homeSession.combo);
        FX.floatText(anchor, "+" + xp + (homeSession.combo > 1 ? "  🔥x" + homeSession.combo : ""));
        FX.burstAt(anchor, { count: 12 + Math.min(homeSession.combo, 8) * 3 });
        FX.pulse(anchor, "reward-pop");
        if ([3, 5, 10, 20, 30, 50].indexOf(homeSession.combo) >= 0) {
          FX.Sound.milestone(); FX.confetti(70 + homeSession.combo * 2); toast("🔥 连击 x" + homeSession.combo + "！手感爆棚");
        }
      } else {
        homeSession.wrong += 1; homeSession.combo = 0; FX.Sound.wrong(); FX.pulse(anchor, "reward-shake");
      }
      updateHomeHud();
    }
    function homeSubmit() {
      if (slots._locked) return;
      const val = slots.getValue();
      if (!val.trim()) { toast("先写点英文再提交"); return; }
      const correct = normalize(val) === normalize(item.en);
      if (correct) {
        slots._locked = true;
        slots.setStatus("ok"); slots.setReadOnly(true);
        fb.className = "studio-feedback ok"; fb.textContent = "✅ " + praise();
        speak("Correct!");
        Store.recordSentence(true); Store.addMinutes(1); Store.logPractice(course.id, "type", true);
        Store.recordWeak(course.id, course.title, "type", item.zh, item.en, true);
        homeAward(true, slots.wrap);
        openTip(app, 420);
        setTimeout(() => nextHomeSentence(course), 1150);
      } else {
        slots.setStatus("err");
        fb.className = "studio-feedback err"; fb.textContent = wrongHint(val, item.en);
        speak("Try again");
        Store.recordWeak(course.id, course.title, "type", item.zh, item.en, false);
        homeAward(false, slots.wrap);
        openTip(app, 260);
        setTimeout(() => { slots.setStatus(""); slots.els.forEach((e) => { e.value = ""; }); slots.focus(0); }, 620);
      }
    }
    function nextHomeSentence(course) {
      pstate.idx += 1;
      if (pstate.idx >= course.lessons.length) { pstate.idx = 0; }
      setProg(pstate.courseId, pstate.mode, pstate.idx);
      renderHome();
    }
    app.querySelector("#homeSubmit").addEventListener("click", homeSubmit);
    app.querySelector("#homeSkip").addEventListener("click", () => {
      if (slots._locked) return;
      slots._locked = true; slots.fill(item.en); slots.setStatus("ok"); slots.setReadOnly(true);
      fb.className = "studio-feedback ok"; fb.textContent = `答案：${item.en}`;
      speak(item.en);
      Store.recordSentence(false); Store.addMinutes(1); Store.logPractice(course.id, "type", false);
      Store.recordWeak(course.id, course.title, "type", item.zh, item.en, false);
      homeSession.combo = 0; updateHomeHud();
      openTip(app);
      const n = document.createElement("button"); n.className = "btn-green"; n.style.marginTop = "14px";
      n.textContent = "下一句 →"; n.addEventListener("click", () => nextHomeSentence(course));
      const tipEl = app.querySelector("#tipbox");
      if (tipEl) app.querySelector(".studio-card").insertBefore(n, tipEl); else app.querySelector(".studio-card").appendChild(n);
    });
    function updateHomeHud() {
      const c = document.getElementById("homeCorrect"); if (c) c.textContent = homeSession.correct;
      const w = document.getElementById("homeWrong"); if (w) w.textContent = homeSession.wrong;
      const b = document.getElementById("homeCombo"); if (b) b.textContent = homeSession.combo;
    }
  }

  // ---------- 课程广场 ----------
  let catFilter = "全部";
  function renderCourses() {
    const list = COURSES.filter((c) => catFilter === "全部" || c.cat === catFilter);
    const chips = CATEGORIES.map(
      (c) => `<button class="chip ${c === catFilter ? "active" : ""}" data-cat="${c}">${c}</button>`
    ).join("");
    app.innerHTML = `
      <div class="page-title">课程广场</div>
      <div class="page-sub">由学习者共享的句型课程，覆盖零基础到考研商务。点开看课程详情。</div>
      <div class="filter-bar">${chips}</div>
      <div class="course-grid">
        ${list.map(courseCard).join("")}
      </div>
    `;
    app.querySelectorAll(".chip").forEach((el) =>
      el.addEventListener("click", () => { catFilter = el.dataset.cat; renderCourses(); })
    );
    app.querySelectorAll(".course-card").forEach((el) =>
      el.addEventListener("click", () => {
        const c = COURSES.find((x) => x.id === el.dataset.id);
        if (isVipLocked(c)) { openCardModal(); return; }
        location.hash = "#/course/" + el.dataset.id;
      })
    );
  }
  function courseCard(c) {
    const done = Store.getCourseCount(c.id);
    const pct = Math.min(100, Math.round((done / c.lessons.length) * 100));
    return `
      <div class="course-card" data-id="${c.id}">
        <div class="course-cover ${c.cover}"><span class="emoji">${c.emoji}</span></div>
        <div class="course-body">
          <div class="course-tags"><span class="lv-tag lv-${c.level}">${c.level}</span><span class="cat-tag">${esc(c.cat)}</span>${c.level === "高级" ? '<span class="vip-tag">🔒 会员专享</span>' : ""}</div>
          <h3>${esc(c.title)}</h3>
          <div class="course-desc">${esc(c.desc || "")}</div>
          <div class="course-meta">${c.lessons.length} 个句子 · 👥 ${fmt(c.learners)} 人在学</div>
          <div class="course-prog"><div class="course-prog-bar" style="width:${pct}%"></div></div>
          <div class="course-foot">
            <span class="learners">${done ? "已练 " + done + " 句" : "还没练过"}</span>
            <span class="tag-green">查看详情 →</span>
          </div>
        </div>
      </div>`;
  }

  // ---------- 语法精讲（讲解数据在 grammar.js）----------
  const gdata = (id) => (typeof GRAMMAR !== "undefined" && GRAMMAR[id]) || {};
  const gnotesOf = (id) => gdata(id).grammar || [];
  const tipOf = (id, en) => (gdata(id).tips || {})[en] || "";
  const wordNoteOf = (id, en) => (gdata(id).words || {})[en] || "";

  // 讲解文本里用反引号包住的关键词 → 高亮
  function richTip(t) {
    return esc(t).replace(/`([^`]+)`/g, '<b class="tg">$1</b>');
  }
  // 取一道题的讲解：单词模式看单词注解，句子模式看语法讲解
  function learnText(courseId, en, isWord) {
    if (isWord) {
      const w = wordNoteOf(courseId, en);
      return w ? "`" + en + "` " + w : "";
    }
    return tipOf(courseId, en);
  }
  // 「讲解自动展开」开关（默认开，记在本地）
  let TIPAUTO = (() => { try { return localStorage.getItem("hy_tip_auto") !== "0"; } catch (e) { return true; } })();
  function setTipAuto(v) { TIPAUTO = !!v; try { localStorage.setItem("hy_tip_auto", v ? "1" : "0"); } catch (e) {} }

  function tipBlockHTML(text, label) {
    if (!text) return "";
    return `<div class="tipbox" id="tipbox">
      <button class="tip-head" id="tipToggle" type="button">
        <span class="tip-ico">💡</span><span class="tip-title">${esc(label || "讲讲这句的语法")}</span><span class="tip-chev">▾</span>
      </button>
      <div class="tip-body"><p>${richTip(text)}</p></div>
    </div>`;
  }
  function bindTip(root) {
    const box = (root || app).querySelector("#tipbox");
    if (!box) return;
    const head = box.querySelector("#tipToggle");
    if (head) head.addEventListener("click", () => box.classList.toggle("open"));
  }
  function openTip(root, delay) {
    if (!TIPAUTO) return;
    const doIt = () => {
      const box = (root || app).querySelector("#tipbox");
      if (box) box.classList.add("open");
    };
    if (delay) setTimeout(doIt, delay); else doIt();
  }
  // 本课语法精讲面板（课程详情页与练习页共用）
  function grammarCardsHTML(courseId) {
    const ns = gnotesOf(courseId);
    if (!ns.length) return "";
    return ns
      .map(
        (n, i) => `
      <div class="gcard">
        <div class="gc-head"><span class="gc-no">${i + 1}</span><span class="gc-t">${esc(n.t)}</span></div>
        <div class="gc-f"><span class="gc-flb">结构</span>${esc(n.f)}</div>
        <div class="gc-z">${esc(n.z)}</div>
        <div class="gc-e"><span class="gc-elb">例</span><em>${esc(n.e)}</em><button class="speak-btn sm" data-en="${esc(n.e)}">🔊</button></div>
      </div>`
      )
      .join("");
  }
  function bindGrammarSpeak(root) {
    (root || app).querySelectorAll(".gcard .speak-btn.sm").forEach((b) =>
      b.addEventListener("click", () => speak(b.dataset.en))
    );
  }

  // ---------- 课程详情页 ----------
  function renderCourseDetail() {
    const id = location.hash.replace("#/", "").split("/")[1];
    const c = COURSES.find((x) => x.id === id);
    if (!c) { location.hash = "#/courses"; return; }
    const done = Store.getCourseCount(c.id);
    const total = c.lessons.length;
    const pct = Math.min(100, Math.round((done / total) * 100));
    const lessonRows = c.lessons
      .map((l, i) => {
        const tip = tipOf(c.id, l.en);
        return `<li${tip ? ' class="has-tip"' : ""}><span class="ln">${i + 1}</span><span class="lzh">${esc(l.zh)}</span><span class="len">${esc(l.en)}</span><button class="speak-btn sm" data-en="${esc(l.en)}">🔊</button>${
          tip ? `<button class="tip-dot" type="button" title="看这句的语法讲解">💡</button><div class="row-tip">${richTip(tip)}</div>` : ""
        }</li>`;
      })
      .join("");
    const wordRows = (c.words || [])
      .map((w) => {
        const note = wordNoteOf(c.id, w.en);
        return `<div class="wchip"><span class="wz">${esc(w.zh)}</span><span class="we">${esc(w.en)}</span><button class="speak-btn sm" data-en="${esc(w.en)}">🔊</button>${
          note ? `<span class="wnote">${esc(note)}</span>` : ""
        }</div>`;
      })
      .join("");
    const gnotes = gnotesOf(c.id);
    app.innerHTML = `
      <a class="back-link" href="#/courses">← 返回课程广场</a>
      <div class="detail-head">
        <div class="detail-cover ${c.cover}">${c.emoji}</div>
        <div class="detail-info">
          <div class="course-tags"><span class="lv-tag lv-${c.level}">${c.level}</span><span class="cat-tag">${esc(c.cat)}</span>${c.level === "高级" ? '<span class="vip-tag">🔒 会员专享</span>' : ""}</div>
          <h1>${esc(c.title)}</h1>
          <p class="detail-desc">${esc(c.desc || "")}</p>
          <div class="detail-meta">${total} 个句子 · 👥 ${fmt(c.learners)} 人在学 · 已练 ${done} 句</div>
          <div class="course-prog"><div class="course-prog-bar" style="width:${pct}%"></div></div>
          <div style="margin-top:14px;display:flex;gap:12px;flex-wrap:wrap">
            ${isVipLocked(c)
              ? `<button class="btn-green" onclick="openCardModal()">🔒 开通学习卡后解锁</button><a class="btn-ghost" href="#/partner">🎯 先测一测适不适合 1299</a>`
              : `<a class="btn-green" href="#/practice/${c.id}">▶ 开始练习</a>`}
          </div>
        </div>
      </div>
      ${gnotes.length ? `<div class="section-h"><span class="bar"></span>本课语法精讲（${gnotes.length}）</div><div class="grammar-list">${grammarCardsHTML(c.id)}</div>` : ""}
      <div class="section-h"><span class="bar"></span>句子清单（${total}）</div>
      <ul class="lesson-list">${lessonRows}</ul>
      ${wordRows ? `<div class="section-h"><span class="bar"></span>核心单词（${c.words.length}）</div><div class="word-list">${wordRows}</div>` : ""}
    `;
    app.querySelectorAll(".speak-btn.sm").forEach((b) => b.addEventListener("click", () => speak(b.dataset.en)));
    app.querySelectorAll(".lesson-list .tip-dot").forEach((b) =>
      b.addEventListener("click", () => {
        const li = b.closest("li");
        li.classList.toggle("tip-open");
      })
    );
  }

  // ---------- 练习页 ----------
  const pstate = { courseId: null, idx: 0, mode: "type", answered: false };

  // 练习进度持久化：按「课程+模式」分别记忆题号，切换/刷新都连续进行
  function loadPracticeMeta() { try { return JSON.parse(localStorage.getItem("hy_practice_v1") || "{}"); } catch (e) { return {}; } }
  function savePracticeMeta() { try { localStorage.setItem("hy_practice_v1", JSON.stringify({ courseId: pstate.courseId, mode: pstate.mode })); } catch (e) {} }
  let PROGRESS = (() => { try { return JSON.parse(localStorage.getItem("hy_progress_v1") || "{}"); } catch (e) { return {}; } })();
  function getProg(courseId, mode) { return PROGRESS[courseId + "|" + mode] || 0; }
  function setProg(courseId, mode, idx) { PROGRESS[courseId + "|" + mode] = idx; try { localStorage.setItem("hy_progress_v1", JSON.stringify(PROGRESS)); } catch (e) {} }
  (function restorePractice() {
    const m = loadPracticeMeta();
    if (m.courseId && COURSES.find((c) => c.id === m.courseId)) pstate.courseId = m.courseId;
    if (m.mode) pstate.mode = m.mode;
    pstate.idx = getProg(pstate.courseId, pstate.mode);
  })();

  // ---------- 奖励系统：连击 / 经验 / 粒子 / 结算 ----------
  const session = { correct: 0, wrong: 0, combo: 0, bestCombo: 0, xp: 0 };
  function resetSession() { session.correct = 0; session.wrong = 0; session.combo = 0; session.bestCombo = 0; session.xp = 0; }

  const PRAISES = ["漂亮！", "就是这样！", "完全正确！", "Nice!", "Perfect!", "稳！", "手感来了！", "就是这个感觉！"];
  const MILESTONES = [3, 5, 10, 20, 30, 50];
  const praise = () => PRAISES[Math.floor(Math.random() * PRAISES.length)];
  // 连击加成：1 连=1.0 倍，最高 2.0 倍（每题基础 10 经验）
  const comboMult = () => 1 + Math.min(Math.max(session.combo - 1, 0), 5) * 0.2;
  function qAnchor() {
    return document.querySelector(".practice-stage .typing-input")
      || document.querySelector(".practice-stage .word-slots")
      || document.querySelector(".practice-stage .answer-slots")
      || document.querySelector(".practice-stage");
  }

  // 答错不给冷冰冰的 "Try again"，给能引导下一步的提示
  const _nrm = (s) => String(s || "").toLowerCase().replace(/[.,!?;:'"]/g, "").replace(/\s+/g, " ").trim();
  function wrongHint(val, en) {
    const a = String(val || "").trim();
    if (!a) return "还没写内容哦～";
    const va = _nrm(a), ve = _nrm(en);
    if (va.replace(/\s/g, "") === ve.replace(/\s/g, "")) return "❗ 差一点点 —— 检查单词之间的空格";
    const pa = va.split(" "), pb = ve.split(" ");
    if (Math.abs(pa.length - pb.length) >= 2) return "❗ 句子成分还不够，再想想还有哪些词";
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if (pa[i] !== pb[i]) return "❗ 第 " + (i + 1) + " 个词不太对，再试试";
    }
    return "❗ 再试一次，注意拼写";
  }
  function wrongWordHint(val, en) {
    const a = String(val || "").trim();
    if (!a) return "还没写内容哦～";
    const va = a.toLowerCase().trim(), ve = String(en || "").toLowerCase().trim();
    if (va.length === ve.length) return "❗ 长度对了，有几个字母不对";
    if (ve.indexOf(va) === 0) return "❗ 开头对了，后面还差几个字母";
    return "❗ 再拼一遍，注意拼写";
  }
  // 看答案 / 跳过：不断连击但也不算答对
  function breakCombo() { session.combo = 0; session.wrong += 1; updateHud(); }

  // 统一入口：答对给奖励，答错给反馈
  function award(correct, anchorEl) {
    const target = anchorEl || qAnchor();
    if (correct) {
      session.correct += 1;
      session.combo += 1;
      if (session.combo > session.bestCombo) session.bestCombo = session.combo;
      const xp = Math.round(10 * comboMult());
      session.xp += xp;
      Store.addXp(xp);
      Store.bumpCombo(session.bestCombo);
      FX.Sound.correct(session.combo);
      FX.floatText(target, "+" + xp + (session.combo > 1 ? "  🔥x" + session.combo : ""));
      FX.burstAt(target, { count: 12 + Math.min(session.combo, 8) * 3 });
      FX.pulse(target, "reward-pop");
      if (MILESTONES.indexOf(session.combo) >= 0) {
        FX.Sound.milestone();
        FX.confetti(70 + session.combo * 2);
        toast("🔥 连击 x" + session.combo + "！手感爆棚");
      }
      updateHud();
      return xp;
    }
    session.wrong += 1;
    session.combo = 0;
    FX.Sound.wrong();
    FX.pulse(target, "reward-shake");
    updateHud();
    return 0;
  }

  function updateHud() {
    const c = document.getElementById("hudCombo");
    if (c) { c.textContent = session.combo; if (c.parentNode) c.parentNode.classList.toggle("hot", session.combo >= 3); }
    const x = document.getElementById("hudXp");
    if (x) x.textContent = session.xp;
    const t = document.getElementById("hudTotal");
    if (t) t.textContent = Store.getXp();
    const b = document.getElementById("hudBest");
    if (b) b.textContent = Store.getBestCombo();
    const a = document.getElementById("hudAcc");
    if (a) { const tot = session.correct + session.wrong; a.textContent = tot ? Math.round((session.correct / tot) * 100) + "%" : "—"; }
    const fill = document.getElementById("pbarFill");
    if (fill) {
      const course = COURSES.find((cc) => cc.id === pstate.courseId);
      if (course) {
        const isWord = pstate.mode === "word";
        const total = isWord ? (course.words || []).length : course.lessons.length;
        const done = Math.min(pstate.idx + (pstate.answered ? 1 : 0), total);
        fill.style.width = total ? Math.round((done / total) * 100) + "%" : "0%";
      }
    }
    syncSoundBtn();
  }

  function syncSoundBtn() {
    const b = document.getElementById("hudSound");
    if (b) { const m = FX.Sound.isMuted(); b.textContent = m ? "🔇" : "🔊"; b.classList.toggle("off", m); }
  }

  // 一轮练完 → 结算面板（撒花 + 战绩）
  function renderRoundEnd(course) {
    const total = session.correct + session.wrong;
    const acc = total ? Math.round((session.correct / total) * 100) : 0;
    const bless = acc >= 95 ? "几乎全对，这状态能去打比赛了！" : acc >= 80 ? "很稳，再加把劲就满分了！" : acc >= 60 ? "有进步空间，再来一轮更熟。" : "别急，慢一点反而记得牢。";
    FX.Sound.finish();
    FX.confetti(140);
    const stage = app.querySelector("#stage");
    stage.innerHTML = `
      <div class="round-end">
        <div class="re-emoji">🎉</div>
        <div class="re-title">本轮完成！</div>
        <div class="re-bless">${esc(bless)}</div>
        <div class="re-stats">
          <div class="re-stat"><b>${session.correct}</b><span>答对</span></div>
          <div class="re-stat"><b>${acc}%</b><span>正确率</span></div>
          <div class="re-stat"><b>${session.bestCombo}</b><span>最高连击</span></div>
          <div class="re-stat hl"><b>+${session.xp}</b><span>获得经验</span></div>
        </div>
        <div class="re-actions">
          <button class="btn-green" id="reAgain">🔁 再来一轮</button>
          <button class="btn-ghost" id="reWeak">📕 去易错本</button>
        </div>
      </div>`;
    stage.querySelector("#reAgain").addEventListener("click", () => {
      pstate.idx = 0; pstate.answered = false;
      setProg(pstate.courseId, pstate.mode, 0);
      resetSession();
      renderStage();
    });
    stage.querySelector("#reWeak").addEventListener("click", () => { location.hash = "#/weak"; });
    const fill = document.getElementById("pbarFill");
    if (fill) fill.style.width = "100%";
  }

  // ---------- 竞技挑战（单人对战 AI 对手，限时连击抢分）----------
  function renderChallenge() {
    if (window.__challengeCleanup) { try { window.__challengeCleanup(); } catch (e) {} window.__challengeCleanup = null; }
    const POOL = COURSES.flatMap((c) => (c.lessons || []).map((l) => ({ zh: l.zh, en: l.en, courseId: c.id, courseTitle: c.title })));
    const ch = { timeLeft: 60, my: 0, rival: 0, combo: 0, best: 0, correct: 0, wrong: 0, item: null, locked: false };
    let tTimer = null, rTimer = null;

    function comboMult() { return 1 + Math.min(Math.max(ch.combo - 1, 0), 5) * 0.2; }
    function nextQ() {
      ch.item = POOL[Math.floor(Math.random() * POOL.length)];
      ch.locked = false;
      const zh = document.getElementById("chZh"); if (zh) zh.textContent = ch.item.zh;
      const inp = document.getElementById("chInput"); if (inp) { inp.value = ""; inp.classList.remove("ok", "err"); setTimeout(() => inp.focus(), 30); }
      const fb = document.getElementById("chFb"); if (fb) { fb.textContent = ""; fb.className = "feedback"; }
    }
    function refreshTop() {
      const t = document.getElementById("chTime"); if (t) t.textContent = ch.timeLeft;
      const m = document.getElementById("chMy"); if (m) m.textContent = ch.my;
      const r = document.getElementById("chRival"); if (r) r.textContent = ch.rival;
    }
    function updateProgress() {
      const f = document.getElementById("chProg"); if (f) f.style.width = (100 - (ch.timeLeft / 60) * 100) + "%";
    }
    function submit() {
      if (ch.locked || !ch.item) return;
      const inp = document.getElementById("chInput");
      const val = inp ? inp.value : "";
      const fb = document.getElementById("chFb");
      if (!val.trim()) { toast("先写点英文再提交"); return; }
      const ok = normalize(val) === normalize(ch.item.en);
      const anchor = document.getElementById("chInput");
      ch.locked = true;
      if (ok) {
        ch.correct += 1; ch.combo += 1; if (ch.combo > ch.best) ch.best = ch.combo;
        const pts = Math.round(10 * comboMult());
        ch.my += pts; Store.addXp(pts); Store.bumpCombo(ch.best);
        FX.Sound.correct(ch.combo);
        FX.floatText(anchor, "+" + pts + (ch.combo > 1 ? "  🔥x" + ch.combo : ""));
        FX.burstAt(anchor, { count: 12 + Math.min(ch.combo, 8) * 3 });
        FX.pulse(anchor, "reward-pop");
        if (fb) { fb.className = "feedback ok"; fb.textContent = "✅ " + praise(); }
        if (MILESTONES.indexOf(ch.combo) >= 0) { FX.Sound.milestone(); FX.confetti(70 + ch.combo * 2); toast("🔥 连击 x" + ch.combo + "！手感爆棚"); }
        refreshTop();
        if (ch.timeLeft > 0) setTimeout(nextQ, 520);
      } else {
        ch.wrong += 1; ch.combo = 0; ch.rival += 8;
        FX.Sound.wrong(); FX.pulse(anchor, "reward-shake");
        if (fb) { fb.className = "feedback err"; fb.textContent = wrongHint(val, ch.item.en); }
        refreshTop();
        if (ch.timeLeft > 0) setTimeout(nextQ, 560);
      }
    }
    function skip() {
      if (ch.locked || !ch.item) return;
      ch.combo = 0; ch.rival += 5;
      const fb = document.getElementById("chFb");
      if (fb) { fb.className = "feedback err"; fb.textContent = "⏭ 跳过，正确答案：" + ch.item.en; }
      ch.locked = true; refreshTop();
      if (ch.timeLeft > 0) setTimeout(nextQ, 560);
    }
    function end() {
      if (window.__challengeCleanup) { window.__challengeCleanup(); window.__challengeCleanup = null; }
      const win = ch.my > ch.rival, draw = ch.my === ch.rival;
      const acc = (ch.correct + ch.wrong) ? Math.round((ch.correct / (ch.correct + ch.wrong)) * 100) : 0;
      const bless = win ? "干得漂亮，这把对手被你按在地上摩擦！" : draw ? "势均力敌，再来一局分胜负！" : "对手这局更快，找找节奏再来！";
      FX.Sound.finish(); if (win) FX.confetti(160);
      const stage = document.getElementById("chStage");
      if (stage) {
        stage.innerHTML = `
          <div class="round-end">
            <div class="re-emoji">${win ? "🏆" : draw ? "🤝" : "😤"}</div>
            <div class="re-title">${win ? "挑战胜利！" : draw ? "平局！" : "惜败，再来一局"}</div>
            <div class="re-bless">${esc(bless)}</div>
            <div class="re-stats">
              <div class="re-stat"><b>${ch.correct}</b><span>答对</span></div>
              <div class="re-stat"><b>${ch.best}</b><span>最高连击</span></div>
              <div class="re-stat hl"><b>${ch.my}</b><span>我的得分</span></div>
              <div class="re-stat"><b>${ch.rival}</b><span>对手得分</span></div>
            </div>
            <div class="re-actions">
              <button class="btn-green" id="chAgain">🔁 再来一局</button>
              <button class="btn-ghost" id="chHome">🏠 返回首页</button>
            </div>
          </div>`;
        stage.querySelector("#chAgain").addEventListener("click", renderChallenge);
        stage.querySelector("#chHome").addEventListener("click", () => { location.hash = "#/home"; });
      }
    }
    function stop() { if (tTimer) clearInterval(tTimer); if (rTimer) clearInterval(rTimer); tTimer = rTimer = null; }
    window.__challengeCleanup = stop;

    app.innerHTML = `
      <section class="challenge-wrap">
        <div class="ch-top">
          <div class="ch-timer">⏱ <b id="chTime">60</b>s</div>
          <div class="ch-scores">
            <div class="ch-side me"><span>你</span><b id="chMy">0</b></div>
            <div class="ch-vs">VS</div>
            <div class="ch-side rival"><span>🤖 对手</span><b id="chRival">0</b></div>
          </div>
          <button class="ch-quit" id="chQuit" title="退出">✕</button>
        </div>
        <div class="ch-progress"><div class="ch-progress-fill" id="chProg"></div></div>
        <div class="practice-stage" id="chStage">
          <div class="sentence-zh" id="chZh">准备中…</div>
          <button class="speak-btn" id="chSpeak" type="button">🔊 听发音</button>
          <div class="sentence-hint">看中文敲英文，越快越准分越高！连击翻倍得分。</div>
          <input class="typing-input" id="chInput" placeholder="Type the English sentence…" autocomplete="off" />
          <div class="feedback" id="chFb"></div>
          <div style="margin-top:16px;display:flex;gap:12px;">
            <button class="btn-green" id="chSubmit">提交</button>
            <button class="btn-ghost" id="chSkip">跳过</button>
          </div>
        </div>
      </section>`;

    document.getElementById("chSubmit").addEventListener("click", submit);
    document.getElementById("chSkip").addEventListener("click", skip);
    document.getElementById("chQuit").addEventListener("click", () => { stop(); location.hash = "#/home"; });
    const inp = document.getElementById("chInput");
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    document.getElementById("chSpeak").addEventListener("click", () => { if (ch.item) speak(ch.item.en); });

    nextQ();
    refreshTop();
    tTimer = setInterval(() => {
      ch.timeLeft -= 1;
      refreshTop(); updateProgress();
      if (ch.timeLeft <= 0) { stop(); end(); }
    }, 1000);
    rTimer = setInterval(() => {
      if (ch.timeLeft <= 0) return;
      ch.rival += 6 + Math.floor(Math.random() * 14);
      refreshTop();
    }, 1900);
  }
  function renderPractice() {
    const idFromHash = location.hash.replace("#/", "").split("/")[1];
    if (idFromHash && COURSES.find((c) => c.id === idFromHash)) pstate.courseId = idFromHash;
    if (!pstate.courseId) pstate.courseId = COURSES[0].id;
    pstate.idx = getProg(pstate.courseId, pstate.mode);

    const side = COURSES.map(
      (c) => `<div class="side-item ${c.id === pstate.courseId ? "active" : ""}" data-id="${c.id}">${c.emoji} ${esc(c.title)}</div>`
    ).join("");

    app.innerHTML = `
      <div class="page-title">开始练习</div>
      <div class="page-sub">答对就有经验、有连击、有爽感 —— 连对越多，音效越亮、彩带越多。</div>
      <div class="voice-bar"><span class="voice-label">🔊 发音嗓音</span><select id="voiceSel" class="voice-sel"></select></div>
      <div class="study-bar">
        <button class="chip" id="gBtn" type="button">📖 本课语法精讲（${gnotesOf(pstate.courseId).length}）</button>
        <label class="tip-switch"><input type="checkbox" id="tipAuto"${TIPAUTO ? " checked" : ""} /><span>答完自动展开讲解</span></label>
      </div>
      <div class="gpanel" id="gpanel"><div class="grammar-list">${grammarCardsHTML(pstate.courseId)}</div></div>
      <div class="hud">
        <div class="hud-item combo"><span class="hud-ico">🔥</span><b id="hudCombo">0</b><span class="hud-lb">连击</span></div>
        <div class="hud-item"><span class="hud-ico">⭐</span><b id="hudXp">0</b><span class="hud-lb">本轮经验</span></div>
        <div class="hud-item"><span class="hud-ico">🏅</span><b id="hudTotal">0</b><span class="hud-lb">总经验</span></div>
        <div class="hud-item"><span class="hud-ico">🎯</span><b id="hudAcc">—</b><span class="hud-lb">正确率</span></div>
        <div class="hud-item"><span class="hud-ico">👑</span><b id="hudBest">0</b><span class="hud-lb">最高连击</span></div>
        <button class="hud-sound" id="hudSound" type="button" title="音效开关">🔊</button>
      </div>
      <div class="pbar"><i id="pbarFill"></i></div>
      <div class="practice-wrap">
        <aside class="side-list"><h4>选择课程</h4>${side}</aside>
        <section class="practice-stage" id="stage"></section>
      </div>
    `;
    app.querySelectorAll(".side-item").forEach((el) =>
      el.addEventListener("click", () => {
        const target = "#/practice/" + el.dataset.id;
        if (location.hash !== target) location.hash = target; // 由 hash 路由驱动，避免被 renderPractice 内的 hash 解析覆盖
      })
    );
    resetSession();
    renderStage();
    bindVoiceSelect();
    bindGrammarSpeak(app);
    const gBtn = app.querySelector("#gBtn"), gPanel = app.querySelector("#gpanel");
    if (gBtn && gPanel) gBtn.addEventListener("click", () => {
      gPanel.classList.toggle("open");
      gBtn.classList.toggle("on");
    });
    const ta = app.querySelector("#tipAuto");
    if (ta) ta.addEventListener("change", () => {
      setTipAuto(ta.checked);
      toast(ta.checked ? "已开启：答完自动展开讲解" : "已关闭自动展开，可点 💡 随时查看");
    });
    savePracticeMeta();
    const sb = document.getElementById("hudSound");
    if (sb) sb.addEventListener("click", () => {
      FX.Sound.toggle(); syncSoundBtn();
      if (!FX.Sound.isMuted()) FX.Sound.tick();
    });
    syncSoundBtn();
  }
  // 机械感逐词下划线输入框：count 个下划线框，空格/回车/方向键跳格，自动扩宽
  function buildWordSlots(box, count, opts) {
    opts = opts || {};
    const words = opts.words || [];                 // 每格目标词，用于预置宽度（长词长线、短词短线）
    const clean = (w) => String(w || "").replace(/[.,!?;:'"()]/g, "");
    const estW = (w) => Math.max(3, clean(w).length + 2);   // 等宽字体下每字母约 1ch，留 2ch 余量
    const wrap = document.createElement("div");
    wrap.className = "word-slots";
    const els = [];
    for (let i = 0; i < count; i++) {
      const cell = document.createElement("div");
      cell.className = "word-slot-wrap";
      if (opts.showIndex) {
        const idx = document.createElement("div");
        idx.className = "idx";
        idx.textContent = String(i + 1).padStart(2, "0");
        cell.appendChild(idx);
      }
      const target = words[i] || "";
      const tLen = clean(target).length || 4;
      const inp = document.createElement("input");
      inp.className = "word-slot"; inp.type = "text"; inp.autocomplete = "off";
      inp.setAttribute("data-i", i);
      if (opts.placeholder) inp.placeholder = opts.placeholder;
      inp.style.width = estW(target) + "ch";        // 预置宽度：长短随单词自适应
      cell.appendChild(inp);
      wrap.appendChild(cell);
      els.push(inp);
      const grow = () => { inp.style.width = (Math.max(inp.value.length, tLen) + 2) + "ch"; };
      inp.addEventListener("input", () => {
        inp.value = inp.value.replace(/\s+/g, "");  // 忽略误敲的空格
        grow();
        // 填到目标长度就自动跳到下一格，不再依赖空格键
        if (tLen > 0 && inp.value.length >= tLen && i + 1 < els.length) focusSlot(i + 1);
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); if (opts.onEnter) opts.onEnter(); }
        else if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); focusSlot(i + 1); }
        else if (e.key === "ArrowRight") { focusSlot(i + 1); }
        else if (e.key === "ArrowLeft") { focusSlot(i - 1); }
        else if (e.key === "Backspace" && !inp.value) { e.preventDefault(); focusSlot(i - 1); }
      });
    }
    box.appendChild(wrap);
    function focusSlot(n) { if (n < 0 || n >= els.length) return; els[n].focus(); }
    return {
      els, wrap,
      getValue() { return els.map((e) => e.value).filter(Boolean).join(" ").trim(); },
      fill(val) {
        const ws = clean(val).split(/\s+/);
        els.forEach((e, i) => { e.value = ws[i] || ""; e.style.width = (Math.max(e.value.length, clean(words[i]).length || 4) + 2) + "ch"; });
      },
      setReadOnly(ro) { els.forEach((e) => { if (ro) e.setAttribute("readonly", "true"); else e.removeAttribute("readonly"); }); },
      setStatus(cls) { els.forEach((e) => { e.classList.remove("ok", "err"); if (cls) e.classList.add(cls); }); },
      focus(n) { (els[n || 0] || els[0]).focus(); },
    };
  }
  function renderStage() {
    const course = COURSES.find((c) => c.id === pstate.courseId);
    const isWord = pstate.mode === "word";
    const total = isWord ? (course.words || []).length : course.lessons.length;
    const stage = app.querySelector("#stage");
    pstate.answered = false; // 每次重绘都是新题，避免上一题已作答的锁死状态被带过来
    stage.innerHTML = `
      <div class="mode-tabs">
        <button class="mode-tab ${pstate.mode === "type" ? "active" : ""}" data-mode="type">⌨️ 看中文敲英文</button>
        <button class="mode-tab ${pstate.mode === "sentence" ? "active" : ""}" data-mode="sentence">🧩 拼句闯关</button>
        <button class="mode-tab ${pstate.mode === "word" ? "active" : ""}" data-mode="word">🔤 单词闯关</button>
      </div>
      <div class="progress-line">${esc(course.title)} · 第 ${(isWord && total ? pstate.idx % total : pstate.idx) + 1} / ${total} ${isWord ? "词" : "句"}</div>
      <div id="qbox"></div>
    `;
    stage.querySelectorAll(".mode-tab").forEach((el) =>
      el.addEventListener("click", () => {
        pstate.mode = el.dataset.mode;
        pstate.idx = getProg(pstate.courseId, pstate.mode);
        pstate.answered = false;
        resetSession();                 // 换玩法 = 新一轮，连击与经验重新累计
        savePracticeMeta();
        renderStage();
      })
    );
    if (pstate.mode === "type") renderType(stage.querySelector("#qbox"), course);
    else if (pstate.mode === "sentence") renderSentence(stage.querySelector("#qbox"), course);
    else renderWord(stage.querySelector("#qbox"), course);
    updateHud();
  }
  function renderType(box, course) {
    const item = course.lessons[pstate.idx];
    const answerWords = parseSentence(item.en);
    box.innerHTML = `
      <div class="sentence-zh">${esc(item.zh)}</div>
      <div class="word-flow">${renderWordCards(answerWords)}</div>
      <button class="speak-btn" id="speak" type="button">🔊 听发音</button>
      <div class="sentence-hint">看中文，在横线上敲出每个英文单词；填完自动跳下一格，或敲空格 / → 跳格，回车提交。</div>
      <div id="slotBox"></div>
      <div class="feedback" id="fb"></div>
      ${tipBlockHTML(learnText(course.id, item.en, false), "讲讲这句的语法")}
      <div style="margin-top:16px;display:flex;gap:12px;">
        <button class="btn-green" id="submit">提交</button>
        <button class="btn-ghost" id="skip">不会，看答案</button>
      </div>`;
    setTimeout(() => speak(item.en), 350);
    bindTip(box);
    const slots = buildWordSlots(box.querySelector("#slotBox"), answerWords.length, { words: answerWords, showIndex: true, onEnter: submit });
    setTimeout(() => slots.focus(0), 50);
    const inputEl = slots.wrap;
    function submit() {
      if (pstate.answered) return;
      const val = slots.getValue();
      if (!val.trim()) { toast("先写点英文再提交"); return; }
      const correct = normalize(val) === normalize(item.en);
      const fb = box.querySelector("#fb");
      if (correct) {
        pstate.answered = true;
        slots.setStatus("ok"); slots.setReadOnly(true);
        fb.className = "feedback ok"; fb.textContent = "✅ " + praise();
        speak("Correct!");
        Store.recordSentence(true); Store.addMinutes(1); Store.logPractice(course.id, "type", true);
        Store.recordWeak(course.id, course.title, "type", item.zh, item.en, true);
        award(true, inputEl);
        openTip(box, 420);
        setTimeout(() => nextSentence(course), 1150);
      } else {
        pstate.answered = false;
        slots.setStatus("err");
        fb.className = "feedback err"; fb.textContent = wrongHint(val, item.en);
        speak("Try again");
        Store.recordWeak(course.id, course.title, "type", item.zh, item.en, false);
        award(false, inputEl);
        openTip(box, 260);
        setTimeout(() => { slots.setStatus(""); slots.els.forEach((e) => { e.value = ""; }); slots.focus(0); }, 620);
      }
    }
    box.querySelector("#submit").addEventListener("click", submit);
    box.querySelector("#speak").addEventListener("click", () => speak(item.en));
    box.querySelector("#skip").addEventListener("click", () => {
      if (pstate.answered) return;
      pstate.answered = true; slots.fill(item.en); slots.setStatus("ok"); slots.setReadOnly(true);
      const fb = box.querySelector("#fb"); fb.className = "feedback ok"; fb.textContent = `答案：${item.en}`;
      speak(item.en);
      Store.recordSentence(false); Store.addMinutes(1); Store.logPractice(course.id, "type", false);
      Store.recordWeak(course.id, course.title, "type", item.zh, item.en, false);
      breakCombo();
      openTip(box);
      const n = document.createElement("button"); n.className = "btn-green"; n.style.marginTop = "14px";
      n.textContent = "下一句 →"; n.addEventListener("click", () => nextSentence(course));
      const tipEl = box.querySelector("#tipbox");
      if (tipEl) box.insertBefore(n, tipEl); else box.appendChild(n);
    });
  }
  function renderSentence(box, course) {
    const item = course.lessons[pstate.idx];
    const words = item.en.replace(/[.,!?;:'"]/g, "").split(/\s+/).filter(Boolean);
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    box.innerHTML = `
      <div class="sentence-zh">${esc(item.zh)}</div>
      <button class="speak-btn" id="speak" type="button">🔊 听发音</button>
      <div class="sentence-hint">点击下方单词，按顺序拼出正确句子。</div>
      <div class="answer-slots" id="slots"></div>
      <div class="word-bank" id="bank">
        ${shuffled.map((w, i) => `<button class="word-chip" data-w="${esc(w)}" data-i="${i}">${esc(w)}</button>`).join("")}
      </div>
      <div class="feedback" id="fb"></div>
      ${tipBlockHTML(learnText(course.id, item.en, false), "讲讲这句的语法")}
      <div style="margin-top:8px;display:flex;gap:12px;">
        <button class="btn-green" id="submit">提交</button>
        <button class="btn-ghost" id="clear">清空</button>
      </div>`;
    const slots = box.querySelector("#slots");
    const bank = box.querySelector("#bank");
    bindTip(box);
    let chosen = [];
    const pick = (w, btn) => {
      if (pstate.answered) return;
      chosen.push(w); btn.classList.add("used");
      const chip = document.createElement("button"); chip.className = "word-chip"; chip.textContent = w;
      chip.addEventListener("click", () => {
        if (pstate.answered) return;
        chosen = chosen.filter((x) => x !== w); btn.classList.remove("used"); chip.remove();
      });
      slots.appendChild(chip);
    };
    bank.querySelectorAll(".word-chip").forEach((b) => b.addEventListener("click", () => pick(b.dataset.w, b)));
    const clear = () => { chosen = []; slots.innerHTML = ""; bank.querySelectorAll(".word-chip").forEach((b) => b.classList.remove("used")); };
    box.querySelector("#clear").addEventListener("click", clear);
    setTimeout(() => speak(item.en), 350);
    box.querySelector("#speak").addEventListener("click", () => speak(item.en));
    box.querySelector("#submit").addEventListener("click", () => {
      if (pstate.answered) return;
      const correct = normalize(chosen.join(" ")) === normalize(item.en);
      const fb = box.querySelector("#fb");
      if (correct) {
        pstate.answered = true;
        fb.className = "feedback ok"; fb.textContent = "✅ " + praise();
        speak("Correct!");
        Store.recordSentence(true); Store.recordWord(true); Store.addMinutes(1); Store.logPractice(course.id, "sentence", true);
        Store.recordWeak(course.id, course.title, "sentence", item.zh, item.en, true);
        award(true, slots);
        openTip(box, 420);
        setTimeout(() => nextSentence(course), 1150);
      } else {
        pstate.answered = false;
        fb.className = "feedback err";
        fb.textContent = chosen.length < words.length ? "❗ 还有单词没放进去" : "❗ 词都对了，顺序再调整一下";
        speak("Try again");
        Store.recordWeak(course.id, course.title, "sentence", item.zh, item.en, false);
        award(false, slots);
        openTip(box, 260);
        clear();
      }
    });
  }
  function nextSentence(course) {
    pstate.idx += 1; pstate.answered = false;
    if (pstate.idx >= course.lessons.length) {
      // 练完一整轮 → 先给结算奖励，而不是默默从头开始
      setProg(pstate.courseId, pstate.mode, course.lessons.length - 1);
      renderRoundEnd(course);
      return;
    }
    setProg(pstate.courseId, pstate.mode, pstate.idx);
    renderStage();
  }
  function renderWord(box, course) {
    const words = course.words || [];
    if (!words.length) { box.innerHTML = `<div class="empty">本课程暂无单词练习，去句子模式练练吧～</div>`; return; }
    const item = words[pstate.idx % words.length];
    box.innerHTML = `
      <div class="sentence-zh">${esc(item.zh)}</div>
      <button class="speak-btn" id="speak" type="button">🔊 听发音</button>
      <div class="sentence-hint">根据中文释义，在下方横线上拼写出对应的英文单词（横线长度随单词自动调整），回车提交。</div>
      <div id="slotBox"></div>
      <div class="feedback" id="fb"></div>
      ${tipBlockHTML(learnText(course.id, item.en, true), "这个单词怎么用")}
      <div style="margin-top:16px;display:flex;gap:12px;">
        <button class="btn-green" id="submit">提交</button>
        <button class="btn-ghost" id="skip">看答案</button>
      </div>`;
    setTimeout(() => speak(item.en), 350);
    bindTip(box);
    const slots = buildWordSlots(box.querySelector("#slotBox"), 1, { showIndex: false, width: "14ch", placeholder: "英文单词", onEnter: submit });
    setTimeout(() => slots.focus(0), 50);
    const inputEl = slots.wrap;
    function submit() {
      if (pstate.answered) return;
      const val = slots.getValue();
      if (!val.trim()) { toast("先写点英文再提交"); return; }
      const correct = normalize(val) === normalize(item.en);
      const fb = box.querySelector("#fb");
      if (correct) {
        pstate.answered = true;
        slots.setStatus("ok"); slots.setReadOnly(true);
        fb.className = "feedback ok"; fb.textContent = "✅ " + praise();
        speak("Correct!");
        Store.recordWord(true); Store.addMinutes(1); Store.logPractice(course.id, "word", true);
        Store.recordWeak(course.id, course.title, "word", item.zh, item.en, true);
        award(true, inputEl);
        openTip(box, 420);
        setTimeout(() => nextWord(course), 1150);
      } else {
        pstate.answered = false;
        slots.setStatus("err");
        fb.className = "feedback err"; fb.textContent = wrongWordHint(val, item.en);
        speak("Try again");
        Store.recordWeak(course.id, course.title, "word", item.zh, item.en, false);
        award(false, inputEl);
        openTip(box, 260);
        setTimeout(() => { slots.setStatus(""); slots.els.forEach((e) => { e.value = ""; }); slots.focus(0); }, 620);
      }
    }
    box.querySelector("#submit").addEventListener("click", submit);
    box.querySelector("#speak").addEventListener("click", () => speak(item.en));
    box.querySelector("#skip").addEventListener("click", () => {
      if (pstate.answered) return;
      pstate.answered = true; slots.fill(item.en); slots.setStatus("ok"); slots.setReadOnly(true);
      const fb = box.querySelector("#fb"); fb.className = "feedback ok"; fb.textContent = `答案：${item.en}`;
      speak(item.en);
      Store.recordWord(false); Store.addMinutes(1); Store.logPractice(course.id, "word", false);
      Store.recordWeak(course.id, course.title, "word", item.zh, item.en, false);
      breakCombo();
      openTip(box);
      const n = document.createElement("button"); n.className = "btn-green"; n.style.marginTop = "14px";
      n.textContent = "下一个 →"; n.addEventListener("click", () => nextWord(course));
      const tipEl = box.querySelector("#tipbox");
      if (tipEl) box.insertBefore(n, tipEl); else box.appendChild(n);
    });
  }
  function nextWord(course) {
    const total = (course.words || []).length;
    pstate.idx += 1; pstate.answered = false;
    if (total && pstate.idx >= total) {
      setProg(pstate.courseId, pstate.mode, total - 1);
      renderRoundEnd(course);
      return;
    }
    setProg(pstate.courseId, pstate.mode, total ? pstate.idx % total : 0);
    renderStage();
  }

  // ---------- 易错本（自动记录记得好 / 记不好）----------
  const modeLabel = (t) => (t === "type" ? "看中文敲英文" : t === "sentence" ? "拼句闯关" : "单词闯关");
  const mcls = (t) => (t === "type" ? "m-type" : t === "sentence" ? "m-sentence" : "m-word");

  function weakCardHTML(e, mastered) {
    const learn = learnText(e.courseId, e.en, e.type === "word");
    return `
      <div class="weak-card ${mastered ? "mastered" : ""}" data-key="${esc(e.key)}" data-zh="${esc(e.zh)}" data-en="${esc(e.en)}">
        <div class="wc-main">
          <div class="wc-zh">${esc(e.zh)}</div>
          <div class="wc-en">${esc(e.en)}<button class="speak-btn sm" data-en="${esc(e.en)}">🔊</button></div>
          <div class="wc-meta">
            <span class="mode-pill ${mcls(e.type)}">${modeLabel(e.type)}</span>
            <span class="wc-course">${esc(e.courseTitle || "")}</span>
          </div>
          <div class="wc-counts">错 <b>${e.wrong}</b> · 对 <b>${e.right}</b>${e.lastWrong ? ` · 最近错 ${e.lastWrong}` : ""}${mastered ? " · ✅ 已掌握" : ""}</div>
          ${learn ? `<div class="wc-tip"><span class="wc-tip-ico">💡</span><span class="wc-tip-tx">${richTip(learn)}</span></div>` : ""}
        </div>
        <div class="wc-actions">
          ${mastered
            ? `<button class="chip wc-unmaster" data-key="${esc(e.key)}">↩ 打回复习</button>`
            : `<button class="chip wc-master" data-key="${esc(e.key)}">✅ 标记已掌握</button>`}
          <button class="chip wc-del" data-key="${esc(e.key)}">🗑 删除</button>
        </div>
      </div>`;
  }

  function bindWeakCards() {
    app.querySelectorAll(".wc-master").forEach((b) =>
      b.addEventListener("click", () => { Store.markMastered(b.dataset.key); toast("✅ 已标记掌握，移入「记得好」"); renderWeakBook(); })
    );
    app.querySelectorAll(".wc-unmaster").forEach((b) =>
      b.addEventListener("click", () => { Store.unmarkMastered(b.dataset.key); toast("已打回复习，回到待巩固"); renderWeakBook(); })
    );
    app.querySelectorAll(".wc-del").forEach((b) =>
      b.addEventListener("click", () => { Store.removeWeak(b.dataset.key); toast("已删除"); renderWeakBook(); })
    );
    app.querySelectorAll(".weak-card .speak-btn.sm").forEach((b) =>
      b.addEventListener("click", () => speak(b.dataset.en))
    );
  }

  function renderWeakBook() {
    const stats = Store.getWeakStats();
    const list = Store.getWeakBook();
    const mastered = Store.getWeakAll().filter((e) => e.mastered);

    app.innerHTML = `
      <div class="page-title">📒 易错本</div>
      <div class="page-sub">练习时答错的句子和单词会自动收进这里，按「错得最多」排序。可逐个标记已掌握，或进入「只练易错」专项攻克。</div>

      <div class="weak-stats">
        <div class="ws"><div class="n orange">${stats.weak}</div><div class="l">待巩固（记不好）</div></div>
        <div class="ws"><div class="n green">${stats.mastered}</div><div class="l">已掌握（记得好）</div></div>
        <div class="ws"><div class="n">${stats.total}</div><div class="l">累计收录</div></div>
      </div>

      <div class="weak-toolbar">
        <button class="btn-green" id="weakReview">🎯 只练易错（${stats.weak}）</button>
        ${stats.total ? `<button class="btn-ghost" id="weakClear">🗑 清空易错本</button>` : ""}
      </div>

      ${stats.weak
        ? `<div class="weak-search"><input id="weakSearch" class="typing-input" placeholder="搜索中文 / 英文关键词…" style="font-size:15px" /></div>
           <div class="weak-list">${list.map((e) => weakCardHTML(e, false)).join("")}</div>`
        : `<div class="empty">🎉 目前没有易错内容。<br />去「开始练习」做几题，做错的会自动归类到这里。</div>`}

      ${mastered.length
        ? `<div class="section-h"><span class="bar"></span>已掌握 · 记得好（${mastered.length}）</div>
           <div class="weak-list">${mastered.map((e) => weakCardHTML(e, true)).join("")}</div>`
        : ""}
    `;

    const rb = app.querySelector("#weakReview");
    if (rb) rb.addEventListener("click", startWeakReview);
    const clr = app.querySelector("#weakClear");
    if (clr) clr.addEventListener("click", () => {
      if (window.confirm("确定清空整个易错本？已掌握的记录也会一并删除，且不可恢复。")) {
        Store.clearWeak(); toast("易错本已清空"); renderWeakBook();
      }
    });
    const search = app.querySelector("#weakSearch");
    if (search) search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      app.querySelectorAll(".weak-card").forEach((c) => {
        const hay = ((c.dataset.zh || "") + " " + (c.dataset.en || "")).toLowerCase();
        c.style.display = !q || hay.indexOf(q) >= 0 ? "" : "none";
      });
    });
    bindWeakCards();
  }

  // ---------- 只练易错（专项复习）----------
  const WK = { items: [], idx: 0, done: 0 };

  function startWeakReview() {
    const items = Store.getWeakReviewItems();
    if (!items.length) { toast("暂无易错内容，去练几题吧～"); return; }
    WK.items = items.slice(0, 30); WK.idx = 0; WK.done = 0;
    location.hash = "#/weak/practice";
  }

  function wkNext() {
    WK.idx += 1;
    if (WK.idx >= WK.items.length) { renderWeakReviewDone(); return; }
    renderWeakReview();
  }
  function addWeakNextBtn(box) {
    const n = document.createElement("button");
    n.className = "btn-green"; n.style.marginTop = "14px"; n.textContent = "下一题 →";
    n.addEventListener("click", () => wkNext());
    box.appendChild(n);
  }

  function renderWeakReviewDone() {
    const remain = Store.getWeakStats().weak;
    app.innerHTML = `
      <div class="page-title">🎯 只练易错</div>
      <div class="practice-wrap">
        <section class="practice-stage">
          <div class="weak-done">
            <div class="wd-n">🎉 本轮复习完成</div>
            <div class="wd-sub">本轮练了 <b>${WK.items.length}</b> 个易错点 · 答对巩固 <b>${WK.done}</b> 个<br />当前仍有 <b>${remain}</b> 个待巩固</div>
            <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
              <button class="btn-green" id="again">🔁 再练一轮</button>
              <a class="btn-ghost" href="#/weak">返回易错本</a>
            </div>
          </div>
        </section>
      </div>`;
    app.querySelector("#again").addEventListener("click", () => { WK.items = []; startWeakReview(); });
  }

  function renderWeakReview() {
    if (!WK.items.length) {
      const items = Store.getWeakReviewItems();
      if (!items.length) {
        app.innerHTML = `
          <div class="page-title">🎯 只练易错</div>
          <div class="empty">🎉 当前没有易错内容，去「开始练习」做几题再来复习吧。</div>
          <div style="margin-top:16px"><a class="btn-green" href="#/practice">去练习 →</a></div>`;
        return;
      }
      WK.items = items.slice(0, 30); WK.idx = 0; WK.done = 0;
    }
    const item = WK.items[WK.idx];
    if (!item) { renderWeakReviewDone(); return; }
    const total = WK.items.length;
    app.innerHTML = `
      <div class="page-title">🎯 只练易错</div>
      <div class="page-sub">只练你记不好的内容，逐个攻克。</div>
      <div class="practice-wrap">
        <section class="practice-stage">
          <div class="progress-line">易错复习 ${WK.idx + 1} / ${total} · 本次已巩固 ${WK.done}</div>
          <div id="wkq"></div>
        </section>
      </div>`;
    const box = app.querySelector("#wkq");
    if (item.type === "type") weakRenderType(box, item);
    else if (item.type === "sentence") weakRenderSentence(box, item);
    else weakRenderWord(box, item);
  }

  // 复习题：看中文敲英文
  function weakRenderType(box, item) {
    box.innerHTML = `
      <div class="sentence-zh">${esc(item.zh)}</div>
      <button class="speak-btn" id="speak" type="button">🔊 听发音</button>
      <div class="sentence-hint">把上面的中文翻译成英文，敲完按回车或点“提交”。</div>
      <input class="typing-input" id="ti" placeholder="Type the English sentence…" autocomplete="off" />
      <div class="feedback" id="fb"></div>
      ${tipBlockHTML(learnText(item.courseId, item.en, false), "讲讲这句的语法")}
      <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-green" id="submit">提交</button>
        <button class="btn-ghost" id="skip">不会，看答案</button>
        <button class="chip wk-master" id="master">✅ 标记已掌握</button>
      </div>`;
    const input = box.querySelector("#ti");
    setTimeout(() => input.focus(), 50);
    setTimeout(() => speak(item.en), 350);
    bindTip(box);
    let locked = false;
    const submit = () => {
      if (locked) return;
      const val = input.value;
      if (!val.trim()) { toast("先写点英文再提交"); return; }
      const correct = normalize(val) === normalize(item.en);
      const fb = box.querySelector("#fb");
      if (correct) {
        locked = true;
        input.classList.add("ok"); input.setAttribute("readonly", "true");
        fb.className = "feedback ok"; fb.textContent = "✅ 正确！";
        speak("Correct!");
        Store.recordWeak(item.courseId, item.courseTitle, "type", item.zh, item.en, true);
        WK.done += 1;
        openTip(box, 420);
        setTimeout(() => wkNext(), 1200);
      } else {
        input.classList.remove("ok"); input.classList.add("err");
        fb.className = "feedback err"; fb.textContent = "❌ 不对，再想想";
        speak("Try again");
        Store.recordWeak(item.courseId, item.courseTitle, "type", item.zh, item.en, false);
        openTip(box, 260);
        setTimeout(() => { input.value = ""; input.classList.remove("err"); input.focus(); }, 600);
      }
    };
    box.querySelector("#submit").addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    box.querySelector("#speak").addEventListener("click", () => speak(item.en));
    box.querySelector("#skip").addEventListener("click", () => {
      if (locked) return;
      locked = true; input.value = item.en; input.classList.add("ok");
      const fb = box.querySelector("#fb"); fb.className = "feedback ok"; fb.textContent = `答案：${item.en}`;
      speak(item.en);
      Store.recordWeak(item.courseId, item.courseTitle, "type", item.zh, item.en, false);
      openTip(box);
      addWeakNextBtn(box);
    });
    box.querySelector("#master").addEventListener("click", () => {
      Store.markMastered(item.key); toast("✅ 已掌握"); wkNext();
    });
  }

  // 复习题：拼句闯关
  function weakRenderSentence(box, item) {
    const words = item.en.replace(/[.,!?;:'"]/g, "").split(/\s+/).filter(Boolean);
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    box.innerHTML = `
      <div class="sentence-zh">${esc(item.zh)}</div>
      <button class="speak-btn" id="speak" type="button">🔊 听发音</button>
      <div class="sentence-hint">点击下方单词，按顺序拼出正确句子。</div>
      <div class="answer-slots" id="slots"></div>
      <div class="word-bank" id="bank">
        ${shuffled.map((w, i) => `<button class="word-chip" data-w="${esc(w)}" data-i="${i}">${esc(w)}</button>`).join("")}
      </div>
      <div class="feedback" id="fb"></div>
      ${tipBlockHTML(learnText(item.courseId, item.en, false), "讲讲这句的语法")}
      <div style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-green" id="submit">提交</button>
        <button class="btn-ghost" id="clear">清空</button>
        <button class="chip wk-master" id="master">✅ 标记已掌握</button>
      </div>`;
    const slots = box.querySelector("#slots");
    const bank = box.querySelector("#bank");
    bindTip(box);
    let chosen = [];
    const pick = (w, btn) => {
      chosen.push(w); btn.classList.add("used");
      const chip = document.createElement("button"); chip.className = "word-chip"; chip.textContent = w;
      chip.addEventListener("click", () => {
        chosen = chosen.filter((x) => x !== w); btn.classList.remove("used"); chip.remove();
      });
      slots.appendChild(chip);
    };
    bank.querySelectorAll(".word-chip").forEach((b) => b.addEventListener("click", () => pick(b.dataset.w, b)));
    const clear = () => { chosen = []; slots.innerHTML = ""; bank.querySelectorAll(".word-chip").forEach((b) => b.classList.remove("used")); };
    box.querySelector("#clear").addEventListener("click", clear);
    setTimeout(() => speak(item.en), 350);
    box.querySelector("#speak").addEventListener("click", () => speak(item.en));
    box.querySelector("#submit").addEventListener("click", () => {
      const correct = normalize(chosen.join(" ")) === normalize(item.en);
      const fb = box.querySelector("#fb");
      if (correct) {
        fb.className = "feedback ok"; fb.textContent = "✅ 拼对啦！";
        speak("Correct!");
        Store.recordWeak(item.courseId, item.courseTitle, "sentence", item.zh, item.en, true);
        WK.done += 1;
        openTip(box, 420);
        setTimeout(() => wkNext(), 1200);
      } else {
        fb.className = "feedback err"; fb.textContent = "❌ 不对，再试试";
        speak("Try again");
        Store.recordWeak(item.courseId, item.courseTitle, "sentence", item.zh, item.en, false);
        openTip(box, 260);
        clear();
      }
    });
    box.querySelector("#master").addEventListener("click", () => {
      Store.markMastered(item.key); toast("✅ 已掌握"); wkNext();
    });
  }

  // 复习题：单词闯关
  function weakRenderWord(box, item) {
    box.innerHTML = `
      <div class="sentence-zh">${esc(item.zh)}</div>
      <button class="speak-btn" id="speak" type="button">🔊 听发音</button>
      <div class="sentence-hint">根据中文释义，拼写出对应的英文单词。</div>
      <input class="typing-input" id="ti" placeholder="Type the English word…" autocomplete="off" />
      <div class="feedback" id="fb"></div>
      ${tipBlockHTML(learnText(item.courseId, item.en, true), "这个单词怎么用")}
      <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-green" id="submit">提交</button>
        <button class="btn-ghost" id="skip">看答案</button>
        <button class="chip wk-master" id="master">✅ 标记已掌握</button>
      </div>`;
    const input = box.querySelector("#ti");
    setTimeout(() => input.focus(), 50);
    setTimeout(() => speak(item.en), 350);
    bindTip(box);
    let locked = false;
    const submit = () => {
      if (locked) return;
      const val = input.value;
      if (!val.trim()) { toast("先写点英文再提交"); return; }
      const correct = normalize(val) === normalize(item.en);
      const fb = box.querySelector("#fb");
      if (correct) {
        locked = true;
        input.classList.add("ok"); input.setAttribute("readonly", "true");
        fb.className = "feedback ok"; fb.textContent = "✅ 正确！";
        speak("Correct!");
        Store.recordWeak(item.courseId, item.courseTitle, "word", item.zh, item.en, true);
        WK.done += 1;
        openTip(box, 420);
        setTimeout(() => wkNext(), 1200);
      } else {
        input.classList.remove("ok"); input.classList.add("err");
        fb.className = "feedback err"; fb.textContent = "❌ 不对，再想想";
        speak("Try again");
        Store.recordWeak(item.courseId, item.courseTitle, "word", item.zh, item.en, false);
        openTip(box, 260);
        setTimeout(() => { input.value = ""; input.classList.remove("err"); input.focus(); }, 600);
      }
    };
    box.querySelector("#submit").addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    box.querySelector("#speak").addEventListener("click", () => speak(item.en));
    box.querySelector("#skip").addEventListener("click", () => {
      if (locked) return;
      locked = true; input.value = item.en; input.classList.add("ok");
      const fb = box.querySelector("#fb"); fb.className = "feedback ok"; fb.textContent = `答案：${item.en}`;
      speak(item.en);
      Store.recordWeak(item.courseId, item.courseTitle, "word", item.zh, item.en, false);
      openTip(box);
      addWeakNextBtn(box);
    });
    box.querySelector("#master").addEventListener("click", () => {
      Store.markMastered(item.key); toast("✅ 已掌握"); wkNext();
    });
  }

  // ---------- 排行榜 ----------
  function renderLeaderboard() {
    const list = Store.getLeaderboard();
    const rows = list.map((u, i) => {
      const rankCls = i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
      return `<div class="lb-row ${u.me ? "me" : ""}">
        <div class="lb-rank ${rankCls}">${medal}</div>
        <div class="lb-name"><span class="lb-avatar">${esc(u.name[0])}</span>${esc(u.name)}${u.me ? "（你）" : ""}</div>
        <div class="lb-extra">${fmt(u.done)} 句</div>
        <div class="lb-extra">${fmt(u.minutes)} 分钟</div>
      </div>`;
    }).join("");
    app.innerHTML = `
      <div class="page-title">排行榜</div>
      <div class="page-sub">完成句子越多，排名越靠前。多练几句，你也能上榜！</div>
      <div class="lb-table">
        <div class="lb-row head"><div>排名</div><div>学习者</div><div class="lb-extra">完成句子</div><div class="lb-extra">学习分钟</div></div>
        ${rows}
      </div>`;
  }

  // ---------- 学习手账 ----------
  function renderJournal() {
    const c = Store.getCheckin();
    const cal = c.calendar.map((on) => `<div class="ci-dot ${on ? "on" : ""}">${on ? "✓" : ""}</div>`).join("");
    const j = Store.getJournal();
    const cards = j.length
      ? j.map((e) => `<div class="journal-card"><div class="jd">${e.date} ${e.mood || ""}</div><div class="jt">${esc(e.title)}</div><div class="jb">${esc(e.body)}</div></div>`).join("")
      : `<div class="empty">还没有手账记录，写下今天的学习感受吧 👇</div>`;
    app.innerHTML = `
      <div class="page-title">学习手账</div>
      <div class="page-sub">记录进度与心得，让学习有迹可循。</div>
      <div class="stat-grid">
        <div class="stat-card"><div class="n orange">${c.current}</div><div class="l">当前连续打卡</div></div>
        <div class="stat-card"><div class="n green">${c.max}</div><div class="l">最高连续</div></div>
        <div class="stat-card"><div class="n">${c.total}</div><div class="l">累计打卡</div></div>
        <div class="stat-card"><div class="n">${fmt(Store.getStats().sentencesDone)}</div><div class="l">累计完成句子</div></div>
      </div>
      <div class="section-h"><span class="bar"></span>近 28 天打卡</div>
      <div class="checkin-row"><div class="ci-week" style="gap:6px">${cal}</div>
        <button class="btn-green" id="jCheckin">📅 打卡</button></div>
      <div class="section-h"><span class="bar"></span>写一条手账</div>
      <div class="stat-card">
        <input class="typing-input" id="jTitle" placeholder="今天想记点什么？（标题）" style="font-size:16px;margin-bottom:12px" />
        <textarea class="typing-input" id="jBody" placeholder="学习心得、卡住的句型、明天的小目标…" style="font-size:15px;min-height:90px;resize:vertical"></textarea>
        <div style="margin-top:12px;display:flex;gap:12px;align-items:center">
          <span>心情：</span>
          <button class="chip mood-pick" data-m="😀">😀</button>
          <button class="chip mood-pick" data-m="😊">😊</button>
          <button class="chip mood-pick" data-m="🤔">🤔</button>
          <button class="chip mood-pick" data-m="💪">💪</button>
          <button class="btn-green" id="jSave" style="margin-left:auto">保存手账</button>
        </div>
      </div>
      <div class="section-h"><span class="bar"></span>我的手账</div>
      <div class="journal-list">${cards}</div>
    `;
    let mood = "😀";
    app.querySelectorAll(".mood-pick").forEach((b) => b.addEventListener("click", () => { mood = b.dataset.m; app.querySelectorAll(".mood-pick").forEach((x) => x.classList.remove("active")); b.classList.add("active"); }));
    app.querySelector("#jCheckin").addEventListener("click", doCheckin);
    app.querySelector("#jSave").addEventListener("click", () => {
      const title = app.querySelector("#jTitle").value.trim();
      const body = app.querySelector("#jBody").value.trim();
      if (!title && !body) { toast("写点什么再保存吧"); return; }
      Store.addJournal({ title: title || "（无标题）", body: body || "", mood });
      toast("✅ 手账已保存");
      renderJournal();
    });
  }

  // ---------- 打卡 ----------
  function doCheckin() {
    const r = Store.checkinToday();
    if (r.already) toast("今天已经打卡啦，明天再来 🌟");
    else toast(`✅ 打卡成功！连续 ${r.current} 天，最高 ${r.max} 天`);
    route();
  }
  document.getElementById("checkinBtn").addEventListener("click", doCheckin);

  // ---------- 支付 / 会员配置 ----------
  // contact = 付款后加此客服领取兑换码
  // wxQr = 微信收款码图片（建议用微信官方"保存收款码"原图，不要用截图/合成图）
  // alipayQr = 支付宝收款码图片
  // codes = 可用兑换码池（手动维护，每个码建议只发给一人，避免被复用）
  const PAY = window.PAY = {
    contact: "vip20213456",
    wxQr: "pay-qr.png",
    alipayQr: "pay-qr-alipay.png",
    codes: [
      "HY2026-1001","HY2026-1002","HY2026-1003","HY2026-1004","HY2026-1005",
      "HY2026-2001","HY2026-2002","HY2026-2003","HY2026-2004","HY2026-2005",
    ],
  };

  // 会员专享判定：高级课程需兑换码激活
  function isVipLocked(c) {
    return c && c.level === "高级" && !Store.isVip();
  }

  // 刷新会员态 UI（顶栏按钮）
  function refreshVipUI() {
    const btn = document.getElementById("navOpenCard");
    if (btn && Store.isVip()) {
      btn.textContent = "会员已开通 ✓";
      btn.classList.add("vip-on");
    }
  }

  // ---------- 学习卡弹层（收款码 + 兑换码激活）----------
  window.openCardModal = function () {
    let mask = document.getElementById("cardMask");
    if (!mask) {
      mask = document.createElement("div");
      mask.className = "modal-mask"; mask.id = "cardMask";
      mask.innerHTML = `
        <div class="modal">
          <h3>开通学习卡</h3>
          <p class="modal-sub">微信 / 支付宝 <b>扫码付款</b>，付款后加客服 <b>${esc(PAY.contact)}</b> 领取兑换码，即可激活全部会员课程。</p>
          <div class="pay-qr-wrap">
            <div class="pay-qr-grid">
              <div class="pay-qr-item">
                <img class="pay-qr" src="${esc(PAY.wxQr)}" alt="微信收款码"
                     onerror="this.style.display='none';this.nextElementSibling.style.display='block'" />
                <div class="qr-tip" style="display:none;font-size:12px;padding:10px">请将微信收款码命名为 <code>pay-qr.png</code> 放到本站目录下</div>
                <div class="pay-qr-label">长按识别 · 微信支付</div>
              </div>
              <div class="pay-qr-item">
                <img class="pay-qr" src="${esc(PAY.alipayQr)}" alt="支付宝收款码"
                     onerror="this.style.display='none';this.nextElementSibling.style.display='block'" />
                <div class="qr-tip" style="display:none;font-size:12px;padding:10px">请将支付宝收款码命名为 <code>pay-qr-alipay.png</code> 放到本站目录下</div>
                <div class="pay-qr-label">长按识别 · 支付宝</div>
              </div>
            </div>
          </div>
          <div class="pay-contact-box">
            <div class="pay-contact-tip">扫码失败？加客服微信转账，备注“英语社”</div>
            <div class="pay-contact-id" id="cardContactId">${esc(PAY.contact)}</div>
            <button class="btn-ghost pay-copy-mini" id="cardCopyContact">复制微信号</button>
          </div>
          <div class="redeem-box">
            <div class="rb-h">已付款？输入兑换码立即激活</div>
            <div class="rb-row">
              <input id="codeInput" class="code-input" placeholder="例如 HY2026-1001" autocomplete="off" />
              <button class="btn-green" id="redeemBtn">激活</button>
            </div>
            <div id="redeemMsg" class="redeem-msg"></div>
          </div>
          <div class="sv-modal-cta">
            <div class="sv-modal-cta-txt">不确定选哪档？花 30 秒做份合伙人测评，老王队长帮你判断适不适合 1299 永久卡。</div>
            <a class="btn-primary" href="#/partner" id="cardSurveyLink">🎯 1299 合伙人测评</a>
          </div>
          <div style="text-align:right;margin-top:16px"><button class="btn-ghost" id="cardClose">关闭</button></div>
        </div>`;
      document.body.appendChild(mask);
      mask.addEventListener("click", (e) => { if (e.target === mask) mask.classList.remove("show"); });
      mask.querySelector("#cardClose").addEventListener("click", () => mask.classList.remove("show"));
      const copyBtn = mask.querySelector("#cardCopyContact");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          const id = PAY.contact;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(id).then(() => {
              copyBtn.textContent = "已复制 ✓";
              setTimeout(() => copyBtn.textContent = "复制微信号", 2000);
            }).catch(() => fallbackCopy(id));
          } else {
            fallbackCopy(id);
          }
        });
      }
      function fallbackCopy(text) {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); copyBtn.textContent = "已复制 ✓"; setTimeout(() => copyBtn.textContent = "复制微信号", 2000); }
        catch (e) { window.toastMsg && window.toastMsg("请手动复制微信号"); }
        document.body.removeChild(ta);
      }
      mask.querySelector("#cardSurveyLink").addEventListener("click", (e) => {
        e.preventDefault();
        mask.classList.remove("show");
        location.hash = "#/partner";
      });
      mask.querySelector("#redeemBtn").addEventListener("click", async () => {
        const v = (mask.querySelector("#codeInput").value || "").trim();
        const msg = mask.querySelector("#redeemMsg");
        if (!v) { msg.className = "redeem-msg err"; msg.textContent = "请输入兑换码"; return; }
        msg.className = "redeem-msg"; msg.textContent = "激活中…";
        // 已登录 → 服务端校验（会员记在云端账号上）；未登录 → 本地码池兜底
        let r;
        if (window.API && API.isLoggedIn()) {
          const res = await API.redeem(v);
          const tips = {
            CODE_INVALID: "兑换码无效，请核对后重试",
            CODE_USED: "该兑换码已被使用",
            CODE_ALREADY_ACTIVATED: "你已经开通过了",
            CODE_EMPTY: "请输入兑换码",
            REDEEM_CODES_NOT_CONFIGURED: "服务端未配置兑换码，请联系站长",
            NETWORK_ERROR: "网络异常，请稍后重试",
            UNAUTHORIZED: "登录已过期，请重新登录",
          };
          r = res.ok
            ? { ok: true, msg: "🎉 学习卡激活成功，会员权益已开通！", vipUntil: res.vipUntil || null, planLabel: res.planLabel || "会员" }
            : { ok: false, msg: tips[res.error] || ("激活失败：" + (res.error || "未知错误")) };
        } else {
          r = Store.redeemCode(v);
        }
        if (r.ok) {
          Store.setVip(true, r.vipUntil || null);
          msg.className = "redeem-msg ok";
          const planLabel = r.planLabel || "会员";
          const untilText = r.vipUntil
            ? "，有效期至 " + new Date(r.vipUntil).toLocaleDateString("zh-CN")
            : "，永久有效";
          msg.textContent = "🎉 " + planLabel + "激活成功" + untilText;
          toast(msg.textContent); refreshVipUI();
          if (window.Member) Member.refresh();   // 解除每日额度门禁
          setTimeout(() => mask.classList.remove("show"), 1500);
        } else {
          msg.className = "redeem-msg err"; msg.textContent = r.msg;
        }
      });
    }
    // 已开通则显示已激活状态
    if (Store.isVip()) {
      const rb = mask.querySelector(".redeem-box");
      if (rb) rb.innerHTML = `<div class="rb-h ok">🎉 您已开通学习卡，会员权益已生效</div>`;
    }
    mask.classList.add("show");
  };

  // ---------- 启动 ----------
  route();
  refreshVipUI();
})();
