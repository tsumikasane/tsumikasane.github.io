// the goals this round's tests start from (2026-11-11, a Wednesday): those of 目標 その10, with ToDos and plans made from
// TOEIC's cells, and 部屋を片づける going on to ハーフマラソン
const base = require("../goal10/data");
const T = base.T;
function all() {
  const gs = base.all();
  gs.find((g) => g.id === "g1").mandala[3].c[1].ev = ["e1", "e0"];
  gs.find((g) => g.id === "g3").nextGoal = "g7";
  return gs;
}
const todos = [
  { id: "t1", text: "単語の復習", done: false, due: "2026-11-12", goal: "g1", createdAt: T("2026-11-08") },
  { id: "t2", text: "模試の申し込み", done: true, doneAt: T("2026-11-09", 20), goal: "g1", createdAt: T("2026-11-01") },
  { id: "t3", text: "ほかのToDo", done: false, createdAt: T("2026-11-01") },
];
const events = [
  { id: "e1", date: "2026-11-20", time: "19:00", endTime: "20:00", title: "シャドーイング", memo: "目標「TOEIC 800点」のマス", createdAt: T("2026-11-10") },
  { id: "e0", date: "2026-11-05", time: "07:00", endTime: "08:00", title: "シャドーイング", createdAt: T("2026-11-01") },
];
module.exports = { T, all, settings: base.settings, todos, events };
