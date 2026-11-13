// 家計簿 ③⑦⑨: 月ごとの推移, 支出のカレンダー, 貯金の目標 (まとめ)
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed, T0 } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const X = (id, date, category, amount, memo, extra = {}) => ({ id, date, kind: "out", category, amount, ...(memo ? { memo } : {}), createdAt: T0, ...extra });
const I = (id, date, amount) => ({ id, date, kind: "in", category: "給与", amount, memo: "バイト代", createdAt: T0 });
const DATA = {
  expenses: [
    I("i6", "2026-06-25", 80000), X("o6", "2026-06-10", "食費", 20000),
    I("i7", "2026-07-25", 80000), X("o7", "2026-07-10", "食費", 25000),
    I("i9", "2026-09-25", 90000), X("o9", "2026-09-10", "食費", 30000), X("p9", "2026-09-12", "交際費", 10000),
    I("i10", "2026-10-25", 85000), X("o10", "2026-10-10", "食費", 28000), X("p10", "2026-10-11", "交通費", 2000),
    I("i11", "2026-11-01", 80000), X("fx-f1-2026-11", "2026-11-01", "住居費", 50000, "家賃", { fixed: "f1" }),
    X("n2", "2026-11-02", "食費", 400, "パン"), X("n3", "2026-11-03", "食費", 600, "コンビニ昼", { method: "qr" }), X("n5", "2026-11-05", "食費", 1500, "スーパー"),
    X("n7", "2026-11-07", "食費", 3000, "外食"), X("n8", "2026-11-08", "交際費", 4000, "飲み会", { method: "card" }), X("n8b", "2026-11-08", "食費", 0 + 300, "おやつ"), X("n9", "2026-11-09", "衣服", 5000, "シャツ"),
  ],
  settings: [
    { id: "budget", monthly: 30000, updatedAt: T0 },
    { id: "fixed", items: [{ id: "f1", name: "家賃", kind: "out", category: "住居費", amount: 50000, day: 1, method: "", since: "2026-11-01" }], updatedAt: T0 },
  ],
};
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.locator('#moneyParts button[data-part="stats"]').click(); await p.waitForTimeout(500);
  ok(await p.isVisible("#trendCard") && await p.isVisible("#exCalCard") && await p.isVisible("#saveCard"), "まとめ shows the three new cards");
  // ③ the chart: 6 months to 11月, the band on 11月
  const labels = await p.evaluate(() => [...document.querySelectorAll("#trendChart text")].map((t) => t.textContent).filter((t) => /^\d+月$/.test(t)));
  ok(labels.join(",") === "6月,7月,8月,9月,10月,11月", "③ six months to 11月: " + labels.join(","));
  const bars = await p.evaluate(() => ({ out: document.querySelectorAll("#trendChart .ch-bar.out").length, inn: document.querySelectorAll("#trendChart .ch-bar.in").length }));
  ok(bars.out === 5 && bars.inn === 5, "③ bars (8月 none): " + JSON.stringify(bars));
  const cur = await p.evaluate(() => document.querySelector("#trendChart text.cur")?.textContent);
  ok(cur === "11月", "③ the month shown in bold: " + cur);
  const nets = await p.evaluate(() => [...document.querySelectorAll("#trendChart .ch-net")].map((t) => t.textContent));
  ok(nets.join(",") === "+6万,+5.5万,+5万,+5.5万,+1.5万", "③ 収支 under the months: " + nets.join(","));
  let notes = await txt(p, "#trendNotes");
  ok(notes.includes("11月 支出 64,800 円・収入 80,000 円・収支 +15,200 円"), "③ the month: " + notes);
  ok(notes.includes("前月より 支出 +34,800 円・収入 −5,000 円"), "③ 前月比: " + notes);
  ok(notes.includes("記録のある5か月の平均 支出 35,960 円・収入 83,000 円"), "③ the average: " + notes);
  ok(await p.isHidden("#trendTable"), "③ the table folded away at first");
  await p.locator("#trendCard summary").click(); await p.waitForTimeout(200);
  const rows = await p.evaluate(() => [...document.querySelectorAll("#trendTable tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ").trim()));
  ok(rows.length === 6 && rows[2] === "8月 — — —" && rows[5] === "11月 64,800 80,000 +15,200", "③ the table: " + rows.join(" | "));
  const aria = await p.getAttribute("#trendChart", "aria-label");
  ok(aria.includes("2026年6月から2026年11月まで") && aria.includes("支出がいちばん多いのは2026年11月の64,800 円"), "③ aria-label: " + aria);
  await p.screenshot({ path: out + "/m3-stats-top.png" });
  // ③ a month pressed: the page goes to it, the months stay put
  const box = await p.locator('#trendChart text:text-is("9月")').boundingBox();
  await p.mouse.click(box.x + box.width / 2, box.y - 40); await p.waitForTimeout(400);
  ok((await txt(p, "#monthNav .cur")) === "2026年9月", "③ 9月 pressed: " + await txt(p, "#monthNav .cur"));
  const labels2 = await p.evaluate(() => [...document.querySelectorAll("#trendChart text")].map((t) => t.textContent).filter((t) => /^\d+月$/.test(t)));
  ok(labels2.join(",") === labels.join(",") && await p.evaluate(() => document.querySelector("#trendChart text.cur")?.textContent) === "9月", "③ months stay put, 9月 in bold");
  notes = await txt(p, "#trendNotes");
  ok(notes.includes("9月 支出 40,000 円・収入 90,000 円・収支 +50,000 円") && !notes.includes("前月より"), "③ 9月 (no 8月 to set against): " + notes);
  // ③ pointed at: its numbers in the tip; the arrow keys too
  const b10 = await p.locator('#trendChart text:text-is("10月")').boundingBox();
  await p.mouse.move(b10.x + b10.width / 2, b10.y - 60); await p.waitForTimeout(200);
  let tip = await txt(p, "#trendTip");
  ok(await p.isVisible("#trendTip") && tip === "2026年10月 支出 30,000 円 収入 85,000 円 収支 +55,000 円", "③ the tip: " + tip);
  await p.mouse.move(5, 5); await p.waitForTimeout(200);
  ok(await p.isHidden("#trendTip"), "③ the tip goes when the pointer leaves");
  await p.focus("#trendChart"); await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(100);
  tip = await txt(p, "#trendTip");
  ok(tip.startsWith("2026年9月"), "③ ArrowLeft first: the month shown: " + tip);
  await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(100);
  ok((await txt(p, "#trendTip")).startsWith("2026年8月 記録なし"), "③ ArrowLeft: 8月 " + await txt(p, "#trendTip"));
  await p.keyboard.press("ArrowRight"); await p.keyboard.press("ArrowRight"); await p.keyboard.press("ArrowRight"); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  ok((await txt(p, "#monthNav .cur")) === "2026年11月" && await p.isVisible("#trendTip"), "③ Enter goes to 11月, tip kept: " + await txt(p, "#monthNav .cur"));
  // ③ an old month: the months move to end at it, and back
  await p.evaluate(() => { for (let i = 0; i < 7; i++) document.querySelector("#monthNav .navbtn").click(); }); await p.waitForTimeout(300);
  const labels3 = await p.evaluate(() => [...document.querySelectorAll("#trendChart text")].map((t) => t.textContent).filter((t) => /^\d+月$/.test(t)));
  ok(labels3.join(",") === "12月,1月,2月,3月,4月,5月" && (await txt(p, "#monthNav .cur")) === "2026年4月", "③ 4月 (7 back): " + labels3.join(","));
  await p.locator("#monthNav .chip-btn").click(); await p.waitForTimeout(300);
  const labels4 = await p.evaluate(() => [...document.querySelectorAll("#trendChart text")].map((t) => t.textContent).filter((t) => /^\d+月$/.test(t)));
  ok(labels4.join(",") === "6月,7月,8月,9月,10月,11月", "③ 今月へ: " + labels4.join(","));
  // ⑦ the calendar: 30 days, the steps from 1日の予算 1,000 円 (500, 1,000, 2,000), 家賃 left out
  const cells = await p.evaluate(() => [...document.querySelectorAll("#exCal .excal-d")].map((c) => [c.dataset.day.slice(8), [...c.classList].find((k) => /^lv/.test(k)), c.querySelector(".da")?.textContent || ""]));
  ok(cells.length === 30, "⑦ 30 days: " + cells.length);
  const lv = Object.fromEntries(cells.map(([d, l, a]) => [d, l + ":" + a]));
  ok(lv["01"] === "lv0:" && lv["02"] === "lv1:400" && lv["03"] === "lv2:600" && lv["05"] === "lv3:1,500" && lv["07"] === "lv4:3,000" && lv["08"] === "lv4:4,300" && lv["10"] === "lv0:", "⑦ steps: " + JSON.stringify(lv));
  const pads = await p.locator("#exCal .excal-pad").count(), wds = await p.evaluate(() => [...document.querySelectorAll("#exCal .excal-wd")].map((w) => w.textContent).join(""));
  ok(pads === 0 && wds === "日月火水木金土", "⑦ 2026-11-01 is a Sunday, the week from 日: " + pads + " " + wds);
  const key = await txt(p, "#exCalKey");
  ok(key.includes("〜500 〜1,000 〜2,000 それ以上") && key.includes("1日の予算 1,000 円 を目安に塗っています。") && key.includes("固定費はのぞいています。") && key.includes("使わなかった日は 4 日。"), "⑦ key: " + key);
  ok(await p.getAttribute('#exCal [data-day="2026-11-10"]', "class").then((c) => c.includes("today")) && (await p.getAttribute('#exCal [data-day="2026-11-11"]', "class")).includes("future"), "⑦ today ringed, tomorrow bare");
  ok((await p.getAttribute('#exCal [data-day="2026-11-08"]', "aria-label")) === "11月8日（日） 支出 4,300 円", "⑦ a day's name for VoiceOver: " + await p.getAttribute('#exCal [data-day="2026-11-08"]', "aria-label"));
  // ⑦ a day pressed: its 明細 under it
  await p.locator('#exCal [data-day="2026-11-08"]').click(); await p.waitForTimeout(300);
  let day = await txt(p, "#exCalDay");
  ok(day.startsWith("11月8日（日） 支出 4,300 円") && day.includes("飲み会") && day.includes("おやつ") && day.includes("この日に追加"), "⑦ 11/8's 明細: " + day);
  ok(await p.getAttribute('#exCal [data-day="2026-11-08"]', "aria-pressed") === "true", "⑦ pressed");
  await p.locator('#exCal [data-day="2026-11-01"]').click(); await p.waitForTimeout(300);
  day = await txt(p, "#exCalDay");
  ok(day.includes("家賃") && day.includes("固定費") && day.includes("バイト代"), "⑦ 11/1 shows 家賃 and the income: " + day);
  await p.screenshot({ path: out + "/m3-cal.png", fullPage: true });
  await p.locator('#exCal [data-day="2026-11-04"]').click(); await p.waitForTimeout(300);
  ok((await txt(p, "#exCalDay")).includes("この日の記録はありません。"), "⑦ a day with none");
  await p.locator("#exCalDay .link-btn").click(); await p.waitForTimeout(500);
  const f = await p.evaluate(() => ({ part: document.querySelector("#moneyParts [aria-pressed=true]").dataset.part, date: exDate.value, focus: document.activeElement.id }));
  ok(f.part === "book" && f.date === "2026-11-04" && f.focus === "exAmount", "⑦ この日に追加: " + JSON.stringify(f));
  // ⑨ 貯金の目標: none yet
  await p.locator('#moneyParts button[data-part="stats"]').click(); await p.waitForTimeout(300);
  ok((await txt(p, "#saveList")).includes("貯金の目標を決める"), "⑨ none yet: " + await txt(p, "#saveList"));
  await p.locator("#saveList .link-btn").click(); await p.waitForTimeout(600);
  ok(await p.isVisible("#saveAdd"), "⑨ the button opens the settings at 貯金の目標");
  await p.locator("#saveAdd").click(); await p.waitForTimeout(300);
  const fid = await p.evaluate(() => document.querySelector("#saveForms [data-save]").dataset.save);
  ok(await p.evaluate(() => document.activeElement.id.startsWith("svName-")), "⑨ a new one, its name to type");
  await p.fill(`#svName-${fid}`, "旅行"); await p.fill(`#svTarget-${fid}`, "300000"); await p.selectOption(`#svSince-${fid}`, "2026-09"); await p.fill(`#svBase-${fid}`, "10000");
  await p.waitForTimeout(800);
  let note = await txt(p, `[data-save="${fid}"] .save-when`);
  ok(note === "いま 130,200 円（43%）。このペースなら 2027年2月ごろ", "⑨ its note: " + note);
  await p.selectOption(`#svUntil-${fid}`, "2027-03"); await p.waitForTimeout(500);
  note = await txt(p, `[data-save="${fid}"] .save-when`);
  ok(note.includes("2027年3月までに、毎月 33,960 円 ずつ"), "⑨ with 期限: " + note);
  await p.locator("#sheetDone").click(); await p.waitForTimeout(800);
  const sv = (await ls(p, "settings")).find((s) => s.id === "savings");
  ok(sv && sv.items.length === 1 && sv.items[0].name === "旅行" && sv.items[0].target === 300000 && sv.items[0].since === "2026-09" && sv.items[0].base === 10000 && sv.items[0].until === "2027-03", "⑨ kept: " + JSON.stringify(sv?.items));
  let goal = await txt(p, "#saveList");
  ok(goal.startsWith("旅行 130,200 円 / 300,000 円") && goal.includes("43%・2026年9月から・2027年3月までに、毎月 33,960 円 ずつ・このペースなら 2027年2月ごろ"), "⑨ まとめ: " + goal);
  ok(await p.evaluate(() => document.querySelector("#saveList .bar-track i").style.width) === "43%", "⑨ the bar at 43%");
  await p.locator("#saveCard").scrollIntoViewIfNeeded();
  await p.screenshot({ path: out + "/m3-save.png" });
  // ⑨ reached
  await p.locator("#moneySettings").click(); await p.waitForTimeout(600);
  await p.fill(`#svTarget-${fid}`, "100000"); await p.waitForTimeout(800);
  await p.locator("#sheetDone").click(); await p.waitForTimeout(800);
  goal = await txt(p, "#saveList");
  ok(goal.includes("100%・2026年9月から・達成しました") && await p.locator("#saveList .bar-track i.done").count() === 1, "⑨ 達成: " + goal);
  // ⑨ deleted, and back
  await p.locator("#moneySettings").click(); await p.waitForTimeout(600);
  await p.locator(`[data-save="${fid}"] .link-btn.danger`).click(); await p.waitForTimeout(400);
  ok(!(await ls(p, "settings")).find((s) => s.id === "savings").items.length, "⑨ deleted");
  await p.evaluate(() => document.querySelector(".toast-undo")?.click()); await p.waitForTimeout(500);
  ok((await ls(p, "settings")).find((s) => s.id === "savings").items.length === 1 && await p.locator("#saveForms [data-save]").count() === 1, "⑨ 元に戻す");
  await p.locator("#sheetDone").click(); await p.waitForTimeout(500);
  ok(!p.errs.length, "no page errors: " + p.errs.join(" | "));
  // dark, for the look
  const d = await phone(b, at("12:00", today), { colorScheme: "dark" });
  await seed(d, { ...DATA, settings: [...DATA.settings, { id: "savings", items: [{ id: "s1", name: "旅行", target: 300000, since: "2026-09", base: 10000, until: "2027-03" }], updatedAt: T0 }] }, "money");
  await d.locator('#moneyParts button[data-part="stats"]').click(); await d.waitForTimeout(500);
  await d.screenshot({ path: out + "/m3-dark-top.png" });
  await d.locator("#exCalCard").scrollIntoViewIfNeeded(); await d.locator('#exCal [data-day="2026-11-08"]').click(); await d.waitForTimeout(300);
  await d.screenshot({ path: out + "/m3-dark-cal.png" });
  ok(!d.errs.length, "dark: no page errors: " + d.errs.join(" | "));
  // wide: 12 months
  const wctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Asia/Tokyo", locale: "ja-JP" });
  await wctx.clock.setFixedTime(at("12:00", today));
  const w = await wctx.newPage(); w.errs = []; w.on("pageerror", (e) => w.errs.push(e.message));
  await seed(w, DATA, "money");
  await w.locator('#moneyParts button[data-part="stats"]').click(); await w.waitForTimeout(600);
  const wl = await w.evaluate(() => [...document.querySelectorAll("#trendChart text")].map((t) => t.textContent).filter((t) => /^\d+月$/.test(t)));
  ok(wl.length === 12 && wl[0] === "12月" && wl[11] === "11月", "③ wide: 12 months: " + wl.join(","));
  await w.screenshot({ path: out + "/m3-wide.png" });
  ok(!w.errs.length, "wide: no page errors: " + w.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
