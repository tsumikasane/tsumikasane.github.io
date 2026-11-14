// きょう その6's example: Saturday 2026-11-14 (a day off); a plan this afternoon, a ToDo done, 勉強, last night's sleep,
// water, the mood and the theme, a 支出 today
const DAY = "2026-11-14";
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const all = () => ({
  events: [{ id: "e1", date: DAY, title: "映画", time: "15:00", endTime: "17:00", createdAt: T("2026-11-01") }],
  todos: [{ id: "t1", text: "洗濯", done: true, doneAt: T(DAY, 9), due: DAY, createdAt: T("2026-11-01") }],
  study: [{ id: "s1", date: DAY, minutes: 40, createdAt: T(DAY) }],
  expenses: [{ id: "x1", date: DAY, kind: "out", category: "食費", amount: 500, createdAt: T(DAY) }],
  bodyDays: [{ id: DAY, date: DAY, bed: "23:00", wake: "07:00", water: 800, createdAt: T(DAY, 7) }],
  settings: [{ id: "h4mood", days: { [DAY]: 4 }, updatedAt: T(DAY) }, { id: "h3theme", days: { [DAY]: { text: "部屋の片づけ", done: true } }, updatedAt: T(DAY) }],
});
module.exports = { DAY, T, all };
