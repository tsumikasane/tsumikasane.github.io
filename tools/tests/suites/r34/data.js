// からだ その2's example: Wednesday 2026-11-11; seven weeks of weights going down, then two weeks flat (停滞期), tags on
// some days, sizes, a goal of 62 kg, 水分 and 睡眠 for the week
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-11";
const addDays = (d, n) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)) + n)).toISOString().slice(0, 10);
// the weight on each day: down 0.05 kg a day from 9/23 to 10/27 (69.0 → 67.25), then flat around 67.2 to 11/10
function kgOn(i) {
  const d = addDays("2026-09-23", i);
  const base = d <= "2026-10-27" ? 69.0 - 0.05 * i : 67.2;
  const wobble = [0, 0.2, -0.1, 0.1, -0.2, 0.15, -0.05][i % 7];
  return { d, kg: Math.round((base + wobble) * 10) / 10 };
}
function weights() {
  const out = [];
  for (let i = 0; addDays("2026-09-23", i) <= "2026-11-10"; i++) {
    const { d, kg } = kgOn(i);
    if (i % 9 === 4) continue; // (a day missed now and then)
    const r = { id: d, date: d, kg, createdAt: T(d, 7, 30), updatedAt: T(d, 7, 30) };
    if (i % 3 === 0) r.fat = Math.round((24 - i * 0.03) * 10) / 10;
    if (i % 7 === 0) { r.waist = Math.round((84 - i * 0.05) * 10) / 10; r.hip = 95; }
    // あったこと: 飲み会 on Fridays (the next day up), 運動した on Sundays (the next day down)
    const wd = new Date(d + "T12:00:00+09:00").getDay();
    if (wd === 5) r.tags = ["drink"];
    if (wd === 0) r.tags = ["move"];
    out.push(r);
  }
  // the day after a 飲み会 up 0.6, after 運動 down 0.3 (on top of the rest)
  const byId = new Map(out.map((r) => [r.id, r]));
  for (const r of out) {
    const next = byId.get(addDays(r.id, 1));
    if (!next) continue;
    if (r.tags?.includes("drink")) next.kg = Math.round((r.kg + 0.6) * 10) / 10;
    if (r.tags?.includes("move")) next.kg = Math.round((r.kg - 0.3) * 10) / 10;
  }
  return out;
}
function bodyDays() {
  return [["2026-11-05", 1200, "23:30", "06:45"], ["2026-11-06", 1800, "00:10", "06:40"], ["2026-11-07", 2000, "23:00", "07:00"], ["2026-11-08", 600, "01:00", "08:00"],
    ["2026-11-09", 1400, "23:45", "06:30"], ["2026-11-10", 1600, "23:20", "06:50"], ["2026-11-11", 400, "00:30", "06:30"]]
    .map(([d, water, bed, wake]) => ({ id: d, date: d, water, bed, wake, createdAt: T(d, 8), updatedAt: T(d, 8) }));
}
const settings = () => [
  { id: "weight", target: 62, updatedAt: T("2026-09-20") },
  { id: "weightBy", date: "2027-01-31", updatedAt: T("2026-09-20") },
  { id: "body", height: 170, age: 21, sex: "m", updatedAt: T("2026-09-20") },
];
module.exports = { T, DAY, addDays, weights, bodyDays, settings };
