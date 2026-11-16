// the goals this round's tests start from (2026-11-15, a Sunday): those of 目標 その18, with 模試2回目 to be done today,
// 毎日30語 yesterday (not done), 本棚 on Tuesday and at home, and TOEIC's やる気 put in on six days before today
const base = require("../goal18/data");
function all() {
  const gs = base.all(), g1 = gs.find((x) => x.id === "g1"), g3 = gs.find((x) => x.id === "g3");
  g1.mandala[2].c[1].doOn = "2026-11-15"; g1.mandala[0].c[2].doOn = "2026-11-14";
  g3.mandala[2].doOn = "2026-11-17"; g3.mandala[2].where = "家";
  g1.mood = { ...g1.mood, "2026-11-09": 5, "2026-11-10": 4, "2026-11-11": 4, "2026-11-12": 1, "2026-11-13": 2, "2026-11-14": 2 };
  return gs;
}
module.exports = { ...base, all };
