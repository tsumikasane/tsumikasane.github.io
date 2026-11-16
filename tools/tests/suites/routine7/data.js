// ルーティーン その7's example: Tuesday 2026-11-03, 9:00 (the month's first week). From 2026-09-01: ストレッチ and 日記を書く on
// the same days (two days in three), 英語 by 勉強 of the subject 英語 (30 分 and more; September a day in three, then every
// other day; 数学 on the days between), 歩く counted to 8,000 歩 (8,500 every day). 10/10 お休み with nothing. Today:
// ストレッチ at 7:00, 歩く 5,200, 数学 60 分. やめる習慣: 夜ふかし from 10/1, done 10/15, 300 円 a day
const T = (d, h = 21, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-03", START = "2026-09-01", REST = "2026-10-10";
const add = (d, n) => { const x = new Date(d + "T12:00:00+09:00"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const idx = (d) => Math.round((Date.parse(d + "T12:00:00Z") - Date.parse(START + "T12:00:00Z")) / 864e5);
const pair = (d) => idx(d) % 3 !== 2; // ストレッチ and 日記
const eng = (d) => (d < "2026-10-01" ? idx(d) % 3 === 0 : idx(d) % 2 === 0); // 英語's 勉強
const R = (id, name, extra = {}) => ({ id, name, createdAt: T(START, 8) + id.charCodeAt(1) * 1000, ...extra });
function days() {
  const out = [];
  for (let d = START; d < DAY; d = add(d, 1)) {
    if (d === REST) { out.push({ id: d, date: d, done: [], at: {}, rest: true, updatedAt: T(d, 7) }); continue; }
    const x = { id: d, date: d, done: ["r4"], at: { r4: T(d, 18) }, counts: { r4: 8500 }, updatedAt: T(d, 22) };
    if (pair(d)) { x.done.push("r1", "r2"); x.at.r1 = T(d, 7); x.at.r2 = T(d, 22); }
    out.push(x);
  }
  out.push({ id: DAY, date: DAY, done: ["r1"], at: { r1: T(DAY, 7) }, counts: { r4: 5200 }, updatedAt: T(DAY, 7) });
  return out;
}
function studies() {
  const out = [];
  for (let d = START; d < DAY; d = add(d, 1)) {
    if (d === REST) continue;
    out.push(eng(d) ? { id: "e" + d, date: d, minutes: 40, subjectId: "s1", createdAt: T(d, 20) } : { id: "m" + d, date: d, minutes: 60, subjectId: "s2", createdAt: T(d, 20) });
  }
  out.push({ id: "mToday", date: DAY, minutes: 60, subjectId: "s2", createdAt: T(DAY, 8) }); // (数学 today: not 英語's)
  return out;
}
const all = () => ({
  routines: [R("r1", "ストレッチ"), R("r2", "日記を書く"), R("r3", "英語", { link: "study", linkMin: 30, linkSub: "s1" }), R("r4", "歩く", { target: 8000, unit: "歩" }),
    { id: "q1", name: "夜ふかし", quit: "2026-10-01", slips: ["2026-10-15"], yen: 300, createdAt: T("2026-10-01", 9) }],
  routineDays: days(),
  study: studies(),
  subjects: [{ id: "s1", name: "英語", createdAt: 1 }, { id: "s2", name: "数学", createdAt: 2 }],
  journal: [],
  settings: [],
});
// a new バッジ: two items done the two days before, both today make 3日連続
const badge = () => ({
  routines: [R("b1", "歯みがき"), R("b2", "ストレッチ")].map((r) => ({ ...r, createdAt: T("2026-11-01", 8) + r.id.charCodeAt(1) })),
  routineDays: ["2026-11-01", "2026-11-02"].map((d) => ({ id: d, date: d, done: ["b1", "b2"], at: { b1: T(d, 7), b2: T(d, 7, 5) }, updatedAt: T(d, 7, 5) })),
  settings: [{ id: "rtBadges", got: { a1: "2026-11-01" }, updatedAt: 1 }],
});
module.exports = { DAY, START, REST, all, badge, T, add, idx, pair, eng };
