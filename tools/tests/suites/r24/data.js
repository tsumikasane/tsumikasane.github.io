// plans for カレンダー その2: two running into each other, one with a 移動時間 and a 持ち物 list, a 仮 one with three
// days, a weekly one with a ふりかえり, one over (to look back on), a shift, a subject
const T = (d, h = 9, m = 0) => Date.parse(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`);
const today = "2026-11-11"; // a Wednesday
function make() {
  return {
    labels: [{ id: "l1", name: "ゼミ", color: "blue", createdAt: 1 }, { id: "l2", name: "遊び", color: "orange", createdAt: 2 }],
    subjects: [{ id: "sb1", name: "線形代数", color: "blue", createdAt: 1 }],
    events: [
      { id: "e1", title: "ゼミ", date: today, time: "10:00", endTime: "11:30", labelId: "l1", createdAt: 1 },
      { id: "e2", title: "面接", date: "2026-11-12", time: "14:00", endTime: "15:00", place: "〇〇ビル 5F", url: "https://example.com/info", travel: 40,
        checks: [{ id: "c1", text: "履歴書" }, { id: "c2", text: "印鑑", done: true }, { id: "c3", text: "スーツ" }], createdAt: 2 },
      { id: "e3", title: "歯医者", date: "2026-11-12", time: "14:30", endTime: "15:00", createdAt: 3 },
      { id: "e4", title: "飲み会", date: "2026-11-13", time: "19:00", endTime: "21:00", labelId: "l2", ten: true,
        cands: [{ date: "2026-11-14", time: "19:00", endTime: "21:00" }, { date: "2026-11-15", time: "18:00", endTime: "20:00" }], createdAt: 4 },
      { id: "e5", title: "英会話", date: "2026-11-04", time: "18:00", endTime: "19:00", repeat: "weekly", checks: [{ id: "k1", text: "テキスト" }],
        checked: { "2026-11-04": ["k1"] }, notes: { "2026-11-04": { mood: "good", text: "発音をほめられた", at: T("2026-11-04", 19) } }, createdAt: 5 },
      { id: "e6", title: "誕生日", date: "2026-11-20", createdAt: 6 },
      { id: "e7", title: "説明会", date: "2026-11-10", time: "13:00", endTime: "14:00", createdAt: 7 },
    ],
    shifts: [{ id: "s1", date: "2026-11-12", start: "17:00", end: "22:00", createdAt: 1 }],
    settings: [{ id: "calendar", freeFrom: "09:00", freeTo: "22:00", updatedAt: 1 }],
  };
}
module.exports = { make, T, today };
