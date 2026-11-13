// the goals this round's tests start from (2026-11-11, a Wednesday): those of 目標 その7, with days of the week, time spent
const base = require("../goal7/data");
const T = base.T;
function all() {
  const gs = base.all();
  const g1 = gs.find((g) => g.id === "g1");
  g1.mandala[3].c[1].wd = [3]; // シャドーイング: 水曜日
  g1.mandala[0].c[1].wd = [1, 3, 5]; // 単語帳2周 (counted): 月水金
  g1.mandala[0].c[1].tlog = { "2026-11-10": 50, "2026-11-11": 45 };
  const g3 = gs.find((g) => g.id === "g3");
  g3.mandala[1].tlog = { "2026-11-09": 30, "2026-11-03": 20 };
  return gs;
}
module.exports = { T, all, settings: base.settings };
