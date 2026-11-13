// ToDos for ToDo その2: today's, one past its 期限, one waiting, with a 科目 and a 金額, some left untouched
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const today = "2026-11-11"; // a Wednesday
function make() {
  return {
    subjects: [{ id: "sb1", name: "数学", color: "blue", createdAt: 1 }, { id: "sb2", name: "英語", color: "red", createdAt: 2 }],
    todos: [
      { id: "a", text: "数学の課題", done: false, due: today, subject: "sb1", mins: 30, createdAt: T("2026-11-10", 8) },
      { id: "b", text: "電気代を払う", done: false, due: today, amount: 5000, cat: "水道光熱費", createdAt: T("2026-11-10", 9) },
      { id: "c", text: "レポートを出す", done: false, due: "2026-11-09", createdAt: T("2026-11-05", 9) },
      { id: "d", text: "先生にメール", done: false, due: "2026-11-12", wait: { since: "2026-11-09", who: "先生の返事", days: 3 }, createdAt: T("2026-11-08", 9) },
      { id: "e", text: "部屋の片づけ", done: false, due: "", createdAt: T("2026-09-27", 9) },
      { id: "f", text: "英単語", done: false, due: "2026-11-13", subject: "sb2", mins: 20, createdAt: T("2026-11-10", 10) },
      { id: "g", text: "買い物", done: false, due: "2026-11-12", steps: [{ text: "牛乳" }, { text: "卵", done: true }, { text: "パン" }], createdAt: T("2026-11-10", 11) },
      { id: "h", text: "ESを書く", done: false, due: "2026-10-20", createdAt: T("2026-10-10", 9) },
      { id: "i", text: "ジムに行く", done: false, due: "2026-11-15", moved: 4, createdAt: T("2026-10-25", 9) },
      { id: "j", text: "洗濯", done: true, due: "2026-11-10", doneAt: T("2026-11-10", 20), createdAt: T("2026-11-09", 9) },
    ],
  };
}
module.exports = { make, T, today };
