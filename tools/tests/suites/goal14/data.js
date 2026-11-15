// the goals this round's tests start from (2026-11-15, a Sunday): those of 目標 その13, with three days of 日記 (one
// speaking of TOEIC, one of 朝ラン)
const base = require("../goal13/data");
const T = base.T;
const J = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const journal = [
  { id: "2026-11-10", date: "2026-11-10", text: "きょうはTOEICの単語を50語やった。少しずつ覚えてきた。", createdAt: J("2026-11-10", "22:00") },
  { id: "2026-11-12", date: "2026-11-12", text: "ゆっくりした一日", createdAt: J("2026-11-12", "22:00") },
  { id: "2026-11-13", date: "2026-11-13", text: "朝ランをして気持ちよかった。", createdAt: J("2026-11-13", "21:00") },
];
module.exports = { T, all: base.all, settings: base.settings, todos: base.todos, events: base.events, journal };
