// バイト その8: カフェ (時給 1,000円, 12/1 から 1,100円・末日締め・翌月25日払い), worked 月曜と木曜 17-22 since 10/1.
// Today 2026-11-26 (木) 12:00
const T0 = Date.parse("2026-10-01T09:00:00+09:00");
const S = (id, date, start, end, more = {}) => ({ id, date, start, end, rest: 0, jobId: "j1", createdAt: T0, ...more });
const shifts = [];
const day = (d) => new Date(Date.parse(d + "T00:00:00Z"));
for (let t = day("2026-10-01"); t <= day("2026-11-22"); t = new Date(t.getTime() + 864e5)) {
  const wd = t.getUTCDay(), d = t.toISOString().slice(0, 10);
  if (wd === 1 || wd === 4) shifts.push(S("w" + d, d, "17:00", "22:00"));
}
shifts.push(
  S("p23", "2026-11-23", "17:00", "22:30", { plan: { start: "17:00", end: "22:00" }, clocked: true }), // 予定より 30 分長く
  S("f13", "2026-11-13", "17:00", "22:00"), S("l14", "2026-11-14", "09:00", "19:00", { rest: 60 }), // 11/12〜14 の 3 連勤, 9 時間
  S("t27", "2026-11-27", "17:00", "22:00"), // あした
  S("d03", "2026-12-03", "17:00", "22:00"), // 1,100円 から
);
const settings = [
  { id: "jobs", items: [{ id: "j1", name: "カフェ", wage: 1000, fare: 0, night: true, cutoff: 0, payday: 25, wageNext: { from: "2026-12-01", wage: 1100 } }], updatedAt: T0 },
  { id: "bt8", inOn: true, updatedAt: T0 },
  { id: "bt5Slip", items: { "j1|2026-10": { gross: 40000, tax: 1000, ins: 200 } }, updatedAt: T0 },
];
module.exports = { DATA: { shifts, settings }, today: "2026-11-26" };
