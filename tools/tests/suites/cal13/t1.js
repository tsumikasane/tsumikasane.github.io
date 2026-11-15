// カレンダー その13 ①〜⑩ (on the hooked copy at 8819)
process.env.URL0 = process.env.URL0 || "http://localhost:8819/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const nos = (s) => String(s || "").replace(/\s+/g, "");
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id) || null;
const openDayOf = async (p, md) => { await p.evaluate((md) => [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith(md)).click(), md); await p.waitForTimeout(700); };
const openPlan = async (p, md, title) => { await openDayOf(p, md); await p.locator("#calDayList .row-btn", { hasText: title }).first().click(); await p.waitForTimeout(700); };
const closeSheet = async (p) => { for (let i = 0; i < 4 && (await p.evaluate(() => document.getElementById("daySheet").open)); i++) { await p.keyboard.press("Escape"); await p.waitForTimeout(700); } };
const setVal = (p, id, v) => p.evaluate(({ id, v }) => { const t = document.getElementById(id); t.value = v; t.dispatchEvent(new Event("input", { bubbles: true })); t.dispatchEvent(new Event("change", { bubbles: true })); }, { id, v });
const turns = (p, d) => p.evaluate((d) => window.__cal13.turns(d), d);
const alarms = (p) => p.evaluate(() => window.__cal13.alarms(Date.now()));
const iso = (a) => (a ? new Date(a.at).toISOString() : null);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
async function open(when = "10:00", day = today, data = make()) { const p = await phone(b, at(when, day), { deviceScaleFactor: 1 }); await seed(p, data, "calendar"); await p.waitForTimeout(900); return p; }
let b;

(async () => {
  b = await chromium.launch();
  let p = await open();
  ok(!p.errs.length, "the page opens, no error", p.errs);

  // ① the season's days
  ok((await txt(p, '.cal-day[aria-label^="11月15日"] .cal13-ev')) === "七五三" && (await p.getAttribute('.cal-day[aria-label^="11月15日"]', "aria-label")).includes("七五三"), "① 七五三 on the month");
  const evs = await p.evaluate(() => ["2027-05-09", "2027-06-20", "2027-02-03", "2026-12-24", "2026-11-23", "2026-11-14"].map((d) => window.__cal13.ev(d)));
  ok(JSON.stringify(evs) === '["母の日","父の日","節分","クリスマスイブ","",""]', "① 母の日, 父の日, 節分, クリスマスイブ; none on a holiday", evs);
  await p.evaluate(() => window.__cal13.view("week", "2026-11-15")); await p.waitForTimeout(500);
  ok((await txt(p, "#tgAllDay .tg-bar.cal13-ev")) === "七五三" && (await txt(p, "#tgHead .cal13-wk")) === "第8週", "① in 週, ⑤ its week of the term", [await txt(p, "#tgAllDay .tg-bar.cal13-ev"), await txt(p, "#tgHead .cal13-wk")]);
  await p.evaluate(() => window.__cal13.view("month", "2026-11-16")); await p.waitForTimeout(500);

  // ⑤② the day's sheet
  await openDayOf(p, "11月16日");
  ok(nos(await txt(p, ".cal13-info")) === "授業第8週・ゴミの日：燃えるゴミ", "⑤② 11/16", await txt(p, ".cal13-info"));
  await closeSheet(p);
  await openDayOf(p, "11月25日");
  ok(nos(await txt(p, ".cal13-info")) === "授業第9週・ゴミの日：資源ゴミ", "② 資源ゴミ on the 4th Wednesday", await txt(p, ".cal13-info"));
  await closeSheet(p);
  await openDayOf(p, "11月15日");
  ok(nos(await txt(p, ".cal13-info")) === "授業第8週・七五三", "① in its sheet", await txt(p, ".cal13-info"));
  await closeSheet(p);
  let al = await alarms(p);
  const tr = al.find((a) => a.tag === "cal-trash:2026-11-19"), tr2 = al.find((a) => a.tag === "cal-trash:2026-11-25");
  ok(tr && iso(tr) === "2026-11-18T11:00:00.000Z" && tr.title === "あしたは燃えるゴミの日" && tr2 && tr2.title === "あしたは資源ゴミの日" && !al.find((a) => a.tag === "cal-trash:2026-11-18"), "② the evening before at 20:00", [tr, tr2]);

  // the gear: ② another kind and その日の朝, ⑨ 終日の予定の時刻, ① off and on
  await p.click("#calSettings"); await p.waitForTimeout(800);
  await p.fill("#cal13TrashName", "ペットボトル");
  await p.click('#cal13TrashWd [data-wd="5"]'); await p.waitForTimeout(100);
  await p.click('[data-k="trash-add"]'); await p.waitForTimeout(500);
  let t13 = (await setting(p, "calendar")).trash13;
  ok(t13.items.length === 3 && t13.items[2].name === "ペットボトル" && JSON.stringify(t13.items[2].wd) === "[5]" && (await p.evaluate(() => document.querySelectorAll("#cal13TrashList li").length)) === 3, "② another kind put in", t13.items);
  await p.selectOption("#cal13TrashWhen", "day"); await p.waitForTimeout(400);
  t13 = (await setting(p, "calendar")).trash13;
  al = await alarms(p);
  const tr3 = al.find((a) => a.tag === "cal-trash:2026-11-19");
  ok(t13.when === "day" && t13.at === "07:00" && tr3 && iso(tr3) === "2026-11-18T22:00:00.000Z" && tr3.title === "きょうは燃えるゴミの日", "② その日の 7:00", [t13, tr3]);
  ok((await p.evaluate(() => document.querySelector('#cal3AlarmAllDay option[value="0"]').textContent)) === "当日（9:00）", "⑨ 9:00 at first");
  await setVal(p, "cal13AllDayAt", "07:30"); await p.waitForTimeout(400);
  ok((await setting(p, "calendar")).allDayAt === "07:30" && (await p.evaluate(() => document.querySelector('#cal3AlarmAllDay option[value="0"]').textContent)) === "当日（7:30）", "⑨ 7:30 kept and said");
  al = await alarms(p);
  ok(iso(al.find((a) => a.tag === "e4:2026-11-20")) === "2026-11-19T22:30:00.000Z", "⑨ 誕生日's alarm at 7:30", al.find((a) => a.tag === "e4:2026-11-20"));
  ok(await p.isChecked("#cal13EvOn"), "① on in the gear");
  await p.click("#cal13EvOn"); await p.waitForTimeout(400);
  ok(!(await setting(p, "calendar")).gyoji, "① off");
  await closeSheet(p);
  ok(!(await p.isVisible('.cal-day[aria-label^="11月15日"] .cal13-ev')), "① gone from the month");
  await p.click("#calSettings"); await p.waitForTimeout(800);
  await p.click("#cal13EvOn"); await p.waitForTimeout(400);
  await closeSheet(p);

  // ③ 空き時間を探す: 土日・祝日, 夜; ⑦ 最近追加した予定
  await p.click("#calFind"); await p.waitForTimeout(700);
  ok(nos(await txt(p, ".cal13-recent")).includes("勉強会11/18（水）18:00・きのうに追加"), "⑦ put in yesterday", await txt(p, ".cal13-recent"));
  await p.evaluate(() => { window.__shared = []; navigator.share = (d) => { window.__shared.push(d); return Promise.resolve(); }; });
  await p.click('.cal5-free [data-k="free-120"]'); await p.waitForTimeout(300);
  await p.click('[data-k="free-we"]'); await p.waitForTimeout(300);
  let days = await p.evaluate(() => [...document.querySelectorAll(".cal5-free-list li")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(days.length && days.every((x) => /（土）|（日）|11\/23/.test(x)), "③ 土日・祝日 only", days);
  await p.click('[data-k="free-ev"]'); await p.waitForTimeout(300);
  days = await p.evaluate(() => [...document.querySelectorAll(".cal5-free-list li")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(days.length === 4 && days.every((x) => x.includes("18:00〜22:00")), "③ the evening (11/21 has ライブ till 21:00)", days);
  await p.click('[data-k="free-share"]'); await p.waitForTimeout(300);
  const sh = (await p.evaluate(() => window.__shared))[0];
  ok(sh && sh.text.split("\n")[0] === "空いている時間（2 時間以上・土日・祝日・夜）" && sh.text.split("\n").slice(1).every((l) => /（[土日]）|11\/23/.test(l)), "③ what is sent says so", sh);
  await closeSheet(p);

  // ⑩ 美術館 into 11/17's free hours
  await openDayOf(p, "11月17日");
  await p.click('.cal13-some [data-some="s1"]'); await p.waitForTimeout(700);
  ok((await p.inputValue("#planTitle")) === "美術館" && (await p.inputValue("#planDate")) === "2026-11-17" && (await p.inputValue("#planTime")) === "09:00", "⑩ the form at the first free hour", [await p.inputValue("#planTitle"), await p.inputValue("#planTime")]);
  await p.click("#planSave"); await p.waitForTimeout(900);
  ok((await ls(p, "events")).some((e) => e.title === "美術館" && e.date === "2026-11-17") && !((await setting(p, "calendar")).someday || []).length, "⑩ added, and gone from 日にち未定");
  await closeSheet(p);

  // ④ 家賃 on the weekday before; a new one on the weekday after
  ok((await turns(p, "2026-12-25")).includes("家賃") && !(await turns(p, "2026-12-27")).includes("家賃") && (await turns(p, "2027-02-26")).includes("家賃") && (await turns(p, "2026-11-27")).includes("家賃"), "④ 12/27 (日) → 12/25, 2/27 (土) → 2/26");
  await p.click("#calAdd"); await p.waitForTimeout(700);
  await p.fill("#planTitle", "引き落とし");
  await setVal(p, "planDate", "2026-11-30"); await p.waitForTimeout(150);
  ok(await p.isHidden("#planBizRow"), "④ none while it does not repeat");
  await p.selectOption("#planRepeat", "monthly"); await p.waitForTimeout(300);
  ok(await p.isVisible("#planBizRow"), "④ for 毎月");
  await p.selectOption("#planBiz", "after"); await p.waitForTimeout(150);
  await p.click("#planSave"); await p.waitForTimeout(800);
  const pay = (await ls(p, "events")).find((e) => e.title === "引き落とし");
  ok(pay && pay.biz === "after" && pay.repeat === "monthly", "④ saved", pay);
  ok((await turns(p, "2027-02-01")).includes("引き落とし") && !(await turns(p, "2027-01-30")).includes("引き落とし") && (await turns(p, "2026-12-30")).includes("引き落とし"), "④ 1/30 (土) → 2/1 (月)");
  await closeSheet(p);
  await p.evaluate(() => { const b = [...document.querySelectorAll(".cal-day")].find((x) => x.getAttribute("aria-label").startsWith("11月27日")); b.click(); }); await p.waitForTimeout(700);
  ok(nos(await txt(p, "#calDayList")).includes("土日・祝日は前の平日"), "④ said in the day's list", await txt(p, "#calDayList"));
  await closeSheet(p);

  // ⑥ the links in 勉強会's memo
  await openPlan(p, "11月18日", "勉強会");
  const links = await p.evaluate(() => [...document.querySelectorAll(".cal13-links a")].map((a) => [a.getAttribute("href"), a.textContent]));
  ok(JSON.stringify(links) === '[["https://example.com/docs/a.pdf","example.com/docs/a.pdf"],["https://www.example.org/","example.org"]]', "⑥ its links", links);
  await closeSheet(p);

  // ⑧ a photo for ライブ
  await openPlan(p, "11月21日", "ライブ");
  ok(await p.isVisible(".cal13-ph"), "⑧ offered");
  await p.setInputFiles("#cal13PhFile", { name: "ticket.png", mimeType: "image/png", buffer: PNG }); await p.waitForTimeout(1200);
  ok((await p.evaluate(() => document.querySelectorAll(".cal13-ph-thumb").length)) === 1 && (await txt(p, ".cal13-ph .cal12-head")) === "写真（1枚）", "⑧ kept", await txt(p, ".cal13-ph"));
  await p.click(".cal13-ph-thumb"); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector("dialog.cal13-ph-view")?.open), "⑧ large at a press");
  await p.click('[data-k="ph-close"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector("dialog.cal13-ph-view")), "⑧ closed");
  await closeSheet(p);
  await openDayOf(p, "11月21日");
  ok(nos(await txt(p, "#calDayList")).includes("写真1枚"), "⑧ said in the day's list");
  await p.locator("#calDayList .row-btn", { hasText: "ライブ" }).first().click(); await p.waitForTimeout(700);
  await p.click(".cal13-ph-item button:not(.cal13-ph-thumb)"); await p.waitForTimeout(200);
  await p.click(".cal13-ph-item button:not(.cal13-ph-thumb)"); await p.waitForTimeout(700);
  ok((await p.evaluate(() => document.querySelectorAll(".cal13-ph-thumb").length)) === 0, "⑧ deleted");
  ok((await p.evaluate(async () => await new Promise((res) => { const q = indexedDB.open("tsumikasane-plan-photos", 1); q.onsuccess = () => { const g = q.result.transaction("photos", "readonly").objectStore("photos").getAll(); g.onsuccess = () => res(g.result.length); }; q.onerror = () => res(-1); }))) === 0, "⑧ none left on the device");
  await closeSheet(p);

  ok(!p.errs.length, "no error on the way", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
