// きょう その3's example: Saturday 2026-11-14, 13:30; records kept for days, a plan and a shift today, a budget
const DAY = "2026-11-14";
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const back = (n) => new Date(Date.UTC(2026, 10, 14 - n)).toISOString().slice(0, 10);
function all() {
  return {
    // 日記 the 4 days before today (not today), 体重 today and the 2 before, 勉強 this week and last
    journal: [1, 2, 3, 4].map((n) => ({ id: back(n), date: back(n), text: "書いた" })),
    weights: [0, 1, 2].map((n) => ({ id: back(n), date: back(n), kg: 60 + n / 10 })),
    study: [{ id: "s1", date: "2026-11-09", minutes: 60, createdAt: T(DAY) }, { id: "s2", date: DAY, minutes: 30, createdAt: T(DAY) }, { id: "s3", date: "2026-11-03", minutes: 45, createdAt: T(DAY) }],
    workouts: [{ id: "w1", date: "2026-11-10", type: "ランニング", km: 3, minutes: 20, createdAt: T(DAY) }, { id: "w2", date: "2026-11-12", type: "ランニング", km: 3, minutes: 20, createdAt: T(DAY) }, { id: "w3", date: "2026-11-04", type: "ランニング", km: 3, minutes: 20, createdAt: T(DAY) }],
    expenses: [{ id: "x1", date: "2026-11-05", kind: "out", category: "食費", amount: 20000, createdAt: T(DAY) }, { id: "x2", date: DAY, kind: "out", category: "食費", amount: 800, createdAt: T(DAY) }],
    events: [{ id: "e1", date: DAY, title: "歯医者", time: "10:00", endTime: "11:00", createdAt: T("2026-11-01") }, { id: "e2", date: DAY, title: "友だちとごはん", time: "18:30", endTime: "20:00", createdAt: T("2026-11-01") }],
    todos: [{ id: "t1", text: "請求書を送る", done: false, due: "2026-11-12", createdAt: T("2026-11-01") }, { id: "t2", text: "洗濯", done: false, due: DAY, time: "15:00", createdAt: T("2026-11-01") }, { id: "t3", text: "本を返す", done: true, doneAt: T(DAY, 9), due: DAY, createdAt: T("2026-11-01") }],
    settings: [{ id: "budget", monthly: 60000 }],
  };
}
module.exports = { DAY, all, T };
