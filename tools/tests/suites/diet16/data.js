// ダイエット その16's example: Monday 2026-11-16, noon (the week from Sunday 11/15). 水分 2,200 ml on even days back and
// 1,200 on odd ones for 30 days, the next morning 0.2 kg lighter after the first and 0.1 heavier after the others;
// ウエスト 90 / ヒップ 96 on 9/27, 85 / 96 on 11/14. 食事 for 30 days: 朝 400 (7:30), 昼 700, 夕 700, チョコ 150 at 15:30
// on 8 days, at 22:00 on 11/13, 11/6 and 10/27 and at 10:30 on 11/1. Runs of 5 km every 水 this year; ベンチプレス on 火・金,
// スクワット 5〜8 weeks back, ラットプルダウン these 2 weeks; on 11/15 a run and ベンチプレス, on the day a 40 分 walk
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-16";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
const wd = (d) => new Date(d + "T12:00:00+09:00").getDay();
const water = (i) => (i % 2 === 0 ? 2200 : 1200);
function weights() {
  const out = [];
  let kg = 72;
  for (let i = 59; i >= 0; i--) {
    const d = addDays(DAY, -i);
    out.push({ id: d, date: d, kg: Math.round(kg * 10) / 10, ...(d === "2026-09-27" ? { waist: 90, hip: 96 } : d === "2026-11-14" ? { waist: 85, hip: 96 } : {}), createdAt: T(d, 7) });
    if (i >= 1 && i <= 30) kg += water(i) >= 2000 ? -0.2 : 0.1;
    else kg -= 0.03;
  }
  return out;
}
let n = 0;
const M = (date, slot, text, kcal, at) => ({ id: "m" + ++n, date, slot, text, kcal, at, createdAt: T(date, 12) + n });
const LATE = ["2026-11-13", "2026-11-06", "2026-10-27"], NOON = ["2026-11-01"];
function meals() {
  const out = [];
  for (let i = 0; i < 30; i++) {
    const d = addDays(DAY, -i);
    out.push(M(d, "朝食", "トースト", 400, "07:30"));
    if (i === 0) continue;
    out.push(M(d, "昼食", "定食", 700, "12:30"), M(d, "夕食", "ごはん", 700, "19:00"));
    if (LATE.includes(d)) out.push(M(d, "間食", "チョコ", 150, "22:00"));
    else if (NOON.includes(d)) out.push(M(d, "間食", "チョコ", 150, "10:30"));
    else if (i % 3 === 0 && i <= 24) out.push(M(d, "間食", "チョコ", 150, "15:30"));
  }
  return out;
}
let w = 0;
function workouts() {
  const out = [], L = (d, exercise, sets) => out.push({ id: "w" + ++w, date: d, type: "筋トレ", exercise, kg: 40, reps: 10, sets, createdAt: T(d, 19) });
  for (let d = "2026-01-07"; d <= "2026-11-11"; d = addDays(d, 7)) out.push({ id: "w" + ++w, date: d, type: "ランニング", km: 5, minutes: 30, createdAt: T(d, 18) });
  for (let i = 1; i < 60; i++) { const d = addDays(DAY, -i), k = wd(d); if (k === 2 || k === 5) L(d, "ベンチプレス", 3); }
  for (const i of [36, 40, 43, 50, 54]) L(addDays(DAY, -i), "スクワット", 4);
  for (const i of [3, 6, 10, 13]) L(addDays(DAY, -i), "ラットプルダウン", 3);
  out.push({ id: "w" + ++w, date: "2026-11-15", type: "ランニング", km: 5, minutes: 30, createdAt: T("2026-11-15", 8) });
  L("2026-11-15", "ベンチプレス", 3);
  out.push({ id: "w" + ++w, date: DAY, type: "ウォーキング", km: 3, minutes: 40, createdAt: T(DAY, 8) });
  return out;
}
function bodyDays() {
  return Array.from({ length: 30 }, (_, i) => { const d = addDays(DAY, -1 - i); return { id: d, date: d, water: water(i + 1), createdAt: T(d, 21), updatedAt: T(d, 21) }; });
}
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-08-01") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-08-01") },
];
module.exports = { T, DAY, addDays, weights, meals, workouts, bodyDays, settings };
