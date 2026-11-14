// ルーティーン その2 ①〜⑩, through the hook build at 8872 (③'s お知らせ) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8872/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const shown = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; }, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const day = async (p, d = D.DAY) => (await ls(p, "routineDays")).find((x) => x.id === d);
const item = async (p, id) => (await ls(p, "routines")).find((x) => x.id === id);
const row = (p, id) => p.locator(`#rtList li[data-rt="${id}"]`);
const rowText = async (p, id) => flat(await row(p, id).innerText());
const names = (p) => p.evaluate(() => [...document.querySelectorAll("#rtList .rt-name")].map((i) => i.value).join(","));
const toast = (p) => txt(p, "#status");
const undo = async (p) => { await p.locator("#status button:visible").first().click(); await p.waitForTimeout(400); };
async function open(b, hm) {
  const p = await phone(b, new Date(`${D.DAY}T${hm}:00+09:00`), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "routine"); await p.waitForTimeout(800);
  return p;
}
(async () => {
  const b = await chromium.launch();

  // ---- 7:30, before 薬's time
  let p = await open(b, "07:30");
  await p.screenshot({ path: "routine2-top.png" });
  // ② メモ under the name, ④ the minutes, ③ the time still to come
  ok((await rowText(p, "r1")).includes("肩回しと前屈を30秒ずつ") && (await rowText(p, "r1")).includes("約5分・6日連続"), "② メモ and ④ 約5分 on ストレッチ", await rowText(p, "r1"));
  ok((await rowText(p, "r3")).includes("目安8:00") && !(await row(p, "r3").getAttribute("class")).includes("rt2-late-row"), "③ 目安 8:00, not gone by yet", await rowText(p, "r3"));
  ok((await txt(p, "#rtFoot")).startsWith("のこり6項目・時間を決めた3項目で約23分"), "④ the minutes left in the foot", await txt(p, "#rtFoot"));
  // ③ お知らせ: 薬's today at 8:00 and on the days to come
  let al = await p.evaluate(() => window.__rt2.alarms(Date.now()));
  const at8 = Date.parse(`${D.DAY}T08:00:00+09:00`);
  ok(al.length === 40 && al[0].at === at8 && al[0].tag === `rt2-by:r3:${D.DAY}` && al[0].body === "「薬を飲む」の時間です（朝ごはんのあと）" && al[0].url === "./#routine", "③ the reminders, today's first", al.slice(0, 2));
  // ⑥ ストレッチ checked: 7日連続, and ① its time on the row
  await row(p, "r1").locator(".check").click(); await p.waitForTimeout(300);
  ok((await toast(p)).includes("「ストレッチ」が7日連続になりました"), "⑥ 7日連続 cheered", await toast(p));
  ok((await rowText(p, "r1")).includes("7:30にやった"), "① 7:30にやった on the row", await rowText(p, "r1"));
  // ① the time put right: 7:05, then 元に戻す
  await row(p, "r1").locator(".rt2-at").click(); await p.waitForTimeout(200);
  ok(await shown(p, "#rt2AtAsk") && (await p.inputValue("#rt2AtInput")) === "07:30" && (await txt(p, "#rt2AtTitle")).includes("「ストレッチ」をやった時刻"), "① the time asked", await txt(p, "#rt2AtTitle"));
  await p.fill("#rt2AtInput", "09:00"); await p.click("#rt2AtSave"); await p.waitForTimeout(200);
  ok(await shown(p, "#rt2AtAsk") && (await txt(p, "#rt2AtTitle")).includes("まだ来ていない時刻"), "① not one still to come", await txt(p, "#rt2AtTitle"));
  await p.fill("#rt2AtInput", "07:05"); await p.click("#rt2AtSave"); await p.waitForTimeout(300);
  ok(!(await shown(p, "#rt2AtAsk")) && (await day(p)).at.r1 === Date.parse(`${D.DAY}T07:05:00+09:00`) && (await rowText(p, "r1")).includes("7:05にやった"), "① saved as 7:05", (await day(p)).at);
  await undo(p);
  ok((await day(p)).at.r1 === Date.parse(`${D.DAY}T07:30:00+09:00`), "① 元に戻す", (await day(p)).at);

  // ⑤ one at a time
  await p.locator("#rtFoot button", { hasText: "1つずつ進める" }).click(); await p.waitForTimeout(300);
  const step = async () => ({ head: await txt(p, "#rt2StepHead"), name: await txt(p, "#rt2StepName"), sub: await txt(p, "#rt2StepSub"), memo: await shown(p, "#rt2StepMemo") ? await txt(p, "#rt2StepMemo") : "", cheer: await shown(p, "#rt2StepCheer") ? await txt(p, "#rt2StepCheer") : "" });
  let s = await step();
  ok(await shown(p, "#rt2Step") && s.name === "歯みがき" && s.head === "のこり5項目・時間を決めた2項目で約18分" && s.sub.includes("約3分") && s.sub.includes("29日連続中"), "⑤ opens on the first still to do", s);
  await p.click("#rt2StepDone"); await p.waitForTimeout(300);
  s = await step();
  ok(s.name === "薬を飲む" && s.cheer === "「歯みがき」が30日連続になりました" && s.memo === "朝ごはんのあと" && s.sub.includes("目安8:00"), "⑤ できた → the next, ⑥ 30日連続 said in it", s);
  ok((await day(p)).done.includes("r2"), "⑤ 歯みがき checked");
  await p.click("#rt2StepLater"); await p.waitForTimeout(200);
  s = await step();
  ok(s.name === "読書" && !(await day(p)).done.includes("r3"), "⑤ あとで → 読書", s);
  await p.click("#rt2StepDone"); await p.waitForTimeout(200);
  ok((await step()).name === "水を飲む" && (await day(p)).done.includes("r4"), "⑤ 読書 done → 水を飲む");
  await p.click("#rt2StepBack"); await p.waitForTimeout(200);
  ok((await step()).name === "読書" && !(await day(p)).done.includes("r4"), "⑤ ひとつ戻す: 読書 back", await day(p));
  await p.click("#rt2StepDone"); await p.waitForTimeout(200);
  ok(await shown(p, "#rt2StepOne") && (await txt(p, "#rt2StepOne")) === "1つ増やす（0→1）" && (await txt(p, "#rt2StepDone")) === "できた（8杯）", "⑤ 水 counted: 1つ増やす", await txt(p, "#rt2StepOne"));
  await p.click("#rt2StepOne"); await p.waitForTimeout(200);
  ok((await step()).name === "日記を書く" && (await day(p)).counts.r5 === 1, "⑤ +1, then the next", await day(p));
  await p.click("#rt2StepDone"); await p.waitForTimeout(200);
  ok((await step()).name === "薬を飲む", "⑤ then back to the one put off", await step());
  await p.click("#rt2StepDone"); await p.waitForTimeout(200);
  ok((await step()).name === "水を飲む" && !(await shown(p, "#rt2StepLater")), "⑤ the last: no あとで");
  await p.click("#rt2StepDone"); await p.waitForTimeout(400);
  ok(!(await shown(p, "#rt2Step")) && (await toast(p)).includes("きょうのルーティーンをぜんぶできました") && (await day(p)).counts.r5 === 8, "⑤ all done: closed, cheered", await toast(p));
  ok((await txt(p, "#rtFoot")).startsWith("7:30にぜんぶできました"), "① the time all were done", await txt(p, "#rtFoot"));
  // ③ today's reminder gone once 薬 is done
  al = await p.evaluate(() => window.__rt2.alarms(Date.now()));
  ok(al.length === 39 && al[0].tag === "rt2-by:r3:2026-11-15", "③ today's gone once done", al.slice(0, 1));
  ok(!p.errs.length, "no errors (7:30)", p.errs);
  await p.close();

  // ---- 8:30: 薬's time gone by
  p = await open(b, "08:30");
  ok((await rowText(p, "r3")).includes("8:00を過ぎています") && (await row(p, "r3").getAttribute("class")).includes("rt2-late-row"), "③ 8:00を過ぎています", await rowText(p, "r3"));
  // ⑨ the 12 weeks: this week (11/8〜11/14) 20 of 34
  const wk = await p.evaluate(() => [...document.querySelectorAll("#rt2Weeks .st-day")].map((b) => [b.querySelector(".st-day-v").textContent, b.querySelector(".st-day-dn").textContent, b.getAttribute("aria-label")]));
  ok(wk.length === 12 && wk[11][0] === "59%" && wk[11][1] === "今週" && wk[11][2].includes("34 回のうち 20 回") && wk[0][1] === "8/23", "⑨ 12 weeks, this one 59%", wk.slice(-2));
  ok(/^12週で\d+%$/.test(await txt(p, "#rt2WeeksSum")), "⑨ the 12 weeks' rate", await txt(p, "#rt2WeeksSum"));
  await p.locator("#rt2Weeks .st-day").nth(10).click(); await p.waitForTimeout(300);
  ok((await p.evaluate(() => document.querySelector(".datenav input[type=date]")?.value)) === "2026-11-07", "⑨ pressed: that week's last day", await p.evaluate(() => document.querySelector(".datenav input[type=date]")?.value));
  await p.goto(p.url().split("#")[0] + "#routine"); await p.reload(); await p.waitForTimeout(800);
  // ⑥ 節目 in each item's record, ⑩ its 12 weeks
  const st2 = p.locator("#rtStats li").nth(1);
  ok(flat(await st2.innerText()).includes("7日30日30日連続まであと1日"), "⑥ 歯みがき's 節目 and the next", flat(await st2.innerText()));
  ok(!flat(await p.locator("#rtStats li").nth(4).innerText()).includes("連続まで"), "⑥ none said for one with no run", flat(await p.locator("#rtStats li").nth(4).innerText()));
  await st2.locator(".rt2-grid-btn").click(); await p.waitForTimeout(300);
  const g = await p.evaluate(() => { const li = document.querySelectorAll("#rtStats li")[1], cs = [...li.querySelectorAll(".rt2-grid .rt2-g")]; const n = (k) => cs.filter((c) => c.classList.contains(k)).length; return { all: cs.length, on: n("on"), miss: n("miss"), yet: n("yet"), rest: n("rest"), off: n("off"), now: n("now"), label: li.querySelector(".rt2-grid").getAttribute("aria-label"), mos: [...li.querySelectorAll(".rt2-g-mos span")].map((s) => s.textContent).filter(Boolean).join(","), btn: li.querySelector(".rt2-grid-btn").getAttribute("aria-expanded"), focus: document.activeElement === li.querySelector(".rt2-grid-btn") }; });
  ok(g.all === 84 && g.on === 73 && g.miss === 10 && g.yet === 1 && g.now === 1 && g.label === "この12週間で 83 日のうち 73 日できました" && g.mos === "8月,9月,10月,11月" && g.btn === "true" && g.focus, "⑩ 歯みがき's 12 weeks", g);
  // ⑦ the rest checked at once, and back
  await p.locator("#rtFoot button", { hasText: "のこりをぜんぶチェック" }).click(); await p.waitForTimeout(300);
  let dd = await day(p);
  ok(dd && dd.done.length === 6 && dd.counts.r5 === 8 && (await toast(p)).includes("のこりの6項目をチェックしました。きょうのルーティーンをぜんぶできました") && (await txt(p, "#rtCount")) === "6/6", "⑦ all checked", { dd, t: await toast(p) });
  await undo(p);
  ok(!(await day(p)) && (await txt(p, "#rtCount")) === "0/6", "⑦ 元に戻す", await day(p));
  // ⑧ できた項目を下へ, in the gear
  await p.click("#rtSettings"); await p.waitForTimeout(400);
  ok(await shown(p, "#rt2DownOn") && !(await p.isChecked("#rt2DownOn")), "⑧ the switch in the gear, off");
  await p.locator("#rt2DownOn").click(); await p.waitForTimeout(300);
  ok((await ls(p, "settings")).find((x) => x.id === "rtDoneDown")?.on === true, "⑧ kept with the account");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  await row(p, "r2").locator(".check").click(); await p.waitForTimeout(300);
  ok((await names(p)) === "ストレッチ,薬を飲む,読書,水を飲む,日記を書く,歯みがき", "⑧ 歯みがき done goes below", await names(p));
  // ②③④ in ⋯: 読書's メモ, 20 分, 21:00 with its お知らせ
  await row(p, "r4").locator(".rt-opts").click(); await p.waitForTimeout(400);
  ok(await shown(p, "#rtiMemo") && await shown(p, "#rtiMins") && await shown(p, "#rtiBy") && !(await shown(p, "#rtiByOn")), "②③④ the fields, お知らせ hidden till a time is set");
  await p.fill("#rtiMemo", "10ページ"); await p.fill("#rtiMins", "20"); await p.fill("#rtiBy", "21:00"); await p.waitForTimeout(100);
  ok(await shown(p, "#rtiByOn"), "③ お知らせ shows with a time");
  await p.locator("#rtiByOn").click();
  await p.click("#recSave"); await p.waitForTimeout(500);
  const r4 = await item(p, "r4");
  ok(r4.memo === "10ページ" && r4.mins === 20 && r4.by === "21:00" && r4.byOn === true, "②③④ saved", r4);
  ok((await rowText(p, "r4")).includes("10ページ") && (await rowText(p, "r4")).includes("目安21:00・約20分"), "②③④ on the row", await rowText(p, "r4"));
  al = await p.evaluate(() => window.__rt2.alarms(Date.now()));
  ok(al.some((a) => a.tag === `rt2-by:r4:${D.DAY}` && a.at === Date.parse(`${D.DAY}T21:00:00+09:00`) && a.body === "「読書」の時間です（10ページ）"), "③ 読書's reminder at 21:00", al.filter((a) => /r4/.test(a.tag)).slice(0, 1));
  ok(!al.some((a) => a.tag === `rt2-by:r3:${D.DAY}`), "③ none today for 薬 (its time gone by)");
  // お休み ahead: no reminder that day
  await p.evaluate(() => { const k = "tsumikasane:routineDays", xs = JSON.parse(localStorage.getItem(k)); xs.push({ id: "2026-11-16", date: "2026-11-16", done: [], at: {}, rest: true, updatedAt: 1 }); localStorage.setItem(k, JSON.stringify(xs)); });
  await p.reload(); await p.waitForTimeout(800);
  al = await p.evaluate(() => window.__rt2.alarms(Date.now()));
  ok(!al.some((a) => /:2026-11-16$/.test(a.tag)) && al.some((a) => /:2026-11-17$/.test(a.tag)), "③ none on an お休みの日");
  // emptied, they go
  await row(p, "r4").locator(".rt-opts").click(); await p.waitForTimeout(400);
  await p.fill("#rtiMemo", ""); await p.fill("#rtiMins", ""); await p.fill("#rtiBy", ""); await p.click("#recSave"); await p.waitForTimeout(500);
  const r4b = await item(p, "r4");
  ok(!("memo" in r4b) && !("mins" in r4b) && !("by" in r4b) && !("byOn" in r4b), "②③④ emptied: gone", r4b);
  ok(!p.errs.length, "no errors (8:30)", p.errs);
  await p.screenshot({ path: "routine2-after.png", fullPage: true });
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
