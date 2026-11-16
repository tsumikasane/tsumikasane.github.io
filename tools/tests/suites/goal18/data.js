// the goals this round's tests start from (2026-11-15, a Sunday): those of 目標 その17, with TOEIC put first (重点), moved
// on the last two days, 部屋を片づける moved on the two days before today, シャドーイング to do after 毎日15分, a checklist in
// 模試2回目, and time kept over a few weeks
const base = require("../goal17/data");
function all() {
  const gs = base.all(), g1 = gs.find((x) => x.id === "g1"), c01 = g1.mandala[0].c[1];
  g1.focus = true;
  c01.log = { ...c01.log, "2026-11-13": 5, "2026-11-14": 8 }; c01.v += 13;
  g1.mandala[3].c[1].pre = { p: "3.0", t: "毎日15分" };
  g1.mandala[2].c[1].list = [{ t: "問題を解く", d: true }, { t: "採点する" }, { t: "復習する" }];
  g1.mandala[3].c[0].tlog = { "2026-11-15": 15, "2026-10-28": 30 };
  const c31 = gs.find((x) => x.id === "g3").mandala[1];
  c31.tlog = { ...c31.tlog, "2026-11-13": 10, "2026-11-14": 10 };
  return gs;
}
module.exports = { ...base, all };
