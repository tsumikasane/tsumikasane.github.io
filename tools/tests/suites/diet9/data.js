// ダイエット その9's example: Saturday 2026-11-14. 120 days of weights going down 0.04 kg a day (lost about 4.8); 食事 every
// day from 10/1 with 間食 eaten out of ストレス and なんとなく, and late in October; ベンチプレス・スクワット・デッドリフト; runs
// of 3, 5 and 10 km, a long one of 170 km (for the trip) and one today; 血圧 on 10 days; a goal of 60 kg
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-14";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
function weights() {
  const out = [];
  for (let i = 119; i >= 0; i--) { const d = addDays(DAY, -i), idx = 119 - i; out.push({ id: d, date: d, kg: Math.round((72 - 0.04 * idx) * 10) / 10, createdAt: T(d, 7) }); }
  return out;
}
let n = 0;
const M = (date, slot, text, kcal, x = {}) => ({ id: "m" + ++n, date, slot, text, kcal, createdAt: T(date, 12) + n, ...x });
function meals() {
  const out = [];
  for (let d = "2026-10-01"; d <= DAY; d = addDays(d, 1)) {
    const day = Number(d.slice(8)), oct = d < "2026-11-01";
    out.push(M(d, "朝食", "トースト", 300, { at: "07:30" }), M(d, "昼食", "定食", 700, { at: "12:30" }), M(d, "夕食", "ごはん", 600, { at: oct && day % 2 ? "22:00" : "19:00" }));
    if (!oct && day % 3 === 0) out.push(M(d, "間食", "ケーキ", 400, { why: day % 2 ? "stress" : "idle" }));
    if (!oct && day === 2) out.push(M(d, "間食", "バナナ", 90, { why: "hungry" }));
  }
  return out;
}
let w = 0;
const RUN = (date, km, minutes, type = "ランニング") => ({ id: "w" + ++w, date, type, km, minutes, createdAt: T(date, 7) });
const ST = (date, exercise, kg, reps, sets) => ({ id: "w" + ++w, date, type: "筋トレ", exercise, kg, reps, sets, createdAt: T(date, 8) + w });
const workouts = () => [
  ST("2026-11-11", "ベンチプレス", 60, 5, 3), ST("2026-11-09", "スクワット", 80, 5, 3), ST("2026-11-13", "デッドリフト", 100, 5, 3),
  RUN("2026-10-02", 170, 1200), RUN("2026-11-01", 3, 15), RUN("2026-11-05", 10, 60), RUN("2026-11-12", 5, 27), RUN(DAY, 3, 20),
];
function bodyDays() {
  const out = [];
  for (let i = 0; i < 10; i++) { const d = addDays(DAY, -i - 1); out.push({ id: d, date: d, sys: 128 + i, dia: 80 + (i % 6), pulse: 62 + (i % 4), steps: 8000, veg: i < 7 ? 5 : 3, createdAt: T(d), updatedAt: T(d) }); }
  return out;
}
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-09-20") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-09-20") },
  { id: "weight", target: 60, updatedAt: T("2026-09-20") },
];
module.exports = { T, DAY, addDays, weights, meals, workouts, bodyDays, settings };
