// 天気 その7's example: 天気 その6's (Monday 2026-11-16 10:00 in 東京), the wind from the east; 大阪 and 京都 kept too; the month
// gone by with rain every 5 days; the archive's months for the year
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
    H.wind_direction_10m.push(90);
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
const WET = ["2026-10-20", "2026-10-25", "2026-10-30", "2026-11-04", "2026-11-09", "2026-11-14"];
function month() {
  const D = [...days(16, 16, 9), ...days(1, 16)];
  return { daily: { time: D, weather_code: D.map((d) => (WET.includes(d) ? 61 : 1)), temperature_2m_max: D.map((d) => (d === "2026-10-30" ? 17 : 15)), temperature_2m_min: D.map((d) => (d === "2026-11-08" ? 2 : 6)), precipitation_sum: D.map((d) => (WET.includes(d) ? 5 : 0)) } };
}
// the archive for the days asked: each month's own highest (lowest 8° under it) and rain
const HI = [10, 11, 14, 19, 23, 26, 30, 31, 27, 22, 17, 12], MM = [50, 60, 110, 120, 130, 170, 150, 150, 210, 200, 95, 55];
function archive(url) {
  const u = new URL(url), a = u.searchParams.get("start_date"), b = u.searchParams.get("end_date"), time = [];
  for (let t = Date.parse(a + "T00:00:00Z"); t <= Date.parse(b + "T00:00:00Z"); t += 86400000) time.push(new Date(t).toISOString().slice(0, 10));
  const m = (d) => Number(d.slice(5, 7)) - 1, dim = (d) => new Date(Date.UTC(Number(d.slice(0, 4)), m(d) + 1, 0)).getUTCDate();
  return { daily: { time, temperature_2m_max: time.map((d) => HI[m(d)]), temperature_2m_min: time.map((d) => HI[m(d)] - 8), precipitation_sum: time.map((d) => MM[m(d)] / dim(d)) } };
}
// 大阪's week: 3° warmer than 東京, rain on 11/19
function osaka() {
  const D = days(16, 7), hi = [15, 16, 14, 9, 10, 18, 17], lo = [7, 6, 5, -1, 3, 8, 7];
  return { daily: { time: D, weather_code: D.map((d) => (d === "2026-11-19" ? 61 : 1)), temperature_2m_max: hi.map((v) => v + 3), temperature_2m_min: lo.map((v) => v + 2), precipitation_probability_max: D.map((d) => (d === "2026-11-19" ? 60 : 10)) } };
}
function places() {
  const one = (hi, lo, r, now) => ({ daily: { weather_code: [1], temperature_2m_max: [hi], temperature_2m_min: [lo], precipitation_probability_max: [r] }, current: { temperature_2m: now } });
  return [one(15, 7, 40, 14), one(18, 9, 10, 16), one(16, 6, 10, 13)];
}
const T = (d, h = 9) => Date.parse(`${d}T${p2(h)}:00:00+09:00`);
// runs on 4 dry days (18 km) and 1 wet one (2 km), the bike on 2 wet ones; plans on 11/19 and 11/20 (rain) and 11/18 (not)
const workouts = [["2026-10-18", "ランニング", 5], ["2026-10-22", "ランニング", 4], ["2026-11-01", "ランニング", 6], ["2026-11-10", "ランニング", 3], ["2026-11-09", "ランニング", 2], ["2026-10-25", "エアロバイク", 0], ["2026-11-14", "エアロバイク", 0]]
  .map(([date, type, km], i) => ({ id: "w" + i, date, type, km: km || undefined, minutes: 30, createdAt: T(date, 7) }));
const events = [["2026-11-19", "10:00", "授業"], ["2026-11-19", "17:00", "バイト"], ["2026-11-20", "15:00", "歯医者"], ["2026-11-18", "13:00", "ゼミ"]].map(([date, time, title], i) => ({ id: "e" + i, date, time, title, createdAt: T("2026-11-10") + i }));
// the forecast seen last night: 11/19 sunny then
const seen = { lat: 35.68, lon: 139.77, dataAt: T("2026-11-15", 21), days: { "2026-11-17": { hi: 16, lo: 6, rain: 10, word: "晴れ", wet: false }, "2026-11-19": { hi: 14, lo: 4, rain: 10, word: "晴れ", wet: false } } };
const all = (more = {}) => ({ wxPlace: { lat: 35.68, lon: 139.77, at: T("2026-11-01"), name: "東京" }, wxPlaces: [{ name: "東京", lat: 35.68, lon: 139.77 }, { name: "大阪", lat: 34.69, lon: 135.5 }, { name: "京都", lat: 35.01, lon: 135.77 }],
  workouts, events, wxSeen: seen, ...more });
module.exports = { DAY, forecast, month, archive, osaka, places, all };
