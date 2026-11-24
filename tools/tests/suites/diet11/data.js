// ダイエット その11's example: Saturday 2026-11-14 (the week from Sunday 11/8). 120 days of weights going down 0.03 kg a day,
// ウエスト now and then; 間食 on 3 days this week and 2 in each week before; runs every other day 7〜27 days back (30 分)
// and every day this week (60 分), ベンチプレス on 11/10 and 11/12; sleep 23:30〜6:30 on weekdays, 1:30〜9:30 on weekends
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-14";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
const wd = (d) => new Date(d + "T12:00:00+09:00").getDay();
function weights() {
  const out = [];
  for (let i = 119; i >= 0; i--) { const d = addDays(DAY, -i), idx = 119 - i; out.push({ id: d, date: d, kg: Math.round((72 - 0.03 * idx) * 100) / 100, ...(i % 30 === 0 ? { waist: 84 - idx * 0.02 } : {}), createdAt: T(d, 7) }); }
  return out;
}
let n = 0;
const M = (date, slot, text, kcal) => ({ id: "m" + ++n, date, slot, text, kcal, createdAt: T(date, 12) + n });
function meals() {
  const out = [];
  for (let i = 0; i < 35; i++) {
    const d = addDays(DAY, -i);
    out.push(M(d, "朝食", "トースト", 300), M(d, "昼食", "定食", 700), M(d, "夕食", "ごはん", 600));
    const thisWeek = d >= "2026-11-08", w = wd(d);
    if (thisWeek ? [1, 3, 5].includes(w) : [2, 4].includes(w)) out.push(M(d, "間食", "チョコ", 200));
  }
  return out;
}
let w = 0;
function workouts() {
  const out = [];
  for (let i = 0; i <= 27; i++) {
    const d = addDays(DAY, -i);
    if (i <= 6) out.push({ id: "w" + ++w, date: d, type: "ランニング", km: 8, minutes: 60, createdAt: T(d, 18) });
    else if (i % 2 === 1) out.push({ id: "w" + ++w, date: d, type: "ランニング", km: 5, minutes: 30, createdAt: T(d, 18) });
  }
  for (const d of ["2026-11-10", "2026-11-12"]) out.push({ id: "w" + ++w, date: d, type: "筋トレ", exercise: "ベンチプレス", kg: 50, reps: 10, sets: 3, createdAt: T(d, 19) });
  return out;
}
function bodyDays() {
  const out = [];
  for (let i = 0; i < 30; i++) { const d = addDays(DAY, -i), we = [0, 6].includes(wd(d)); out.push({ id: d, date: d, bed: we ? "01:30" : "23:30", wake: we ? "09:30" : "06:30", createdAt: T(d), updatedAt: T(d) }); }
  return out;
}
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-09-20") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-09-20") },
  { id: "weight", target: 65, updatedAt: T("2026-09-20") },
  { id: "snackGoal", perWeek: 3, updatedAt: T("2026-09-20") },
];
module.exports = { T, DAY, addDays, weights, meals, workouts, bodyDays, settings };
