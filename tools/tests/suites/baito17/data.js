// バイト その17: カフェ (時給 1,000円・25日払い・シフトのアプリ・担当 レジ、キッチン・100 時間で +30 円・立ち仕事) and 塾 (時給
// 1,500円・翌月10日払い). Today 2026-11-20 (金) 12:00. カフェ: 2025/11/25 から 17:00〜22:00 を 14 回 (1〜6月・10月・11月), 11/23 にも;
// 担当 10/5 レジ, 11/2 レジ, 11/9 キッチン, 11/16 レジ. 塾: 去年の 5/17・8/16, 今年の 10/17・11/7・11/18 16:00〜21:00. 体重 50 kg.
// 月 20 時間・週 2 日まで. 使いみち 貯金 30%・自由 20%
const T0 = Date.parse("2026-09-01T09:00:00+09:00");
const S = (id, date, start, end, jobId = "j1", more = {}) => ({ id, date, start, end, rest: 0, jobId, createdAt: T0, ...more });
const C = (id, date, more) => S(id, date, "17:00", "22:00", "j1", more), J = (id, date) => S(id, date, "16:00", "21:00", "j2");
const shifts = [
  C("f0", "2025-11-25"), ...["01", "02", "03", "04", "05", "06"].map((m) => C(`m${m}`, `2026-${m}-10`)),
  C("o1", "2026-10-05", { role: "レジ" }), C("o2", "2026-10-12"), C("o3", "2026-10-19"), C("o4", "2026-10-26"),
  C("n1", "2026-11-02", { role: "レジ" }), C("n2", "2026-11-09", { role: "キッチン" }), C("n3", "2026-11-16", { role: "レジ" }), C("n4", "2026-11-23"),
  J("u1", "2025-05-17"), J("u2", "2025-08-16"), J("t0", "2026-10-17"), J("t1", "2026-11-07"), J("t2", "2026-11-18"),
];
const settings = [
  { id: "jobs", items: [
    { id: "j1", name: "カフェ", wage: 1000, fare: 0, night: true, cutoff: 0, payday: 25, app: "https://shift.example.com/cafe", roles: "レジ、キッチン", raiseH: 100, raisePlus: 30, move: "stand" },
    { id: "j2", name: "塾", wage: 1500, fare: 0, night: true, cutoff: 0, payday: 10 },
  ], updatedAt: T0 },
  { id: "bt17", monthMax: 20, weekDays: 2, split: [{ name: "貯金", pct: 30 }, { name: "自由", pct: 20 }], annivChk: true, updatedAt: T0 },
];
const weights = [{ id: "2026-11-01", kg: 50, createdAt: 1 }];
module.exports = { DATA: { shifts, settings, weights }, today: "2026-11-20" };
