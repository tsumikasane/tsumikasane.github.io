// ダイエット その7's example: Saturday 2026-11-14. 100 days of weights going down 0.05 kg a day, 体脂肪率 26 → 23%; ラーメン
// every 7th day (the next morning +0.6 kg), サラダ the day after it (that morning back down), ケーキ every 5th day; today's
// 運動 a ベンチプレス and a run; a 目安 of 2,000 kcal
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-14";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
const ramen = (i) => i % 7 === 0, salad = (i) => i % 7 === 6, cake = (i) => i % 5 === 0; // (i: days before DAY)
function weights() {
  const out = [];
  for (let i = 99; i >= 0; i--) {
    const d = addDays(DAY, -i), idx = 99 - i, kg = 72 - 0.05 * idx + (i + 1 <= 99 && ramen(i + 1) ? 0.6 : 0);
    out.push({ id: d, date: d, kg: Math.round(kg * 100) / 100, fat: Math.round((26 - 0.03 * idx) * 10) / 10, createdAt: T(d, 7) });
  }
  return out;
}
let n = 0;
const M = (date, slot, text, kcal) => ({ id: "m" + ++n, date, slot, text, kcal, createdAt: T(date, 12) + n });
function meals() {
  const out = [];
  for (let i = 0; i < 95; i++) {
    const d = addDays(DAY, -i);
    out.push(M(d, "朝食", "トースト", 300), M(d, "昼食", "定食", 700), ramen(i) ? M(d, "夕食", "ラーメン", 800) : M(d, "夕食", "ごはん", 600));
    if (salad(i)) out.push(M(d, "間食", "サラダ", 100));
    if (cake(i)) out.push(M(d, "間食", "ケーキ", 500));
  }
  return out;
}
const workouts = () => [
  { id: "w1", date: DAY, type: "筋トレ", exercise: "ベンチプレス", kg: 60, reps: 5, sets: 3, createdAt: T(DAY, 8) },
  { id: "w2", date: DAY, type: "ランニング", km: 5, minutes: 30, createdAt: T(DAY, 7) },
  { id: "w3", date: "2026-11-10", type: "筋トレ", exercise: "レッグプレス", kg: 100, reps: 10, sets: 3, createdAt: T("2026-11-10", 8) },
];
const settings = () => [
  { id: "body", height: 170, age: 21, sex: "m", updatedAt: T("2026-09-20") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-09-20") },
];
module.exports = { T, DAY, addDays, weights, meals, workouts, settings };
