/* ===== 硬核英语社 · 奖励反馈特效（音效 / 粒子 / 飘分 / 彩带） =====
   全部零依赖：音效用 Web Audio 实时合成，粒子用 DOM + CSS 动画，不加载任何素材。 */
(function () {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem("hy_sound") === "off"; } catch (e) {}

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  // 单个音符：freq 频率、start 延迟秒、dur 时长、type 波形、gain 音量
  function tone(freq, start, dur, type, gain) {
    const c = ac();
    if (!c) return;
    try {
      const t0 = c.currentTime + (start || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain == null ? 0.16 : gain, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    } catch (e) {}
  }

  const Sound = {
    isMuted() { return muted; },
    setMuted(v) { muted = !!v; try { localStorage.setItem("hy_sound", muted ? "off" : "on"); } catch (e) {} },
    toggle() { this.setMuted(!muted); return muted; },
    // 答对：连击越高，音越高、越亮（12 平均律两度递进）
    correct(combo) {
      if (muted) return;
      const step = Math.min(Math.max((combo || 1) - 1, 0), 7);
      const base = 620 * Math.pow(1.0595, step * 2);
      tone(base, 0, 0.13, "sine", 0.17);
      tone(base * 1.5, 0.07, 0.16, "sine", 0.12);
    },
    wrong() {
      if (muted) return;
      tone(215, 0, 0.15, "triangle", 0.12);
      tone(158, 0.07, 0.2, "triangle", 0.1);
    },
    tick() { if (muted) return; tone(1250, 0, 0.06, "sine", 0.06); },
    milestone() {
      if (muted) return;
      [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.24, "sine", 0.15));
    },
    finish() {
      if (muted) return;
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.1, 0.36, "sine", 0.15));
      tone(1568, 0.5, 0.5, "sine", 0.1);
    },
  };

  const COLORS = ["#18b46b", "#6ee7a8", "#ffd166", "#ff8a3d", "#7cd4fd", "#a78bfa"];

  // 粒子迸发（连击越高越多）
  function burst(x, y, opts) {
    opts = opts || {};
    const n = opts.count || 14;
    const colors = opts.colors || COLORS;
    const wrap = document.createElement("div");
    wrap.className = "fx-burst";
    wrap.style.left = x + "px";
    wrap.style.top = y + "px";
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const dist = 42 + Math.random() * 78;
      const sz = 5 + Math.random() * 7;
      p.style.setProperty("--dx", Math.round(Math.cos(ang) * dist) + "px");
      p.style.setProperty("--dy", Math.round(Math.sin(ang) * dist) + "px");
      p.style.width = sz + "px";
      p.style.height = sz + "px";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.07).toFixed(3) + "s";
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 1100);
  }

  function burstAt(el, opts) {
    if (!el || !el.getBoundingClientRect) return burst(window.innerWidth / 2, window.innerHeight * 0.4, opts);
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, opts);
  }

  // 全屏彩带（连击里程碑 / 结算）
  function confetti(count) {
    count = count || 90;
    const wrap = document.createElement("div");
    wrap.className = "fx-confetti";
    for (let i = 0; i < count; i++) {
      const p = document.createElement("i");
      const w = 6 + Math.random() * 6;
      p.style.left = (Math.random() * 100).toFixed(2) + "%";
      p.style.width = w + "px";
      p.style.height = (w * 0.62).toFixed(1) + "px";
      p.style.background = COLORS[i % COLORS.length];
      p.style.animationDelay = (Math.random() * 0.55).toFixed(3) + "s";
      p.style.animationDuration = (1.7 + Math.random() * 1.5).toFixed(2) + "s";
      p.style.setProperty("--rot", Math.round(Math.random() * 780 - 390) + "deg");
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 3800);
  }

  // 飘分 / 飘字
  function floatText(el, text, cls) {
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement("div");
    d.className = "fx-float " + (cls || "");
    d.textContent = text;
    d.style.left = r.left + r.width / 2 + "px";
    d.style.top = Math.max(24, r.top) + "px";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1150);
  }

  // 元素脉冲（重放动画）
  function pulse(el, cls, ms) {
    if (!el || !el.classList) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms || 780);
  }

  window.FX = { Sound, burst, burstAt, confetti, floatText, pulse, COLORS };
})();
