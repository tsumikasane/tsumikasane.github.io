// the goals this round's tests start from (2026-11-11, a Wednesday): those of 目標 その9, with a memo and a counted cell
// gone up three days in a row
const base = require("../goal9/data");
const T = base.T;
function all() {
  const gs = base.all();
  const g1 = gs.find((g) => g.id === "g1");
  g1.mandala[0].c[1].m = "公式の単語帳";
  g1.mandala[0].c[1].log = { ...g1.mandala[0].c[1].log, "2026-11-09": 10, "2026-11-11": 5 };
  return gs;
}
module.exports = { T, all, settings: base.settings };
