// ルーティーン その5's example: Sunday 2026-11-15, 9:00. ストレッチ done every day for a month, today at 7:20 (② 身についた;
// ⑨); 英単語 seldom (② 見なおし); 薬 by 8:00, not yet (⑨ 過ぎています); 読書 by 21:00 with ミニマム and 参考リンク (⑩ ⑤);
// 散歩 done 11/10〜11/13, not 11/14 (③ おまもり, 月に1回 since 11/1); 水 8 杯 counted, a day at 8 every other day (⑧);
// テスト勉強 from 11/20 and 水やり till 11/10 (④). And another: two items done 11/13 and 11/14, ごほうび at 3 days (①)
const T = (d, h = 21, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-15";
const add = (d, n) => { const x = new Date(d + "T12:00:00+09:00"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const R = (id, name, made, extra = {}) => ({ id, name, createdAt: T(made, 9) + id.charCodeAt(1), ...extra });
function days() {
  const out = new Map();
  const get = (d) => out.get(d) || out.set(d, { id: d, date: d, done: [], at: {}, updatedAt: T(d, 7) }).get(d);
  const put = (d, id, h = 7, m = 10) => { const x = get(d); if (!x.done.includes(id)) { x.done.push(id); x.at[id] = T(d, h, m); } };
  for (let d = "2026-10-15"; d <= DAY; d = add(d, 1)) put(d, "r1", 7, 20);
  for (const d of ["2026-10-20", "2026-10-28", "2026-11-05"]) put(d, "r2", 20);
  for (let d = "2026-11-12"; d <= "2026-11-14"; d = add(d, 1)) put(d, "r4", 21);
  for (let d = "2026-11-10"; d <= "2026-11-13"; d = add(d, 1)) put(d, "r5", 18);
  for (let i = 1; i <= 29; i++) { const d = add(DAY, -i), x = get(d), n = i % 2 ? 8 : 3; x.counts = { ...(x.counts || {}), r6: n }; if (n >= 8) put(d, "r6", 22); }
  return [...out.values()];
}
const all = () => ({
  routines: [
    R("r1", "ストレッチ", "2026-09-01"),
    R("r2", "英単語", "2026-09-01"),
    R("r3", "薬を飲む", "2026-09-01", { by: "08:00" }),
    R("r4", "読書", "2026-09-01", { by: "21:00", mini: "1ページだけ", url: "https://example.com/reading" }),
    R("r5", "散歩", "2026-09-01"),
    R("r6", "水を飲む", "2026-09-01", { target: 8, unit: "杯" }),
    R("r7", "テスト勉強", "2026-11-01", { start: "2026-11-20" }),
    R("r8", "水やり", "2026-08-01", { until: "2026-11-10" }),
  ],
  routineDays: days(),
  settings: [{ id: "rtCharm", n: 1, since: "2026-11-01", updatedAt: 1 }],
});
const reward = () => ({
  routines: [R("a1", "歯みがき", "2026-11-01"), R("a2", "ストレッチ", "2026-11-01")],
  routineDays: ["2026-11-13", "2026-11-14"].map((d) => ({ id: d, date: d, done: ["a1", "a2"], at: { a1: T(d, 7), a2: T(d, 7, 5) }, updatedAt: T(d, 7, 5) })),
  settings: [{ id: "rtReward", name: "ケーキ", n: 3, from: "2026-11-13", got: [], updatedAt: 1 }],
});
module.exports = { DAY, all, reward, T, add };
