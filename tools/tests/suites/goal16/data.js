// the goals this round's tests start from (2026-11-15, a Sunday): those of 目標 その15, with 社会人になるまでに sorted
// as 学び and TOEIC with a 週のノルマ of 3
const base = require("../goal15/data");
function all() {
  const gs = base.all();
  gs.find((g) => g.id === "g2").tag = "study";
  gs.find((g) => g.id === "g1").quota = 3;
  return gs;
}
module.exports = { ...base, all };
