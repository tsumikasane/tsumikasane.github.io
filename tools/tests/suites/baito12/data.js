// バイト その12: カフェ (時給 1,000円・交通費 300円・末日締め・翌月25日払い・水曜と祝日が定休) and 塾 (時給 1,500円・15日締め・
// 25日払い). Today 2026-11-20 (金) 12:00, カフェ 17:00〜22:00. ふりかえり: 金曜の夜がしんどい; 11/21 は 18:00〜 から変えた;
// 11/22 は新宿店（ヘルプ）で交通費 500円; 11/23 は祝日, 11/25 は水曜. 家計簿: #バイト と #カフェ の支出
const T0 = Date.parse("2026-09-01T09:00:00+09:00");
const S = (id, date, start, end, jobId = "j1", more = {}) => ({ id, date, start, end, rest: 0, jobId, createdAt: T0, ...more });
const shifts = [
  S("f1", "2026-10-02", "18:00", "22:00", "j1", { feel: "hard" }), S("f2", "2026-10-09", "18:00", "22:00", "j1", { feel: "hard" }),
  S("f3", "2026-10-16", "18:00", "22:00", "j1", { feel: "ok" }), S("f4", "2026-10-20", "10:00", "15:00", "j1", { feel: "good" }),
  S("f5", "2026-11-06", "18:00", "22:00", "j1", { feel: "hard" }), S("f6", "2026-11-10", "10:00", "14:00", "j1", { feel: "good" }),
  S("n1", "2026-11-20", "17:00", "22:00"),
  S("c1", "2026-11-21", "17:00", "22:00", "j1", { changes: [{ at: Date.parse("2026-11-20T10:00:00+09:00"), date: "2026-11-21", start: "18:00", end: "22:00" }] }),
  S("p1", "2026-11-22", "10:00", "15:00", "j1", { place: "新宿店（ヘルプ）", fare: 500 }),
  S("h1", "2026-11-23", "17:00", "22:00"), S("w1", "2026-11-25", "17:00", "22:00"),
  S("s1", "2026-11-18", "18:00", "21:00", "j2"),
];
const settings = [
  { id: "jobs", items: [
    { id: "j1", name: "カフェ", wage: 1000, fare: 300, night: true, cutoff: 0, payday: 25, closed: [3], closedHol: true, terms: ["paper", "pay"] },
    { id: "j2", name: "塾", wage: 1500, fare: 0, night: true, cutoff: 15, payday: 25 },
  ], updatedAt: T0 },
  { id: "bt12", cutOn: true, cutAt: "21:00", updatedAt: T0 },
];
const X = (id, date, amount, memo, kind = "out") => ({ id, date, kind, category: "その他", amount, memo, createdAt: T0 });
const expenses = [X("e1", "2026-11-05", 3980, "黒いくつ #バイト"), X("e2", "2026-10-12", 1200, "#カフェ タクシー"), X("e3", "2026-11-03", 800, "ランチ"), X("e4", "2026-10-25", 30000, "#バイト 給料", "in")];
module.exports = { DATA: { shifts, settings, expenses }, today: "2026-11-20" };
