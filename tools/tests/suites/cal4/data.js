// plans for カレンダー その4: a 大事な one with who it is with, a weekly one with a turn called off, a birthday and an
// anniversary with the year they began, the same plan before and after, one that tells as it ends, a stamp on a day
const today = "2026-11-14"; // a Saturday
function make() {
  return {
    labels: [{ id: "l1", name: "ゼミ", color: "blue", createdAt: 1 }],
    events: [
      { id: "e1", title: "ゼミ", date: "2026-11-16", time: "10:00", endTime: "11:30", labelId: "l1", star: true, with: "田中さん", place: "3号館", createdAt: 1 },
      { id: "e2", title: "英会話", date: "2026-11-04", time: "18:00", endTime: "19:00", repeat: "weekly", alarms: [10], cancel: ["2026-11-18"], createdAt: 2 },
      { id: "e3", title: "母の誕生日", date: "2020-11-20", repeat: "yearly", fromYear: 1970, createdAt: 3 },
      { id: "e4", title: "美容院", date: "2026-10-03", time: "14:00", endTime: "15:00", place: "駅前の美容院", createdAt: 4 },
      { id: "e5", title: "美容院", date: "2026-11-21", time: "14:00", endTime: "15:00", createdAt: 5 },
      { id: "e6", title: "面接", date: "2026-11-17", time: "14:00", endTime: "15:00", endNote: true, createdAt: 6 },
      { id: "e7", title: "結婚記念日", date: "2016-11-25", repeat: "yearly", fromYear: 2016, createdAt: 7 },
    ],
    settings: [{ id: "calendar", freeFrom: "09:00", freeTo: "22:00", stamps: { "2026-11-16": "🎂" }, updatedAt: 1 }],
  };
}
module.exports = { make, today };
