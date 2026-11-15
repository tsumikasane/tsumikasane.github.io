// ルーティーン その3's example: Sunday 2026-11-15 (the week from Sunday, as set by default). Six items:
// ストレッチ after 歯みがき (⑤), on a 7日チャレンジ since 11/9 and done 11/9〜11/14 (today's check makes 7: 達成, and 7日連続);
// 歯みがき done every day since 10/1; 英単語 done 10/20〜10/24 and 11/10〜11/14 (5 and 5: today's makes 6, 自己ベスト);
// 読書 done 11/10〜11/13 and パス on 11/14 (①: 4日連続 still); 水 (8 杯) and 日記 (by the journal) not done yesterday (③).
// ルーティーンのお知らせ on at 21:00
const T = (d, h = 21, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-15";
const add = (d, n) => { const x = new Date(d + "T12:00:00+09:00"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const R = (id, name, made, extra = {}) => ({ id, name, createdAt: T(made, 9) + id.charCodeAt(1), ...extra });
function days() {
  const out = new Map();
  const put = (d, id, h = 7, m = 10) => { const x = out.get(d) || { id: d, date: d, done: [], at: {}, updatedAt: T(d, h, m) }; if (!x.done.includes(id)) { x.done.push(id); x.at[id] = T(d, h, m); } out.set(d, x); };
  for (let d = "2026-10-01"; d <= "2026-11-14"; d = add(d, 1)) put(d, "r2", 7, 0);
  for (let d = "2026-11-09"; d <= "2026-11-14"; d = add(d, 1)) put(d, "r1", 7, 10);
  for (let d = "2026-10-20"; d <= "2026-10-24"; d = add(d, 1)) put(d, "r3", 21, 0);
  for (let d = "2026-11-10"; d <= "2026-11-14"; d = add(d, 1)) put(d, "r3", 21, 0);
  for (let d = "2026-10-01"; d <= "2026-11-09"; d = add(d, 2)) put(d, "r4", 22, 0);
  for (let d = "2026-11-10"; d <= "2026-11-13"; d = add(d, 1)) put(d, "r4", 22, 0);
  out.get("2026-11-14").skip = ["r4"];
  return [...out.values()];
}
const all = () => ({
  routines: [
    R("r1", "ストレッチ", "2026-09-01", { after: "r2", ch: { from: "2026-11-09", n: 7 } }),
    R("r2", "歯みがき", "2026-09-01"),
    R("r3", "英単語", "2026-10-01"),
    R("r4", "読書", "2026-09-01"),
    R("r5", "水を飲む", "2026-09-01", { target: 8, unit: "杯" }),
    R("r6", "日記を書く", "2026-09-01", { link: "journal" }),
  ],
  routineDays: days(),
  settings: [{ id: "rtRemind", on: true, at: "21:00", updatedAt: 1 }],
});
module.exports = { DAY, all, T, add };
