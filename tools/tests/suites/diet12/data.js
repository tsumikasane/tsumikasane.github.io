// ダイエット その12's example: Sunday 2026-11-15, noon (the week from Sunday 11/15). 90 days of weights: 70.0 kg going down
// to the goal of 66.0 by 30 days back, then about it; the day before 65.8 and the day 66.6 (+0.8), mostly put in at 7:10,
// every 5th day at 21:00 and 0.6 kg heavier. 食事 for 30 days: トースト (P 9) in the morning, 定食 (P 25) at noon but カツカレー
// on 4 days, ごはん (P 30) at night, カフェラテ（M） on 6 days; the day before 焼肉 at 21:30 too, and 3 without kcal. Runs of
// 12, 14, 15 and 16 km the 4 weeks before, 10 km on the day; 筋トレ on the days between, 8 days in a row to the day
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-15";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
function weights() {
  const out = [];
  for (let i = 89; i >= 0; i--) {
    const d = addDays(DAY, -i), eve = i % 5 === 3 && i > 1;
    let kg = i >= 30 ? 70 - (4 * (89 - i)) / 59 : 66 + 0.3 * Math.sin(i * 1.3) - 0.2;
    if (i === 1) kg = 65.8;
    if (i === 0) kg = 66.6;
    if (eve) kg += 0.6;
    out.push({ id: d, date: d, kg: Math.round(kg * 10) / 10, createdAt: eve ? T(d, 21) : T(d, 7, 10), ...(i === 1 ? { tags: ["salty", "eatout"] } : {}) });
  }
  return out;
}
let n = 0;
const M = (date, slot, text, kcal, p, at) => ({ id: "m" + ++n, date, slot, text, ...(kcal !== undefined ? { kcal } : {}), ...(p !== undefined ? { p } : {}), ...(at ? { at } : {}), createdAt: T(date, 12) + n });
const CURRY = [3, 9, 15, 21], LATTE = [2, 5, 8, 11, 14, 17];
function meals() {
  const out = [];
  for (let i = 0; i < 30; i++) {
    const d = addDays(DAY, -i);
    out.push(M(d, "朝食", "トースト", 300, 9));
    if (i === 0) continue; // (the day itself: only 朝食 so far, and the soup below)
    out.push(CURRY.includes(i) ? M(d, "昼食", "カツカレー", 1000) : M(d, "昼食", "定食", 700, 25));
    out.push(M(d, "夕食", "ごはん", 600, 30));
    if (LATTE.includes(i)) out.push(M(d, "間食", "カフェラテ（M）", 150));
    if (i === 1) out.push(M(d, "夕食", "焼肉", 1200, 40, "21:30"));
  }
  out.push(M(addDays(DAY, -2), "昼食", "おにぎり（鮭）"), M(addDays(DAY, -3), "夕食", "サラダ"), M(DAY, "朝食", "手作りスープ"));
  return out;
}
let w = 0;
const RUNS = { "2026-10-18": 4, "2026-10-20": 4, "2026-10-22": 4, "2026-10-25": 4, "2026-10-27": 5, "2026-10-29": 5, "2026-11-01": 5, "2026-11-03": 5, "2026-11-05": 5, "2026-11-08": 5, "2026-11-10": 5, "2026-11-12": 6, "2026-11-15": 10 };
const LIFT = [["2026-11-09", "ベンチプレス", 50, 10], ["2026-11-11", "ダンベルフライ", 12, 12], ["2026-11-13", "ベンチプレス", 50, 10], ["2026-11-14", "スクワット", 60, 8]];
function workouts() {
  const out = Object.entries(RUNS).map(([d, km]) => ({ id: "w" + ++w, date: d, type: "ランニング", km, minutes: km * 6, createdAt: T(d, 18) }));
  for (const [d, exercise, kg, reps] of LIFT) out.push({ id: "w" + ++w, date: d, type: "筋トレ", exercise, kg, reps, sets: 3, createdAt: T(d, 19) });
  return out;
}
function bodyDays() {
  return [{ id: DAY, date: DAY, bed: "01:30", wake: "06:30", createdAt: T(DAY, 7), updatedAt: T(DAY, 7) }, { id: addDays(DAY, -1), date: addDays(DAY, -1), alc: 3, createdAt: T(addDays(DAY, -1), 22), updatedAt: T(addDays(DAY, -1), 22) }];
}
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-08-01") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-08-01") },
  { id: "weight", target: 66, updatedAt: T("2026-08-01") },
];
module.exports = { T, DAY, addDays, weights, meals, workouts, bodyDays, settings, CURRY, LATTE };
