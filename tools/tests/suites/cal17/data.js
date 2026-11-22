// plans for カレンダー その17 (today Monday 11/16, 10:00): 線形代数 (a class, Mondays, two turns with a memo and one with a
// ふりかえり), ゼミ, 面接 (30 minutes to get there) and 夕食 today; 研究会 and 打ち合わせ (label 研究) later in the week;
// 映画 on Saturday; three labels and a timetable of two classes
const today = "2026-11-16";
function make() {
  return {
    events: [
      { id: "e1", title: "ゼミ", date: today, time: "10:00", endTime: "12:00", labelId: "l1", place: "研究棟", createdAt: 1 },
      { id: "e2", title: "研究会", date: "2026-11-18", time: "13:00", endTime: "14:00", labelId: "l2", createdAt: 2 },
      { id: "e3", title: "打ち合わせ", date: "2026-11-19", time: "15:00", endTime: "16:00", labelId: "l2", createdAt: 3 },
      { id: "e4", title: "線形代数", date: "2026-10-05", time: "09:00", endTime: "10:30", repeat: "weekly", repeatUntil: "2027-02-10", cls: "c1", labelId: "lc", place: "A101",
        turnNotes: { "2026-11-09": "第6回 行列式", "2026-11-23": "小テスト" }, notes: { "2026-11-02": { mood: "good", text: "よくわかった" } }, createdAt: 4 },
      { id: "e5", title: "面接", date: today, time: "14:00", endTime: "15:00", travel: 30, place: "本社", createdAt: 5 },
      { id: "e6", title: "夕食", date: today, time: "19:00", endTime: "20:00", createdAt: 6 },
      { id: "e7", title: "映画", date: "2026-11-21", time: "18:00", endTime: "20:00", createdAt: 7 },
    ],
    labels: [{ id: "l1", name: "ゼミ", color: "blue", createdAt: 1 }, { id: "l2", name: "研究", color: "green", createdAt: 2 }, { id: "lc", name: "授業", color: "orange", createdAt: 3 }],
    settings: [
      { id: "calendar", freeFrom: "09:00", freeTo: "22:00", gap17: { on: true, min: 60 }, updatedAt: 1 }, // (⑥ すきま時間のお知らせ on from before: taken out, 2026-11-22)
      { id: "timetable", from: "2026-10-01", to: "2027-02-10", items: [{ id: "c1", wd: 1, p: 1, name: "線形代数", room: "A101" }, { id: "c2", wd: 3, p: 2, name: "英語", room: "B202" }], updatedAt: 1 },
    ],
  };
}
module.exports = { make, today };
