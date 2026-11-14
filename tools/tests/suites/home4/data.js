// きょう その4's example: Saturday 2026-11-14; a subject, plans ahead, a ToDo tomorrow, a shift on Monday, last night's bed
const DAY = "2026-11-14";
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const all = () => ({
  subjects: [{ id: "sb1", name: "英語", createdAt: T("2026-10-01") }],
  events: [{ id: "e1", date: DAY, title: "図書館", time: "10:00", endTime: "11:00", createdAt: T("2026-11-01") }, { id: "e2", date: "2026-11-15", title: "映画", time: "13:00", endTime: "15:00", createdAt: T("2026-11-01") },
    { id: "e3", date: "2026-11-17", title: "歯医者", time: "16:00", endTime: "17:00", createdAt: T("2026-11-01") }],
  todos: [{ id: "t1", text: "レポートを出す", done: false, due: "2026-11-15", createdAt: T("2026-11-01") }],
  shifts: [{ id: "sh1", date: "2026-11-16", start: "17:00", end: "22:00", createdAt: T("2026-11-01") }],
  bodyDays: [{ id: DAY, date: DAY, bed: "23:30", createdAt: T(DAY, 0) }],
});
module.exports = { DAY, T, all };
