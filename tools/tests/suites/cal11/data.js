// plans for カレンダー その11: a week (11/15〜11/21) of plans of one day each and two that repeat, a class (数学, from the
// timetable) on Fridays, a plan to meet before (飲み会), one online with a phone number, one with a word for its alarm
const today = "2026-11-14"; // a Saturday
function make() {
  return {
    events: [
      { id: "e1", title: "ゼミ準備", date: "2026-11-16", time: "10:00", endTime: "11:00", createdAt: 1 },
      { id: "e2", title: "ジム", date: "2026-11-18", time: "19:00", endTime: "20:00", createdAt: 2 },
      { id: "e3", title: "英会話", date: "2026-11-03", time: "18:00", endTime: "19:00", repeat: "weekly", createdAt: 3 },
      { id: "e4", title: "数学", date: "2026-11-06", time: "09:00", endTime: "10:30", repeat: "weekly", repeatUntil: "2027-02-10", cls: "c1", subjectId: "s1", createdAt: 4 },
      { id: "e5", title: "飲み会", date: "2026-11-20", time: "18:00", endTime: "21:00", place: "渋谷", travel: 30, meet: "17:30", meetPlace: "ハチ公前", alarms: [60], createdAt: 5 },
      { id: "e6", title: "オンライン面談", date: "2026-11-19", time: "15:00", endTime: "16:00", online: true, url: "https://meet.example.com/abc", tel: "03-1234-5678", createdAt: 6 },
      { id: "e7", title: "歯医者", date: "2026-11-21", time: "10:00", endTime: "11:00", alarms: [10], say: "保険証を持っていく", createdAt: 7 },
    ],
    subjects: [{ id: "s1", name: "数学", createdAt: 1 }, { id: "s2", name: "英語", createdAt: 2 }],
    settings: [
      { id: "calendar", freeFrom: "09:00", freeTo: "22:00", updatedAt: 1 },
      { id: "timetable", from: "2026-10-01", to: "2027-02-10", items: [{ id: "c1", wd: 5, p: 1, name: "数学", subjectId: "s1" }], updatedAt: 1 },
    ],
  };
}
module.exports = { make, today };
