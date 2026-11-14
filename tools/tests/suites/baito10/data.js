// バイト その10: カフェ (時給 1,000円・交通費 300円・末日締め・翌月25日払い・契約 11/27 まで; 前は 950円) and 配達 (時給
// 1,000円・出来高 1件 300円・末日締め・翌月10日払い). Today 2026-11-16 (月) 12:00, a カフェ shift 12:00〜17:00
const T0 = Date.parse("2026-09-01T09:00:00+09:00");
const S = (id, date, start, end, jobId = "j1", more = {}) => ({ id, date, start, end, rest: 0, jobId, createdAt: T0, ...more });
const shifts = [
  S("c1", "2026-10-05", "10:00", "15:00", "j1", { with: ["田中", "佐藤"] }), S("c2", "2026-10-12", "10:00", "15:00", "j1", { with: ["田中"] }),
  S("c3", "2026-11-02", "10:00", "15:00", "j1", { with: ["田中"] }),
  S("td", "2026-11-16", "12:00", "17:00"), // きょう
  S("d1", "2026-11-03", "17:00", "20:00", "j2", { units: 12 }), S("d2", "2026-11-10", "17:00", "20:00", "j2", { units: 8 }),
];
const settings = [
  { id: "jobs", items: [
    { id: "j1", name: "カフェ", wage: 1000, fare: 300, night: true, cutoff: 0, payday: 25, wageHist: [{ until: "2026-09-30", wage: 950 }],
      checks: { in: ["名札をつける", "シフト表を見る"], out: ["レジ締め"] }, contractEnd: "2026-11-27",
      skills: [{ id: "s1", name: "レジ", date: "2026-06-10" }], lent: [{ id: "l1", name: "制服", date: "2026-04-01" }] },
    { id: "j2", name: "配達", wage: 1000, fare: 0, night: true, cutoff: 0, payday: 10, unitPrice: 300 },
  ], updatedAt: T0 },
];
module.exports = { DATA: { shifts, settings }, today: "2026-11-16" };
