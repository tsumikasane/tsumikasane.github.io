// バイト その3: one job (時給 1,200円・交通費 300円・末日締め・25日払い); today 2026-11-12 (木) 12:00
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const S = (id, date, start, end, rest = 0) => ({ id, date, start, end, rest, jobId: "j1", createdAt: T0 });
const shifts = [
  S("o1", "2026-10-05", "17:00", "22:00"), S("o2", "2026-10-12", "17:00", "22:00"),
  // 6 days in a row, 11/2〜11/7; 11/9 7 hours without rest
  ...["02", "03", "04", "05", "06", "07"].map((d, i) => S("n" + i, `2026-11-${d}`, "17:00", "21:00")),
  S("n9", "2026-11-09", "10:00", "17:00"), S("n10", "2026-11-13", "17:00", "22:00", 30), S("n11", "2026-11-20", "17:00", "22:00"),
];
const settings = [
  { id: "jobs", items: [{ id: "j1", name: "カフェ", wage: 1200, fare: 300, night: true, cutoff: 0, payday: 25 }], updatedAt: T0 },
  { id: "bt3", weekMax: 20, aim: 60000, updatedAt: T0 },
];
module.exports = { DATA: { shifts, settings }, today: "2026-11-12" };
