// バイト その6: カフェ (時給 1,000円・交通費は1か月 300円・末日締め・翌月25日払い, 12/29〜1/3 は +200円). Today 2026-11-26 (木) 12:00
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const S = (id, date, start, end, more = {}) => ({ id, date, start, end, rest: 0, jobId: "j1", createdAt: T0, ...more });
const shifts = [
  S("n1", "2026-11-02", "17:00", "22:00"),
  S("n2", "2026-11-09", "17:00", "22:00", { tentative: true }),
  S("n3", "2026-11-25", "17:00", "22:00"), // きのう: まだふりかえっていない
  S("d1", "2026-12-30", "17:00", "22:00"), // 年末: +200円
];
const job = { id: "j1", name: "カフェ", wage: 1000, fare: 300, fareMode: "month", night: true, cutoff: 0, payday: 25, periods: [{ from: "2026-12-29", to: "2027-01-03", plus: 200 }], notes: "レジ締めは22時" };
const settings = [
  { id: "jobs", items: [job], wall: 1030000, wall2: 1300000, wall2Name: "130万の壁", updatedAt: T0 },
  { id: "bt6", pats: [{ id: "p1", name: "早番", start: "09:00", end: "14:00", rest: 30 }], updatedAt: T0 },
];
module.exports = { DATA: { shifts, settings }, today: "2026-11-26", T0 };
