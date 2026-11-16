// ルーティーン その6's example: Monday 2026-11-16, 9:00. Four items from 2026-06-01, made in the order 日記を書く (22:30),
// ストレッチ (7:05), 歯みがき (7:25, メモ 3分, 目安 7:30), 水を飲む (8 杯, done 12:00). June: ストレッチ alone; July〜11/15: all
// of them every day but 日記 on 11/10; 11/15: ストレッチ 7:00 and 日記 22:00. Today: ストレッチ 7:02, 歯みがき 7:31, 水 3 杯.
// やめる習慣: 夜ふかし from 11/1, done on 11/10
const T = (d, h = 21, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-16";
const add = (d, n) => { const x = new Date(d + "T12:00:00+09:00"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const R = (id, name, extra = {}) => ({ id, name, createdAt: T("2026-06-01", 8) + id.charCodeAt(1) * 1000, ...extra });
function days() {
  const out = new Map();
  const get = (d) => out.get(d) || out.set(d, { id: d, date: d, done: [], at: {}, updatedAt: T(d, 7) }).get(d);
  const put = (d, id, h, m = 0) => { const x = get(d); if (!x.done.includes(id)) { x.done.push(id); x.at[id] = T(d, h, m); } };
  for (let d = "2026-06-01"; d <= "2026-06-30"; d = add(d, 1)) put(d, "r2", 7, 5);
  for (let d = "2026-07-01"; d <= "2026-11-15"; d = add(d, 1)) {
    const y = d === "2026-11-15";
    put(d, "r2", 7, y ? 0 : 5); put(d, "r3", 7, 25);
    const x = get(d); x.counts = { r4: 8 }; put(d, "r4", 12, 0);
    if (d !== "2026-11-10") put(d, "r1", y ? 22 : 22, y ? 0 : 30);
  }
  put(DAY, "r2", 7, 2); put(DAY, "r3", 7, 31); get(DAY).counts = { r4: 3 };
  return [...out.values()];
}
const all = () => ({
  routines: [R("r1", "日記を書く"), R("r2", "ストレッチ"), R("r3", "歯みがき", { memo: "3分", by: "07:30" }), R("r4", "水を飲む", { target: 8, unit: "杯" }),
    { id: "q1", name: "夜ふかし", quit: "2026-11-01", slips: ["2026-11-10"], createdAt: T("2026-11-01", 9) }],
  routineDays: days(),
  settings: [],
});
module.exports = { DAY, all, T, add };
