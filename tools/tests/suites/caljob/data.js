// for the shifts' colour in the calendar (today Wednesday 11/18, 10:00): the バイト label (orange) and a plan of it
// tomorrow; カフェ (a job of its own colour, pink) and its shift tonight; ゼミ (blue) this morning; 仕事 (purple), a label
// 家計簿のバイト may be linked by
const { T0 } = require("./lib");
const today = "2026-11-18";
function make() {
  return {
    labels: [{ id: "l1", name: "バイト", color: "orange", createdAt: 1 }, { id: "l2", name: "ゼミ", color: "blue", createdAt: 2 }, { id: "l3", name: "仕事", color: "purple", createdAt: 3 }],
    events: [
      { id: "e1", title: "ゼミ", date: today, time: "10:00", endTime: "11:30", labelId: "l2", createdAt: 1 },
      { id: "e2", title: "バイト", date: "2026-11-19", time: "17:00", endTime: "21:00", labelId: "l1", createdAt: 2 },
    ],
    shifts: [{ id: "s1", date: today, start: "17:00", end: "22:00", jobId: "j1", createdAt: 1 }],
    settings: [
      { id: "calendar", updatedAt: T0 },
      { id: "jobs", items: [{ id: "j1", name: "カフェ", wage: 1100, cutoff: 0, payday: 25, color: "pink" }], updatedAt: T0 },
    ],
  };
}
module.exports = { make, today };
