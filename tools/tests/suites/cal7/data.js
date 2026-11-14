// plans for カレンダー その7: a 大事な one with 持ち物 running into another, a weekly one resting on holidays (and on a day
// off of one's own), the same plan at a six-week gap, a plan with a mark and a label with its own 通知アラーム, two
// plans with ふりかえり, a set of 持ち物
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const today = "2026-11-14"; // a Saturday
function make() {
  return {
    labels: [{ id: "l1", name: "ゼミ", color: "blue", createdAt: 1 }, { id: "l2", name: "遊び", color: "orange", createdAt: 2 }],
    events: [
      { id: "e1", title: "面接", date: "2026-11-17", time: "14:00", endTime: "15:00", star: true, place: "〇〇ビル", checks: [{ id: "c1", text: "履歴書" }, { id: "c2", text: "印鑑", done: true }], createdAt: 1 },
      { id: "e2", title: "歯医者", date: "2026-11-17", time: "14:30", endTime: "15:00", createdAt: 2 },
      { id: "e3", title: "英会話", date: "2026-11-04", time: "18:00", endTime: "19:00", repeat: "weekly", noHol: true, createdAt: 3 },
      { id: "e4", title: "美容院", date: "2026-08-01", time: "14:00", endTime: "15:00", createdAt: 4 },
      { id: "e5", title: "美容院", date: "2026-09-12", time: "14:00", endTime: "15:00", createdAt: 5 },
      { id: "e6", title: "美容院", date: "2026-10-24", time: "14:00", endTime: "15:00", place: "駅前の美容院", createdAt: 6 },
      { id: "e7", title: "ゼミ", date: "2026-11-16", time: "10:00", endTime: "11:30", labelId: "l1", mark: "🎓", createdAt: 7 },
      { id: "e8", title: "サークル", date: "2026-11-10", time: "18:00", endTime: "20:00", notes: { "2026-11-10": { mood: "good", text: "楽しかった", at: T("2026-11-10", 21) } }, createdAt: 8 },
      { id: "e9", title: "発表", date: "2026-11-12", time: "13:00", endTime: "14:00", notes: { "2026-11-12": { mood: "bad", text: "緊張した", at: T("2026-11-12", 15) } }, createdAt: 9 },
    ],
    settings: [{ id: "calendar", freeFrom: "09:00", freeTo: "22:00", offDays: [{ id: "o1", name: "創立記念日", from: "2026-11-18", to: "2026-11-18" }], labelAlarms: { l1: 30 },
      checkSets: [{ id: "k1", name: "旅行", items: ["充電器", "歯ブラシ"] }], updatedAt: 1 }],
  };
}
module.exports = { make, today };
