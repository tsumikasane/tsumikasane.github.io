// ダイエット その19's example: Monday 2026-11-16, noon; the diet begun 10/1 (71.0 kg, down 0.03 a day), the goal 69.5 kg
// (no 期限 yet), 2,000 kcal a day. Eaten over on 11/2 (3,000), 11/8 (2,900) and 11/13 (3,200): the next mornings up 0.8,
// 0.6 and 1.0, back on the 3rd, the 2nd and not yet. ウエスト 86.0 on 10/1, 85.4, 84.8 and 83.6. Walks on the even days back
// (6 km/h on 11/14, 4 on 10/27, 5 the others; 4 the 2 before the 4 weeks), runs of 5 km on 11/10 (30 min) and 11/12 (28)
// with the weight before and after, and 10 km today; the nights after 運動 7h30 (ぐっすり), the others 6h30 (ふつう).
// 夜の体重 on 11/9〜11/15. A カレー kept (4人分, 350 kcal) with 2 left from 11/13; ベルトの穴 on 11/8
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-16";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
const back = (d) => Math.round((Date.parse(DAY + "T00:00:00Z") - Date.parse(d + "T00:00:00Z")) / 864e5); // (days before today)
const BUMP = { "2026-11-03": 0.8, "2026-11-04": 0.4, "2026-11-09": 0.6, "2026-11-10": 0.1, "2026-11-14": 1.0, "2026-11-15": 0.5, "2026-11-16": 0.3 };
const WAIST = { "2026-10-01": 86.0, "2026-10-20": 85.4, "2026-11-05": 84.8, "2026-11-15": 83.6 };
function weights() {
  const out = [];
  let i = 0;
  for (let d = "2026-10-01"; d <= DAY; d = addDays(d, 1), i++) out.push({ id: d, date: d, kg: Math.round((71 - 0.03 * i + (BUMP[d] || 0)) * 10) / 10, ...(WAIST[d] ? { waist: WAIST[d] } : {}), createdAt: T(d, 7) });
  return out;
}
let n = 0;
const M = (date, slot, text, kcal) => ({ id: "m" + ++n, date, slot, text, kcal, createdAt: T(date, 12) + n });
function meals() {
  const out = [];
  for (let d = "2026-10-20"; d < DAY; d = addDays(d, 1)) out.push(M(d, "昼食", "ふつうの食事", 1800));
  for (const [d, k] of [["2026-11-02", 1200], ["2026-11-08", 1100], ["2026-11-13", 1400]]) out.push(M(d, "夕食", "飲み会", k));
  return out;
}
let w = 0;
function workouts() {
  const out = [], W = (i, km, minutes) => { const d = addDays(DAY, -i); out.push({ id: "w" + ++w, date: d, type: "ウォーキング", km, minutes, createdAt: T(d, 18) }); };
  for (let i = 2; i <= 30; i += 2) if (i !== 4 && i !== 6) W(i, i === 2 ? 3 : i === 10 ? 2 : i >= 28 ? 2 : 2.5, 30);
  const R = (d, km, minutes, extra = {}) => out.push({ id: "w" + ++w, date: d, type: "ランニング", km, minutes, ...extra, createdAt: T(d, 7) + w });
  R("2026-11-10", 5, 30, { pre: 70.4, post: 70 }); R("2026-11-12", 5, 28, { pre: 70.3, post: 69.9 }); R(DAY, 10, 60);
  return out;
}
function bodyDays() {
  const out = [];
  for (let i = 1; i <= 30; i++) { const x = addDays(DAY, -i), d = addDays(x, 1), ex = i % 2 === 0; out.push({ id: d, date: d, bed: ex ? "23:00" : "00:00", wake: "06:30", sleepQ: ex ? 3 : 2, createdAt: T(d, 7), updatedAt: T(d, 7) }); }
  const kg = new Map(weights().map((r) => [r.id, r.kg]));
  for (let d = "2026-11-09"; d <= "2026-11-15"; d = addDays(d, 1)) { const x = out.find((y) => y.id === d); x.night = Math.round((kg.get(d) + 0.7) * 10) / 10; }
  return out;
}
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-10-01") },
  { id: "weight", target: 69.5, updatedAt: T("2026-10-01") },
  { id: "dietStart", date: "2026-10-01", updatedAt: T("2026-10-01") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-10-01") },
  { id: "recipes", list: [{ id: "r1", name: "カレー", serv: 4, text: "豚こま肉 300g 690\nじゃがいも 2個 150\nにんじん 1本 30\n玉ねぎ 2個 130\nカレールー 4皿分 400", kcal: 1400, one: 350, at: T("2026-11-01") }], updatedAt: T("2026-11-01") },
  { id: "mealStock", list: [{ id: "s1", rid: "r1", name: "カレー", one: 350, serv: 4, left: 2, made: "2026-11-13", at: T("2026-11-13") }], updatedAt: T("2026-11-13") },
  { id: "nsv", list: [{ id: "n1", date: "2026-11-08", text: "ベルトの穴がひとつ縮んだ", at: T("2026-11-08") }], updatedAt: T("2026-11-08") },
];
module.exports = { T, DAY, addDays, back, weights, meals, workouts, bodyDays, settings };
