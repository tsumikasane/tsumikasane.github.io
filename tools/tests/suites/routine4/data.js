// ルーティーン その4's example: Sunday 2026-11-15. ストレッチ (🧘) done two mornings in three, at 7:05 or 7:10 (④: 7:10ごろ); 読書 (📖) done
// 11/10〜11/14 (5日連続: ⑨ still to do today) with ひとこと on 11/13 and 11/14 (③); ToDoを片づける checked by a ToDo done
// today (⑩); 水 8 杯 counted
const T = (d, h = 21, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-15";
const add = (d, n) => { const x = new Date(d + "T12:00:00+09:00"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const R = (id, name, made, extra = {}) => ({ id, name, createdAt: T(made, 9) + id.charCodeAt(1), ...extra });
function days() {
  const out = new Map();
  const put = (d, id, h = 7, m = 10) => { const x = out.get(d) || { id: d, date: d, done: [], at: {}, updatedAt: T(d, h, m) }; if (!x.done.includes(id)) { x.done.push(id); x.at[id] = T(d, h, m); } out.set(d, x); };
  // ストレッチ: the 30 days before today but every third day (11/14 and 11/13 done: 2日連続), at 7:10 or 7:05, ten each
  for (let i = 1; i <= 30; i++) if (i % 3) put(add(DAY, -i), "r1", 7, [0, 10, 5][i % 3]);
  for (let d = "2026-11-10"; d <= "2026-11-14"; d = add(d, 1)) put(d, "r2", 22, 0);
  out.get("2026-11-13").notes = { r2: "p.100まで" };
  out.get("2026-11-14").notes = { r2: "p.120まで" };
  return [...out.values()];
}
const all = () => ({
  routines: [
    R("r1", "ストレッチ", "2026-09-01", { emoji: "🧘" }),
    R("r2", "読書", "2026-09-01", { emoji: "📖" }),
    R("r3", "ToDoを片づける", "2026-09-01", { link: "todo" }),
    R("r4", "水を飲む", "2026-09-01", { target: 8, unit: "杯" }),
  ],
  routineDays: days(),
  todos: [{ id: "t1", text: "レポートを出す", done: true, doneAt: T(DAY, 7, 0), due: DAY, createdAt: T("2026-11-10", 9) }, { id: "t2", text: "買い物", done: false, createdAt: T("2026-11-10", 9) }],
});
module.exports = { DAY, all, T, add };
