// the goals this round's tests and pictures start from (2026-11-11, a Wednesday)
const base = require("../r31/data");
const T = base.T;
function all() {
  const gs = base.all();
  const g1 = gs.find((g) => g.id === "g1");
  g1.why = "英語で仕事をしたいから"; g1.vision = "海外のチームと英語で話せている";
  g1.focus = true;
  g1.remind = { days: [1, 3, 5], at: "21:00" };
  g1.metric = { name: "模試の点数", unit: "点", target: 800, log: [{ id: "m1", day: "2026-09-15", v: 620, at: T("2026-09-15") }, { id: "m2", day: "2026-10-10", v: 680, at: T("2026-10-10") }, { id: "m3", day: "2026-11-08", v: 720, at: T("2026-11-08") }] };
  g1.mandala[0].c[1].mins = 95; g1.mandala[0].c[1].tlog = { "2026-11-10": 50, "2026-11-11": 45 }; g1.mandala[0].c[1].tt = T("2026-11-11", 19);
  g1.mandala[2].wt = 2; g1.mandala[5].wt = 0.5;
  const g3 = gs.find((g) => g.id === "g3");
  g3.quit = { at: T("2026-11-09", 22), why: "引っ越すことになったので" }; g3.pausedAt = T("2026-11-09", 22);
  return gs;
}
module.exports = { T, all };
