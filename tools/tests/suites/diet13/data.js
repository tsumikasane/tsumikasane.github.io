// ダイエット その13's example: Sunday 2026-11-15, noon. 60 days of weights 72.0 kg down 0.05 a day (69.0 on the day), a goal
// of 66.0. 食事 for 30 days: 納豆ごはん (400, P 15), 定食 (800, P 25; 900 円 on 11/1〜11/14, 850 円 on 10/27〜10/31),
// 鶏むね肉のソテー (500, P 35) at night, プロテイン (115, P 21) every other day, ラーメン too on 11/14 and a クッキー without
// kcal on 11/13; on the day 納豆ごはん and 焼肉定食 (1200, P 40, 1,500 円). ベンチプレス 50 kg × 10 on 2 days of the 4 weeks
// before and 3 of the last 4 (no better); スクワット 60 → 65 kg × 8. Runs every 火・木 for 8 weeks; 歩数 8,000 on weekdays,
// 6,000 on 土, 3,000 on 日. Sleep 6, 5, 7, 6.5, 8, 5.5 and 6 hours the 7 nights to the day; ひざ hurting 3 days on end
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-15";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
const wd = (d) => new Date(d + "T12:00:00+09:00").getDay();
function weights() {
  const out = [];
  for (let i = 59; i >= 0; i--) { const d = addDays(DAY, -i); out.push({ id: d, date: d, kg: Math.round((69 + 0.05 * i) * 10) / 10, createdAt: T(d, 7) }); }
  return out;
}
let n = 0, e = 0;
const meals = [], expenses = [];
const M = (date, slot, text, kcal, p, yen) => {
  const m = { id: "m" + ++n, date, slot, text, ...(kcal !== undefined ? { kcal } : {}), ...(p !== undefined ? { p } : {}), createdAt: T(date, 12) + n };
  if (yen) { const x = { id: "e" + ++e, date, kind: "out", category: "食費", amount: yen, memo: text, meal: m.id, createdAt: T(date, 12) + n }; expenses.push(x); m.exId = x.id; }
  meals.push(m);
};
for (let i = 0; i < 30; i++) {
  const d = addDays(DAY, -i);
  M(d, "朝食", "納豆ごはん", 400, 15);
  if (i === 0) { M(d, "昼食", "焼肉定食", 1200, 40, 1500); continue; }
  M(d, "昼食", "定食", 800, 25, i <= 14 ? 900 : i <= 19 ? 850 : undefined);
  M(d, "夕食", "鶏むね肉のソテー", 500, 35);
  if (i % 2 === 0) M(d, "間食", "プロテイン（1杯 30g）", 115, 21);
  if (i === 1) M(d, "夕食", "ラーメン（しょうゆ）", 500);
  if (i === 2) M(d, "間食", "クッキー");
}
let w = 0;
function workouts() {
  const out = [];
  const L = (i, exercise, kg, reps) => { const d = addDays(DAY, -i); out.push({ id: "w" + ++w, date: d, type: "筋トレ", exercise, kg, reps, sets: 3, createdAt: T(d, 19) }); };
  for (const i of [30, 37]) L(i, "ベンチプレス", 50, 10);
  for (const i of [2, 9, 16]) L(i, "ベンチプレス", 50, 10);
  for (const i of [31, 38]) L(i, "スクワット", 60, 8);
  for (const i of [3, 10]) L(i, "スクワット", 65, 8);
  for (let i = 1; i < 56; i++) { const d = addDays(DAY, -i); if (wd(d) === 2 || wd(d) === 4) out.push({ id: "w" + ++w, date: d, type: "ランニング", km: 5, minutes: 30, createdAt: T(d, 18) }); }
  return out;
}
const SLEEP = [["00:00", "06:00"], ["01:00", "06:00"], ["23:00", "06:00"], ["23:30", "06:00"], ["22:00", "06:00"], ["00:30", "06:00"], ["00:00", "06:00"]];
function bodyDays() {
  const out = [];
  for (let i = 0; i < 56; i++) {
    const d = addDays(DAY, -i), x = { id: d, date: d, steps: wd(d) === 0 ? 3000 : wd(d) === 6 ? 6000 : 8000, createdAt: T(d, 21), updatedAt: T(d, 21) };
    if (i < 7) { const [bed, wake] = SLEEP[6 - i]; Object.assign(x, { bed, wake }); }
    if (i < 3) x.pain = i === 0 ? ["knee", "tired"] : ["knee"];
    out.push(x);
  }
  return out;
}
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-08-01") },
  { id: "kcalGoal", target: 1800, updatedAt: T("2026-08-01") },
  { id: "weight", target: 66, updatedAt: T("2026-08-01") },
];
module.exports = { T, DAY, addDays, weights, meals: () => meals.map((m) => ({ ...m })), expenses: () => expenses.map((x) => ({ ...x })), workouts, bodyDays, settings };
