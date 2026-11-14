// ダイエット その10's example: Saturday 2026-11-14. 90 days: a run every 3rd day (that day 10,000 歩, the next morning 0.2 kg
// lighter), else 5,000 歩; 体脂肪率 down 0.05 a day (goal 20%); ベンチプレス once a week, 2.5 kg heavier each week; 食事 every
// day, weekends with a ケーキ and a late 夕食
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-14";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
const wd = (d) => new Date(d + "T12:00:00+09:00").getDay();
const ran = (i) => i % 3 === 0; // (i: days before DAY)
function weights() {
  const out = [];
  for (let i = 89; i >= 0; i--) { const d = addDays(DAY, -i), idx = 89 - i, kg = 70 - 0.03 * idx - (ran(i + 1) ? 0.2 : 0); out.push({ id: d, date: d, kg: Math.round(kg * 100) / 100, fat: Math.round((26 - 0.05 * idx) * 100) / 100, createdAt: T(d, 7) }); }
  return out;
}
let n = 0;
const M = (date, slot, text, kcal, at) => ({ id: "m" + ++n, date, slot, text, kcal, at, createdAt: T(date, 12) + n });
function meals() {
  const out = [];
  for (let i = 0; i < 35; i++) {
    const d = addDays(DAY, -i), we = [0, 6].includes(wd(d));
    out.push(M(d, "朝食", "トースト", 300, "07:30"), M(d, "昼食", "定食", 700, "12:30"), M(d, "夕食", "ごはん", 600, we ? "21:30" : "19:00"));
    if (we) out.push(M(d, "間食", "ケーキ", 500, "15:00"));
  }
  return out;
}
let w = 0;
function workouts() {
  const out = [];
  for (let i = 0; i < 90; i++) if (ran(i)) { const d = addDays(DAY, -i); out.push({ id: "w" + ++w, date: d, type: "ランニング", km: 5, minutes: 30, createdAt: T(d, 18) }); }
  for (let k = 0; k < 8; k++) { const d = addDays(DAY, -7 * (7 - k)); out.push({ id: "w" + ++w, date: d, type: "筋トレ", exercise: "ベンチプレス", kg: 50 + 2.5 * k, reps: 5, sets: 3, createdAt: T(d, 19) + k }); }
  return out;
}
function bodyDays() {
  const out = [];
  for (let i = 0; i < 40; i++) { const d = addDays(DAY, -i); out.push({ id: d, date: d, steps: ran(i) ? 10000 : 5000, wake: "06:30", bed: "23:30", createdAt: T(d), updatedAt: T(d) }); }
  return out;
}
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-09-20") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-09-20") },
  { id: "fat", target: 20, updatedAt: T("2026-09-20") },
];
module.exports = { T, DAY, addDays, ran, weights, meals, workouts, bodyDays, settings };
