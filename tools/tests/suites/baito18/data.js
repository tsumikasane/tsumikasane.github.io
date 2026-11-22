// 締め日と給料日を2回ずつ: カフェ (時給 1,000円) は 15日締め・25日払い と 末日締め・翌月10日払い; 塾 (時給 1,500円) は
// 末日締め・翌月10日払い だけ (いままでどおり). Today 2026-11-20 (金) 12:00. カフェ 17:00〜21:00 (4時間・4,000円) を
// 10/28, 11/5, 11/12, 11/18, 11/25 に; 塾 16:00〜18:00 (2時間・3,000円) を 11/7 に
const today = "2026-11-20";
const T0 = Date.parse("2026-10-01T09:00:00+09:00");
const S = (id, date, start, end, jobId = "j1") => ({ id, date, start, end, rest: 0, jobId, createdAt: T0 });
const shifts = [S("o1", "2026-10-28", "17:00", "21:00"), S("n1", "2026-11-05", "17:00", "21:00"), S("n2", "2026-11-12", "17:00", "21:00"),
  S("n3", "2026-11-18", "17:00", "21:00"), S("n4", "2026-11-25", "17:00", "21:00"), S("k1", "2026-11-07", "16:00", "18:00", "j2")];
const jobs = (more = {}) => ({ id: "jobs", items: [
  { id: "j1", name: "カフェ", wage: 1000, fare: 0, night: true, cutoff: 15, payday: 25, cutoff2: 0, payday2: 10, ...more },
  { id: "j2", name: "塾", wage: 1500, fare: 0, night: true, cutoff: 0, payday: 10 },
], updatedAt: T0 });
const DATA = { shifts, settings: [jobs(), { id: "bt3", payOn: true, payAt: "09:00", updatedAt: T0 }, { id: "bt12", cutOn: true, cutAt: "21:00", updatedAt: T0 }] };
module.exports = { DATA, jobs, today, T0 };
