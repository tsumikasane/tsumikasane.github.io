// plans for カレンダー その5: a run of days, a weekly one resting for a while, a birthday, the same plan three times this
// year, one put in twice, and a plan with no day yet
const today = "2026-11-14"; // a Saturday
function make() {
  return {
    events: [
      { id: "e1", title: "合宿", date: "2026-11-20", endDate: "2026-11-23", createdAt: 1 },
      { id: "e2", title: "英会話", date: "2026-11-04", time: "18:00", endTime: "19:00", repeat: "weekly", alarms: [10], pauseFrom: "2026-11-23", pauseTo: "2026-12-06", createdAt: 2 },
      { id: "e3", title: "母の誕生日", date: "2020-11-20", repeat: "yearly", fromYear: 1970, createdAt: 3 },
      { id: "e4", title: "美容院", date: "2026-03-01", time: "14:00", endTime: "15:00", createdAt: 4 },
      { id: "e5", title: "美容院", date: "2026-07-01", time: "14:00", endTime: "15:00", createdAt: 5 },
      { id: "e6", title: "美容院", date: "2026-11-21", time: "14:00", endTime: "15:00", createdAt: 6 },
      { id: "e7", title: "ゼミ", date: "2026-11-16", time: "10:00", endTime: "11:30", createdAt: 7 },
      { id: "e8", title: "ゼミ", date: "2026-11-16", time: "10:00", endTime: "11:30", createdAt: 8 },
      { id: "e9", title: "面接", date: "2026-11-16", time: "14:00", endTime: "15:00", createdAt: 9 },
    ],
    settings: [{ id: "calendar", freeFrom: "09:00", freeTo: "22:00", someday: [{ id: "s1", t: "温泉旅行", at: 1 }], updatedAt: 1 }],
  };
}
module.exports = { make, today };
