// the goals this round's tests start from (2026-11-11, a Wednesday): those of 目標 その3
const base = require("../r31/data");
const T = base.T;
function all() {
  const gs = base.all();
  const g3 = gs.find((g) => g.id === "g3");
  g3.deadline = "2026-12-31"; // (under way, not 期限切れ)
  g3.ms = [{ id: "ms1", d: "2026-11-01", p: 90 }, { id: "ms2", d: "2026-11-20", p: 60 }];
  return gs;
}
module.exports = { T, all };
