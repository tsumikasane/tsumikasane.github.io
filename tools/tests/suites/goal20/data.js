// the goals this round's tests start from (2026-11-15, a Sunday): those of 目標 その19, with 単語帳2周 in いまやる, three
// cells done that were thought to take 1時間 and took 1時間30分 each, シャドーイング thought to take 20分, and クローゼット
// moved on on Wednesday too (11/9, 11/11, 11/13, 11/14)
const base = require("../goal19/data");
function all() {
  const gs = base.all(), g1 = gs.find((x) => x.id === "g1");
  g1.mandala[0].c[1].now = Date.parse("2026-11-15T09:00:00+09:00");
  for (const c of [g1.mandala[0].c[0], g1.mandala[1].c[0], g1.mandala[1].c[1]]) { c.est = 60; c.tlog = { "2026-10-05": 90 }; }
  g1.mandala[3].c[1].est = 20;
  gs.find((x) => x.id === "g3").mandala[1].tlog["2026-11-11"] = 10;
  return gs;
}
module.exports = { ...base, all };
