// 天気 その5's example: Monday 2026-11-16 10:00 in 東京 (yesterday 3° warmer by the hour). The air pressure falls 6 hPa from
// 17時 today, and 2.5 hPa from 4時 tomorrow; 11/19 a frozen morning (-1°), 11/20 a hot noon (33°, 暑さ指数 31); today
// dry air at noon; tomorrow night (しし座流星群) a clear sky. Yesterday's forecast (as seen the day before) kept: 雨
// 18° / 9° 70%, and it came 16° / 8° with no rain
const DAY = "2026-11-16";
const days = (from, n, m = 10) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, m, from + i)).toISOString().slice(0, 10));
const p2 = (n) => String(n).padStart(2, "0");
const PRESS = { "2026-11-16": (h) => (h <= 17 ? 1015 : [1013, 1011, 1010, 1009, 1009, 1009][h - 18]), "2026-11-17": (h) => [1010, 1011, 1012, 1012, 1012, 1011, 1010.5, 1010][h] ?? 1009.5 };
function forecast() {
  const D = days(15, 8), keys = ["precipitation_probability", "temperature_2m", "weather_code", "apparent_temperature", "relative_humidity_2m", "wind_speed_10m", "precipitation", "pressure_msl", "cloud_cover", "wind_direction_10m",
    "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "snowfall", "shortwave_radiation", "uv_index"], H = { time: [] };
  for (const k of keys) H[k] = [];
  for (const d of D) for (let h = 0; h < 24; h++) {
    const today = d === DAY, hot = d === "2026-11-20", noon = hot && h >= 12 && h <= 14;
    const base = 12 + 4 * Math.sin(((h - 8) / 24) * 2 * Math.PI), t = noon ? 33 : hot ? 25 : d === "2026-11-15" ? base + 3 : d === "2026-11-19" ? base - 6 : base;
    H.time.push(`${d}T${p2(h)}:00`);
    H.precipitation_probability.push(10);
    H.temperature_2m.push(Math.round(t * 10) / 10);
    H.weather_code.push(1);
    H.apparent_temperature.push(Math.round((t - 1) * 10) / 10);
    H.relative_humidity_2m.push(today && h >= 9 && h <= 15 ? 50 : hot ? 60 : 65);
    H.wind_speed_10m.push(2);
    H.precipitation.push(0);
    H.pressure_msl.push(PRESS[d] ? PRESS[d](h) : 1015);
    H.cloud_cover.push(today && h >= 10 && h <= 14 ? 20 : d === "2026-11-17" && h >= 20 ? 10 : 50);
    H.cloud_cover_low.push(30); H.cloud_cover_mid.push(30); H.cloud_cover_high.push(30);
    H.wind_direction_10m.push(0);
    H.snowfall.push(0);
    H.shortwave_radiation.push(noon ? 800 : h >= 9 && h <= 15 ? 300 : 0);
    H.uv_index.push(h >= 10 && h <= 14 ? 2 : 0);
  }
  const n = D.length;
  return { daily: { time: D, weather_code: [3, 1, 1, 3, 1, 1, 1, 1], temperature_2m_max: [16, 15, 16, 14, 9, 33, 18, 17], temperature_2m_min: [8, 7, 6, 5, -1, 20, 8, 7],
    precipitation_probability_max: [20, 10, 10, 20, 0, 0, 10, 5], apparent_temperature_max: [15, 12, 15, 13, 7, 35, 17, 16], apparent_temperature_min: Array(n).fill(5),
    sunrise: D.map((d, i) => `${d}T06:${p2(17 + i)}`), sunset: D.map((d, i) => `${d}T16:${p2(35 - i)}`), uv_index_max: Array(n).fill(3), wind_speed_10m_max: Array(n).fill(3),
    precipitation_sum: Array(n).fill(0), wind_direction_10m_dominant: Array(n).fill(0), wind_gusts_10m_max: Array(n).fill(6) }, hourly: H };
}
// the 16 days (① shows 11/23 on: 勤労感謝の日 first)
function long() {
  const D = days(16, 16);
  return { daily: { time: D, weather_code: D.map((d, i) => (i === 8 ? 61 : 1)), temperature_2m_max: D.map((d, i) => 15 - Math.floor(i / 4)), temperature_2m_min: D.map(() => 6), precipitation_probability_max: D.map((d, i) => (i === 8 ? 60 : 10)) } };
}
const T = (d, h = 9) => Date.parse(`${d}T${p2(h)}:00:00+09:00`);
const guess = { lat: 35.68, lon: 139.77, days: {
  "2026-11-12": { hi: 15, lo: 7, rain: 10, word: "晴れ", act: { hi: 15, lo: 7, mm: 0 } },
  "2026-11-13": { hi: 16, lo: 8, rain: 60, word: "雨", act: { hi: 14, lo: 8, mm: 3 } },
  "2026-11-14": { hi: 17, lo: 9, rain: 20, word: "くもり", act: { hi: 17, lo: 10, mm: 2 } },
  "2026-11-15": { hi: 18, lo: 9, rain: 70, word: "雨" } } };
const all = (more = {}) => ({ wxPlace: { lat: 35.68, lon: 139.77, at: T("2026-11-01"), name: "東京" }, wxGuess: guess, ...more });
module.exports = { DAY, forecast, long, all };
