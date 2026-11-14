// ダイエット その8's example: Saturday 2026-11-14. Weights for 120 days; 食事 every day from 10/20 to 11/6, none on 11/7,
// then every day to today (7 on end, 18 the longest), no 朝食 on 11/10 and 11/12; today's 朝食 with its PFC; ベンチプレス
// beaten three times and the runs twice; スクワット on 4 days; a 目安 of 2,000 kcal and a goal of 65 kg
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-14";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
function weights() {
  const out = [];
  for (let i = 119; i >= 0; i--) {
    const d = addDays(DAY, -i), idx = 119 - i, kg = 72 - 0.03 * idx + [0, 0.2, -0.1, 0.1, -0.2, 0.15, -0.05][idx % 7];
    out.push({ id: d, date: d, kg: Math.round(kg * 10) / 10, fat: Math.round((25 - 0.02 * idx) * 10) / 10, createdAt: T(d, 7) });
  }
  return out;
}
let n = 0;
const M = (date, slot, text, kcal, x = {}) => ({ id: "m" + ++n, date, slot, text, kcal, createdAt: T(date, 12) + n, ...x });
function meals() {
  const out = [];
  for (let d = "2026-10-20"; d <= DAY; d = addDays(d, 1)) {
    if (d === "2026-11-07") continue;
    if (d === DAY) { out.push(M(d, "朝食", "トースト", 300, { p: 10, f: 5, c: 50 }), M(d, "昼食", "定食", 700)); continue; }
    if (d !== "2026-11-10" && d !== "2026-11-12") out.push(M(d, "朝食", "トースト", 300));
    out.push(M(d, "昼食", "定食", 700), M(d, "夕食", d === "2026-11-01" ? "カレー" : "ごはん", d === "2026-11-01" ? 750 : 600));
  }
  return out;
}
let w = 0;
const RUN = (date, km, minutes) => ({ id: "w" + ++w, date, type: "ランニング", km, minutes, createdAt: T(date, 7) });
const ST = (date, exercise, kg, reps, sets) => ({ id: "w" + ++w, date, type: "筋トレ", exercise, kg, reps, sets, createdAt: T(date, 8) + w });
const workouts = () => [
  ST("2026-10-01", "ベンチプレス", 50, 5, 3), ST("2026-10-20", "ベンチプレス", 55, 5, 3), ST("2026-11-01", "ベンチプレス", 55, 6, 3), ST("2026-11-11", "ベンチプレス", 60, 5, 3),
  RUN("2026-10-05", 5, 30), RUN("2026-10-25", 8, 50), RUN("2026-11-12", 5, 27),
  ST("2026-11-02", "スクワット", 40, 10, 3), ST("2026-11-05", "スクワット", 40, 10, 3), ST("2026-11-09", "スクワット", 40, 10, 3), ST("2026-11-13", "スクワット", 40, 10, 3),
];
const bodyDays = () => ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"].map((d) => ({ id: d, date: d, steps: 8000, bed: "23:30", wake: "06:30", createdAt: T(d), updatedAt: T(d) }));
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-09-20") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-09-20") },
  { id: "weight", target: 65, updatedAt: T("2026-09-20") },
];
module.exports = { T, DAY, addDays, weights, meals, workouts, bodyDays, settings };
