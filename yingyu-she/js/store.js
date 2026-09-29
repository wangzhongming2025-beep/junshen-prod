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
      xp: 0,
      bestCombo: 0,
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
    weakBook: {}, // 易错本：key -> {key,courseId,courseTitle,type,zh,en,wrong,right,lastWrong,lastRight,mastered,createdAt}
    vip: false,
    vipUntil: null, // 月/季/年卡到期时间 ISO 字符串；null 表示永久/未开通
    redeemedCodes: [],
  });

  // 变更监听：用于登录后的云同步
  const listeners = [];

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
    listeners.forEach((f) => { try { f(); } catch (e) {} });
  }

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // 规范化英文文本，用于生成稳定 key（去标点、转小写、压空格）
  const normalizeGlobal = (s) =>
    String(s || "").trim().toLowerCase().replace(/[.,!?;:'"()]/g, "").replace(/\s+/g, " ");

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

    // ---------- 经验与连击（奖励系统）----------
    addXp(n) {
      const v = Math.round(Number(n) || 0);
      if (v <= 0) return state.stats.xp || 0;
      state.stats.xp = (state.stats.xp || 0) + v;
      save();
      return state.stats.xp;
    },
    getXp() { return state.stats.xp || 0; },
    // 记录历史最高连击（只在破纪录时写盘）
    bumpCombo(n) {
      const v = Math.round(Number(n) || 0);
      if (v > (state.stats.bestCombo || 0)) { state.stats.bestCombo = v; save(); }
      return state.stats.bestCombo || 0;
    },
    getBestCombo() { return state.stats.bestCombo || 0; },
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

    // 会员态：是否开通学习卡（支持月/季/年卡到期自动失效）
    isVip() {
      if (!state.vip) return false;
      if (state.vipUntil) {
        const t = new Date(state.vipUntil).getTime();
        if (!isNaN(t) && t <= Date.now()) return false;
      }
      return true;
    },

    // 兑换码激活：校验码池 + 防复用，成功后置 vip
    redeemCode(raw) {
      const code = (raw || "").trim().toUpperCase();
      if (!code) return { ok: false, msg: "请输入兑换码" };
      const codes = (window.PAY && Array.isArray(window.PAY.codes)) ? window.PAY.codes : [];
      if (!codes.includes(code)) return { ok: false, msg: "兑换码无效，请核对后重试" };
      if (state.redeemedCodes.includes(code)) return { ok: false, msg: "该兑换码已被使用" };
      state.redeemedCodes.push(code);
      state.vip = true;
      // 前端默认码池当前统一视为月卡（30天）；永久卡需登录后由服务端 redeem 返回 vipUntil=null
      state.vipUntil = new Date(Date.now() + 30 * 86400000).toISOString();
      save();
      return { ok: true, msg: "🎉 月卡激活成功，有效期 30 天" };
    },

    // ---------- 易错本（自动记录记得好/记不好）----------
    // key 由 课程 + 模式 + 英文 唯一确定；模式：type=看中文敲英文, sentence=拼句, word=单词闯关
    _weakKey(courseId, type, en) {
      return `${courseId}::${type}::${normalizeGlobal(en)}`;
    },
    // 每次作答后调用：correct=true 记对、false 记错
    recordWeak(courseId, courseTitle, type, zh, en, correct) {
      const key = this._weakKey(courseId, type, en);
      const b = state.weakBook;
      if (!b[key]) {
        b[key] = {
          key, courseId, courseTitle, type, zh, en,
          wrong: 0, right: 0, lastWrong: null, lastRight: null,
          mastered: false, createdAt: todayStr(),
        };
      }
      const e = b[key];
      if (e.courseTitle !== courseTitle) e.courseTitle = courseTitle; // 标题更新兜底
      if (correct) { e.right += 1; e.lastRight = todayStr(); }
      else {
        e.wrong += 1; e.lastWrong = todayStr();
        if (e.mastered) e.mastered = false; // 已掌握后再次出错 → 重新回到待巩固
      }
      save();
      return e;
    },
    // 待巩固列表（未掌握），按错得最多、最近错、对得最少排序
    getWeakBook() {
      return Object.values(state.weakBook)
        .filter((e) => !e.mastered)
        .sort((a, b) => b.wrong - a.wrong
          || (b.lastWrong || "").localeCompare(a.lastWrong || "")
          || a.right - b.right);
    },
    // 全部条目（含已掌握），用于「记得好」视图
    getWeakAll() {
      return Object.values(state.weakBook).map((e) => ({ ...e }));
    },
    getWeakStats() {
      const all = Object.values(state.weakBook);
      return {
        weak: all.filter((e) => !e.mastered).length,
        mastered: all.filter((e) => e.mastered).length,
        total: all.length,
      };
    },
    // 复习用：待巩固条目（不含已掌握），映射为题目
    getWeakReviewItems() {
      return this.getWeakBook().map((e) => ({
        key: e.key, courseId: e.courseId, courseTitle: e.courseTitle,
        type: e.type, zh: e.zh, en: e.en,
      }));
    },
    markMastered(key) { if (state.weakBook[key]) { state.weakBook[key].mastered = true; save(); } },
    unmarkMastered(key) { if (state.weakBook[key]) { state.weakBook[key].mastered = false; save(); } },
    removeWeak(key) { delete state.weakBook[key]; save(); },
    clearWeak() { state.weakBook = {}; save(); },

    // ---------- 云同步支撑 ----------
    // 注册变更监听（member.js 用它触发防抖上传）
    onChange(fn) { if (typeof fn === "function") listeners.push(fn); },
    // 用云端数据整体替换本地（补齐缺省字段，防止结构缺失）
    replaceAll(data) {
      if (!data || typeof data !== "object") return;
      const d = defaultState();
      state = Object.assign(d, data, {
        stats: Object.assign(d.stats, data.stats || {}),
        checkin: Object.assign(d.checkin, data.checkin || {}),
        weakBook: data.weakBook && typeof data.weakBook === "object" ? data.weakBook : {},
        journal: Array.isArray(data.journal) ? data.journal : [],
        practiceLog: Array.isArray(data.practiceLog) ? data.practiceLog : [],
        redeemedCodes: Array.isArray(data.redeemedCodes) ? data.redeemedCodes : [],
      });
      save();
    },
    // 会员态由云端/兑换结果驱动
    setVip(v, until) {
      state.vip = !!v;
      if (until === undefined) {
        // 不传则保留原值（永久卡）
      } else if (until === null || until === false) {
        state.vipUntil = null;
      } else {
        state.vipUntil = until;
      }
      save();
    },

    reset() { state = defaultState(); save(); },
  };
})();
