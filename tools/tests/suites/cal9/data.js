// plans for カレンダー その9: one every six weeks, plans with people and places, a long day, a plan made often, one
// deleted lately, and a past day's records
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const today = "2026-11-14"; // a Saturday
function make() {
  return {
    events: [
      { id: "e1", title: "美容院", date: "2026-10-03", time: "14:00", endTime: "15:00", repeat: "every6w", createdAt: 1 },
      { id: "e2", title: "ゼミ", date: "2026-11-16", time: "10:00", endTime: "11:30", with: "田中さん", place: "3号館", alarms: [10], createdAt: 2 },
      { id: "e3", title: "飲み会", date: "2026-11-10", time: "19:00", endTime: "21:00", with: "田中さん", place: "居酒屋", createdAt: 3 },
      { id: "e4", title: "勉強会", date: "2026-11-12", time: "13:00", endTime: "15:00", with: "佐藤さん", place: "3号館", createdAt: 4 },
      { id: "e5", title: "授業", date: "2026-11-17", time: "09:00", endTime: "18:00", createdAt: 5 },
      { id: "e6", title: "ジム", date: "2026-11-02", time: "18:00", endTime: "19:00", createdAt: 6 },
      { id: "e7", title: "ジム", date: "2026-11-09", time: "18:00", endTime: "19:00", createdAt: 7 },
    ],
    journal: [{ id: "2026-11-12", date: "2026-11-12", text: "発表がんばった", updatedAt: T("2026-11-12", 22) }],
    meals: [{ id: "m1", date: "2026-11-12", slot: "昼食", text: "カレー", createdAt: T("2026-11-12", 12) }],
    study: [{ id: "s1", date: "2026-11-12", minutes: 90, createdAt: T("2026-11-12", 20) }],
    expenses: [{ id: "x1", date: "2026-11-12", kind: "out", category: "食費", amount: 800, createdAt: T("2026-11-12", 12) }],
    weights: [{ id: "2026-11-12", kg: 60.2, createdAt: T("2026-11-12", 7) }],
    deleted: [{ id: "events/e9", store: "events", rid: "e9", at: T("2026-11-13", 10), data: { id: "e9", title: "削除した予定", date: "2026-11-01", createdAt: 9 } }],
    settings: [{ id: "calendar", freeFrom: "09:00", freeTo: "22:00", updatedAt: 1 }],
  };
}
module.exports = { make, today };
