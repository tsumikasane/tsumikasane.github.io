// ダイエット その14's example: Sunday 2026-11-15, noon. 70 days of weights: 0.05 kg a day down to 69.0 four weeks back,
// then 0.02 a day (68.4 on the day), 体脂肪率 24.0 the last 2 weeks; a goal of 66.0. 食事 for 60 days: トースト 300, 定食
// 700, ごはん 800 a day; ラーメン 600 more on the 8 nights of short sleep (5 hours: 11/12, 11/10 …), ポテトチップス on the
// days after お酒, 焼肉 1000 on 11/14 (2,800 that day). Runs on 火・木・土 (5 km in 30 分; 11/12 in 25 分), the menu's
// チェストプレス and レッグプレス on 月・水・金. 歩数 9,500 (7,000 every 10th day). 体力チェック on 9/10 and 10/12
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-15";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
const wd = (d) => new Date(d + "T12:00:00+09:00").getDay();
const SHORT = [3, 5, 10, 15, 22, 29, 36, 43], ALC = [20, 27, 34, 41];
function weights() {
  const out = [];
  for (let i = 69; i >= 0; i--) {
    const d = addDays(DAY, -i), kg = i >= 28 ? 69 + 0.05 * (i - 28) : 68.44 + 0.02 * i;
    out.push({ id: d, date: d, kg: Math.round(kg * 10) / 10, ...(i < 14 ? { fat: 24 } : {}), createdAt: T(d, 7) });
  }
  return out;
}
let n = 0;
const M = (date, slot, text, kcal) => ({ id: "m" + ++n, date, slot, text, kcal, createdAt: T(date, 12) + n });
function meals() {
  const out = [];
  for (let i = 0; i < 60; i++) {
    const d = addDays(DAY, -i);
    out.push(M(d, "朝食", "トースト", 300));
    if (i === 0) continue;
    out.push(M(d, "昼食", "定食", 700), M(d, "夕食", "ごはん", 800));
    if (SHORT.includes(i)) out.push(M(d, "夕食", "ラーメン", 600));
    if (ALC.some((a) => a - 1 === i)) out.push(M(d, "間食", "ポテトチップス", 340));
    if (i === 1) out.push(M(d, "夕食", "焼肉", 1000));
  }
  return out;
}
let w = 0;
function workouts() {
  const out = [];
  for (let i = 1; i < 60; i++) {
    const d = addDays(DAY, -i), k = wd(d);
    if (k === 2 || k === 4 || k === 6) out.push({ id: "w" + ++w, date: d, type: "ランニング", km: 5, minutes: i === 3 ? 25 : 30, createdAt: T(d, 18) });
    if (k === 1 || k === 3 || k === 5) for (const x of ["チェストプレス", "レッグプレス"]) out.push({ id: "w" + ++w, date: d, type: "筋トレ", exercise: x, kg: 30, reps: 20, sets: 3, createdAt: T(d, 19) });
  }
  return out;
}
function bodyDays() {
  const out = [];
  for (let i = 0; i < 60; i++) {
    const d = addDays(DAY, -i), short = SHORT.includes(i);
    out.push({ id: d, date: d, bed: short ? "01:30" : "23:00", wake: "06:30", steps: i === 0 ? 0 : i % 10 === 0 ? 7000 : 9500, ...(ALC.includes(i) ? { alc: 2 } : {}),
      ...(i < 14 && i > 0 ? { sleepQ: short ? 1 : 3 } : {}), createdAt: T(d, 21), updatedAt: T(d, 21) });
  }
  return out;
}
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-08-01") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-08-01") },
  { id: "weight", target: 66, updatedAt: T("2026-08-01") },
  { id: "stepGoal", steps: 8000, updatedAt: T("2026-08-01") },
  { id: "fitTests", list: [{ date: "2026-09-10", push: 20, sit: 15, squat: 30, plank: 60 }, { date: "2026-10-12", push: 24, sit: 17, squat: 34, plank: 75 }], updatedAt: T("2026-10-12") },
];
module.exports = { T, DAY, addDays, weights, meals, workouts, bodyDays, settings };
