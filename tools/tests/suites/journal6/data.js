// 日記 その6's example: Saturday 2026-11-14, 21:00, nothing written today. 見出し on 11/1 (# and ##) and 11/3 (##), a ==マーカー==,
// #カフェ on two days; a year ago today, the answer to one's own question; the questions: one's own only, the same each year
const at = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const DAY = "2026-11-14";
const jn = (date, text) => ({ id: date, date, text, createdAt: at(date, "21:00"), updatedAt: at(date, "21:00") });
const journal = () => [
  jn("2025-11-14", "【自分の問い？】\n去年の答え"),
  jn("2026-11-01", "# 11月のはじまり\n## 朝\nカフェで==大事==なこと。\n#カフェ"),
  jn("2026-11-03", "## 文化の日\n本を読んだ。"),
  jn("2026-11-12", "カフェで勉強。#カフェ"),
  jn("2026-11-13", "あしたは雨。"),
];
const all = () => ({ journal: journal(), todos: [], settings: [{ id: "jnAsk6", mode: "year", mine: ["自分の問い？"], only: true, updatedAt: 1 }] });
module.exports = { DAY, all };
