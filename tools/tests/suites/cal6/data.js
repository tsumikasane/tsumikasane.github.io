// plans for カレンダー その6: two on a day to move at once, a weekly one, today's three (over, going on, to come), a plan
// with a 費用, a place with a 移動時間, old plans to tidy away (and an old class, kept), two labels and a shift
const today = "2026-11-14"; // a Saturday
function make() {
  return {
    labels: [{ id: "l1", name: "ゼミ", color: "blue", createdAt: 1 }, { id: "l2", name: "遊び", color: "orange", createdAt: 2 }],
    events: [
      { id: "e1", title: "ゼミ", date: "2026-11-16", time: "10:00", endTime: "11:30", labelId: "l1", place: "3号館", travel: 30, createdAt: 1 },
      { id: "e2", title: "英会話", date: "2026-11-04", time: "18:00", endTime: "19:00", repeat: "weekly", labelId: "l2", createdAt: 2 },
      { id: "e3", title: "飲み会", date: "2026-11-16", time: "19:00", endTime: "21:00", labelId: "l2", cost: 4000, createdAt: 3 },
      { id: "e4", title: "歯医者", date: today, time: "09:00", endTime: "09:30", createdAt: 4 },
      { id: "e5", title: "買い物", date: today, time: "10:00", endTime: "11:00", createdAt: 5 },
      { id: "e6", title: "映画", date: today, time: "13:00", endTime: "15:00", createdAt: 6 },
      { id: "e7", title: "旅行", date: "2024-08-01", endDate: "2024-08-03", createdAt: 7 },
      { id: "e8", title: "サークル", date: "2023-04-05", time: "17:00", endTime: "18:00", repeat: "weekly", repeatUntil: "2024-03-27", createdAt: 8 },
      { id: "e9", title: "線形代数", date: "2023-04-10", time: "09:00", endTime: "10:30", repeat: "weekly", repeatUntil: "2023-07-31", cls: "c1", createdAt: 9 },
      { id: "e10", title: "美容院", date: "2026-10-03", time: "14:00", endTime: "15:00", place: "駅前の美容院", labelId: "l2", createdAt: 10 },
    ],
    shifts: [{ id: "s1", date: "2026-11-20", start: "17:00", end: "22:00", createdAt: 1 }],
    settings: [{ id: "calendar", freeFrom: "09:00", freeTo: "22:00", updatedAt: 1 }],
  };
}
module.exports = { make, today };
