// a year and more of records, as the user's might be: every kind, at times of day of their own
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
function make(until = "2026-11-10", from = "2025-09-01") {
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const D = { todos: [], journal: [], meals: [], workouts: [], weights: [], expenses: [], study: [], routines: [], routineDays: [], goals: [], subjects: [], settings: [] };
  D.subjects.push({ id: "sb1", name: "英語", color: "blue", createdAt: 1 });
  D.routines.push({ id: "rt1", name: "ストレッチ", createdAt: T(from) }, { id: "rt2", name: "水を飲む", createdAt: T(from) });
  let bench = 30, km = 2, i = 0;
  for (let d = from; d <= until; d = addDays(d, 1), i++) {
    const wd = new Date(d + "T12:00:00Z").getUTCDay();
    if (rnd() < 0.7) D.journal.push({ id: d, date: d, text: `${d} の日記。きょうもがんばった`, createdAt: T(d, 22, 10) });
    if (rnd() < 0.8) D.meals.push({ id: "m" + i + "a", date: d, slot: "朝食", text: "トーストとコーヒー", kcal: 350, createdAt: T(d, 7, 30) });
    if (rnd() < 0.8) D.meals.push({ id: "m" + i + "b", date: d, slot: "夕食", text: "カレー", kcal: 750, createdAt: T(d, 19, 15) });
    if (rnd() < 0.5) D.todos.push({ id: "t" + i, text: `レポート ${i}`, done: true, doneAt: T(d, 16, 5), createdAt: T(d, 8) });
    if (rnd() < 0.6) D.study.push({ id: "s" + i, date: d, minutes: 30 + Math.round(rnd() * 90), subjectId: "sb1", createdAt: T(d, 21, 0) });
    if (wd === 1 || wd === 4) { if (i % 14 === 1) bench += 2.5; D.workouts.push({ id: "w" + i, date: d, type: "筋トレ", exercise: "ベンチプレス", sets: 3, kg: bench, reps: 8, createdAt: T(d, 18, 30) }); }
    if (wd === 6) { km = Math.min(12, km + (rnd() < 0.3 ? 1 : 0)); D.workouts.push({ id: "r" + i, date: d, type: "ランニング", km, minutes: km * 6.5, createdAt: T(d, 6, 40) }); }
    if (rnd() < 0.5) D.weights.push({ id: d, date: d, kg: 66 - i * 0.01, createdAt: T(d, 6, 50) });
    if (rnd() < 0.3) D.expenses.push({ id: "e" + i, date: d, kind: "out", amount: 500 + Math.round(rnd() * 2000), cat: "食費", createdAt: T(d, 12, 20) });
    if (rnd() < 0.4) D.routineDays.push({ id: "rd" + i, date: d, done: ["rt1", "rt2"], first: T(d, 23, 30) });
  }
  D.goals.push({ id: "g1", title: "TOEIC 800点", criterion: "800点", deadline: "2026-12-31", depth: 1, done: true, doneAt: T("2026-08-20", 15), createdAt: T("2026-01-10"),
    mandala: [{ t: "単語", d: true, at: T("2026-02-01", 20) }, { t: "文法", d: true, at: T("2026-03-15", 20) }, null, null, null, null, null, null] });
  return D;
}
module.exports = { make, addDays, T };
