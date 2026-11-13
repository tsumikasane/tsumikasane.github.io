// ダイエット その6's example: Saturday 2026-11-14. 60 days of weights with sleep (short nights: up the next morning), meals
// today, runs over two pairs of shoes, 筋トレ, age 21 and 身長 170
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-14";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
// every 3rd night short (5 h) and its morning +0.4; the others 7.5 h and −0.2
function weights() {
  const out = []; let kg = 70;
  for (let i = 60; i >= 0; i--) { const d = addDays(DAY, -i); kg += i % 3 === 0 ? 0.4 : -0.2; out.push({ id: d, date: d, kg: Math.round(kg * 10) / 10, createdAt: T(d, 7) }); }
  return out;
}
function bodyDays() {
  const out = [];
  for (let i = 60; i >= 1; i--) { const d = addDays(DAY, -i); out.push({ id: d, date: d, ...(i % 3 === 0 ? { bed: "01:30", wake: "06:30" } : { bed: "23:00", wake: "06:30" }), createdAt: T(d), updatedAt: T(d) }); }
  out.push({ id: DAY, date: DAY, bed: "23:00", wake: "06:30", water: 2000, steps: 10000, veg: 2, pulse: 60, createdAt: T(DAY), updatedAt: T(DAY) });
  return out;
}
const meals = () => [{ id: "m1", date: DAY, slot: "朝食", text: "トースト", kcal: 400, createdAt: T(DAY, 7) }, { id: "m2", date: DAY, slot: "昼食", text: "定食", kcal: 800, createdAt: T(DAY, 12) }];
let w = 0;
const RUN = (date, km, minutes) => ({ id: "w" + ++w, date, type: "ランニング", km, minutes, createdAt: T(date, 7) });
const workouts = () => [RUN("2026-03-10", 10, 60), RUN("2026-09-01", 300, 1800), RUN("2026-10-01", 250, 1500), RUN("2026-11-10", 20, 120), RUN("2026-11-12", 10, 60), { id: "w99", date: DAY, type: "筋トレ", exercise: "スクワット", kg: 40, reps: 10, sets: 3, createdAt: T(DAY, 8) }];
const settings = () => [
  { id: "body", height: 170, age: 21, sex: "m", updatedAt: T("2026-09-20") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-09-20") },
  { id: "runShoes", list: [{ id: "s1", name: "古いシューズ", from: "2026-01-01", limit: 600 }, { id: "s2", name: "新しいシューズ", from: "2026-09-15", limit: 600 }], updatedAt: T("2026-09-20") },
];
module.exports = { T, DAY, addDays, weights, bodyDays, meals, workouts, settings };
