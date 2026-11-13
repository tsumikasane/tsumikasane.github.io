// 家計簿 その3: 6 months before with 食費 10,000 each, and November (today 2026-11-12, a Thursday) with more
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const X = (id, date, category, amount, memo, kind = "out", more = {}) => ({ id, date, kind, category, amount, ...(memo ? { memo } : {}), createdAt: T0, ...more });
const expenses = [];
for (const m of ["05", "06", "07", "08", "09", "10"]) {
  expenses.push(X("f" + m, `2026-${m}-10`, "食費", 10000, "スーパー"), X("k" + m, `2026-${m}-15`, "交通費", 3000, "電車"));
  expenses.push(X("r" + m, `2026-${m}-25`, "雑費", 5000, "家賃", "out", { fixed: true }));
}
expenses.push(X("t1", "2026-10-20", "交際費", 40000, "沖縄 #旅行"));
expenses.push(
  X("n1", "2026-11-02", "食費", 8000, "外食 #旅行"), X("n2", "2026-11-06", "食費", 12000, "スーパー"), X("n3", "2026-11-09", "衣服", 6000, "シャツ"),
  X("n4", "2026-11-10", "食費", 500, "コンビニ"), X("n5", "2026-11-11", "交際費", 3000, "カラオケ #推し活"), X("n6", "2026-11-12", "食費", 700, "ランチ"),
  X("n7", "2026-11-01", "給与", 50000, "バイト代", "in"));
const settings = [{ id: "budget", monthly: 30000, updatedAt: T0 }, { id: "moNotes", notes: { "2026-10": "旅行で使いすぎた" }, updatedAt: T0 }];
module.exports = { DATA: { expenses, settings }, today: "2026-11-12" };
