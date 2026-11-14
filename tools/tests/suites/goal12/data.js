// the goals this round's tests start from: those of 目標 その11, with a link in the memo of TOEIC's 長文 (the day: 2026-11-14,
// a Saturday)
const base = require("../goal11/data");
const T = base.T;
function all() {
  const gs = base.all();
  gs.find((g) => g.id === "g1").mandala[4].m = "教材はここ https://example.com/toeic を見る";
  return gs;
}
module.exports = { T, all, settings: base.settings, todos: base.todos, events: base.events };
