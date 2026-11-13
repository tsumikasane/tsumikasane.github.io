// バイト その4: カフェ (時給 1,000円・末日締め・翌月25日払い, 6:00〜9:00 は +100円, 1回 300円 引かれる, 給料日に自動で収入)
// and 塾 (時給 1,500円), worked every Tuesday and Saturday from 2025-11-04. Today 2026-11-26 (木) 12:00
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const S = (id, date, start, end, rest = 0, jobId = "j1", more = {}) => ({ id, date, start, end, rest, jobId, createdAt: T0, ...more });
const shifts = [
  S("o1", "2026-10-05", "17:00", "22:00"),
  S("n1", "2026-11-02", "09:00", "19:00", 60), // 9 時間: 1 時間が 8 時間をこえる
  S("n2", "2026-11-03", "06:00", "10:00"), // 6:00〜9:00 の 3 時間が時給アップ
  S("n3", "2026-11-28", "17:00", "22:00", 0, "j1", { memo: "研修" }), // 歯医者とかぶる
];
// 塾: Tuesdays and Saturdays, 2025-11-04 〜 2026-11-21
const day = (d) => new Date(Date.parse(d + "T00:00:00Z"));
for (let t = day("2025-11-04"); t <= day("2026-11-21"); t = new Date(t.getTime() + 864e5)) {
  const wd = t.getUTCDay(), d = t.toISOString().slice(0, 10);
  if (wd === 2 || wd === 6) shifts.push(S("j" + d, d, "18:00", "21:00", 0, "j2"));
}
const settings = [{ id: "jobs", items: [
  { id: "j1", name: "カフェ", wage: 1000, fare: 0, night: true, cutoff: 0, payday: 25, band: { from: "06:00", to: "09:00", plus: 100 }, deduct: 300, autoIn: "2026-10-01" },
  { id: "j2", name: "塾", wage: 1500, fare: 0, night: true, cutoff: 0, payday: 0 },
], updatedAt: T0 }];
const events = [{ id: "e1", title: "歯医者", date: "2026-11-28", time: "18:00", endTime: "19:00", createdAt: T0 }];
module.exports = { DATA: { shifts, settings, events }, today: "2026-11-26" };
