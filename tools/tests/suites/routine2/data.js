// ルーティーン その2's example: Saturday 2026-11-14. Six items; ストレッチ done 11/8〜11/13 (6 days: today's check makes 7),
// 歯みがき done most days since 9/1 (a run of 29 to yesterday: today's makes 30), 薬 by 8:00 with its お知らせ, 読書 15 分,
// 水 8 杯 counted, 日記 by the journal; 11/11 お休み
const T = (d, h = 21, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-14";
const add = (d, n) => { const x = new Date(d + "T12:00:00+09:00"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const R = (id, name, made, extra = {}) => ({ id, name, createdAt: T(made, 9) + id.charCodeAt(1), ...extra });
function days() {
  const out = new Map();
  const put = (d, id, h = 7, m = 10) => { const x = out.get(d) || { id: d, date: d, done: [], at: {}, updatedAt: T(d, h, m) }; if (!x.done.includes(id)) { x.done.push(id); x.at[id] = T(d, h, m); } out.set(d, x); };
  // 歯みがき: every day from 10/16 to 11/13 (29 days), and before that most days from 9/1 (a gap on 10/15)
  for (let d = "2026-09-01"; d <= "2026-11-13"; d = add(d, 1)) if (d !== "2026-10-15") put(d, "r2", 7, 5);
  // ストレッチ: 11/8〜11/13 (11/11, お休み, done too): 6 days in a row
  for (let d = "2026-11-08"; d <= "2026-11-13"; d = add(d, 1)) put(d, "r1", 7, 20);
  // 読書: every other day over 12 weeks
  for (let i = 1; i <= 84; i += 2) put(add(DAY, -i), "r4", 22, 0);
  // 薬: most days
  for (let i = 1; i <= 40; i++) if (i % 5) put(add(DAY, -i), "r3", 8, 0);
  const x = out.get("2026-11-11"); if (x) x.rest = true;
  return [...out.values()];
}
const all = () => ({
  routines: [
    R("r1", "ストレッチ", "2026-08-01", { memo: "肩回しと前屈を30秒ずつ", mins: 5 }),
    R("r2", "歯みがき", "2026-08-01", { mins: 3 }),
    R("r3", "薬を飲む", "2026-08-01", { by: "08:00", byOn: true, memo: "朝ごはんのあと" }),
    R("r4", "読書", "2026-08-01", { mins: 15 }),
    R("r5", "水を飲む", "2026-08-01", { target: 8, unit: "杯" }),
    R("r6", "日記を書く", "2026-08-01", { link: "journal" }),
  ],
  routineDays: days(),
});
module.exports = { DAY, all, T };
