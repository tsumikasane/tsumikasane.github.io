// plans for カレンダー その12 (today Monday 11/16): two classes on Mondays (the timetable's), ゼミ ending just before 面接
// with its way there, 飲み会 tonight with a time to meet, people and a time to go home, 英会話 on Wednesdays with an alarm,
// 旅行 counted down, 通院 tomorrow morning with rain in the forecast at its way there
const today = "2026-11-16";
function make() {
  return {
    events: [
      { id: "e1", title: "線形代数", date: "2026-11-02", time: "09:00", endTime: "10:30", repeat: "weekly", repeatUntil: "2027-02-10", cls: "c1", place: "A101", alarms: [10], createdAt: 1 },
      { id: "e2", title: "英語", date: "2026-11-02", time: "13:00", endTime: "14:30", repeat: "weekly", repeatUntil: "2027-02-10", cls: "c2", place: "3号館201", createdAt: 2 },
      { id: "e3", title: "ゼミ", date: today, time: "15:00", endTime: "16:45", createdAt: 3 },
      { id: "e4", title: "面接", date: today, time: "17:00", endTime: "18:00", travel: 30, place: "〇〇ビル", createdAt: 4 },
      { id: "e5", title: "飲み会", date: today, time: "19:00", endTime: "22:00", travel: 30, travelBack: 30, meet: "18:45", meetPlace: "駅前", with: "田中さん", place: "居酒屋", home: "23:30", createdAt: 5 },
      { id: "e6", title: "英会話", date: "2026-11-04", time: "18:00", endTime: "19:00", repeat: "weekly", alarms: [60], createdAt: 6 },
      { id: "e7", title: "旅行", date: "2026-12-01", count: true, createdAt: 7 },
      { id: "e8", title: "通院", date: "2026-11-17", time: "10:00", endTime: "11:00", travel: 30, createdAt: 8 },
    ],
    settings: [
      { id: "calendar", freeFrom: "09:00", freeTo: "22:00", rainEarly: 10, updatedAt: 1 },
      { id: "timetable", from: "2026-10-01", to: "2027-02-10", items: [{ id: "c1", wd: 1, p: 1, name: "線形代数", room: "A101" }, { id: "c2", wd: 1, p: 3, name: "英語", room: "3号館201" }], updatedAt: 1 },
    ],
  };
}
// the forecast kept (天気's place), 7 days from today hour by hour: rain only at 11/17 9:00
function weather(at) {
  const days = [...Array(7)].map((_, i) => { const d = new Date(today + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  const time = days.flatMap((d) => [...Array(24)].map((_, h) => `${d}T${String(h).padStart(2, "0")}:00`)), n = time.length, fill = (v) => Array(n).fill(v);
  const wet = time.map((t) => t === "2026-11-17T09:00");
  const hourly = { time, precipitation_probability: wet.map((w) => (w ? 80 : 0)), weather_code: wet.map((w) => (w ? 61 : 1)), temperature_2m: fill(15), apparent_temperature: fill(14), relative_humidity_2m: fill(60),
    wind_speed_10m: fill(5), precipitation: wet.map((w) => (w ? 2 : 0)), pressure_msl: fill(1015), cloud_cover: fill(30), wind_direction_10m: fill(180), cloud_cover_low: fill(10), cloud_cover_mid: fill(10), cloud_cover_high: fill(10),
    snowfall: fill(0), shortwave_radiation: fill(100), uv_index: fill(1) };
  const dfill = (v) => Array(7).fill(v);
  const daily = { time: days, weather_code: days.map((d) => (d === "2026-11-17" ? 61 : 1)), temperature_2m_max: dfill(18), temperature_2m_min: dfill(8), precipitation_probability_max: days.map((d) => (d === "2026-11-17" ? 80 : 0)),
    apparent_temperature_max: dfill(17), apparent_temperature_min: dfill(7), sunrise: days.map((d) => d + "T06:20"), sunset: days.map((d) => d + "T16:35"), uv_index_max: dfill(3), wind_speed_10m_max: dfill(10),
    precipitation_sum: days.map((d) => (d === "2026-11-17" ? 2 : 0)), wind_direction_10m_dominant: dfill(180), wind_gusts_10m_max: dfill(20) };
  return { wxPlace: { lat: 35.68, lon: 139.76, name: "東京" }, wxData: { day: today, at, lat: 35.68, lon: 139.76, days: 7, v: 5, daily, hourly } };
}
module.exports = { make, today, weather };
