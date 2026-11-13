// 勉強 その2's example: Saturday 2026-11-14, 21:00. 英語 and 数学; records over 12 weeks, most at night (put in on their
// day), one to 復習 from 11/13 (1日後 due) and one from 11/7 (7日後 due, 1・3 done); a 試験 gone by (中間, 英語, 70/100) and
// one to come (期末, 英語, 12/10); a 教材 of 200 ページ at 120, 40 of them in the last 4 weeks
const T = (d, h = 21, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-14";
const add = (d, n) => { const x = new Date(d + "T12:00:00+09:00"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
function study() {
  const out = [];
  let i = 0;
  for (let w = 1; w <= 80; w += 3) { const d = add(DAY, -w); out.push({ id: "s" + i++, date: d, subjectId: w % 2 ? "en" : "ma", minutes: 60, note: w % 2 ? "単語" : "問題集", createdAt: T(d, 22) }); }
  out.push({ id: "r1", date: "2026-11-13", subjectId: "en", minutes: 45, note: "関係代名詞", rev: true, revDone: [], createdAt: T("2026-11-13", 21) });
  out.push({ id: "r2", date: "2026-11-07", subjectId: "ma", minutes: 30, note: "二次関数", rev: true, revDone: [1, 3], createdAt: T("2026-11-07", 21) });
  out.push({ id: "m1", date: "2026-10-01", subjectId: "en", minutes: 60, mat: "bk", upto: 80, createdAt: T("2026-10-01", 21) });
  out.push({ id: "m2", date: "2026-11-10", subjectId: "en", minutes: 60, mat: "bk", upto: 120, from: "07:00", to: "08:00", createdAt: T("2026-11-10", 8) });
  return out;
}
const all = () => ({
  subjects: [{ id: "en", name: "英語", color: "blue", order: 0, createdAt: T("2026-08-01") }, { id: "ma", name: "数学", color: "green", order: 1, createdAt: T("2026-08-01") }],
  study: study(),
  settings: [
    { id: "studyExams", list: [{ id: "ex1", name: "中間", date: "2026-10-20", sub: "en", score: 70, max: 100 }, { id: "ex0", name: "小テスト", date: "2026-09-20", sub: "en", score: 6, max: 10 }, { id: "ex2", name: "期末", date: "2026-12-10", sub: "en" }], updatedAt: 1 },
    { id: "studyMats", list: [{ id: "bk", name: "単語帳", sub: "en", total: 200, unit: "ページ" }], updatedAt: 1 },
  ],
});
module.exports = { DAY, all };
