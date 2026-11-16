// ダイエット その17's example: Monday 2026-11-16, noon (the week from Sunday 11/15). Weights for 2025-08〜11 (73 kg, up and down
// a little) and 2026-08〜11/16 (71.5 kg down to 69). 脈拍 63 the 2 weeks before last, 60 the last 2, 68 on the day. 食事 for 14 days:
// トースト and ゆで卵 in the morning, 定食 at noon, ごはん・焼き魚・サラダ at night; ラーメン 食べすぎた on 3 days, 定食
// ちょうど on 5, サラダ 物足りない on 2; から揚げ ×3 and とんかつ in the 7 days (から揚げ once before), カフェラテ ×2 and
// コーラ (ジュース once before). 膝つき腕立て伏せ 20, スクワット 20, プランク 30 秒; runs of 6:30, 5:30 and 5:00 a km. A note of
// the week before (来週やること) and one 体重以外の変化
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-16";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
function weights() {
  const out = [];
  let i = 0;
  for (let d = "2025-08-01"; d <= "2025-11-30"; d = addDays(d, 1), i++) out.push({ id: d, date: d, kg: Math.round((73 + 0.4 * Math.sin(i / 6)) * 10) / 10, createdAt: T(d, 7) });
  i = 0;
  for (let d = "2026-08-01"; d <= DAY; d = addDays(d, 1), i++) out.push({ id: d, date: d, kg: Math.round((71.5 - (2.5 * i) / 107) * 10) / 10, createdAt: T(d, 7) });
  return out;
}
let n = 0;
const M = (date, slot, text, kcal, extra = {}) => ({ id: "m" + ++n, date, slot, text, kcal, ...extra, createdAt: T(date, 12) + n });
function meals() {
  const out = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(DAY, -i);
    out.push(M(d, "朝食", "トースト", 300), M(d, "朝食", "ゆで卵", 70));
    if (i === 0) continue;
    out.push(M(d, "昼食", "定食", 700, i <= 5 ? { full: 2 } : {}), M(d, "夕食", "ごはん", 250), M(d, "夕食", "焼き魚", 200), M(d, "夕食", "サラダ", 100, i === 2 || i === 4 ? { full: 1 } : {}));
    if ([1, 3, 6].includes(i)) out.push(M(d, "夕食", "ラーメン", 900, { full: 3 }));
    if ([1, 2, 5].includes(i)) out.push(M(d, "昼食", "から揚げ", 300));
    if (i === 4) out.push(M(d, "夕食", "とんかつ", 500));
    if (i === 9) out.push(M(d, "夕食", "から揚げ", 300));
    if (i === 2 || i === 3) out.push(M(d, "間食", "カフェラテ（M）", 150));
    if (i === 6) out.push(M(d, "間食", "コーラ", 225));
    if (i === 10) out.push(M(d, "間食", "オレンジジュース", 90));
  }
  return out;
}
let w = 0;
function workouts() {
  const out = [], L = (d, exercise, reps, extra = {}) => out.push({ id: "w" + ++w, date: d, type: "筋トレ", exercise, reps, sets: 2, ...extra, createdAt: T(d, 19) });
  L(addDays(DAY, -3), "膝つき腕立て伏せ", 20); L(addDays(DAY, -3), "スクワット", 20); L(addDays(DAY, -5), "プランク", 30, { per: "sec" }); L(addDays(DAY, -10), "壁腕立て伏せ", 25);
  const R = (i, min) => { const d = addDays(DAY, -i); out.push({ id: "w" + ++w, date: d, type: "ランニング", km: 5, minutes: min, createdAt: T(d, 18) }); };
  for (const i of [2, 6, 9, 13]) R(i, 32.5);
  for (const i of [4, 11]) R(i, 27.5);
  R(8, 25);
  return out;
}
const PULSE = (i) => (i === 0 ? 68 : i <= 13 ? 60 : 63);
function bodyDays() {
  return Array.from({ length: 28 }, (_, i) => { const d = addDays(DAY, -i); return { id: d, date: d, pulse: PULSE(i), createdAt: T(d, 7), updatedAt: T(d, 7) }; });
}
const settings = () => [
  { id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-08-01") },
  { id: "kcalGoal", target: 2000, updatedAt: T("2026-08-01") },
  { id: "weekNotes", list: [{ week: "2026-11-08", good: "間食をがまんできた", next: "ランを3回する" }], updatedAt: T("2026-11-14") },
  { id: "nsv", list: [{ id: "n1", date: "2026-11-01", text: "前のズボンが入った", at: T("2026-11-01") }], updatedAt: T("2026-11-01") },
];
module.exports = { T, DAY, addDays, weights, meals, workouts, bodyDays, settings };
