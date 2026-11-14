// 天気 その4's example: Saturday 2026-11-14 10:00 in 東京. Today rain 15時〜18時 (19時 dry); 11/15 rain 7時〜9時, 5° colder;
// 11/16 a cold morning (2°); the UV up to 6 at noon today. The normal 15° / 6° (last year's day 20° / 10°); the month gone
// by: rain every 5th day, cloud every 7th from the 3rd; the models apart on 11/18 (6°) and on 11/19's rain
const DAY = "2026-11-14";
const days = (from, n, m = 10) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, m, from + i)).toISOString().slice(0, 10));
const p2 = (n) => String(n).padStart(2, "0");
const UV = { 9: 2, 10: 3, 11: 5, 12: 6, 13: 5, 14: 3, 15: 1 };
function forecast() {
  const D = days(13, 8), keys = ["precipitation_probability", "temperature_2m", "weather_code", "apparent_temperature", "relative_humidity_2m", "wind_speed_10m", "precipitation", "pressure_msl", "cloud_cover", "wind_direction_10m",
    "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "snowfall", "shortwave_radiation", "uv_index"], H = { time: [] };
  for (const k of keys) H[k] = [];
  for (const d of D) for (let h = 0; h < 24; h++) {
    const today = d === DAY, wet = (today && h >= 15 && h <= 18) || (d === "2026-11-15" && h >= 7 && h <= 9);
    const t = 12 + 4 * Math.sin(((h - 8) / 24) * 2 * Math.PI);
    H.time.push(`${d}T${p2(h)}:00`);
    H.precipitation_probability.push(wet ? 70 : 10);
    H.temperature_2m.push(Math.round(t * 10) / 10);
    H.weather_code.push(wet ? 61 : 1);
    H.apparent_temperature.push(Math.round((t - 1) * 10) / 10);
    H.relative_humidity_2m.push(65);
    H.wind_speed_10m.push(2);
    H.precipitation.push(wet ? (h <= 16 || d !== DAY ? 2 : 1) : 0);
    H.pressure_msl.push(1015);
    H.cloud_cover.push(50); H.cloud_cover_low.push(30); H.cloud_cover_mid.push(30); H.cloud_cover_high.push(30);
    H.wind_direction_10m.push(0);
    H.snowfall.push(0);
    H.shortwave_radiation.push(h >= 9 && h <= 15 ? 300 : 0);
    H.uv_index.push(today ? UV[h] || 0 : h >= 10 && h <= 14 ? 2 : 0);
  }
  const n = D.length;
  return { daily: { time: D, weather_code: [1, 61, 61, 1, 1, 3, 1, 1], temperature_2m_max: [15, 18, 13, 14, 21, 12, 19, 17], temperature_2m_min: [7, 8, 6, 2, 10, 3, 7, 7],
    precipitation_probability_max: [5, 70, 80, 10, 0, 20, 10, 5], apparent_temperature_max: [14, 17, 12, 13, 20, 11, 18, 16], apparent_temperature_min: Array(n).fill(5),
    sunrise: D.map((d, i) => `${d}T06:${p2(16 + i)}`), sunset: D.map((d, i) => `${d}T16:${p2(36 - i)}`), uv_index_max: [3, 6, 2, 2, 2, 2, 2, 2], wind_speed_10m_max: [3, 4, 2, 5, 2, 7, 3, 3],
    precipitation_sum: [0, 6, 6, 0, 0, 0, 0, 0], wind_direction_10m_dominant: Array(n).fill(0), wind_gusts_10m_max: Array(n).fill(6) }, hourly: H };
}
// the three models, the week from today
function models() {
  const D = days(14, 7), hi = [18, 13, 14, 21, 12, 19, 17], lo = [8, 6, 2, 10, 3, 7, 7];
  const off = { "2026-11-16": 3, "2026-11-18": 6 };
  const m = (o) => D.map((d, i) => hi[i] + (off[d] || 1) * o), l = (o) => D.map((d, i) => lo[i] + o);
  return { daily: { time: D, temperature_2m_max_jma_seamless: m(0), temperature_2m_max_ecmwf_ifs025: m(1), temperature_2m_max_gfs_seamless: m(0.5),
    temperature_2m_min_jma_seamless: l(0), temperature_2m_min_ecmwf_ifs025: l(1), temperature_2m_min_gfs_seamless: l(0.5),
    precipitation_sum_jma_seamless: D.map((d) => (d === "2026-11-19" ? 3 : d === "2026-11-15" ? 6 : 0)), precipitation_sum_ecmwf_ifs025: D.map((d) => (d === "2026-11-15" ? 5 : 0)), precipitation_sum_gfs_seamless: D.map((d) => (d === "2026-11-19" ? 0.1 : d === "2026-11-15" ? 4 : 0)) } };
}
// the month gone by, 10/14 to today (past_days=31)
function month() {
  const D = [...days(14, 18, 9), ...days(1, 14)], code = [], hi = [], lo = [], mm = [];
  D.forEach((d, i) => {
    const rain = i % 5 === 0, cloud = !rain && i % 7 === 3;
    code.push(rain ? 61 : cloud ? 3 : 1); mm.push(rain ? 5 : 0);
    hi.push(d === "2026-10-20" ? 26 : 20); lo.push(d === "2026-11-10" ? 3 : 10);
  });
  return { daily: { time: D, weather_code: code, temperature_2m_max: hi, temperature_2m_min: lo, precipitation_sum: mm } };
}
// the archive for the asked days: 15° / 6°, but last year's 11/14, 20° / 10°
function archive(url) {
  const u = new URL(url), a = u.searchParams.get("start_date"), b = u.searchParams.get("end_date"), time = [];
  for (let t = Date.parse(a + "T00:00:00Z"); t <= Date.parse(b + "T00:00:00Z"); t += 86400000) time.push(new Date(t).toISOString().slice(0, 10));
  return { daily: { time, temperature_2m_max: time.map((d) => (d === "2025-11-14" ? 20 : 15)), temperature_2m_min: time.map((d) => (d === "2025-11-14" ? 10 : 6)) } };
}
const T = (d, h = 9) => Date.parse(`${d}T${p2(h)}:00:00+09:00`);
const all = (more = {}) => ({ wxPlace: { lat: 35.68, lon: 139.77, at: T("2026-11-01"), name: "東京" }, ...more });
module.exports = { DAY, forecast, models, month, archive, all };
