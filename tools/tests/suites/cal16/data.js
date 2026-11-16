// plans for カレンダー その16 (today Monday 11/16, 10:00): 線形代数 (a class, Mondays) at 9:00, ゼミ, 面接 (its way there, a
// notification an hour before, 履歴書 still to take) and 夕食 today, each at its place; 歯医者 tomorrow; 会議 every
// Wednesday and ランチ on 11/18; ジム and 英会話 every Tuesday evening since September; 映画 in October and 旅行 (★) in
// August; a timetable of two classes, one with its 単位
const today = "2026-11-16";
function make() {
  return {
    events: [
      { id: "e1", title: "ゼミ", date: today, time: "10:00", endTime: "12:00", place: "研究棟", createdAt: 1 },
      { id: "e2", title: "面接", date: today, time: "14:00", endTime: "15:00", place: "本社", travel: 30, alarms: [60], checks: [{ id: "k1", text: "履歴書" }, { id: "k2", text: "印鑑", done: true }], createdAt: 2 },
      { id: "e3", title: "夕食", date: today, time: "19:00", endTime: "21:00", place: "レストラン", with: "田中", createdAt: 3 },
      { id: "e4", title: "線形代数", date: "2026-10-05", time: "09:00", endTime: "10:30", repeat: "weekly", repeatUntil: "2027-02-10", cls: "c1", place: "A101", labelId: "lc", createdAt: 4 },
      { id: "e5", title: "会議", date: "2026-11-04", time: "10:00", endTime: "11:00", repeat: "weekly", createdAt: 5 },
      { id: "e6", title: "歯医者", date: "2026-11-17", time: "10:00", endTime: "11:00", place: "駅前クリニック", createdAt: 6 },
      { id: "e7", title: "ジム", date: "2026-09-01", time: "18:00", endTime: "20:00", repeat: "weekly", place: "ジム", createdAt: 7 },
      { id: "e8", title: "英会話", date: "2026-09-01", time: "18:00", endTime: "19:00", repeat: "weekly", place: "駅前教室", createdAt: 8 },
      { id: "e9", title: "映画", date: "2026-10-24", time: "18:00", endTime: "20:00", place: "映画館", with: "田中", createdAt: 9 },
      { id: "e10", title: "旅行", date: "2026-08-10", endDate: "2026-08-12", place: "京都", with: "家族", star: true, createdAt: 10 },
      { id: "e11", title: "ランチ", date: "2026-11-18", time: "12:00", endTime: "13:00", createdAt: 11 },
    ],
    labels: [{ id: "lc", name: "授業", color: "blue", createdAt: 1 }],
    settings: [
      { id: "calendar", freeFrom: "09:00", freeTo: "22:00", updatedAt: 1 },
      { id: "timetable", from: "2026-10-01", to: "2027-02-10", items: [{ id: "c1", wd: 1, p: 1, name: "線形代数", room: "A101" }, { id: "c2", wd: 3, p: 2, name: "英語", room: "B202", credit: 1 }], updatedAt: 1 },
    ],
  };
}
module.exports = { make, today };
