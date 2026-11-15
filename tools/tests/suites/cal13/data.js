// plans for カレンダー その13 (today Monday 11/16): a class on Mondays (the timetable's, its term from 10/1), 家賃 on the 27th
// moved to the weekday before, 勉強会 put in yesterday with links in its memo, a birthday with an alarm on the day, ライブ
// for a photo; the season's days on, two kinds of rubbish with their notification the evening before, 美術館 without a day
const today = "2026-11-16";
function make() {
  return {
    events: [
      { id: "e1", title: "線形代数", date: "2026-10-05", time: "09:00", endTime: "10:30", repeat: "weekly", repeatUntil: "2027-02-10", cls: "c1", place: "A101", createdAt: 1 },
      { id: "e2", title: "家賃", date: "2026-10-27", repeat: "monthly", biz: "before", createdAt: 2 },
      { id: "e3", title: "勉強会", date: "2026-11-18", time: "18:00", endTime: "20:00", memo: "資料：https://example.com/docs/a.pdf と https://www.example.org/。", createdAt: Date.parse("2026-11-15T12:00:00+09:00") },
      { id: "e4", title: "誕生日", date: "2026-11-20", alarms: [0], createdAt: 4 },
      { id: "e5", title: "ライブ", date: "2026-11-21", time: "18:00", endTime: "21:00", createdAt: 5 },
    ],
    settings: [
      { id: "calendar", freeFrom: "09:00", freeTo: "22:00", gyoji: true, someday: [{ id: "s1", t: "美術館", at: 1 }],
        trash13: { items: [{ id: "t1", name: "燃えるゴミ", wd: [1, 4] }, { id: "t2", name: "資源ゴミ", wd: [3], nth: [2, 4] }], on: true, when: "eve", at: "20:00" }, updatedAt: 1 },
      { id: "timetable", from: "2026-10-01", to: "2027-02-10", items: [{ id: "c1", wd: 1, p: 1, name: "線形代数", room: "A101" }], updatedAt: 1 },
    ],
  };
}
module.exports = { make, today };
