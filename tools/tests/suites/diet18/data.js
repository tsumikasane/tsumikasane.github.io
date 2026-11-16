// ダイエット その18's example: Monday 2026-11-16, noon. Weights from 8/25, 72.0 kg down 0.025 a day with a 7-day ripple
// (0, +0.3, −0.2, +0.1, −0.3, +0.2, 0) and today 0.8 over; the diet begun 9/1, the goal 68 kg by 12/31. 間食 of
// ポテトチップス ×3 and チョコ ×2 in the 60 days, ゆで卵 of 70 kcal; a カレー kept (4人分, 1,400 kcal). The calendar: ランチ
// tomorrow, 忘年会 on Thursday, 焼肉 on Saturday called off, 歯医者, and 新年会 in January. 筋トレ on 6 days of November
// (8 in October), ジム's fee 8,000 円; 川沿い runs of 5 km (10/3 27:30, 10/17 28:40 きつさ 6, 11/1 29:10, 11/14 28:20
// きつさ 6) and 公園 of 3 km (11/8 18:00, 11/12 17:30); きつさ 8 on 11/14 (スクワット), 9 on 11/15, 8 today (レッグプレス)
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-16";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
const RIPPLE = [0, 0.3, -0.2, 0.1, -0.3, 0.2, 0];
function weights() {
  const out = [];
  let i = 0;
  for (let d = "2026-08-25"; d <= DAY; d = addDays(d, 1), i++) out.push({ id: d, date: d, kg: Math.round((72 - 0.025 * i + RIPPLE[i % 7] + (d === DAY ? 0.8 : 0)) * 10) / 10, createdAt: T(d, 7) });
  return out;
}
let n = 0;
const M = (date, slot, text, kcal) => ({ id: "m" + ++n, date, slot, text, kcal, createdAt: T(date, 12) + n });
function meals() {
  const out = [];
  for (let i = 0; i < 20; i++) { const d = addDays(DAY, -i); out.push(M(d, "朝食", "ゆで卵", 70)); if (i) out.push(M(d, "夕食", "定食", 700)); }
  for (const i of [2, 9, 20]) out.push(M(addDays(DAY, -i), "間食", "ポテトチップス", 330));
  for (const i of [5, 12]) out.push(M(addDays(DAY, -i), "間食", "チョコ", 250));
  return out;
}
let w = 0;
function workouts() {
  const out = [], S = (d, exercise, extra = {}) => out.push({ id: "w" + ++w, date: d, type: "筋トレ", exercise, kg: 40, reps: 10, sets: 3, ...extra, createdAt: T(d, 19) + w });
  for (const d of ["2026-11-02", "2026-11-05", "2026-11-09"]) S(d, "チェストプレス");
  S("2026-11-14", "スクワット", { rpe: 8 }); S("2026-11-15", "ラットプルダウン", { rpe: 9 }); S(DAY, "レッグプレス", { rpe: 8 }); S(DAY, "チェストプレス");
  for (const d of ["2026-10-01", "2026-10-04", "2026-10-08", "2026-10-11", "2026-10-15", "2026-10-18", "2026-10-22", "2026-10-25"]) S(d, "チェストプレス");
  const R = (d, km, minutes, note, extra = {}) => out.push({ id: "w" + ++w, date: d, type: "ランニング", km, minutes, note, ...extra, createdAt: T(d, 7) + w });
  R("2026-10-03", 5, 27.5, "川沿い"); R("2026-10-17", 5, 28 + 40 / 60, "川沿い", { rpe: 6 }); R("2026-11-01", 5, 29 + 10 / 60, "川沿い"); R("2026-11-14", 5, 28 + 20 / 60, "川沿い", { rpe: 6 });
  R("2026-11-08", 3, 18, "公園"); R("2026-11-12", 3, 17.5, "公園");
  return out;
}
const events = () => [
  { id: "e1", title: "○○さんとランチ", date: "2026-11-17", time: "12:00", createdAt: T("2026-11-01") },
  { id: "e2", title: "忘年会", date: "2026-11-19", time: "19:00", createdAt: T("2026-11-01") },
  { id: "e3", title: "焼肉", date: "2026-11-21", time: "18:00", cancel: ["2026-11-21"], createdAt: T("2026-11-01") },
  { id: "e4", title: "歯医者", date: "2026-11-18", time: "10:00", createdAt: T("2026-11-01") },
  { id: "e5", title: "新年会", date: "2027-01-08", time: "19:00", createdAt: T("2026-11-01") },
];
const CURRY = "豚こま肉 300g 690\nじゃがいも 2個 150\nにんじん 1本 30\n玉ねぎ 2個 130\nカレールー 4皿分 400";
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-08-01") },
  { id: "weight", target: 68, updatedAt: T("2026-09-01") },
  { id: "weightBy", date: "2026-12-31", updatedAt: T("2026-09-01") },
  { id: "dietStart", date: "2026-09-01", updatedAt: T("2026-09-01") },
  { id: "gymFee", yen: 8000, updatedAt: T("2026-10-01") },
  { id: "recipes", list: [{ id: "r1", name: "カレー", serv: 4, text: CURRY, kcal: 1400, one: 350, at: T("2026-11-01") }], updatedAt: T("2026-11-01") },
];
module.exports = { T, DAY, addDays, RIPPLE, weights, meals, workouts, events, settings, CURRY };
