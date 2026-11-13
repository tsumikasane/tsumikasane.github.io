// ToDo その7's example (その5's and その6's, and more): Wednesday 2026-11-11, 8:30. A class timetable (英語 on Thursdays, 統計学 on Mondays, ゼミ on
// Wednesdays at 8:00, begun already), a busy afternoon today and tomorrow, plans to come (面接, 旅行), ToDos in a list
// 大学 and none, a checklist 持ち物, done ones over four weeks (mostly mornings, Tuesdays), and two いつものセット
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const DAY = "2026-11-11";
const lists = () => [
  { id: "l-uni", name: "大学", order: 0, due: "2026-12-20", createdAt: T("2026-10-01") },
  { id: "l-pack", name: "持ち物", order: 1, check: true, createdAt: T("2026-10-02") },
];
const events = () => [
  { id: "ev-en", title: "英語", date: "2026-10-01", time: "10:40", endTime: "12:10", repeat: "weekly", repeatUntil: "2027-01-31", cls: "c-en", place: "3号館201", createdAt: T("2026-09-30") },
  { id: "ev-st", title: "統計学", date: "2026-10-05", time: "09:00", endTime: "10:30", repeat: "weekly", repeatUntil: "2027-01-31", cls: "c-st", place: "講義棟A", createdAt: T("2026-09-30") },
  { id: "ev-se", title: "ゼミ", date: "2026-10-07", time: "08:00", endTime: "09:30", repeat: "weekly", repeatUntil: "2027-01-31", cls: "c-se", createdAt: T("2026-09-30") },
  { id: "ev-b1", title: "バイト", date: "2026-11-11", time: "13:00", endTime: "21:50", createdAt: T("2026-11-01") },
  { id: "ev-b2", title: "インターン", date: "2026-11-12", time: "13:00", endTime: "21:00", createdAt: T("2026-11-01") },
  { id: "ev-iv", title: "面接", date: "2026-11-18", time: "14:00", endTime: "15:00", place: "本社ビル 5階", createdAt: T("2026-11-01") },
  { id: "ev-tr", title: "旅行", date: "2026-11-22", createdAt: T("2026-11-01") },
];
function todos() {
  const out = [
    { id: "a", text: "レポートを書く", due: "2026-11-12", flag: true, mins: 300, listId: "l-uni", memo: "テーマは環境問題", week: "2026-11-08", createdAt: T("2026-11-01") },
    { id: "b", text: "英単語を覚える", due: "2026-11-20", flag: true, mins: 60, listId: "l-uni", steps: [{ id: "s1", text: "単語帳 1章", done: true }, { id: "s2", text: "単語帳 2章" }, { id: "s3", text: "小テスト" }], createdAt: T("2026-11-02") },
    { id: "c", text: "メールに返信", due: "2026-11-11", mins: 15, createdAt: T("2026-11-03") },
    { id: "d", text: "部屋の片付け", snooze: T("2026-11-11", 20), createdAt: T("2026-11-04") },
    { id: "e", text: "資料を読む", due: "2026-11-10", flag: true, mins: 120, listId: "l-uni", pct: 40, createdAt: T("2026-11-05") },
    { id: "f", text: "銀行で振り込み", due: "2026-11-13", place: "駅前の銀行", createdAt: T("2026-11-06") },
    { id: "g", text: "プレゼン準備", due: "2026-11-12", mins: 90, flag: true, listId: "l-uni", week: "2026-11-08", doing: "2026-11-10", createdAt: T("2026-11-06", 10) },
    { id: "h", text: "薬を飲む", due: "2026-11-11", time: "20:00", remind: true, nag: 30, createdAt: T("2026-11-07") },
    // (その6) a repeat (ゴミ出し, Mondays and Thursdays), one left over from last week's plan, this week's done one, and
    // 英単語を覚える done last week with 52 minutes focused
    { id: "r1", text: "ゴミ出し", due: "2026-11-12", repeat: "weekly", repeatDays: [1, 4], createdAt: T("2026-10-01") },
    { id: "lw", text: "本を返す", due: "2026-11-14", week: "2026-11-01", createdAt: T("2026-11-02", 12) },
    { id: "w1", text: "洗濯", done: true, doneAt: T("2026-11-10", 20), week: "2026-11-08", createdAt: T("2026-11-08", 9) },
    { id: "q1", text: "英単語を覚える", done: true, doneAt: T("2026-11-04", 21), due: "2026-11-04", focus: 52, mins: 60, createdAt: T("2026-10-28") },
    // (その7) done 41 days ago, in 大学 (for ④ 整理 and ② how far 大学 has come)
    { id: "old1", text: "履修登録", done: true, doneAt: T("2026-10-01", 10), due: "2026-10-01", listId: "l-uni", createdAt: T("2026-09-25") },
    // 持ち物, a checklist: 財布 checked yesterday, 鍵 today, two to go; an old check taken off
    { id: "p0", text: "財布", listId: "l-pack", done: true, doneAt: T("2026-11-01", 8), ckOff: true, createdAt: T("2026-10-02", 9, 1) },
    { id: "p1", text: "財布", listId: "l-pack", done: true, doneAt: T("2026-11-10", 19), createdAt: T("2026-10-02", 9, 1) },
    { id: "p2", text: "鍵", listId: "l-pack", done: true, doneAt: T("2026-11-11", 7, 50), createdAt: T("2026-10-02", 9, 2) },
    { id: "p3", text: "学生証", listId: "l-pack", createdAt: T("2026-10-02", 9, 3) },
    { id: "p4", text: "充電器", listId: "l-pack", createdAt: T("2026-10-02", 9, 4) },
  ];
  // done over the four weeks: 7 in the morning (4 on Tuesdays), 3 in the evening, 2 at midday
  const done = [["2026-10-20", 10, 15], ["2026-10-27", 10, 40], ["2026-11-03", 11, 5], ["2026-11-10", 9, 30], ["2026-10-22", 10, 20], ["2026-10-29", 11, 30], ["2026-11-05", 9, 45],
    ["2026-10-24", 20, 10], ["2026-10-31", 19, 30], ["2026-11-07", 18, 45], ["2026-10-25", 13, 0], ["2026-11-01", 14, 20]];
  done.forEach(([d, h, m], i) => out.push({ id: "z" + i, text: `済んだこと${i + 1}`, done: true, doneAt: T(d, h, m), due: d, createdAt: T(d, 8) }));
  return out;
}
const settings = () => [
  { id: "todoSets", list: [
    { id: "s1", name: "レポート提出", items: [{ text: "資料を集める", off: 7 }, { text: "下書きを書く", off: 3 }, { text: "見直す", off: 1 }, { text: "提出する" }] },
    { id: "s2", name: "旅行の準備", items: [{ text: "宿を予約" }, { text: "荷物をまとめる" }] },
  ], updatedAt: T("2026-10-01") },
];
const all = () => ({ todos: todos(), todoLists: lists(), events: events(), settings: settings() });
module.exports = { T, DAY, lists, events, todos, settings, all };
