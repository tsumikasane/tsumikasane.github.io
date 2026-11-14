// きょう その5's example: Saturday 2026-11-14; yesterday's records, two weeks of mood and sleep, a birthday today and an
// anniversary in 4 days, records through the year
const DAY = "2026-11-14", Y = "2026-11-13";
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const back = (n) => new Date(Date.UTC(2026, 10, 14 - n)).toISOString().slice(0, 10);
// mood and sleep: 4 long nights (8h) with good days, 3 short ones (5h) with poor days
const ms = [[1, 5, "23:00", "07:00"], [2, 4, "23:30", "07:30"], [3, 4, "23:00", "07:00"], [4, 5, "22:30", "06:30"], [5, 2, "02:00", "07:00"], [6, 2, "01:30", "06:30"], [7, 1, "02:00", "07:00"]];
const all = () => ({
  todos: [{ id: "t1", text: "請求書を送る", done: true, doneAt: T(Y, 20), createdAt: T("2026-11-01") }, { id: "t2", text: "本を返す", done: true, doneAt: T("2026-03-02", 10), createdAt: T("2026-03-01") }],
  study: [{ id: "s1", date: Y, minutes: 45, createdAt: T(Y) }, { id: "s2", date: "2026-02-10", minutes: 120, createdAt: T("2026-02-10") }],
  workouts: [{ id: "w1", date: Y, type: "ランニング", km: 3, minutes: 20, createdAt: T(Y) }, { id: "w2", date: "2026-05-05", type: "ランニング", km: 5, minutes: 30, createdAt: T("2026-05-05") }],
  expenses: [{ id: "x1", date: Y, kind: "out", category: "食費", amount: 1200, createdAt: T(Y) }],
  weights: [{ id: "2026-01-10", date: "2026-01-10", kg: 62, createdAt: T("2026-01-10") }, { id: Y, date: Y, kg: 60, createdAt: T(Y) }],
  journal: [{ id: "2026-04-01", date: "2026-04-01", text: "春", createdAt: T("2026-04-01") }, { id: Y, date: Y, text: "きのう", createdAt: T(Y) }],
  bodyDays: ms.map(([n, , bed, wake]) => ({ id: back(n), date: back(n), bed, wake, createdAt: T(back(n), 7) })),
  events: [{ id: "b1", date: "2006-11-14", title: "誕生日", repeat: "yearly", fromYear: 2006, createdAt: T("2026-01-01") },
    { id: "a1", date: "2020-11-18", title: "記念日", repeat: "yearly", fromYear: 2020, createdAt: T("2026-01-01") }],
  settings: [{ id: "h4mood", days: Object.fromEntries(ms.map(([n, m]) => [back(n), m])), updatedAt: T(Y) }, { id: "h3theme", days: { [Y]: { text: "早く寝る", done: true } }, updatedAt: T(Y) }],
});
module.exports = { DAY, Y, T, all };
