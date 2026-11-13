// the goals the round's tests and pictures start from (2026-11-11, a Wednesday)
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const G1 = { id: "g1", title: "TOEIC 800点", criterion: "TOEIC 800点", deadline: "2027-01-31", depth: 2, done: false, createdAt: T("2026-09-01"), rewards: { half: "ケーキを食べる", done: "旅行に行く" },
  mandala: [
    { t: "単語", c: [{ t: "単語帳1周", d: true, at: T("2026-11-09", 21) }, { t: "単語帳2周", n: 300, v: 120, u: "ページ", vt: T("2026-11-10", 22), log: { "2026-10-20": 50, "2026-11-10": 70 } }, { t: "毎日30語" }, null, null, null, null, null] },
    { t: "文法", c: [{ t: "文法書1周", d: true, at: T("2026-10-01", 20) }, { t: "問題集", d: true, at: T("2026-10-15", 20) }, { t: "苦手まとめ", d: true, at: T("2026-11-11", 8) }, null, null, null, null, null] },
    { t: "模試", c: [{ t: "模試1回目", d: true, at: T("2026-10-10", 15) }, { t: "模試2回目" }, { t: "模試3回目" }, null, null, null, null, null] },
    { t: "リスニング", c: [{ t: "毎日15分" }, { t: "シャドーイング" }, null, null, null, null, null, null] },
    { t: "長文" }, { t: "語彙アプリ", d: true, at: T("2026-09-20") }, null, null] };
const G2 = { id: "g2", title: "社会人になるまでに", criterion: "4つぜんぶ", deadline: "2028-03-31", depth: 2, done: false, createdAt: T("2026-10-01"),
  mandala: [{ t: "英語", g: "g1" }, { t: "資格", c: [{ t: "簿記3級", d: true, at: T("2026-10-30") }, { t: "FP3級" }, null, null, null, null, null, null] }, { t: "体力" }, { t: "お金" }, null, null, null, null] };
const G3 = { id: "g3", title: "部屋を片づける", criterion: "床に物がない", deadline: "2026-11-05", depth: 1, done: false, createdAt: T("2026-10-20"),
  mandala: [{ t: "机", d: true, at: T("2026-10-25") }, { t: "クローゼット" }, { t: "本棚" }, null, null, null, null, null] };
const G4 = { id: "g4", title: "簿記3級に合格する", criterion: "合格", deadline: "2026-10-31", depth: 2, done: true, doneAt: T("2026-10-30", 18), createdAt: T("2026-09-01"),
  mandala: [{ t: "仕訳", d: true, at: T("2026-09-20") }, { t: "過去問", d: true, at: T("2026-10-25") }, null, null, null, null, null, null] };
const G5 = { id: "g5", title: "毎日日記を書く（30日）", criterion: "30日", deadline: "2025-06-30", depth: 1, done: true, doneAt: T("2025-07-05", 21), createdAt: T("2025-06-01"),
  mandala: [{ t: "書く", d: true, at: T("2025-07-05") }, null, null, null, null, null, null, null] };
const G6 = { id: "g6", title: "5km走れるようになる", criterion: "5km", deadline: "2026-06-30", depth: 1, done: true, doneAt: T("2026-06-20", 7), createdAt: T("2026-05-01"),
  mandala: [{ t: "走る", d: true, at: T("2026-06-20") }, null, null, null, null, null, null, null] };
module.exports = { T, G1, G2, G3, G4, G5, G6, all: () => [G1, G2, G3, G4, G5, G6].map((g) => JSON.parse(JSON.stringify(g))) };
