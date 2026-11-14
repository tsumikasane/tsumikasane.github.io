// plans for カレンダー その10: one on the 2nd and 4th Mondays, a weekly one with a note for one turn, one a year ago,
// two countdowns, one by train with time to get ready, three at 10:00 (a time used often)
const today = "2026-11-14"; // a Saturday
function make() {
  return {
    events: [
      { id: "e1", title: "サークル", date: "2026-11-09", time: "18:00", endTime: "20:00", repeat: "monthlyNth", nths: [2, 4], createdAt: 1 },
      { id: "e2", title: "英会話", date: "2026-11-04", time: "18:00", endTime: "19:00", repeat: "weekly", turnNotes: { "2026-11-18": "テーマは自己紹介" }, createdAt: 2 },
      { id: "e3", title: "合宿", date: "2025-11-16", createdAt: 3 },
      { id: "e4", title: "旅行", date: "2026-12-01", count: true, createdAt: 4 },
      { id: "e5", title: "誕生日", date: "2027-01-10", count: true, createdAt: 5 },
      { id: "e6", title: "面接", date: "2026-11-17", time: "14:00", endTime: "15:00", travel: 30, by: "電車", prep: 30, place: "〇〇ビル", createdAt: 6 },
      { id: "e7", title: "歯医者", date: "2026-10-01", time: "10:00", endTime: "11:00", createdAt: 7 },
      { id: "e8", title: "美容院", date: "2026-10-15", time: "10:00", endTime: "11:00", createdAt: 8 },
      { id: "e9", title: "買い物", date: "2026-11-02", time: "10:00", endTime: "11:00", createdAt: 9 },
    ],
    settings: [{ id: "calendar", freeFrom: "09:00", freeTo: "22:00", updatedAt: 1 }],
  };
}
module.exports = { make, today };
