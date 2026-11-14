// バイト その5: カフェ (時給 1,000円・末日締め・翌月25日払い・通勤 30 分). Today 2026-11-26 (木) 12:00
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const S = (id, date, start, end, more = {}) => ({ id, date, start, end, rest: 0, jobId: "j1", createdAt: T0, ...more });
const shifts = [
  S("o1", "2026-10-06", "17:00", "22:00"), S("o2", "2026-10-20", "17:00", "22:00"),
  S("n1", "2026-11-02", "17:00", "22:00"),
  S("n2", "2026-11-09", "10:00", "15:00", { wage: 1500 }), // この回だけ 1,500円
  S("n3", "2026-11-16", "17:00", "22:00", { memo: "研修" }),
  S("n4", "2026-11-27", "17:00", "22:00"), // あした
];
const job = { id: "j1", name: "カフェ", wage: 1000, fare: 0, night: true, cutoff: 0, payday: 25, commute: 30, tel: "03-1234-5678", addr: "東京都新宿区1-2-3", bring: "エプロン、名札" };
const settings = [
  { id: "jobs", items: [job], updatedAt: T0 },
  { id: "bt3", weekMax: 20, updatedAt: T0 },
  { id: "bt5Leave", items: [{ id: "l1", jobId: "j1", date: "2026-11-05", hours: 5 }], updatedAt: T0 },
  { id: "bt5Off", items: [{ id: "f1", why: "swap", at: T0, shift: { id: "n9", date: "2026-11-12", start: "17:00", end: "22:00", rest: 0, jobId: "j1", createdAt: T0 } }], updatedAt: T0 },
  { id: "bt5Slip", items: { "j1|2026-10": { gross: 10000, ins: 60 } }, updatedAt: T0 },
];
const events = [{ id: "e1", title: "飲み会", date: "2026-12-05", time: "19:00", endTime: "21:00", createdAt: T0 }];
module.exports = { DATA: { shifts, settings, events }, today: "2026-11-26", job };
