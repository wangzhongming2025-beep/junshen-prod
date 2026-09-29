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
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function normalize(s) {
    return s.trim().toLowerCase().replace(/[.,!?;:'"()]/g, "").replace(/\s+/g, " ");
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
    if (!VOICES.length) {
      const o = document.createElement("option");
      o.textContent = "系统默认嗓音"; o.value = ""; sel.appendChild(o);
      return;
    }
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
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || "en-US";
      u.rate = 0.96;
      if (currentVoiceURI) {
        const v = VOICES.find((x) => x.voiceURI === currentVoiceURI);
        if (v) u.voice = v;
      }
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
    leaderboard: renderLeaderboard,
    journal: renderJournal,
  };
  let statRange = "total";
  function route() {
    const r = (location.hash.replace("#/", "") || "home").split("/")[0];
    Object.values(nav.querySelectorAll("a")).forEach((a) => {
      a.classList.toggle("active", a.dataset.route === r);
    });
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
  function renderHome() {
    const s = Store.getStats();
    const c = Store.getCheckin();
    const lvl = Store.getLevel();
    const goal = Store.getTodayGoal();
    const badges = Store.getBadges();
    const ciDots = c.calendar
      .map((on, i) => `<div class="ci-dot ${on ? "on" : ""} ${i === c.calendar.length - 1 && !on ? "today" : ""}">${on ? "✓" : ""}</div>`)
      .join("");
    app.innerHTML = `
      <section class="hero">
        <div>
          <h1>游戏化，把英语学进肌肉记忆</h1>
          <p>看着中文敲英文、把打乱的单词拼成句子，像闯关一样练句型。每天打卡、看排名，让坚持有反馈。</p>
          <div style="margin-top:16px;display:flex;gap:12px;">
            <a class="btn-primary" href="#/practice" style="background:#fff;color:var(--green-d);box-shadow:none;">开始练习 →</a>
            <a class="btn-ghost" href="#/courses" style="background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.65);color:#fff;">逛课程广场</a>
          </div>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="n">${fmt(s.sentencesDone)}</div><div class="l">完成句子</div></div>
          <div class="hero-stat"><div class="n">${fmt(s.wordsDone)}</div><div class="l">完成单词</div></div>
          <div class="hero-stat"><div class="n">${c.current}</div><div class="l">连续打卡</div></div>
        </div>
      </section>

      <div class="grow-row">
        <div class="grow-level">${lvl.icon} <b>${lvl.name}</b>${lvl.next ? `<span class="grow-next">距「${lvl.next.name}」还差 ${lvl.next.min - lvl.total}</span>` : `<span class="grow-next">已封顶 🎉</span>`}</div>
        <div class="grow-goal">
          <div class="grow-goal-top"><span>今日目标 ${goal.goal} 句</span><span>${goal.done}/${goal.goal}</span></div>
          <div class="goal-bar"><div class="goal-bar-fill" style="width:${goal.percent}%"></div></div>
        </div>
      </div>
      <div class="badge-row">
        ${badges.map((b) => `<div class="badge ${b.got ? "got" : "nogot"}">${b.icon}<span>${b.name}</span></div>`).join("")}
      </div>

      <div class="section-h"><span class="bar"></span>我的学习统计</div>
      <div class="time-tabs">
        <button class="tt ${statRange === "total" ? "active" : ""}" data-r="total">总计</button>
        <button class="tt ${statRange === "today" ? "active" : ""}" data-r="today">今日</button>
        <button class="tt ${statRange === "week" ? "active" : ""}" data-r="week">本周</button>
        <button class="tt ${statRange === "month" ? "active" : ""}" data-r="month">本月</button>
      </div>
      <div class="stat-grid" id="statGrid">${statCardsHTML(statRange)}</div>

      <div class="checkin-row">
        <div class="ci-info">
          <div class="ci-num"><div class="n">${c.current}</div><div class="l">当前连续</div></div>
          <div class="ci-week">${ciDots}</div>
        </div>
        <button class="btn-green" id="homeCheckin">📅 立即打卡</button>
      </div>

      <div class="section-h"><span class="bar"></span>${Store.isVip() ? "学习卡已开通 ✓" : "开通学习卡，解锁全部课程"}</div>
      ${Store.isVip()
        ? `<div class="vip-on-box">🎉 您已开通会员，全部课程（含会员专享）已解锁，继续加油！</div>`
        : `<div class="stat-grid">
        <div class="stat-card" style="cursor:pointer" onclick="openCardModal()"><div class="n orange">¥39</div><div class="l">月卡</div><div class="sub">先体验，随时退</div></div>
        <div class="stat-card" style="cursor:pointer" onclick="openCardModal()"><div class="n orange">¥109</div><div class="l">季卡</div><div class="sub">立省 ¥8</div></div>
        <div class="stat-card" style="cursor:pointer" onclick="openCardModal()"><div class="n orange">¥365</div><div class="l">年卡</div><div class="sub">平均每天仅 ¥1</div></div>
        <div class="stat-card" style="cursor:pointer" onclick="openCardModal()"><div class="n green">¥1299</div><div class="l">永久卡</div><div class="sub">一次开通，终身可用</div></div>
      </div>`}
    `;
    app.querySelector("#homeCheckin").addEventListener("click", doCheckin);
    app.querySelectorAll(".tt").forEach((b) =>
      b.addEventListener("click", () => {
        statRange = b.dataset.r;
        app.querySelectorAll(".tt").forEach((x) => x.classList.toggle("active", x === b));
        app.querySelector("#statGrid").innerHTML = statCardsHTML(statRange);
      })
    );
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

  // ---------- 课程详情页 ----------
  function renderCourseDetail() {
    const id = location.hash.replace("#/", "").split("/")[1];
    const c = COURSES.find((x) => x.id === id);
    if (!c) { location.hash = "#/courses"; return; }
    const done = Store.getCourseCount(c.id);
    const total = c.lessons.length;
    const pct = Math.min(100, Math.round((done / total) * 100));
    const lessonRows = c.lessons
      .map((l, i) => `<li><span class="ln">${i + 1}</span><span class="lzh">${esc(l.zh)}</span><span class="len">${esc(l.en)}</span><button class="speak-btn sm" data-en="${esc(l.en)}">🔊</button></li>`)
      .join("");
    const wordRows = (c.words || [])
      .map((w) => `<div class="wchip"><span class="wz">${esc(w.zh)}</span><span class="we">${esc(w.en)}</span><button class="speak-btn sm" data-en="${esc(w.en)}">🔊</button></div>`)
      .join("");
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
          <div style="margin-top:14px;display:flex;gap:12px">
            ${isVipLocked(c)
              ? `<button class="btn-green" onclick="openCardModal()">🔒 开通学习卡后解锁</button>`
              : `<a class="btn-green" href="#/practice/${c.id}">▶ 开始练习</a>`}
          </div>
        </div>
      </div>
      <div class="section-h"><span class="bar"></span>句子清单（${total}）</div>
      <ul class="lesson-list">${lessonRows}</ul>
      ${wordRows ? `<div class="section-h"><span class="bar"></span>核心单词（${c.words.length}）</div><div class="word-list">${wordRows}</div>` : ""}
    `;
    app.querySelectorAll(".speak-btn.sm").forEach((b) => b.addEventListener("click", () => speak(b.dataset.en)));
  }

  // ---------- 练习页 ----------
  const pstate = { courseId: null, idx: 0, mode: "type", answered: false };
  function renderPractice() {
    const idFromHash = location.hash.replace("#/", "").split("/")[1];
    if (idFromHash && COURSES.find((c) => c.id === idFromHash)) pstate.courseId = idFromHash;
    if (!pstate.courseId) pstate.courseId = COURSES[0].id;

    const side = COURSES.map(
      (c) => `<div class="side-item ${c.id === pstate.courseId ? "active" : ""}" data-id="${c.id}">${c.emoji} ${esc(c.title)}</div>`
    ).join("");

    app.innerHTML = `
      <div class="page-title">开始练习</div>
      <div class="page-sub">两种玩法：看中文敲英文，或把打乱的单词拼成句子。</div>
      <div class="voice-bar"><span class="voice-label">🔊 发音嗓音</span><select id="voiceSel" class="voice-sel"></select></div>
      <div class="practice-wrap">
        <aside class="side-list"><h4>选择课程</h4>${side}</aside>
        <section class="practice-stage" id="stage"></section>
      </div>
    `;
    app.querySelectorAll(".side-item").forEach((el) =>
      el.addEventListener("click", () => {
        pstate.courseId = el.dataset.id; pstate.idx = 0; pstate.mode = "type";
        renderPractice();
      })
    );
    renderStage();
    bindVoiceSelect();
  }
  function renderStage() {
    const course = COURSES.find((c) => c.id === pstate.courseId);
    const isWord = pstate.mode === "word";
    const total = isWord ? (course.words || []).length : course.lessons.length;
    const stage = app.querySelector("#stage");
    stage.innerHTML = `
      <div class="mode-tabs">
        <button class="mode-tab ${pstate.mode === "type" ? "active" : ""}" data-mode="type">⌨️ 看中文敲英文</button>
        <button class="mode-tab ${pstate.mode === "sentence" ? "active" : ""}" data-mode="sentence">🧩 拼句闯关</button>
        <button class="mode-tab ${pstate.mode === "word" ? "active" : ""}" data-mode="word">🔤 单词闯关</button>
      </div>
      <div class="progress-line">${esc(course.title)} · 第 ${pstate.idx + 1} / ${total} ${isWord ? "词" : "句"}</div>
      <div id="qbox"></div>
    `;
    stage.querySelectorAll(".mode-tab").forEach((el) =>
      el.addEventListener("click", () => { pstate.mode = el.dataset.mode; pstate.idx = 0; pstate.answered = false; renderStage(); })
    );
    if (pstate.mode === "type") renderType(stage.querySelector("#qbox"), course);
    else if (pstate.mode === "sentence") renderSentence(stage.querySelector("#qbox"), course);
    else renderWord(stage.querySelector("#qbox"), course);
  }
  function renderType(box, course) {
    const item = course.lessons[pstate.idx];
    box.innerHTML = `
      <div class="sentence-zh">${esc(item.zh)}</div>
      <button class="speak-btn" id="speak" type="button">🔊 听发音</button>
      <div class="sentence-hint">把上面的中文翻译成英文，敲完按回车或点“提交”。</div>
      <input class="typing-input" id="ti" placeholder="Type the English sentence…" autocomplete="off" />
      <div class="feedback" id="fb"></div>
      <div style="margin-top:16px;display:flex;gap:12px;">
        <button class="btn-green" id="submit">提交</button>
        <button class="btn-ghost" id="skip">不会，看答案</button>
      </div>`;
    const input = box.querySelector("#ti");
    setTimeout(() => input.focus(), 50);
    setTimeout(() => speak(item.en), 350);
    const submit = () => {
      if (pstate.answered) return;
      const val = input.value;
      if (!val.trim()) { toast("先写点英文再提交"); return; }
      const correct = normalize(val) === normalize(item.en);
      const fb = box.querySelector("#fb");
      if (correct) {
        pstate.answered = true;
        input.classList.add("ok"); input.setAttribute("readonly", "true");
        fb.className = "feedback ok"; fb.textContent = "✅ 正确！";
        speak("Correct!");
        Store.recordSentence(true); Store.addMinutes(1); Store.logPractice(course.id, "type", true);
        setTimeout(() => nextSentence(course), 1200);
      } else {
        pstate.answered = false;
        input.classList.remove("ok"); input.classList.add("err");
        fb.className = "feedback err"; fb.textContent = "❌ Try again";
        speak("Try again");
        setTimeout(() => { input.value = ""; input.classList.remove("err"); input.focus(); }, 600);
      }
    };
    box.querySelector("#submit").addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    box.querySelector("#speak").addEventListener("click", () => speak(item.en));
    box.querySelector("#skip").addEventListener("click", () => {
      if (pstate.answered) return;
      pstate.answered = true; input.value = item.en; input.classList.add("ok");
      const fb = box.querySelector("#fb"); fb.className = "feedback ok"; fb.textContent = `答案：${item.en}`;
      speak(item.en);
      Store.recordSentence(false); Store.addMinutes(1); Store.logPractice(course.id, "type", false);
      const n = document.createElement("button"); n.className = "btn-green"; n.style.marginTop = "14px";
      n.textContent = "下一句 →"; n.addEventListener("click", () => nextSentence(course)); box.appendChild(n);
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
      <div style="margin-top:8px;display:flex;gap:12px;">
        <button class="btn-green" id="submit">提交</button>
        <button class="btn-ghost" id="clear">清空</button>
      </div>`;
    const slots = box.querySelector("#slots");
    const bank = box.querySelector("#bank");
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
        fb.className = "feedback ok"; fb.textContent = "✅ 拼对啦！";
        speak("Correct!");
        Store.recordSentence(true); Store.recordWord(true); Store.addMinutes(1); Store.logPractice(course.id, "sentence", true);
        setTimeout(() => nextSentence(course), 1200);
      } else {
        pstate.answered = false;
        fb.className = "feedback err"; fb.textContent = "❌ Try again";
        speak("Try again");
        clear();
      }
    });
  }
  function nextSentence(course) {
    pstate.idx += 1; pstate.answered = false;
    if (pstate.idx >= course.lessons.length) {
      pstate.idx = 0;
      toast("🎉 本课程已练完一轮，从头再来！");
    }
    renderStage();
  }
  function renderWord(box, course) {
    const words = course.words || [];
    if (!words.length) { box.innerHTML = `<div class="empty">本课程暂无单词练习，去句子模式练练吧～</div>`; return; }
    const item = words[pstate.idx % words.length];
    box.innerHTML = `
      <div class="sentence-zh">${esc(item.zh)}</div>
      <button class="speak-btn" id="speak" type="button">🔊 听发音</button>
      <div class="sentence-hint">根据中文释义，拼写出对应的英文单词。</div>
      <input class="typing-input" id="ti" placeholder="Type the English word…" autocomplete="off" />
      <div class="feedback" id="fb"></div>
      <div style="margin-top:16px;display:flex;gap:12px;">
        <button class="btn-green" id="submit">提交</button>
        <button class="btn-ghost" id="skip">看答案</button>
      </div>`;
    const input = box.querySelector("#ti");
    setTimeout(() => input.focus(), 50);
    setTimeout(() => speak(item.en), 350);
    const submit = () => {
      if (pstate.answered) return;
      const val = input.value;
      if (!val.trim()) { toast("先写点英文再提交"); return; }
      const correct = normalize(val) === normalize(item.en);
      const fb = box.querySelector("#fb");
      if (correct) {
        pstate.answered = true;
        input.classList.add("ok"); input.setAttribute("readonly", "true");
        fb.className = "feedback ok"; fb.textContent = "✅ 正确！";
        speak("Correct!");
        Store.recordWord(true); Store.addMinutes(1); Store.logPractice(course.id, "word", true);
        setTimeout(() => nextWord(course), 1200);
      } else {
        pstate.answered = false;
        input.classList.remove("ok"); input.classList.add("err");
        fb.className = "feedback err"; fb.textContent = "❌ Try again";
        speak("Try again");
        setTimeout(() => { input.value = ""; input.classList.remove("err"); input.focus(); }, 600);
      }
    };
    box.querySelector("#submit").addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    box.querySelector("#speak").addEventListener("click", () => speak(item.en));
    box.querySelector("#skip").addEventListener("click", () => {
      if (pstate.answered) return;
      pstate.answered = true; input.value = item.en; input.classList.add("ok");
      const fb = box.querySelector("#fb"); fb.className = "feedback ok"; fb.textContent = `答案：${item.en}`;
      speak(item.en);
      Store.recordWord(false); Store.addMinutes(1); Store.logPractice(course.id, "word", false);
      const n = document.createElement("button"); n.className = "btn-green"; n.style.marginTop = "14px";
      n.textContent = "下一个 →"; n.addEventListener("click", () => nextWord(course)); box.appendChild(n);
    });
  }
  function nextWord(course) {
    pstate.idx += 1; pstate.answered = false;
    if (pstate.idx >= (course.words || []).length) {
      pstate.idx = 0; toast("🎉 单词练完一轮，再来一遍！");
    }
    renderStage();
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
  // contact = 付款后加此客服领取兑换码；qr = 收款码图片(放本目录，命名为 pay-qr.png)
  // codes = 可用兑换码池（手动维护，每个码建议只发给一人，避免被复用）
  const PAY = window.PAY = {
    contact: "vip20213456",
    qr: "pay-qr.png",
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
            <img class="pay-qr" src="${esc(PAY.qr)}" alt="收款码"
                 onerror="this.style.display='none';document.getElementById('qrTip').style.display='block'" />
            <div id="qrTip" class="qr-tip" style="display:none">请将收款码图片命名为 <code>pay-qr.png</code> 放到本站目录下</div>
          </div>
          <div class="redeem-box">
            <div class="rb-h">已付款？输入兑换码立即激活</div>
            <div class="rb-row">
              <input id="codeInput" class="code-input" placeholder="例如 HY2026-1001" autocomplete="off" />
              <button class="btn-green" id="redeemBtn">激活</button>
            </div>
            <div id="redeemMsg" class="redeem-msg"></div>
          </div>
          <div style="text-align:right;margin-top:16px"><button class="btn-ghost" id="cardClose">关闭</button></div>
        </div>`;
      document.body.appendChild(mask);
      mask.addEventListener("click", (e) => { if (e.target === mask) mask.classList.remove("show"); });
      mask.querySelector("#cardClose").addEventListener("click", () => mask.classList.remove("show"));
      mask.querySelector("#redeemBtn").addEventListener("click", () => {
        const v = mask.querySelector("#codeInput").value;
        const r = Store.redeemCode(v);
        const msg = mask.querySelector("#redeemMsg");
        if (r.ok) {
          msg.className = "redeem-msg ok"; msg.textContent = r.msg;
          toast(r.msg); refreshVipUI();
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
