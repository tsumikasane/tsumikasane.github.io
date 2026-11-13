// the goals this round's tests start from (2026-11-11, a Wednesday): those of 目標 その6, and one to start on 12/1
const base = require("../goal6/data");
const T = base.T;
function all() {
  const gs = base.all();
  const g1 = gs.find((g) => g.id === "g1");
  g1.mandala[3].c[0].now = T("2026-11-11", 8); // 毎日15分: いまやる
  g1.mandala[0].c[2].due = "2026-11-12"; g1.mandala[2].c[1].due = "2026-11-09"; // 毎日30語 あした, 模試2回目 2日過ぎ
  g1.mandala[2].c[2].later = true; // 模試3回目: あとで
  g1.mandala[3].c[1].ord = 1; g1.mandala[3].c[0].ord = 2; // シャドーイング, then 毎日15分
  gs.push({ id: "g7", title: "ハーフマラソンを走る", criterion: "完走", deadline: "2027-03-15", depth: 2, done: false, createdAt: T("2026-11-10"), startOn: "2026-12-01", mandala: [{ t: "走る" }, null, null, null, null, null, null, null] });
  return gs;
}
const settings = [{ id: "goalPoints", rewards: [{ id: "r1", name: "ケーキを食べる", cost: 10 }, { id: "r2", name: "新しいシューズ", cost: 50 }], log: [] }];
module.exports = { T, all, settings };
