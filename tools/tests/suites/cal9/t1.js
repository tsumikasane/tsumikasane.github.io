// カレンダー その9 ①〜⑩ (on the hooked copy at 8815)
process.env.URL0 = process.env.URL0 || "http://localhost:8815/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const nos = (s) => String(s || "").replace(/\s+/g, "");
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const ev = async (p, id) => (await ls(p, "events")).find((e) => e.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id) || null;
const openDayOf = async (p, md) => { await p.evaluate((md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).click(), md); await p.waitForTimeout(700); };
const openPlan = async (p, md, title) => { await openDayOf(p, md); await p.locator("#calDayList .row-btn", { hasText: title }).first().click(); await p.waitForTimeout(700); };
const closeSheet = async (p) => { for (let i = 0; i < 4 && (await p.evaluate(() => document.getElementById("daySheet").open)); i++) { await p.keyboard.press("Escape"); await p.waitForTimeout(700); } };
const undo = async (p) => { await p.locator(".show button", { hasText: "元に戻す" }).first().click(); await p.waitForTimeout(600); };
const setVal = (p, id, v) => p.evaluate(({ id, v }) => { const t = document.getElementById(id); t.value = v; t.dispatchEvent(new Event("input", { bubbles: true })); t.dispatchEvent(new Event("change", { bubbles: true })); }, { id, v });
const tabNow = (p) => p.evaluate(() => document.documentElement.dataset.tab);
async function open(data = make(), when = "10:30", day = today) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ① every six weeks: its turns, .ics, and the plan opened
  ok((await p.evaluate(() => window.__cal9.turns("2026-11-14"))).includes("美容院") && !(await p.evaluate(() => window.__cal9.turns("2026-11-21"))).includes("美容院") && (await p.evaluate(() => window.__cal9.turns("2026-12-26"))).includes("美容院"), "① 6週間ごと: 10/3, 11/14, 12/26");
  ok((await p.evaluate(() => window.__cal9.ics("e1"))).includes("RRULE:FREQ=WEEKLY;INTERVAL=6"), "① .ics with its INTERVAL");
  await openPlan(p, "11月14日", "美容院");
  ok((await p.inputValue("#edRepeat")) === "every6w" && (await p.evaluate(() => document.getElementById("edRepeat").selectedOptions[0].textContent)) === "6週間ごと", "① the plan opened says 6週間ごと");
  await closeSheet(p);
  // a new one every three weeks
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "掃除");
  await p.selectOption("#planRepeat", "cal9:pick"); await p.waitForTimeout(300);
  ok(await p.isVisible("#planEvery9") && (await p.inputValue("#planRepeat")) === "", "① 間隔を決める… asks under the menu");
  await p.fill("#planEvery9N", "3"); await p.selectOption("#planEvery9U", "w"); await p.waitForTimeout(150);
  await p.click('#planEvery9 [data-k="every-ok"]'); await p.waitForTimeout(300);
  ok((await p.inputValue("#planRepeat")) === "every3w", "① 3週間ごと picked", await p.inputValue("#planRepeat"));
  await p.click("#planSave"); await p.waitForTimeout(700);
  const sweep = (await ls(p, "events")).find((e) => e.title === "掃除");
  ok(sweep && sweep.repeat === "every3w", "① saved", sweep);
  ok((await p.evaluate((d) => window.__cal9.turns(d), sweep && require_add(sweep.date, 21))).includes("掃除"), "① three weeks on, again");
  await closeSheet(p);

  // ② lines of words at once
  await openDayOf(p, "11月19日");
  await p.click("#cal9BulkBtn"); await p.waitForTimeout(300);
  await p.fill("#cal9BulkText", "10:00 ゼミ準備\nあした 14時 面接練習\n買い出し"); await p.waitForTimeout(300);
  const pre = await p.evaluate(() => [...document.querySelectorAll("#cal9BulkList li")].map((x) => x.innerText.replace(/\s+/g, " ")));
  ok(pre.length === 3 && pre[0] === "11/19（木） 10:00〜11:00 ゼミ準備" && pre[1] === "11/15（日） 14:00〜15:00 面接練習" && pre[2] === "11/19（木） 終日 買い出し", "② what each line makes", pre);
  await p.click("#cal9BulkAdd"); await p.waitForTimeout(700);
  let all = await ls(p, "events");
  ok(["ゼミ準備", "面接練習", "買い出し"].every((t) => all.some((e) => e.title === t)), "② all three added");
  await undo(p);
  all = await ls(p, "events");
  ok(!["ゼミ準備", "面接練習", "買い出し"].some((t) => all.some((e) => e.title === t)), "② 元に戻す");
  await closeSheet(p);

  // ⑩ a past day's records
  await openDayOf(p, "11月12日");
  const rec = nos(await txt(p, "#cal9Rec"));
  ok(rec.includes("日記発表がんばった") && rec.includes("食事1件（昼食）") && rec.includes("体重60.2kg") && rec.includes("勉強1時間30分") && rec.includes("支出800円"), "⑩ the day's records", rec);
  await p.click('#cal9Rec [data-rec="日記"]'); await p.waitForTimeout(900);
  ok((await tabNow(p)) === "journal", "⑩ 日記 opens on its page", await tabNow(p));
  p = await open();

  // ③④ people and places in 予定
  await p.click("#calFind"); await p.waitForTimeout(700);
  const ppl = nos(await txt(p, ".cal9-people"));
  ok(ppl.includes("田中さん2回・11/10") && ppl.includes("佐藤さん1回・11/12") && ppl.includes("3号館2回・11/12") && ppl.includes("居酒屋1回・11/10"), "③④ with how many and the last", ppl);
  await p.click('.cal9-people [data-who="田中さん"]'); await p.waitForTimeout(500);
  const found = await txt(p, "#findList");
  ok((await p.inputValue("#findText")) === "田中さん" && found.includes("ゼミ") && found.includes("飲み会") && !found.includes("勉強会"), "③ 田中さん's plans", found.slice(0, 200));
  await closeSheet(p);

  // ⑤ a while without 予定's notifications
  let al = await p.evaluate(() => window.__cal9.alarms(Date.now()));
  ok(al.some((a) => a.tag === "e2:2026-11-16"), "⑤ ゼミ's alarm as it is");
  await p.click("#calSettings"); await p.waitForTimeout(700);
  await setVal(p, "cal9QuietFrom", "2026-11-16"); await setVal(p, "cal9QuietTo", "2026-11-17");
  await p.click("#cal9QuietOn"); await p.waitForTimeout(500);
  ok(JSON.stringify((await setting(p, "calendar")).quiet9) === '{"from":"2026-11-16","to":"2026-11-17"}', "⑤ kept", (await setting(p, "calendar")).quiet9);
  al = await p.evaluate(() => window.__cal9.alarms(Date.now()));
  ok(!al.some((a) => a.tag === "e2:2026-11-16"), "⑤ none while resting", al.map((a) => a.tag));
  // ⑥ a day's limit
  await p.fill("#cal9Max", "8"); await p.press("#cal9Max", "Tab"); await p.waitForTimeout(400);
  ok((await setting(p, "calendar")).busyMax === 8, "⑥ 8時間 kept");
  // ⑦ 最近削除した予定
  ok((await txt(p, "#cal9Trash")) === "最近削除した予定（1件）", "⑦ how many", await txt(p, "#cal9Trash"));
  await p.click("#cal9Quiet" + "Off"); await p.waitForTimeout(400);
  ok(!(await setting(p, "calendar")).quiet9, "⑤ やめる");
  await p.click("#cal9Trash"); await p.waitForTimeout(1000);
  ok((await tabNow(p)) === "trash" && (await txt(p, "#trashList")).includes("削除した予定"), "⑦ 記録's page with the plans", [await tabNow(p), await txt(p, "#trashList")]);
  p = await open({ ...make(), settings: [{ id: "calendar", freeFrom: "09:00", freeTo: "22:00", busyMax: 8, updatedAt: 1 }] });
  await openDayOf(p, "11月17日");
  ok((await txt(p, "#cal4Day .cal9-over")) === "目安の 8 時間をこえています", "⑥ the day over its limit", await txt(p, "#cal4Day"));
  await closeSheet(p);
  await openDayOf(p, "11月16日");
  await p.click("#dayAdd"); await p.waitForTimeout(700);
  await setVal(p, "planTime", "12:00"); await setVal(p, "planEndTime", "20:00"); await p.waitForTimeout(300);
  ok((await txt(p, "#planBusy")) === "この日は予定が合計 9 時間 30 分になります（目安 8 時間）", "⑥ the form says so", await txt(p, "#planBusy"));
  await closeSheet(p);

  // ⑧ よく使う tidied
  await p.click("#calAdd"); await p.waitForTimeout(700);
  ok((await txt(p, "#planOften")).includes("ジム"), "⑧ ジム in よく使う");
  await p.click("#planOftenTool .cal9-often-edit"); await p.waitForTimeout(200);
  await p.locator("#planOften .cal9-often-x", { hasText: "ジム" }).click(); await p.waitForTimeout(500);
  ok((await setting(p, "calendar")).oftenHide?.length === 1 && await p.isHidden("#planOften"), "⑧ left out");
  await closeSheet(p);
  await p.click("#calSettings"); await p.waitForTimeout(700);
  ok((await txt(p, "#cal9OftenBack")).includes("ジム"), "⑧ in the gear");
  await p.locator("#cal9OftenBack .link-btn", { hasText: "戻す" }).click(); await p.waitForTimeout(400);
  ok(!(await setting(p, "calendar")).oftenHide?.length, "⑧ 戻す");
  await closeSheet(p);

  // ⑨ the week as a picture
  const pic = await p.evaluate(() => window.__cal9.weekCanvas("2026-11-16"));
  ok(pic.w === 1080 && pic.h > 600 && pic.drawn.includes("11/15〜11/21の予定") && pic.drawn.includes("11月16日（月）") && pic.drawn.includes("10:00〜11:30  ゼミ") && pic.drawn.includes("09:00〜18:00  授業"), "⑨ the week drawn", pic);
  await openDayOf(p, "11月16日");
  await p.click("#dayShare"); await p.waitForTimeout(200);
  ok(await p.isVisible('#dayShareBox [data-share="week-image"]'), "⑨ この週を画像で in 文字で送る");
  await closeSheet(p);

  ok(!p.errs.length, "no error on the way", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });

function require_add(d, n) { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
