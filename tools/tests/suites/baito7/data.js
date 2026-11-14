// バイト その7: カフェ (時給 1,000円・末日締め・翌月28日払い, 土日祝なら前の平日・皆勤手当 3,000円・通勤 30 分).
// Today 2026-11-26 (木) 12:00; 11/28 is a Saturday
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const S = (id, date, start, end, more = {}) => ({ id, date, start, end, rest: 0, jobId: "j1", createdAt: T0, ...more });
const shifts = [
  S("o1", "2026-10-05", "17:00", "22:00"),
  S("n1", "2026-11-02", "17:00", "22:00"),
  S("n2", "2026-11-27", "17:00", "22:00"), // あした
  S("n3", "2026-11-30", "10:00", "15:00", { dayPay: 8000 }), // 日給
  S("x1", "2026-12-10", "17:00", "22:00"), // 試験の2日前
];
const job = { id: "j1", name: "カフェ", wage: 1000, fare: 0, night: true, cutoff: 0, payday: 28, payShift: "before", allow: 3000, allowName: "皆勤手当", commute: 30, bring: "エプロン", wageHist: [{ until: "2026-09-30", wage: 950 }] };
const settings = [
  { id: "jobs", items: [job], updatedAt: T0 },
  { id: "bt7", goOn: true, eveOn: true, eveAt: "21:00", updatedAt: T0 },
  { id: "bt7Extra", items: { "j1|2026-11": [{ id: "e1", name: "寸志", amount: 5000 }] }, updatedAt: T0 },
  { id: "studyExams", list: [{ id: "x", name: "数学", date: "2026-12-12" }], updatedAt: T0 },
];
module.exports = { DATA: { shifts, settings }, today: "2026-11-26" };
