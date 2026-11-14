// 日記 その5's example: Saturday 2026-11-14, 21:00, nothing written today. 11/1 with 飾り (見出し, 太字, 区切り線, a link)
// and 11/3 named; #カフェ on three days (once more inside a 伏せ字 on 11/3); 11/10 marked あとで書く
const at = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const DAY = "2026-11-14";
const jn = (date, text) => ({ id: date, date, text, createdAt: at(date, "21:00"), updatedAt: at(date, "21:00") });
const journal = () => [
  jn("2025-12-01", "去年の冬。"),
  jn("2026-11-01", "# 11月のはじまり\n**たのしい**一日だった。\n---\nhttps://example.com/page と 11/3 の話。#カフェ"),
  jn("2026-11-03", "文化の日。#カフェ に行った。｟#カフェ ひみつ｠"),
  jn("2026-11-12", "カフェで勉強。#カフェ"),
  jn("2026-11-13", "あしたは雨。"),
];
const all = () => ({ journal: journal(), todos: [], settings: [{ id: "jnLater", days: ["2026-11-10"], updatedAt: 1 }] });
module.exports = { DAY, all };
