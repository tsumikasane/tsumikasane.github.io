// plans for カレンダー その8: one with the way there and back, one to move to the next free time (a long one after it),
// two found by a word, a label with hours a week, a ひな形 of a day; and a timetable apart
const today = "2026-11-14"; // a Saturday
function make() {
  return {
    labels: [{ id: "l1", name: "ゼミ", color: "blue", createdAt: 1 }, { id: "l2", name: "勉強", color: "green", createdAt: 2 }],
    events: [
      { id: "e1", title: "ゼミ", date: "2026-11-16", time: "10:00", endTime: "11:30", labelId: "l1", travel: 30, travelBack: 40, createdAt: 1 },
      { id: "e2", title: "面接", date: "2026-11-16", time: "13:00", endTime: "14:00", createdAt: 2 },
      { id: "e3", title: "打ち合わせ", date: "2026-11-17", time: "10:00", endTime: "11:00", createdAt: 3 },
      { id: "e4", title: "授業", date: "2026-11-17", time: "11:00", endTime: "17:00", createdAt: 4 },
      { id: "e6", title: "勉強", date: "2026-11-12", time: "13:00", endTime: "16:00", labelId: "l2", createdAt: 6 },
      { id: "e7", title: "ゼミ発表", date: "2026-11-20", time: "15:00", endTime: "16:00", createdAt: 7 },
    ],
    settings: [{ id: "calendar", freeFrom: "09:00", freeTo: "22:00", labelGoals: { l2: 10 },
      dayTpls: [{ id: "t1", name: "平日", plans: [{ title: "朝ラン", time: "06:30", endTime: "07:00" }, { title: "英語", time: "21:00", endTime: "21:30", labelId: "l2", checks: ["単語帳"] }] }], updatedAt: 1 }],
  };
}
// a timetable on its own (its classes become plans)
function makeTT() {
  return { settings: [{ id: "timetable", from: "2026-10-01", to: "2027-01-31", items: [{ id: "c1", wd: 1, p: 1, name: "線形代数", room: "A101" }, { id: "c2", wd: 3, p: 3, name: "英語" }], updatedAt: 1 }] };
}
module.exports = { make, makeTT, today };
