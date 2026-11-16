// ダイエット その15's example: Monday 2026-11-16, noon. 60 days of weights about 68 kg (6.8 typed on 10/27). 食事 for 30
// days: トースト (300, P 9), 定食 (700, P 25), a dinner of 5 by turns (800, P 30), チョコ (150) every 3rd day; おにぎり of
// 5,000 kcal on 11/13. ベンチプレス on 火・金 (600 kg on 11/13), runs of 5 km on 水 (25 分 on 11/11, else 30 分) and longer
// on 土 (8, 10, 12, 14 km the last 4). Beds against 23:30; 80,000 歩 on 11/12; reasons for 4 days without 運動.
// The races: つくば (half, 12/13, goal 2:00:00) and 秋の10km (11/8, past)
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-16";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
const wd = (d) => new Date(d + "T12:00:00+09:00").getDay();
function weights() {
  const out = [];
  for (let i = 59; i >= 0; i--) { const d = addDays(DAY, -i); out.push({ id: d, date: d, kg: d === "2026-10-27" ? 6.8 : Math.round((68 + 0.3 * Math.sin(i)) * 10) / 10, createdAt: T(d, 7) }); }
  return out;
}
let n = 0;
const M = (date, slot, text, kcal, p) => ({ id: "m" + ++n, date, slot, text, kcal, ...(p !== undefined ? { p } : {}), createdAt: T(date, 12) + n });
const DIN = ["ハンバーグ", "焼き魚", "カレー", "パスタ", "鍋"];
function meals() {
  const out = [];
  for (let i = 0; i < 30; i++) {
    const d = addDays(DAY, -i);
    out.push(M(d, "朝食", "トースト", 300, 9));
    if (i === 0) continue;
    out.push(M(d, "昼食", "定食", 700, 25), M(d, "夕食", DIN[i % 5], 800, 30));
    if (i % 3 === 0) out.push(M(d, "間食", "チョコ", 150));
    if (d === "2026-11-13") out.push(M(d, "間食", "おにぎり", 5000));
  }
  return out;
}
let w = 0;
const LONG = { "2026-10-24": 8, "2026-10-31": 10, "2026-11-07": 12, "2026-11-14": 14 };
function workouts() {
  const out = [];
  for (let i = 1; i < 60; i++) {
    const d = addDays(DAY, -i), k = wd(d);
    if (k === 2 || k === 5) out.push({ id: "w" + ++w, date: d, type: "筋トレ", exercise: "ベンチプレス", kg: d === "2026-11-13" ? 600 : 50, reps: 10, sets: 3, createdAt: T(d, 19) });
    if (k === 3) out.push({ id: "w" + ++w, date: d, type: "ランニング", km: 5, minutes: d === "2026-11-11" ? 25 : 30, createdAt: T(d, 18), ...(d === "2026-11-04" ? { note: "河川敷のコース" } : {}) });
    if (k === 6 && LONG[d]) out.push({ id: "w" + ++w, date: d, type: "ランニング", km: LONG[d], minutes: LONG[d] * 6.5, createdAt: T(d, 8) });
  }
  return out;
}
const BEDS = ["23:00", "23:40", "00:30", "23:20", "01:00", "05:00", "23:30", "00:00", "23:10", "23:50", "22:50", "00:40", "23:30", "23:00"]; // 11/3 … 11/16
const SKIP = { "2026-11-09": "busy", "2026-11-02": "busy", "2026-10-26": "busy", "2026-11-15": "tired" };
function bodyDays() {
  const out = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(DAY, -13 + i);
    out.push({ id: d, date: d, bed: BEDS[i], wake: "06:00", ...(d === "2026-11-12" ? { steps: 80000 } : { steps: 8000 }), ...(SKIP[d] ? { skip: SKIP[d] } : {}), createdAt: T(d, 7), updatedAt: T(d, 7) });
  }
  out.push({ id: "2026-10-26", date: "2026-10-26", steps: 7000, skip: "busy", createdAt: T("2026-10-26", 21), updatedAt: T("2026-10-26", 21) });
  return out;
}
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-08-01") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-08-01") },
  { id: "weight", target: 52, updatedAt: T("2026-08-01") },
  { id: "bd3Bed", on: true, at: "23:30", updatedAt: T("2026-08-01") },
  { id: "races", list: [{ id: "r1", name: "つくばマラソン", date: "2026-12-13", km: 21.0975, goal: 7200 }, { id: "r0", name: "秋の10km", date: "2026-11-08", km: 10 }], updatedAt: T("2026-10-01") },
];
module.exports = { T, DAY, addDays, weights, meals, workouts, bodyDays, settings };
