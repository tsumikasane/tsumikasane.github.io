// バイト その15: カフェ (時給 1,000円・15分ごとに数える・終電 23:40 で駅まで 15 分・通勤 30 分・扶養控除等申告書を出した・まかない
// 200円・末日締め 25日払い) and 塾 (時給 1,500円・翌月10日払い・通勤 20 分). Today 2026-11-20 (金) 12:00. カフェ: 10/5・11/2 17:00〜22:00,
// 11/9 17:03〜22:07 (打刻のまま), 11/14 10:00〜15:00, 11/21 18:00〜23:30, 11/24 17:00〜22:00. 塾: 10/17・11/7・11/14 16:00〜21:00.
// 月の目標 50,000 円. 予定: 11/22 サークル 9:00〜, 11/24 ゼミ 〜16:40. 家計簿: 11/10 に塾の10月分 7,500 円, 支出 4,200 円, 固定費
// スマホ 2,500 円 (毎月23日). 勉強: 10/27 30分, 11/3 2時間, 11/10 1.5時間, 11/17 1時間. バイト探し: 本屋の面接 11/21 15:00
const T0 = Date.parse("2026-09-01T09:00:00+09:00");
const S = (id, date, start, end, jobId = "j1", more = {}) => ({ id, date, start, end, rest: 0, jobId, createdAt: T0, ...more });
const shifts = [
  S("c0", "2026-10-05", "17:00", "22:00"), S("c1", "2026-11-02", "17:00", "22:00"), S("c2", "2026-11-09", "17:03", "22:07"),
  S("c3", "2026-11-14", "10:00", "15:00"), S("c4", "2026-11-21", "18:00", "23:30"), S("c5", "2026-11-24", "17:00", "22:00"),
  S("t0", "2026-10-17", "16:00", "21:00", "j2"), S("t1", "2026-11-07", "16:00", "21:00", "j2"), S("t2", "2026-11-14", "16:00", "21:00", "j2"),
];
const settings = [
  { id: "jobs", items: [
    { id: "j1", name: "カフェ", wage: 1000, fare: 0, night: true, cutoff: 0, payday: 25, deduct: 200, round: 15, lastTrain: "23:40", toStation: 15, commute: 30, fuyo: true },
    { id: "j2", name: "塾", wage: 1500, fare: 0, night: true, cutoff: 0, payday: 10, commute: 20 },
  ], updatedAt: T0 },
  { id: "bt3", aim: 50000, updatedAt: T0 },
  { id: "bt15", taxChk: true, hunt: [{ id: "h1", name: "本屋", wage: 1100, memo: "駅前", day: "2026-11-21", time: "15:00", st: "meet", at: 1 }], updatedAt: T0 },
  { id: "fixed", items: [{ id: "f1", name: "スマホ", kind: "out", category: "通信費", amount: 2500, day: 23, method: "", since: "2026-11-01" }], updatedAt: T0 },
];
const events = [
  { id: "e1", title: "サークル", date: "2026-11-22", time: "09:00", endTime: "12:00", createdAt: 1 },
  { id: "e2", title: "ゼミ", date: "2026-11-24", time: "15:00", endTime: "16:40", createdAt: 1 },
];
const expenses = [
  { id: "x1", kind: "in", amount: 7500, date: "2026-11-10", category: "給与", pay: "j2|2026-10", createdAt: 1 },
  { id: "x2", kind: "out", amount: 1200, date: "2026-11-12", category: "食費", createdAt: 1 },
  { id: "x3", kind: "out", amount: 3000, date: "2026-11-18", category: "日用品", createdAt: 1 },
];
const study = [
  { id: "s1", date: "2026-10-27", minutes: 30, createdAt: 1 }, { id: "s2", date: "2026-11-03", minutes: 120, createdAt: 1 },
  { id: "s3", date: "2026-11-10", minutes: 90, createdAt: 1 }, { id: "s4", date: "2026-11-17", minutes: 60, createdAt: 1 },
];
module.exports = { DATA: { shifts, settings, events, expenses, study }, today: "2026-11-20" };
