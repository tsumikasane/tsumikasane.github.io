// 天気 その6's example: Monday 2026-11-16 10:00 in 東京 (大阪 kept too). Sunny today and tomorrow, cloudy 11/18, rain 11/19
// and 11/20 (5° colder), sunny again 11/21 (8° warmer); today the air unstable 13時〜16時, strong wind 15時〜17時; tomorrow
// fog at dawn; 11/19 a clear, still, frozen dawn. The month gone by: 17° at the warmest, 2° at the coldest
const DAY = "2026-11-16";
const days = (from, n, m = 10) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, m, from + i)).toISOString().slice(0, 10));
const p2 = (n) => String(n).padStart(2, "0");
function forecast() {
  const D = days(15, 8), keys = ["precipitation_probability", "temperature_2m", "weather_code", "apparent_temperature", "relative_humidity_2m", "wind_speed_10m", "precipitation", "pressure_msl", "cloud_cover", "wind_direction_10m",
    "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "snowfall", "shortwave_radiation", "uv_index", "cape", "visibility", "wind_gusts_10m"], H = { time: [] };
  for (const k of keys) H[k] = [];
  for (const d of D) for (let h = 0; h < 24; h++) {
    const today = d === DAY, cold = d === "2026-11-19", wet = cold && h >= 12 && h <= 20, windy = today && h >= 15 && h <= 17;
    const base = 12 + 4 * Math.sin(((h - 8) / 24) * 2 * Math.PI), t = cold ? base - 6 : base;
    const feel = today && h >= 12 && h <= 15 ? 17 : today && h >= 18 && h <= 21 ? 9 : Math.round((t - 1) * 10) / 10;
    H.time.push(`${d}T${p2(h)}:00`);
    H.precipitation_probability.push(wet ? 80 : 10);
    H.temperature_2m.push(Math.round(t * 10) / 10);
    H.weather_code.push(wet ? 61 : 1);
    H.apparent_temperature.push(feel);
    H.relative_humidity_2m.push(65);
    H.wind_speed_10m.push(windy ? 9 : 2);
    H.precipitation.push(wet ? 2 : 0);
    H.pressure_msl.push(1015);
    H.cloud_cover.push(cold && h <= 8 ? 10 : 50); H.cloud_cover_low.push(30); H.cloud_cover_mid.push(30); H.cloud_cover_high.push(30);
    H.wind_direction_10m.push(0);
    H.snowfall.push(0);
    H.shortwave_radiation.push(h >= 9 && h <= 15 ? 300 : 0);
    H.uv_index.push(h >= 10 && h <= 14 ? 2 : 0);
    H.cape.push(today && h >= 13 && h <= 16 ? 1500 : 0);
    H.visibility.push(d === "2026-11-17" && h >= 5 && h <= 7 ? 400 : 24000);
    H.wind_gusts_10m.push(windy ? 16 : 5);
  }
  const n = D.length;
  return { daily: { time: D, weather_code: [3, 1, 1, 3, 61, 61, 1, 1], temperature_2m_max: [16, 15, 16, 14, 9, 10, 18, 17], temperature_2m_min: [8, 7, 6, 5, -1, 3, 8, 7],
    precipitation_probability_max: [20, 40, 10, 20, 80, 70, 10, 5], apparent_temperature_max: [15, 16, 15, 13, 7, 9, 17, 16], apparent_temperature_min: Array(n).fill(5),
    sunrise: D.map((d, i) => `${d}T06:${p2(17 + i)}`), sunset: D.map((d, i) => `${d}T16:${p2(35 - i)}`), uv_index_max: Array(n).fill(3), wind_speed_10m_max: Array(n).fill(3),
    precipitation_sum: Array(n).fill(0), wind_direction_10m_dominant: Array(n).fill(0), wind_gusts_10m_max: Array(n).fill(6) }, hourly: H };
}
// the month gone by (past_days=31): 15° / 6°, but 17° on 10/30 and 2° on 11/8
function month() {
  const D = [...days(16, 16, 9), ...days(1, 16)];
  return { daily: { time: D, weather_code: D.map(() => 1), temperature_2m_max: D.map((d) => (d === "2026-10-30" ? 17 : 15)), temperature_2m_min: D.map((d) => (d === "2026-11-08" ? 2 : 6)), precipitation_sum: D.map(() => 0) } };
}
// 大阪's week: 3° warmer than 東京, rain on 11/19
function osaka() {
  const D = days(16, 7), hi = [15, 16, 14, 9, 10, 18, 17], lo = [7, 6, 5, -1, 3, 8, 7];
  return { daily: { time: D, weather_code: D.map((d) => (d === "2026-11-19" ? 61 : 1)), temperature_2m_max: hi.map((v) => v + 3), temperature_2m_min: lo.map((v) => v + 2), precipitation_probability_max: D.map((d) => (d === "2026-11-19" ? 60 : 10)) } };
}
function places() {
  return [{ daily: { weather_code: [1], temperature_2m_max: [15], temperature_2m_min: [7], precipitation_probability_max: [40] }, current: { temperature_2m: 14 } },
    { daily: { weather_code: [1], temperature_2m_max: [18], temperature_2m_min: [9], precipitation_probability_max: [10] }, current: { temperature_2m: 16 } }];
}
const T = (d, h = 9) => Date.parse(`${d}T${p2(h)}:00:00+09:00`);
const all = (more = {}) => ({ wxPlace: { lat: 35.68, lon: 139.77, at: T("2026-11-01"), name: "東京" }, wxPlaces: [{ name: "東京", lat: 35.68, lon: 139.77 }, { name: "大阪", lat: 34.69, lon: 135.5 }], ...more });
module.exports = { DAY, forecast, month, osaka, places, all };
