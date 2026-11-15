// バイト その13: カフェ (時給 1,000円・交通費 300円・通勤 30分・青) and 塾 (時給 1,500円・緑). Today 2026-11-18 (水) 12:00, the
// week from 日曜. カフェ every 土曜 5/2〜11/7 10:00〜15:00 (28 回); 10/13 は休んだ (so 24 回 in a row before it); 11/12 (田中さんの
// 代わり) and 11/14 (佐藤の代わり) 17:00〜22:00; 塾 11/17 18:00〜21:00; きょう 17:00〜22:00; 11/20 22:00〜2:00; 12/1. 10/6 は田中に代わって
// もらった. ゼミ 11/19 13:00〜15:00. 期間の目標「冬休み」11月 50,000 円. シフト希望 12月: ○ 2日・4日, △ 5日. 来週のお知らせ 金曜 20:00,
// お知らせを休む 11/19〜11/21; 前の晩のお知らせ 21:00
const T0 = Date.parse("2026-04-01T09:00:00+09:00");
const S = (id, date, start, end, jobId = "j1", more = {}) => ({ id, date, start, end, rest: 0, jobId, createdAt: T0, ...more });
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shifts = [];
for (let d = new Date(2026, 4, 2); d <= new Date(2026, 10, 7); d.setDate(d.getDate() + 7)) shifts.push(S(`p${ymd(d)}`, ymd(d), "10:00", "15:00"));
shifts.push(S("r1", "2026-11-12", "17:00", "22:00", "j1", { coverFor: "田中さん" }), S("r2", "2026-11-14", "17:00", "22:00", "j1", { coverFor: "佐藤" }),
  S("s1", "2026-11-17", "18:00", "21:00", "j2"), S("t1", "2026-11-18", "17:00", "22:00"), S("w1", "2026-11-20", "22:00", "02:00"), S("x1", "2026-12-01", "17:00", "22:00"));
const settings = [
  { id: "jobs", items: [
    { id: "j1", name: "カフェ", wage: 1000, fare: 300, night: true, cutoff: 0, payday: 25, commute: 30, color: "blue" },
    { id: "j2", name: "塾", wage: 1500, fare: 0, night: true, cutoff: 0, payday: 25, color: "green" },
  ], updatedAt: T0 },
  { id: "bt5Off", items: [
    { id: "o1", why: "absent", at: T0, shift: S("ab", "2026-10-13", "10:00", "15:00") },
    { id: "o2", why: "swap", by: "田中", at: T0, shift: S("sw", "2026-10-06", "17:00", "22:00") },
  ], updatedAt: T0 },
  { id: "bt13", nextOn: true, nextWd: 5, nextAt: "20:00", muteFrom: "2026-11-19", muteTo: "2026-11-21", updatedAt: T0 },
  { id: "bt13Goal", items: [{ id: "g1", name: "冬休み", from: "2026-11-01", to: "2026-11-30", amount: 50000 }], updatedAt: T0 },
  { id: "bt7", eveOn: true, eveAt: "21:00", updatedAt: T0 },
];
const events = [{ id: "e1", title: "ゼミ", date: "2026-11-19", time: "13:00", endTime: "15:00", createdAt: 1 }];
const bt3Ask = { month: "2026-12", marks: { "2026-12-02": "o", "2026-12-04": "o", "2026-12-05": "t" }, note: "" };
module.exports = { DATA: { shifts, settings, events, bt3Ask }, today: "2026-11-18" };
