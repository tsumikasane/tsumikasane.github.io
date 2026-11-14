// バイト その9: カフェ (時給 1,000円・交通費 300円・末日締め・翌月25日払い) and 塾 (時給 1,500円, 11/10 にやめた).
// Today 2026-11-26 (木) 12:00, 出勤 at 10:00; 11/23 is 勤労感謝の日
const T0 = Date.parse("2026-10-01T09:00:00+09:00");
const S = (id, date, start, end, jobId = "j1", more = {}) => ({ id, date, start, end, rest: 0, jobId, createdAt: T0, ...more });
const shifts = [
  S("a1", "2026-11-02", "17:00", "22:00"), S("a2", "2026-11-09", "17:00", "22:00"),
  S("h23", "2026-11-23", "17:00", "23:00"), // 祝日, 1 時間が深夜
  S("o1", "2026-11-24", "10:00", "15:00"), S("o2", "2026-11-24", "14:00", "16:00"), // 重なる
  S("td", "2026-11-26", "10:00", "15:00"), // きょうの予定
  S("b1", "2026-10-06", "18:00", "21:00", "j2"), S("b2", "2026-10-20", "18:00", "21:00", "j2"), S("b3", "2026-11-03", "18:00", "21:00", "j2"),
];
const settings = [
  { id: "jobs", items: [
    { id: "j1", name: "カフェ", wage: 1000, fare: 300, night: true, cutoff: 0, payday: 25 },
    { id: "j2", name: "塾", wage: 1500, fare: 0, night: true, cutoff: 0, payday: 25, ended: "2026-11-10" },
  ], wall: 1030000, updatedAt: T0 },
  { id: "bt2Clock", jobId: "j1", date: "2026-11-26", start: "10:00", at: Date.parse("2026-11-26T10:00:00+09:00"), updatedAt: T0 },
];
module.exports = { DATA: { shifts, settings }, today: "2026-11-26" };
