// 日記 その2's example: Saturday 2026-11-14, 21:00. 日記 a year ago today, on 11/13 (★, with 箇条書き), 11/12, 11/10, 11/1
// and 10/20, with #タグ and words met again (カフェ, 発表); today's weather kept by 天気 (晴れ 18° / 9°), nothing written today
const T = (d, h = 21) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const DAY = "2026-11-14";
const jn = (date, text, more = {}) => ({ id: date, date, text, ...more, createdAt: T(date), updatedAt: T(date) });
const journal = () => [
  jn("2025-11-14", "1年前のきょう。紅葉を見に行った。#旅行"),
  jn("2026-11-13", "カフェで勉強した。#カフェ\n・英語\n・数学", { fav: true }),
  jn("2026-11-12", "カフェで友だちと話した。#友だち"),
  jn("2026-11-10", "学校で発表の練習をした。#学校"),
  jn("2026-11-01", "発表の準備をした。カフェにも行った。"),
  jn("2026-10-20", "#旅行 京都の紅葉。"),
];
const days = ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"];
const wx = { day: DAY, at: T(DAY, 20), lat: 35.68, lon: 139.76, days: 7, v: 3,
  daily: { time: days, weather_code: days.map(() => 0), temperature_2m_max: days.map(() => 18), temperature_2m_min: days.map(() => 9), precipitation_probability_max: days.map(() => 0) }, hourly: { time: [] } };
const all = () => ({ journal: journal(), settings: [], wxData: wx });
module.exports = { DAY, all };
