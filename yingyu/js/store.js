/* ===== 硬核英语社 · 数据层（localStorage） ===== */
const Store = (() => {
  const KEY = "waxueshe_demo_state_v1";

  const defaultState = () => ({
    stats: {
      sentencesDone: 0,
      wordsDone: 0,
      sentenceWrong: { unfamilar: 0, mastered: 0 },
      wordWrong: { unfamilar: 0, mastered: 0 },
      studyMinutes: 0,
      todayMinutes: 0,
      monthMinutes: 0,
    },
    checkin: {
      current: 0,
      max: 0,
      total: 0,
      lastDate: null,
      calendar: Array(28).fill(false), // 近28天打卡标记
    },
    journal: [],
    practiceLog: [],
    vip: false,
    redeemedCodes: [],
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // 合并默认，防止缺字段
      return Object.assign(defaultState(), parsed, {
        stats: Object.assign(defaultState().stats, parsed.stats || {}),
        checkin: Object.assign(defaultState().checkin, parsed.checkin || {}),
      });
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return {
    get: () => state,
    getStats: () => state.stats,
    getCheckin: () => state.checkin,
    getJournal: () => state.journal,

    // 练习结果：recordSentence(correct), recordWord(correct)
    recordSentence(correct) {
      state.stats.sentencesDone += 1;
      if (!correct) state.stats.sentenceWrong.unfamilar += 1;
      save();
    },
    recordWord(correct) {
      state.stats.wordsDone += 1;
      if (!correct) state.stats.wordWrong.unfamilar += 1;
      save();
    },
    addMinutes(n) {
      state.stats.studyMinutes += n;
      state.stats.todayMinutes += n;
      state.stats.monthMinutes += n;
      save();
    },
    logPractice(course, mode, correct) {
      state.practiceLog.push({ date: todayStr(), course, mode, correct });
      if (state.practiceLog.length > 200) state.practiceLog.shift();
      save();
    },

    // 打卡：返回 {ok, current, max, total, already}
    checkinToday() {
      const t = todayStr();
      const c = state.checkin;
      if (c.lastDate === t) return { ok: false, already: true, current: c.current, max: c.max, total: c.total };
      // 移位：新的一天，calendar 左移一位，末尾置 true
      c.calendar.shift();
      c.calendar.push(true);
      c.total += 1;
      // 连续天数：若昨天打过卡则 +1，否则重置为 1
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      c.current = (c.lastDate === yStr) ? c.current + 1 : 1;
      if (c.current > c.max) c.max = c.current;
      c.lastDate = t;
      save();
      return { ok: true, already: false, current: c.current, max: c.max, total: c.total };
    },

    addJournal(entry) {
      state.journal.unshift(Object.assign({ date: todayStr() }, entry));
      save();
    },

    // 排行榜：合并本人成绩
    getLeaderboard() {
      const s = state.stats;
      const me = {
        name: "我（你）", done: s.sentencesDone, minutes: s.studyMinutes, me: true,
      };
      const list = LEADERBOARD.map((x) => ({ ...x }));
      list.push(me);
      list.sort((a, b) => b.done - a.done);
      return list;
    },

    // 按时间范围聚合统计：range = total|today|week|month
    getStatsByRange(range) {
      const s = state.stats;
      if (range === "total") return { sentences: s.sentencesDone, words: s.wordsDone, minutes: s.studyMinutes };
      const now = new Date();
      const today = todayStr();
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 6);
      const y = now.getFullYear(), m = now.getMonth();
      const inRange = state.practiceLog.filter((l) => {
        if (range === "today") return l.date === today;
        const d = new Date(l.date);
        if (range === "week") return d >= weekAgo;
        if (range === "month") return d.getFullYear() === y && d.getMonth() === m;
        return false;
      });
      const sentences = inRange.filter((l) => l.mode !== "word").length;
      const words = inRange.filter((l) => l.mode === "word").length;
      return { sentences, words, minutes: inRange.length };
    },

    // 等级：基于累计句子 + 单词
    getLevel() {
      const total = state.stats.sentencesDone + state.stats.wordsDone;
      const tiers = [
        { min: 0, name: "新兵", icon: "🥉" },
        { min: 50, name: "铜牌学员", icon: "🥉" },
        { min: 200, name: "银牌学员", icon: "🥈" },
        { min: 500, name: "金牌学员", icon: "🥇" },
        { min: 1200, name: "钻石学霸", icon: "💎" },
        { min: 3000, name: "王者学神", icon: "👑" },
      ];
      let cur = tiers[0];
      for (const t of tiers) if (total >= t.min) cur = t;
      const next = tiers.find((t) => t.min > total) || null;
      return { name: cur.name, icon: cur.icon, total, next };
    },

    // 连续打卡勋章
    getBadges() {
      const max = state.checkin.max;
      const defs = [
        { d: 3, icon: "🔥", name: "三天打鱼" },
        { d: 7, icon: "⚡", name: "一周勇士" },
        { d: 30, icon: "🌟", name: "月卡达人" },
        { d: 100, icon: "💯", name: "百日坚持" },
      ];
      return defs.map((b) => ({ ...b, got: max >= b.d }));
    },

    // 今日目标（默认 20 句）
    getTodayGoal() {
      const goal = 20;
      const today = todayStr();
      const done = state.practiceLog.filter((l) => l.date === today && l.mode !== "word").length;
      return { goal, done: Math.min(done, goal), percent: Math.min(100, Math.round((done / goal) * 100)) };
    },

    // 某课程已练句数
    getCourseCount(id) {
      return state.practiceLog.filter((l) => l.course === id).length;
    },

    // 会员态：是否开通学习卡
    isVip() { return !!state.vip; },

    // 兑换码激活：校验码池 + 防复用，成功后置 vip
    redeemCode(raw) {
      const code = (raw || "").trim().toUpperCase();
      if (!code) return { ok: false, msg: "请输入兑换码" };
      const codes = (window.PAY && Array.isArray(window.PAY.codes)) ? window.PAY.codes : [];
      if (!codes.includes(code)) return { ok: false, msg: "兑换码无效，请核对后重试" };
      if (state.redeemedCodes.includes(code)) return { ok: false, msg: "该兑换码已被使用" };
      state.redeemedCodes.push(code);
      state.vip = true;
      save();
      return { ok: true, msg: "🎉 学习卡激活成功，会员权益已开通！" };
    },

    reset() { state = defaultState(); save(); },
  };
})();
