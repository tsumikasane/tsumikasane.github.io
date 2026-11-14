// the goals this round's tests start from (2026-11-11, a Wednesday): those of 目標 その8, with ふりかえり on two
const base = require("../goal8/data");
const T = base.T;
function all() {
  const gs = base.all();
  gs.find((g) => g.id === "g1").notes = [{ id: "n1", at: T("2026-11-10", 21), text: "単語を毎日続けられた" }];
  gs.find((g) => g.id === "g3").notes = [{ id: "n2", at: T("2026-11-11", 22), text: "机は片づいた" }];
  return gs;
}
module.exports = { T, all, settings: base.settings };
