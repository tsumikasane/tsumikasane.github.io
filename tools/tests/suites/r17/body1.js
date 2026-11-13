// からだ ①〜⑩
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10";
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const T = (d, h = 7) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const between = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
const slopeOf = (pts) => { const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n; let a = 0, b = 0; for (const [x, y] of pts) { a += (x - mx) * (y - my); b += (x - mx) ** 2; } return a / b; };
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const short = (d) => { const x = new Date(d + "T12:00:00Z"); return `${x.getUTCMonth() + 1}/${x.getUTCDate()}（${WD[x.getUTCDay()]}）`; };
// 40 days going down about 0.05 kg a day, every third day missed; 体脂肪率 from 30 days back, ウエスト and 二の腕 weekly
const weights = [];
for (let i = 40; i >= 0; i--) {
  if (i % 3 === 1) continue;
  const d = addDays(today, -i), kg = Math.round((66 - (40 - i) * 0.05 + (((i * 7) % 5) - 2) * 0.15) * 10) / 10;
  const r = { id: d, date: d, kg, createdAt: T(d) };
  if (i < 30) r.fat = Math.round((20 - (30 - i) * 0.03) * 10) / 10;
  if (i % 7 === 0) { r.waist = Math.round((80 - (40 - i) * 0.05) * 10) / 10; r.arm = 30.5; }
  if (i === 5) r.intake = 2300; // typed: taken over the day's 食事
  weights.push(r);
}
const meals = [];
for (let i = 1; i <= 20; i++) { const d = addDays(today, -i); meals.push({ id: "m" + i, date: d, slot: "夕食", text: "ごはん", kcal: 2100, createdAt: T(d, 19) }); }
meals.push({ id: "m-low", date: addDays(today, -21), slot: "朝食", text: "パン", kcal: 300, createdAt: T(addDays(today, -21), 8) }); // under 800: left out
meals.push({ id: "m-today", date: today, slot: "朝食", text: "パン", kcal: 300, createdAt: T(today, 8) }); // today: not over yet
const SET = [{ id: "body", height: 170, age: 30, sex: "m", updatedAt: T("2026-11-01") }, { id: "weight", target: 62, updatedAt: T("2026-11-01") }];
const DATA = { weights, meals, settings: SET };
// what the app should say, worked out here on its own
const recs = weights.filter((r) => r.id <= today), last = recs[recs.length - 1];
const avgLast = (() => { const xs = recs.filter((r) => r.id >= addDays(last.id, -6)); return xs.reduce((s, r) => s + r.kg, 0) / xs.length; })();
const paceFrom = addDays(last.id, -27), paceRecs = recs.filter((r) => r.id >= paceFrom), paceDay = slopeOf(paceRecs.map((r) => [between(paceFrom, r.id), r.kg]));
const fmtPace = (w) => `${w < 0 ? "−" : "+"}${Math.abs(w).toFixed(Math.abs(w) < 0.095 ? 2 : 1)} kg/週`;
const when = addDays(today, Math.max(1, Math.ceil((last.kg - 62) / -paceDay)));
const estFrom = addDays(today, -28), estWs = recs.filter((r) => r.id >= estFrom), estSlope = slopeOf(estWs.map((r) => [between(estFrom, r.id), r.kg]));
const intakeDays = new Map(meals.filter((m) => m.date >= estFrom && m.date < today).map((m) => [m.date, 0]));
for (const m of meals) if (m.date >= estFrom && m.date < today) intakeDays.set(m.date, intakeDays.get(m.date) + m.kcal);
for (const r of estWs) if (r.id < today && typeof r.intake === "number") intakeDays.set(r.id, r.intake);
const dayKs = [...intakeDays.values()].filter((k) => k >= 800), meanIn = dayKs.reduce((s, k) => s + k, 0) / dayKs.length;
const est = Math.round((meanIn - estSlope * 7200) / 10) * 10;
const fmtN = (n) => n.toLocaleString("en-US");

(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:30", today));
  await seed(p, DATA, "diet"); await p.evaluate((P) => localStorage.setItem(P + "dietPart", "weight"), P); await p.reload(); await p.waitForTimeout(900);
  const stats = await txt(p, "#wtStats");
  // ①
  ok(await p.locator("#wtChart path.avg-line").count() === 1 && await p.locator("#wtChart path.line.raw").count() === 1 && await p.locator("#fatChart path.avg-line").count() === 1, "① 7日平均 lines on 体重 and 体脂肪率");
  ok((await txt(p, "#wtLegend")).startsWith("記録 7日平均"), "① the legend: " + await txt(p, "#wtLegend"));
  ok(stats.includes(`最新 ${last.kg.toFixed(1)} kg きょうの記録・7日平均 ${avgLast.toFixed(1)} kg`), "① 最新 with its 7日平均 " + avgLast.toFixed(2), stats);
  ok(stats.includes(`ペース ${fmtPace(paceDay * 7)} 最近4週間の記録から`), "① ペース " + fmtPace(paceDay * 7), stats);
  // the tip: a point's 7日平均
  await p.locator("#wtChart").hover({ position: { x: (await p.locator("#wtChart").boundingBox()).width - 48, y: 100 } }); await p.waitForTimeout(100);
  ok((await txt(p, "#wtTip")).includes("7日平均"), "① the tip says the 7日平均: " + await txt(p, "#wtTip"));
  // ②
  ok(stats.includes(`目標まで あと ${(last.kg - 62).toFixed(1)} kg 目標 62.0 kg・${when.slice(5).replace(/^0/, "").replace("-0", "/").replace("-", "/")}ごろ`), "② 目標まで with when: " + when, stats);
  let plan = await txt(p, "#wtPlan");
  ok(plan.includes(`今のペース（${fmtPace(paceDay * 7)}）なら ${short(when)}ごろに届きます。`) && plan.includes("期限を決めると"), "② the plan says when, and asks for a 期限", plan);
  // ③
  ok(stats.includes(`BMI ${(last.kg / 2.89).toFixed(1)} 普通体重・標準体重 63.6 kg`), "③ BMI", stats);
  ok(await p.locator("#wtChart rect.band").count() === 0, "③ no band when all of the plot is inside 普通体重");
  // ④
  const lastFat = recs.filter((r) => r.fat).pop();
  ok(stats.includes(`除脂肪体重 ${(lastFat.kg * (1 - lastFat.fat / 100)).toFixed(1)} kg`) && stats.includes(`体脂肪量 ${(lastFat.kg * lastFat.fat / 100).toFixed(1)} kg`), "④ 除脂肪体重 and 体脂肪量", stats);
  await p.locator("#fatChart").hover({ position: { x: (await p.locator("#fatChart").boundingBox()).width - 48, y: 60 } }); await p.waitForTimeout(100);
  ok((await txt(p, "#fatTip")).includes("脂肪 "), "④ 体脂肪率's tip says 脂肪の量: " + await txt(p, "#fatTip"));
  // ⑦
  ok(plan.includes(`推定メンテナンスカロリー ${fmtN(est)} kcal`) && plan.includes(`${dayKs.length} 日の平均 ${fmtN(Math.round(meanIn))} kcal`), "⑦ estimate " + est + " from " + dayKs.length + " days", plan);
  // ⑨
  const rows = await p.evaluate(() => [...document.querySelectorAll("#wtReviewTable tbody tr")].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()));
  const wk0 = addDays(today, -new Date(today + "T12:00:00Z").getUTCDay()), wkRecs = recs.filter((r) => r.id >= wk0), wkPrev = recs.filter((r) => r.id >= addDays(wk0, -7) && r.id < wk0);
  const mean = (xs) => xs.reduce((s, r) => s + r.kg, 0) / xs.length;
  ok(rows.length === 8 && rows[0] === `今週 ${wkRecs.length}回 ${mean(wkRecs).toFixed(1)} kg ${mean(wkRecs) - mean(wkPrev) < 0 ? "−" : "+"}${Math.abs(mean(wkRecs) - mean(wkPrev)).toFixed(1)} kg ${(wkRecs.reduce((s, r) => s + r.fat, 0) / wkRecs.length).toFixed(1)}%`, "⑨ 8 weeks, this one first", rows.slice(0, 2));
  ok(rows[1].startsWith(`${Number(addDays(wk0, -7).slice(5, 7))}/${Number(addDays(wk0, -7).slice(8))}〜`), "⑨ the week before's days", rows[1]);
  await p.locator('#wtReviewBy [data-by="month"]').click(); await p.waitForTimeout(100);
  const mrows = await p.evaluate(() => [...document.querySelectorAll("#wtReviewTable tbody tr")].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()));
  ok(mrows.length === 6 && mrows[0].startsWith("今月") && mrows[1].startsWith("10月") && mrows[3].startsWith("8月") && mrows[3].endsWith("— — —"), "⑨ 6 months", mrows.slice(0, 4));
  // ⑤ the size plot
  ok(await txt(p, "#sizePick") === "ウエスト 二の腕" && (await txt(p, "#sizeNote")).startsWith("ウエスト 78.0 cm（きょう）"), "⑤ the size plot: " + await txt(p, "#sizePick") + " | " + await txt(p, "#sizeNote"));
  await p.locator('#sizePick button:has-text("二の腕")').click(); await p.waitForTimeout(100);
  ok((await txt(p, "#sizeNote")).startsWith("二の腕 30.5 cm") && (await p.getAttribute("#sizeChart", "aria-label")).startsWith("二の腕の推移グラフ"), "⑤ 二の腕 picked: " + await txt(p, "#sizeNote"));

  // ②⑧ a 期限 set under the gear
  await p.locator("#wtSettings").click(); await p.waitForTimeout(500);
  ok(!(await p.isHidden("#wtRemindForm")) && await p.inputValue("#wtRemindAt") === "08:00" && !(await p.isChecked("#wtRemindOn")), "⑥ the お知らせ there, off, 08:00");
  await p.fill("#wtBy", "2027-01-31"); await p.locator("#wtBy").dispatchEvent("change"); await p.waitForTimeout(200);
  // ⑥ on: kept
  await p.locator("#wtRemindOn").click({ force: true }); await p.waitForTimeout(200);
  await p.fill("#wtRemindAt", "07:30"); await p.locator("#wtRemindAt").dispatchEvent("change"); await p.waitForTimeout(200);
  let set = await ls(p, "settings");
  ok(set.find((x) => x.id === "weightBy")?.date === "2027-01-31", "②⑧ the 期限 kept", set.find((x) => x.id === "weightBy"));
  ok(set.find((x) => x.id === "weightRemind")?.on === true && set.find((x) => x.id === "weightRemind")?.at === "07:30", "⑥ kept: on at 07:30", set.find((x) => x.id === "weightRemind"));
  await p.locator("#sheetDone").click(); await p.waitForTimeout(500);
  plan = await txt(p, "#wtPlan");
  const daysLeft = between(today, "2027-01-31"), need = (-(last.kg - 62) / daysLeft) * 7;
  ok(plan.includes(`期限 2027年1/31（日） ${need < 0 ? "−" : "+"}${Math.abs(need).toFixed(Math.abs(need) < 0.095 ? 2 : 1)} kg/週 あと ${daysLeft} 日で届くペース・今のペースで間に合います`), "② the 期限's pace", plan);
  const kcal = Math.round((est - ((last.kg - 62) * 7200) / daysLeft) / 10) * 10;
  ok(plan.includes(`1日の摂取カロリー ${fmtN(kcal)} kcal 推定メンテナンスカロリー ${fmtN(est)} kcal から`), "⑧ a day's kcal " + kcal, plan);
  await p.locator('#wtPlan button:has-text("食事の目安にする")').click(); await p.waitForTimeout(300);
  set = await ls(p, "settings");
  ok(set.find((x) => x.id === "kcalGoal")?.target === kcal && (await txt(p, "#wtPlan")).includes("食事の目安になっています。"), "⑧ made 食事's 目安");
  await p.locator(".toast-undo:visible").first().click(); await p.waitForTimeout(300);
  set = await ls(p, "settings");
  ok(!set.find((x) => x.id === "kcalGoal"), "⑧ 元に戻す: none again", set.find((x) => x.id === "kcalGoal"));

  // ⑤ sizes typed with a day's weight: the day before, which has none
  await p.locator("#wtForm").scrollIntoViewIfNeeded();
  await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "前日"); b?.click(); }); await p.waitForTimeout(300);
  const y1 = addDays(today, -1);
  ok(await p.isVisible("#wtSizeOpen") && await p.isHidden("#wtSize-waist"), "⑤ the sizes asked for, not shown");
  await p.locator("#wtSizeOpen").click(); await p.waitForTimeout(100);
  ok(await p.isVisible("#wtSize-thigh"), "⑤ shown once asked for");
  await p.fill("#wtInput", "64.0"); await p.fill("#wtFat", "19.0"); await p.fill("#wtIntake", "2050"); await p.fill("#wtSize-waist", "79.3"); await p.fill("#wtSize-thigh", "5");
  await p.locator("#wtSubmit").click(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelector("#wtSize-thigh").validity.rangeUnderflow) && !(await ls(p, "weights")).some((r) => r.id === addDays("2026-11-10", -1) && r.thigh), "⑤ a size out of range: not taken");
  await p.fill("#wtSize-thigh", "55.5"); await p.locator("#wtSubmit").click(); await p.waitForTimeout(300);
  let w1 = (await ls(p, "weights")).find((r) => r.id === y1);
  ok(w1 && w1.kg === 64 && w1.fat === 19 && w1.intake === 2050 && w1.waist === 79.3 && w1.thigh === 55.5 && w1.arm === undefined, "⑤ kept with the day's weight", w1);
  ok(await txt(p, "#sizePick") === "ウエスト 二の腕 太もも", "⑤ 太もも in the plot's picker: " + await txt(p, "#sizePick"));
  // today's in its sheet (きょう's 体重): the sizes there, one changed, one emptied, the rest kept
  await p.goto(URL0 + "#home"); await p.reload(); await p.waitForTimeout(800);
  await p.locator('.qk[data-kind="weight"]').click(); await p.waitForTimeout(500);
  ok(await p.inputValue("#reSize-waist") === "78.0" && await p.inputValue("#reSize-arm") === "30.5" && await p.inputValue("#reSize-hip") === "", "⑤ its sheet has the sizes");
  await p.fill("#reSize-waist", "77.9"); await p.fill("#reSize-arm", ""); await p.locator("#recSave").click(); await p.waitForTimeout(500);
  const w0 = (await ls(p, "weights")).find((r) => r.id === today);
  ok(w0 && w0.waist === 77.9 && w0.arm === undefined && w0.fat === last.fat && w0.kg === last.kg, "⑤ changed there, the rest kept", w0);

  // ⑩ photos
  await p.goto(URL0 + "#diet"); await p.evaluate((P) => localStorage.setItem(P + "dietPart", "weight"), P); await p.reload(); await p.waitForTimeout(800);
  ok(await p.isVisible("#photoEmpty") && await p.isHidden("#photoCompare"), "⑩ none yet: the note");
  await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "前日"); for (let i = 0; i < 1; i++) b?.click(); }); await p.waitForTimeout(300);
  await p.setInputFiles("#wtPhotoFile", __dirname + "/photo1.png"); await p.waitForTimeout(800);
  ok(await p.locator("#photoStrip .photo-thumb").count() === 1 && (await txt(p, "#photoCompare")).includes("もう1枚追加すると"), "⑩ one photo: shown, asks for another");
  await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith("翌日")); b?.click(); }); await p.waitForTimeout(300);
  await p.setInputFiles("#wtPhotoFile", __dirname + "/photo2.png"); await p.waitForTimeout(800);
  const cmp = await txt(p, "#photoCompare");
  ok(await p.locator("#photoCompare figure").count() === 2 && cmp.includes(short(addDays(today, -1))) && cmp.includes(short(today)) && cmp.includes("1 日のあいだ・体重 −0.3 kg"), "⑩ two side by side, older first, with the weights", cmp);
  const stored = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open("tsumikasane-photos"); r.onsuccess = () => { const g = r.result.transaction("photos").objectStore("photos").getAll(); g.onsuccess = () => res(g.result.map((x) => [x.date, x.w, x.h, x.blob.type, x.blob.size > 100])); }; }));
  ok(stored.length === 2 && stored.every((x) => x[3] === "image/jpeg" && x[4]) && stored.some((x) => x[1] === 600 && x[2] === 800), "⑩ kept on this device as JPEG", stored);
  ok(!(await ls(p, "settings")).some((x) => JSON.stringify(x).includes("blob")), "⑩ not in the synced records");
  // deleted (pressed twice), then 元に戻す
  const del = p.locator("#photoCompare figure").nth(1).locator(".photo-del");
  await del.click(); await del.click(); await p.waitForTimeout(500);
  ok(await p.locator("#photoStrip .photo-thumb").count() === 1, "⑩ deleted");
  await p.locator(".toast-undo:visible").first().click(); await p.waitForTimeout(500);
  ok(await p.locator("#photoStrip .photo-thumb").count() === 2, "⑩ 元に戻す: back");
  await p.reload(); await p.waitForTimeout(900);
  ok(await p.locator("#photoStrip .photo-thumb").count() === 2 && await p.locator("#photoCompare figure").count() === 2, "⑩ still there after a reload");
  // a thumbnail pressed: only it, then both again
  await p.locator("#photoStrip .photo-thumb").first().click(); await p.waitForTimeout(200);
  ok(await p.locator("#photoCompare figure").count() === 1, "⑩ a picked one let go: one shown");
  await p.screenshot({ path: out + "/body-photos.png" });

  // ③ the band, with an edge of it inside the plot (160 cm: 25 at 64.0 kg)
  await p.evaluate((P) => { const k = P + "settings", list = JSON.parse(localStorage.getItem(k)); list.find((x) => x.id === "body").height = 160; localStorage.setItem(k, JSON.stringify(list)); }, P);
  await p.reload(); await p.waitForTimeout(900);
  ok(await p.locator("#wtChart rect.band").count() === 1 && (await txt(p, "#wtLegend")).includes("普通体重（BMI 18.5〜25）"), "③ the band where 25 is inside the plot");
  ok((await txt(p, "#wtStats")).includes("肥満（1度）") || (await txt(p, "#wtStats")).includes("普通体重"), "③ the class at 160 cm");

  ok(!p.errs.length, "no page errors: " + p.errs.join(" | "));
  // dark
  const d = await phone(b, at("12:30", today), { colorScheme: "dark" });
  await seed(d, DATA, "diet"); await d.evaluate((P) => localStorage.setItem(P + "dietPart", "weight"), P); await d.reload(); await d.waitForTimeout(900);
  await d.screenshot({ path: out + "/body-dark.png", fullPage: true });
  ok(!d.errs.length, "dark: no page errors: " + d.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
