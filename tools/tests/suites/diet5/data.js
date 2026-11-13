// ダイエット その5's example: Saturday 2026-11-14. Ten weeks of weights (Mondays heavier), 30 days of 食事, runs and 筋トレ
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-14";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
const wd = (d) => new Date(d + "T12:00:00+09:00").getDay();
function weights() {
  const out = [];
  for (let i = 0; i <= 400; i++) {
    const d = addDays("2025-10-10", i);
    if (d > "2026-11-14") break;
    if (d < "2026-08-01" && i % 7) continue; // (before August, once a week)
    const kg = Math.round((72 - i * 0.01 + (wd(d) === 1 ? 0.6 : 0)) * 10) / 10;
    out.push({ id: d, date: d, kg, ...(i % 2 ? {} : { fat: Math.round((25 - i * 0.005) * 10) / 10 }), createdAt: T(d, 7), updatedAt: T(d, 7) });
  }
  return out;
}
let n = 0;
const M = (date, slot, text, kcal, extra = {}) => ({ id: "m" + ++n, date, slot, text, kcal, createdAt: T(date, 12) + n, ...extra });
function meals() {
  const out = [];
  for (let i = 0; i < 30; i++) {
    const d = addDays(DAY, -i);
    out.push(M(d, "朝食", "トースト", 200, { at: "07:30", p: 6, f: 3, c: 36 }), M(d, "昼食", i % 2 ? "牛丼（並）" : "定食", i % 2 ? 650 : 800, { at: "12:30" }), M(d, "夕食", "ごはん", 250, { at: "19:00" }));
    if (i % 3 === 0) out.push(M(d, "間食", "ケーキ", 400));
  }
  return out;
}
let w = 0;
const RUN = (date, km, minutes) => ({ id: "w" + ++w, date, type: "ランニング", km, minutes, createdAt: T(date, 7) });
const ST = (date, exercise, kg, reps, sets) => ({ id: "w" + ++w, date, type: "筋トレ", exercise, kg, reps, sets, createdAt: T(date, 8) + w });
const workouts = () => [
  RUN("2026-11-10", 5, 30), RUN("2026-11-12", 10, 65), RUN("2026-08-01", 5, 20),
  ST("2026-10-01", "ベンチプレス", 50, 10, 3), ST("2026-11-11", "ベンチプレス", 60, 5, 3), ST("2026-11-11", "プランク", 0, 60, 3),
  // the week before (11/2〜11/8): 3 days; the one before that (10/26〜11/1): 3 days
  RUN("2026-11-03", 3, 20), RUN("2026-11-05", 3, 20), RUN("2026-11-07", 3, 20), RUN("2026-10-27", 3, 20), RUN("2026-10-29", 3, 20), RUN("2026-10-31", 3, 20),
];
const bodyDays = () => [{ id: "2026-11-13", date: "2026-11-13", sys: 128, dia: 82, pulse: 64, createdAt: T("2026-11-13"), updatedAt: T("2026-11-13") }];
const settings = () => [{ id: "body", height: 170, age: 21, sex: "m", updatedAt: T("2026-09-20") }];
module.exports = { T, DAY, addDays, weights, meals, workouts, bodyDays, settings };
