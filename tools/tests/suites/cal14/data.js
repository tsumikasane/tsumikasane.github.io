// plans for カレンダー その14 (today Monday 11/16): a class on Mondays with a turn called off, one deleted and one moved by
// itself; 面接 today with its way there; tomorrow 掃除 (all day), 歯医者, 買い物 in the afternoon and 夕食 at another place;
// 旅行 of three days with its first day's line
const today = "2026-11-16";
function make() {
  return {
    events: [
      { id: "e1", title: "線形代数", date: "2026-10-05", time: "09:00", endTime: "10:30", repeat: "weekly", repeatUntil: "2027-02-10", cls: "c1", place: "A101", skip: ["2026-10-26", "2026-11-02"], cancel: ["2026-11-09"], createdAt: 1 },
      { id: "e2", title: "線形代数", date: "2026-10-26", time: "13:00", endTime: "14:30", place: "B202", createdAt: 2 },
      { id: "e3", title: "買い物", date: "2026-11-17", part: "pm", createdAt: 30 },
      { id: "e4", title: "歯医者", date: "2026-11-17", time: "10:00", endTime: "11:00", place: "駅前クリニック", createdAt: 40 },
      { id: "e5", title: "夕食", date: "2026-11-17", time: "19:00", endTime: "21:00", place: "レストラン", createdAt: 50 },
      { id: "e6", title: "掃除", date: "2026-11-17", createdAt: 60 },
      { id: "e7", title: "旅行", date: "2026-11-20", endDate: "2026-11-22", trip: { "2026-11-20": "移動・ホテル" }, createdAt: 70 },
      { id: "e8", title: "面接", date: today, time: "14:00", endTime: "15:00", travel: 30, createdAt: 80 },
    ],
    settings: [
      { id: "calendar", freeFrom: "09:00", freeTo: "22:00", soon14: 10, review14: { on: true, at: "21:30" }, updatedAt: 1 },
      { id: "timetable", from: "2026-10-01", to: "2027-02-10", items: [{ id: "c1", wd: 1, p: 1, name: "線形代数", room: "A101" }], updatedAt: 1 },
    ],
  };
}
module.exports = { make, today };
