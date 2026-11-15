// バイト その11: カフェ (時給 1,000円・交通費 300円・通勤 30分・末日締め・翌月25日払い・青; 2024/6/1 から) and 塾 (時給 1,500円・緑).
// Today 2026-11-15 (日) 12:00. 8〜10月はカフェに 4 回ずつ (5時間), 11/10 のカフェは「なくなった」. 2024年6〜11月は週2回
// (前の年の有給 3 日、11/30 まで). The forecast kept: 11/16 の夕方から雨. シフト希望 (11月): ○ 16・17・18, △ 21, × 20
const T0 = Date.parse("2026-07-01T09:00:00+09:00");
const S = (id, date, start, end, jobId = "j1", more = {}) => ({ id, date, start, end, rest: 0, jobId, createdAt: T0, ...more });
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shifts = [
  S("g1", "2026-11-16", "17:00", "23:00"), S("g2", "2026-11-17", "07:00", "12:00"), // 8 時間しかあかない
  S("s1", "2026-11-17", "18:00", "21:00", "j2"), // 同じ日のあと: 数えない
  S("x1", "2026-11-20", "17:00", "22:00"), // × の日
  S("w1", "2026-11-23", "17:00", "22:00"), S("w2", "2026-11-25", "18:00", "21:00", "j2"), // 11/22 からの週
];
for (const [m, days] of [["08", [3, 10, 17, 24]], ["09", [7, 14, 21, 28]], ["10", [5, 12, 19, 26]]]) for (const d of days) shifts.push(S(`p${m}${pad(d)}`, `2026-${m}-${pad(d)}`, "10:00", "15:00"));
for (let d = new Date(2024, 5, 1); d <= new Date(2024, 10, 30); d.setDate(d.getDate() + 1)) if (d.getDay() === 2 || d.getDay() === 6) shifts.push(S(`y${ymd(d)}`, ymd(d), "10:00", "15:00"));
const settings = [
  { id: "jobs", items: [
    { id: "j1", name: "カフェ", wage: 1000, fare: 300, night: true, cutoff: 0, payday: 25, commute: 30, addr: "駅前1-2", color: "blue" },
    { id: "j2", name: "塾", wage: 1500, fare: 0, night: true, cutoff: 0, payday: 25, color: "green" },
  ], updatedAt: T0 },
  { id: "bt5Off", items: [{ id: "o1", why: "cancel", at: T0, shift: S("cx", "2026-11-10", "17:00", "22:00") }], updatedAt: T0 },
  { id: "bt7", goOn: true, eveOn: true, eveAt: "21:00", updatedAt: T0 },
  { id: "bt11", weekOn: true, weekAt: "08:00", leaveOn: true, updatedAt: T0 },
];
// 天気's forecast, as kept: 11/15〜11/21, every hour 晴れ 15℃; 11/16 16時 くもり 12℃ (雨 20%), 18〜23時 雨 (70%)
const time = [], code = [], temp = [], rain = [];
for (let d = 15; d <= 21; d++) for (let h = 0; h < 24; h++) {
  time.push(`2026-11-${pad(d)}T${pad(h)}:00`);
  const wet = d === 16 && h >= 18;
  code.push(d === 16 && h === 16 ? 3 : wet ? 61 : 1); temp.push(d === 16 && h === 16 ? 12 : wet ? (h === 23 ? 8 : 9) : 15); rain.push(d === 16 && h === 16 ? 20 : wet ? 70 : 0);
}
const days = Array.from({ length: 7 }, (_, i) => `2026-11-${pad(15 + i)}`);
const wxData = { day: "2026-11-15", at: Date.parse("2026-11-15T06:00:00+09:00"), lat: 35.68, lon: 139.76, days: 7, v: 5,
  daily: { time: days, weather_code: days.map(() => 1), temperature_2m_max: days.map(() => 18), temperature_2m_min: days.map(() => 9), precipitation_probability_max: days.map(() => 10) },
  hourly: { time, weather_code: code, temperature_2m: temp, precipitation_probability: rain } };
const bt3Ask = { month: "2026-11", marks: { "2026-11-16": "o", "2026-11-17": "o", "2026-11-18": "o", "2026-11-21": "t", "2026-11-20": "x" }, note: "" };
module.exports = { DATA: { shifts, settings, wxData, bt3Ask }, today: "2026-11-15" };
