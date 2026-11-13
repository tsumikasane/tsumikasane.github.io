// ToDo その4's example: Wednesday 2026-11-11, a student's ToDos, a list for shopping, a plan this morning, the weather
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-11";
function todos() {
  return [
    { id: "a", text: "レポートを書く", done: false, due: "2026-11-16", mins: 240, flag: true, listId: "L2", createdAt: T("2026-11-05") },
    { id: "b", text: "洗濯", done: false, due: DAY, slot: "am", wx: "sun", createdAt: T("2026-11-08") },
    { id: "c", text: "布団を干す", done: false, wx: "sun", createdAt: T("2026-11-06") },
    { id: "d", text: "部屋の片づけ", done: false, wx: "rain", createdAt: T("2026-11-06") },
    { id: "e", text: "英単語 50語", done: false, due: DAY, mins: 15, slot: "pm", listId: "L2", createdAt: T("2026-11-07") },
    { id: "f", text: "銀行で振込", done: false, due: DAY, time: "15:00", flag: true, createdAt: T("2026-11-07") },
    { id: "g", text: "母に電話", done: false, mins: 10, createdAt: T("2026-11-09") },
    { id: "h", text: "図書館の本を返す", done: false, due: "2026-11-09", mins: 5, slot: "noon", createdAt: T("2026-11-02") },
    { id: "i", text: "先生の返事を待つ", done: false, wait: { since: "2026-11-09", days: 3 }, createdAt: T("2026-11-09") },
    { id: "j", text: "ゼミの発表スライド", done: false, due: "2026-11-20", mins: 90, listId: "L2", createdAt: T("2026-11-10") },
    // ゴミ出し, by hand on four Mondays (⑧)
    ...["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"].map((d, i) => ({ id: "g" + i, text: "ゴミ出し", done: true, due: d, doneAt: T(d, 8), createdAt: T(d, 7) })),
    // done today (⑩)
    { id: "k", text: "レポートの資料集め", done: true, doneAt: T(DAY, 7, 10), due: DAY, createdAt: T("2026-11-08") },
    { id: "l", text: "ジムに行く", done: true, doneAt: T(DAY, 7, 40), createdAt: T("2026-11-10") },
    // 買い物 (⑥): to buy, in the basket, and bought before
    { id: "s1", text: "牛乳", done: false, listId: "L1", qty: 2, price: 220, createdAt: T("2026-11-10") },
    { id: "s2", text: "卵", done: true, doneAt: T(DAY, 7, 50), listId: "L1", price: 280, createdAt: T("2026-11-10") },
    { id: "s3", text: "食パン", done: false, listId: "L1", createdAt: T("2026-11-10") },
    ...[["バナナ", 3], ["バナナ", 4], ["バナナ", 6], ["ヨーグルト", 4], ["ヨーグルト", 7], ["牛乳", 2], ["牛乳", 5]].map(([text, d], i) =>
      ({ id: "p" + i, text, done: true, doneAt: T(`2026-11-0${d}`, 18), listId: "L1", paid: "x" + i, ...(text === "バナナ" ? { price: 198 } : {}), createdAt: T(`2026-11-0${d}`, 9) })),
  ];
}
const lists = () => [{ id: "L1", name: "買い物", shop: true, createdAt: T("2026-10-01") }, { id: "L2", name: "学校", createdAt: T("2026-10-02") }];
const events = () => [{ id: "ev1", date: DAY, title: "英語の授業", time: "09:00", endTime: "10:30", createdAt: T("2026-11-01") }, { id: "ev2", date: DAY, title: "バイト面接", time: "16:00", endTime: "17:00", createdAt: T("2026-11-01") }];
function weather(at) {
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(Date.UTC(2026, 10, 11 + i)).toISOString().slice(0, 10));
  return {
    wxPlace: { lat: 35.68, lon: 139.77, at },
    wxData: { day: DAY, at, lat: 35.68, lon: 139.77, days: 7, daily: { time: days, weather_code: [0, 61, 3, 0, 2, 63, 0], temperature_2m_max: [18, 15, 16, 19, 18, 14, 17], temperature_2m_min: [9, 10, 8, 9, 10, 9, 8], precipitation_probability_max: [10, 80, 30, 0, 20, 90, 10] }, hourly: { time: [], precipitation_probability: [] } },
  };
}
module.exports = { T, DAY, todos, lists, events, weather };
