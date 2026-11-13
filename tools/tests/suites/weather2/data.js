// 天気 その2's example: Friday 2026-11-13 10:00 in 東京, rain from 15時 with the pressure falling, dry at noon, two plans
const DAY = "2026-11-13";
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const days = (from, n) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 10, from + i)).toISOString().slice(0, 10));
function forecast() {
  const D = days(12, 8), H = { time: [], precipitation_probability: [], temperature_2m: [], weather_code: [], apparent_temperature: [], relative_humidity_2m: [], wind_speed_10m: [], precipitation: [], pressure_msl: [], cloud_cover: [], wind_direction_10m: [] };
  for (const d of D) for (let h = 0; h < 24; h++) {
    const today = d === DAY, wet = today && h >= 15 && h <= 18;
    const t = 12 + 4 * Math.sin(((h - 8) / 24) * 2 * Math.PI) + (d === "2026-11-14" ? 3 : 0);
    H.time.push(`${d}T${String(h).padStart(2, "0")}:00`);
    H.precipitation_probability.push(wet ? 70 : 5);
    H.temperature_2m.push(Math.round(t * 10) / 10);
    H.apparent_temperature.push(Math.round((t - 2) * 10) / 10);
    H.weather_code.push(wet ? 61 : 1);
    H.relative_humidity_2m.push(today && h >= 11 && h <= 14 ? 35 : 65);
    H.wind_speed_10m.push(3);
    H.precipitation.push(wet ? [0.5, 2, 4.5, 1][h - 15] : 0);
    H.pressure_msl.push(today ? (h <= 10 ? 1016 : h <= 16 ? 1016 - (h - 10) : 1010) : 1015);
    H.cloud_cover.push(h >= 20 ? 20 : 50);
    H.wind_direction_10m.push(315);
  }
  const n = D.length;
  return { daily: { time: D, weather_code: [1, 61, 1, 3, 0, 2, 63, 1], temperature_2m_max: [15, 16, 19, 15, 17, 18, 13, 16], temperature_2m_min: [7, 8, 10, 6, 7, 9, 5, 7], precipitation_probability_max: [5, 70, 5, 20, 0, 10, 90, 5],
    apparent_temperature_max: Array(n).fill(14), apparent_temperature_min: Array(n).fill(5), sunrise: D.map((d) => d + "T06:17"), sunset: D.map((d) => d + "T16:35"), uv_index_max: Array(n).fill(3), wind_speed_10m_max: Array(n).fill(5),
    precipitation_sum: [0, 8, 0, 0, 0, 0, 12, 0], wind_direction_10m_dominant: Array(n).fill(0), wind_gusts_10m_max: [8, 16, 8, 8, 8, 8, 8, 8] }, hourly: H };
}
function air() {
  const time = [], pm2_5 = [], dust = [];
  for (const d of days(13, 5)) for (let h = 0; h < 24; h++) { time.push(`${d}T${String(h).padStart(2, "0")}:00`); pm2_5.push(d === DAY && h === 12 ? 42 : 12); dust.push(d === DAY && h === 13 ? 60 : 5); }
  return { hourly: { time, pm2_5, dust } };
}
const events = () => [{ id: "e1", date: DAY, title: "買い物", time: "11:00", endTime: "12:00", createdAt: T("2026-11-01") }, { id: "e2", date: DAY, title: "映画", time: "17:00", endTime: "19:00", createdAt: T("2026-11-01") }];
const all = () => ({ events: events(), wxPlace: { lat: 35.68, lon: 139.77, at: T("2026-11-01"), name: "東京" } });
module.exports = { DAY, forecast, air, all };
