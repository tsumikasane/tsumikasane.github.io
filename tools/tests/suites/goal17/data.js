// the goals this round's tests start from (2026-11-15, a Sunday): those of 目標 その16, with plans kept by three cells
// whose times are over (単語帳2周 yesterday evening, 長文 this morning, クローゼット every Friday), a few 見積もり and a
// 小さな一歩, four cells due on 11/25, and TOEIC's なぜ with the day's やる気 low
const base = require("../goal16/data");
const J = (d, hm) => Date.parse(`${d}T${hm}:00+09:00`);
function all() {
  const gs = base.all(), g = (id) => gs.find((x) => x.id === id), g1 = g("g1"), g2 = g("g2"), g3 = g("g3");
  g1.mandala[0].c[1].ev = ["e7"]; g1.mandala[4].ev = ["e8"]; g3.mandala[1].ev = ["e9"];
  g1.mandala[2].c[1].est = 120; g3.mandala[2].est = 15; g3.mandala[1].step = "引き出しを1つ開ける";
  g1.why = "海外で働きたいから"; g1.mood = { "2026-11-15": 2 };
  for (const c of [g2.mandala[1].c[1], g2.mandala[2], g2.mandala[3], g3.mandala[2]]) c.due = "2026-11-25";
  return gs;
}
const events = [...base.events,
  { id: "e7", date: "2026-11-14", time: "19:00", endTime: "20:00", title: "単語帳2周", memo: "目標「TOEIC 800点」のマス", createdAt: J("2026-11-13", "21:00") },
  { id: "e8", date: "2026-11-15", time: "09:00", endTime: "10:00", title: "長文", memo: "目標「TOEIC 800点」のマス", createdAt: J("2026-11-14", "21:00") },
  { id: "e9", date: "2026-11-06", time: "18:00", endTime: "19:00", title: "クローゼット", repeat: "weekly", memo: "目標「部屋を片づける」のマス", createdAt: J("2026-11-05", "21:00") }];
module.exports = { ...base, all, events };
