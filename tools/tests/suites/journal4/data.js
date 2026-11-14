// 日記 その4's example: Saturday 2026-11-14, 21:00, nothing written today. 11/3 (文化の日), 11/7 (立冬, a week ago),
// and 11/10, 11/12, 11/13 written with 見出し (よかったこと on three days, あしたやりたいこと on two); last week's ひとこと
const at = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
const DAY = "2026-11-14";
const jn = (date, text) => ({ id: date, date, text, createdAt: at(date, "21:00"), updatedAt: at(date, "21:00") });
const journal = () => [
  jn("2026-11-03", "文化の日。"),
  jn("2026-11-07", "立冬の日。寒くなった。"),
  jn("2026-11-10", "よかったこと：散歩\nあしたやりたいこと：\n・洗濯\n・買い物\n21:30 寝る"),
  jn("2026-11-12", "よかったこと：カフェ\nがんばったこと：勉強"),
  jn("2026-11-13", "よかったこと：映画\nあしたやりたいこと：掃除\n天気：雨"),
];
const all = () => ({ journal: journal(), todos: [], settings: [{ id: "jnWeek:2026-11-01", text: "先週のひとこと", updatedAt: 1 }] });
module.exports = { DAY, all };
