// 天気 その3's example: Saturday 2026-11-14 10:00 in 東京 (大阪 kept too). Today rain 15時〜17時 with thunder at 16時; 11/15
// a clear dawn; 11/17 a hot noon (for WBGT); 11/18 snow early. Days shorten by 2 minutes a day
const DAY = "2026-11-14";
const days = (from, n) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 10, from + i)).toISOString().slice(0, 10));
const p2 = (n) => String(n).padStart(2, "0");
function forecast() {
  const D = days(13, 8), keys = ["precipitation_probability", "temperature_2m", "weather_code", "apparent_temperature", "relative_humidity_2m", "wind_speed_10m", "precipitation", "pressure_msl", "cloud_cover", "wind_direction_10m",
    "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "snowfall", "shortwave_radiation"], H = { time: [] };
  for (const k of keys) H[k] = [];
  for (const d of D) for (let h = 0; h < 24; h++) {
    const today = d === DAY, wet = today && (h === 15 || h === 16), hot = d === "2026-11-17" && h >= 12 && h <= 14, snow = d === "2026-11-18" && h >= 3 && h <= 8;
    const t = hot ? 33 : 12 + 4 * Math.sin(((h - 8) / 24) * 2 * Math.PI);
    H.time.push(`${d}T${p2(h)}:00`);
    H.precipitation_probability.push(wet ? 70 : snow ? 80 : 10);
    H.temperature_2m.push(Math.round(t * 10) / 10);
    H.weather_code.push(today && h === 16 ? 95 : wet ? 61 : snow ? 71 : 1);
    H.apparent_temperature.push(Math.round((t - 1) * 10) / 10);
    H.relative_humidity_2m.push(hot ? 60 : 65);
    H.wind_speed_10m.push(2);
    H.precipitation.push(wet ? 2 : 0);
    H.pressure_msl.push(1015);
    const dawn = d === "2026-11-15" && h === 6, dusk15 = d === "2026-11-15" && h === 17, dusk14 = today && h === 17;
    H.cloud_cover.push(dawn ? 40 : dusk15 ? 5 : dusk14 ? 60 : 50);
    H.wind_direction_10m.push(0);
    H.cloud_cover_low.push(dawn ? 5 : dusk15 ? 0 : dusk14 ? 10 : 30);
    H.cloud_cover_mid.push(dawn ? 30 : dusk15 ? 5 : dusk14 ? 40 : 30);
    H.cloud_cover_high.push(dawn ? 30 : dusk15 ? 5 : dusk14 ? 50 : 30);
    H.snowfall.push(snow ? 0.5 : 0);
    H.shortwave_radiation.push(hot ? 800 : h >= 9 && h <= 15 ? 300 : 0);
  }
  const n = D.length;
  return { daily: { time: D, weather_code: [1, 95, 1, 3, 0, 71, 0, 1], temperature_2m_max: [15, 18, 20, 16, 21, 14, 19, 17], temperature_2m_min: [7, 8, 10, 6, 7, 3, 7, 7],
    precipitation_probability_max: [5, 70, 5, 20, 0, 90, 10, 5], apparent_temperature_max: [14, 17, 19, 15, 20, 13, 18, 16], apparent_temperature_min: Array(n).fill(5),
    sunrise: D.map((d, i) => `${d}T06:${p2(16 + i)}`), sunset: D.map((d, i) => `${d}T16:${p2(36 - i)}`), uv_index_max: Array(n).fill(3), wind_speed_10m_max: [3, 4, 2, 5, 2, 7, 3, 3],
    precipitation_sum: Array(n).fill(0), wind_direction_10m_dominant: Array(n).fill(0), wind_gusts_10m_max: Array(n).fill(6) }, hourly: H };
}
// the places kept, in one request: 東京 and 大阪
function places() {
  return [{ daily: { weather_code: [95], temperature_2m_max: [18], temperature_2m_min: [8], precipitation_probability_max: [70] }, current: { temperature_2m: 14.2 } },
    { daily: { weather_code: [0], temperature_2m_max: [20], temperature_2m_min: [11], precipitation_probability_max: [0] }, current: { temperature_2m: 17.6 } }];
}
const T = (d, h = 9) => Date.parse(`${d}T${p2(h)}:00:00+09:00`);
const all = () => ({ wxPlace: { lat: 35.68, lon: 139.77, at: T("2026-11-01"), name: "東京" }, wxPlaces: [{ name: "東京", lat: 35.68, lon: 139.77 }, { name: "大阪", lat: 34.69, lon: 135.5 }] });
module.exports = { DAY, forecast, places, all };
