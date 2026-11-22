// plans for カレンダー その18 (today Monday 11/16, 10:00): 線形代数 (a class, Mondays, its last turn on 11/23), ゼミ,
// 会議, 面接 (kept secret, an hour's notification) and 夕食 today; 打ち合わせ held (仮) on three days; 旅行 at the
// weekend, its payment due tomorrow; ゼミ's label with its length, place and words
const today = "2026-11-16";
function make() {
  return {
    events: [
      { id: "e1", title: "旅行", date: "2026-11-21", endDate: "2026-11-22", place: "京都", due18: { k: "pay", d: "2026-11-17" }, createdAt: 1 },
      { id: "e2", title: "面接", date: today, time: "14:00", endTime: "15:00", place: "本社", memo: "社名はひみつ", alarms: [60], secret: true, createdAt: 2 },
      { id: "e3", title: "ゼミ", date: today, time: "10:00", endTime: "12:00", labelId: "l1", createdAt: 3 },
      { id: "e4", title: "会議", date: today, time: "12:30", endTime: "13:00", createdAt: 4 },
      { id: "e5", title: "夕食", date: today, time: "16:00", endTime: "17:00", createdAt: 5 },
      { id: "e6", title: "打ち合わせ", date: "2026-11-19", time: "15:00", endTime: "16:00", ten: true, cands: [{ date: "2026-11-20", time: "10:00", endTime: "11:00" }, { date: "2026-11-21" }], createdAt: 6 },
      { id: "e7", title: "線形代数", date: "2026-10-05", time: "09:00", endTime: "10:30", repeat: "weekly", repeatUntil: "2026-11-23", cls: "c1", labelId: "l2", place: "A101", createdAt: 7 },
    ],
    labels: [{ id: "l1", name: "ゼミ", color: "blue", createdAt: 1 }, { id: "l2", name: "授業", color: "orange", createdAt: 2 }],
    settings: [
      { id: "calendar", freeFrom: "09:00", freeTo: "22:00", last18: true, labelDefs18: { l1: { len: 90, place: "研究棟", words: "ゼミ、輪講" } }, updatedAt: 1 },
      { id: "timetable", from: "2026-10-01", to: "2027-02-10", items: [{ id: "c1", wd: 1, p: 1, name: "線形代数", room: "A101", teacher: "田中先生" }, { id: "c2", wd: 3, p: 2, name: "英語", room: "B202" }], updatedAt: 1 },
    ],
  };
}
module.exports = { make, today };
