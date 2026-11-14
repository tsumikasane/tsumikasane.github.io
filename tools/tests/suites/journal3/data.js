// 日記 その3's example: Saturday 2026-11-14, 21:00, nothing written today. 日記 begun at their own hours (夜 four, 深夜 two
// (one past midnight), 朝 one) in the last 90 days, one a year before; 11/5 and 11/12 name 11/3 (11/3, 11月3日, 2026/11/03)
const at = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const DAY = "2026-11-14";
const jn = (date, text, begun) => ({ id: date, date, text, createdAt: begun, updatedAt: begun });
const journal = () => [
  jn("2025-12-31", "去年の大みそか。#休み", at("2025-12-31", "20:00")),
  jn("2026-10-20", "10月の日記。", at("2026-10-20", "21:00")),
  jn("2026-11-01", "ついたち。", at("2026-11-02", "01:30")),
  jn("2026-11-03", "文化の日。#休み", at("2026-11-03", "21:30")),
  jn("2026-11-05", "11/3のことを思い出した。11月3日はたのしかった。", at("2026-11-05", "22:10")),
  jn("2026-11-10", "朝に書いた。#休み", at("2026-11-10", "07:40")),
  jn("2026-11-12", "夜。2026/11/03 の日記も見返した。", at("2026-11-12", "22:05")),
  jn("2026-11-13", "あしたは雨。", at("2026-11-13", "23:30")),
];
// (① versions kept before: 10/1's 日記 is gone for good, so its go; 11/3's stay)
const jnHist = { "2026-10-01": [{ t: "消えた日記", at: 1, kept: 1 }], "2026-11-03": [{ t: "前の文化の日", at: at("2026-11-03", "21:30"), kept: at("2026-11-03", "21:40") }] };
const all = () => ({ journal: journal(), todos: [], settings: [], jnHist });
module.exports = { DAY, all };
