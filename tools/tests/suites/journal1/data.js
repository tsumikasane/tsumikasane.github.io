// 日記 ①〜⑩'s example: Friday 2026-11-13, 20:00. 日記 on the 4 days before (a run), a month ago, a year ago and a few more,
// some with #タグ; the day's records (a plan, 勉強, 運動, 食事, 体重, ルーティーン, 家計簿) for ④
const T = (d, h = 21) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const DAY = "2026-11-13";
const jn = (date, text) => ({ id: date, date, text, createdAt: T(date), updatedAt: T(date) });
const journal = () => [
  jn("2026-11-09", "朝から雨。#大学 のレポートを進めた。"),
  jn("2026-11-10", "友だちとカフェへ。#カフェ #友だち"),
  jn("2026-11-11", "#大学 の発表がうまくいった！"),
  jn("2026-11-12", "ゆっくり休んだ日。" + "あ".repeat(400)),
  jn("2026-10-13", "1か月前の日記。紅葉を見に行った。#旅行"),
  jn("2025-11-13", "1年前の日記。はじめての一人旅。#旅行"),
  jn("2026-11-01", "11月のはじまり。"),
  jn("2026-10-20", "#カフェ で勉強。"),
];
const all = () => ({
  journal: journal(),
  events: [{ id: "ev1", title: "ゼミ", date: DAY, time: "10:00", endTime: "11:30", createdAt: T("2026-11-01") }],
  subjects: [{ id: "s-en", name: "英語", color: "blue", order: 0, createdAt: T("2026-10-01") }],
  study: [{ id: "st1", date: DAY, subjectId: "s-en", minutes: 90, createdAt: T(DAY, 15) }],
  workouts: [{ id: "w1", date: DAY, type: "ラン", minutes: 30, km: 5, createdAt: T(DAY, 7) }],
  meals: [{ id: "m1", date: DAY, slot: "朝食", text: "トースト", kcal: 300, createdAt: T(DAY, 8) }, { id: "m2", date: DAY, slot: "昼食", text: "カレーライス", kcal: 750, createdAt: T(DAY, 12) }],
  weights: [{ id: DAY, date: DAY, kg: 60.2, createdAt: T(DAY, 7) }],
  routines: [{ id: "r1", name: "ストレッチ", order: 0, createdAt: T("2026-10-01") }],
  routineDays: [{ id: DAY, date: DAY, done: ["r1"], createdAt: T(DAY, 8) }],
  expenses: [{ id: "e1", date: DAY, kind: "out", amount: 1200, cat: "食費", memo: "ランチ", createdAt: T(DAY, 12) }],
  settings: [],
});
module.exports = { DAY, all };
