// the goals this round's tests start from (2026-11-14, a Saturday): those of 目標 その12, with 朝ランを習慣に (four of
// its five runs done on three mornings in a row, its 期限 two days past), and the weekly 見直し notification on
const base = require("../goal12/data");
const T = base.T;
const J = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
function all() {
  const gs = base.all();
  gs.push({ id: "g8", title: "朝ランを習慣に", criterion: "5回走る", deadline: "2026-11-12", depth: 1, done: false, createdAt: J("2026-11-10", "07:00"),
    mandala: [{ t: "1回目", d: true, at: J("2026-11-11", "06:30") }, { t: "2回目", d: true, at: J("2026-11-12", "06:40") }, { t: "3回目", d: true, at: J("2026-11-13", "06:35") },
      { t: "4回目", d: true, at: J("2026-11-13", "18:00") }, { t: "5回目" }, null, null, null] });
  return gs;
}
const settings = [...base.settings, { id: "goalReview", on: true, wd: 0, at: "20:00", updatedAt: J("2026-11-01", "09:00") }];
module.exports = { T, all, settings, todos: base.todos, events: base.events };
