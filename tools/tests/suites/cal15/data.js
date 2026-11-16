// plans for カレンダー その15 (today Monday 11/16, 10:00): ゼミ till noon and 面接 (★, its way there, a 予約番号) today;
// tomorrow 歯医者 with its way there and back and two notifications at a time of the day; 会議 every Wednesday and ランチ
// on 11/18; 打ち合わせ held (仮) on 11/19 at 15:00 (買い物 there), 11/20 at 10:00 and 11/21 all day (映画 that day); 試験
// (★) in December, 発表会 (★) in March, a ★ birthday every year; and a timetable of two classes
const today = "2026-11-16";
function make() {
  return {
    events: [
      { id: "e1", title: "ゼミ", date: today, time: "10:00", endTime: "12:00", createdAt: 1 },
      { id: "e2", title: "面接", date: today, time: "14:00", endTime: "15:00", travel: 30, star: true, place: "本社", resv: "AB-1234", createdAt: 2 },
      { id: "e3", title: "歯医者", date: "2026-11-17", time: "10:00", endTime: "11:00", travel: 15, travelBack: 20, place: "駅前クリニック", clock: [{ k: 0, at: "07:30" }, { k: 1, at: "21:00" }], createdAt: 3 },
      { id: "e4", title: "会議", date: "2026-11-04", time: "10:00", endTime: "11:00", repeat: "weekly", createdAt: 4 },
      { id: "e5", title: "ランチ", date: "2026-11-18", time: "12:00", endTime: "13:00", createdAt: 5 },
      { id: "e6", title: "打ち合わせ", date: "2026-11-19", time: "15:00", endTime: "16:00", ten: true, cands: [{ date: "2026-11-20", time: "10:00", endTime: "11:00" }, { date: "2026-11-21" }], createdAt: 6 },
      { id: "e7", title: "買い物", date: "2026-11-19", time: "15:30", endTime: "16:30", createdAt: 7 },
      { id: "e8", title: "映画", date: "2026-11-21", time: "18:00", endTime: "20:00", createdAt: 8 },
      { id: "e9", title: "試験", date: "2026-12-10", time: "09:00", endTime: "12:00", star: true, createdAt: 9 },
      { id: "e10", title: "発表会", date: "2026-03-01", star: true, createdAt: 10 },
      { id: "e11", title: "母の誕生日", date: "1970-05-05", repeat: "yearly", star: true, createdAt: 11 },
    ],
    settings: [
      { id: "calendar", freeFrom: "09:00", freeTo: "22:00", updatedAt: 1 },
      { id: "timetable", from: "2026-10-01", to: "2027-02-10", items: [{ id: "c1", wd: 1, p: 1, name: "線形代数", room: "A101" }, { id: "c2", wd: 3, p: 2, name: "英語コミュニケーションII", room: "B202" }], updatedAt: 1 },
    ],
  };
}
module.exports = { make, today };
