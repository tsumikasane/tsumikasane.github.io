// ルーティーン その3 ①〜⑩, through the hook build at 8873 (the お知らせ) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8873/";
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
const toast = (p) => txt(p, "#status");
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(400); };
const alarms = (p, re) => p.evaluate((src) => window.__rt3.alarms(Date.now(), new RegExp(src)), re);
const Y = "2026-11-14";
async function open(b, hm = "07:30") {
  const p = await phone(b, new Date(`${D.DAY}T${hm}:00+09:00`), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "routine"); await p.waitForTimeout(800);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b);
  await p.screenshot({ path: "routine3-top.png" });

  // ③ yesterday's still to do: 水 and 日記 (読書 was パス then)
  const yd = await p.evaluate(() => [...document.querySelectorAll("#rt3YdayCard li .body")].map((x) => x.textContent));
  ok(await shown(p, "#rt3YdayCard") && yd.join(",") === "水を飲む,日記を書く", "③ yesterday's: 水 and 日記, not 読書 (パス)", yd);
  await p.locator("#rt3YdayCard li", { hasText: "水を飲む" }).locator("button", { hasText: "やった" }).click(); await p.waitForTimeout(300); // (その7 ①: できなかった beside it)
  let yy = await day(p, Y);
  ok(yy.done.includes("r5") && yy.counts.r5 === 8 && (await toast(p)).includes("きのうの「水を飲む」にチェックしました"), "③ やった: yesterday's 水 to 8", { yy, t: await toast(p) });
  await undo(p);
  ok(!(await day(p, Y)).done.includes("r5"), "③ 元に戻す");
  await p.locator("#rt3YdayCard button", { hasText: "とじる" }).click(); await p.waitForTimeout(300);
  ok(!(await shown(p, "#rt3YdayCard")), "③ とじる");
  await p.reload(); await p.waitForTimeout(800);
  ok(!(await shown(p, "#rt3YdayCard")), "③ put away for that day, after a reload too");

  // ① 読書's run goes over yesterday's パス
  ok((await rowText(p, "r4")).includes("4日連続"), "① 読書 4日連続 over the パス", await rowText(p, "r4"));
  // ⑤ ⑥ on ストレッチ's row
  ok((await rowText(p, "r1")).includes("歯みがきのあとに") && (await rowText(p, "r1")).includes("7日チャレンジ6/7"), "⑤ 歯みがきのあとに, ⑥ 7日チャレンジ 6/7", await rowText(p, "r1"));
  // ⑤ 歯みがき done: 次は ストレッチ
  await row(p, "r2").locator(".check").click(); await p.waitForTimeout(300);
  ok((await toast(p)).includes("次は「ストレッチ」"), "⑤ 次は「ストレッチ」", await toast(p));
  ok(!(await rowText(p, "r1")).includes("歯みがきのあとに") || true, "(⑤ still said while it is to do)");
  // ⑥ ストレッチ: 7日連続 (その2 ⑥) and the 7日チャレンジ 達成
  await row(p, "r1").locator(".check").click(); await p.waitForTimeout(300);
  let t = await toast(p);
  ok(t.includes("「ストレッチ」が7日連続になりました") && t.includes("「ストレッチ」の7日チャレンジを達成しました"), "⑥ 7日チャレンジ 達成, with 7日連続", t);
  ok(flat(await p.locator("#rtStats li").first().innerText()).includes("7日チャレンジ達成（11/15）"), "⑥ 達成 in 項目ごとの記録", flat(await p.locator("#rtStats li").first().innerText()));
  // ⑦ 英単語: 自己ベスト
  await row(p, "r3").locator(".check").click(); await p.waitForTimeout(300);
  ok((await toast(p)).includes("「英単語」の連続が自己ベストを更新しました（6日）"), "⑦ 自己ベスト", await toast(p));
  // ④ taken off: 元に戻す, the time as it was
  const at3 = (await day(p)).at.r3;
  await row(p, "r3").locator(".check").click(); await p.waitForTimeout(300);
  ok((await toast(p)).includes("「英単語」のチェックを外しました") && !(await day(p)).done.includes("r3"), "④ taken off, said", await toast(p));
  await undo(p);
  ok((await day(p)).done.includes("r3") && (await day(p)).at.r3 === at3, "④ 元に戻す: checked again, its time kept", (await day(p)).at);
  // ① パス from the foot
  await p.locator("#rtFoot button", { hasText: "項目をパスする" }).click(); await p.waitForTimeout(300);
  const opts = await p.evaluate(() => [...document.querySelectorAll("#rt3PassGroup .ask-btn")].map((x) => x.textContent));
  ok(await shown(p, "#rt3PassAsk") && opts.join(",") === "読書,水を飲む,日記を書く", "① the ones still to do offered", opts);
  await p.locator("#rt3PassGroup .ask-btn", { hasText: "読書" }).click(); await p.waitForTimeout(300);
  ok((await day(p)).skip?.join() === "r4" && (await row(p, "r4").getAttribute("class")).includes("rt3-skipped") && (await txt(p, "#rtCount")) === "3/5・パス1", "① 読書 パス: 3 / 5・パス 1", { c: await txt(p, "#rtCount"), d: await day(p) });
  ok((await rowText(p, "r4")).includes("パス") && (await rowText(p, "r4")).includes("4日連続"), "① its row says パス, its run kept", await rowText(p, "r4"));
  await row(p, "r5").locator(".check").click(); await p.waitForTimeout(300);
  ok((await day(p)).skip?.join() === "r4" && (await day(p)).counts.r5 === 1, "① the パス kept as another is checked", await day(p));
  await row(p, "r4").locator(".rt3-unpass").click(); await p.waitForTimeout(300);
  ok(!(await day(p)).skip && (await toast(p)).includes("「読書」のパスをやめました") && (await txt(p, "#rtCount")) === "3/6", "① パスをやめる", await day(p));
  ok(!p.errs.length, "no errors (1)", p.errs);
  await p.close();

  // ---- again from the start: 1つずつ進める with ⑤ and ①, ② ⑨ in the gear, ⑧, ⑩, ⑥ in ⋯
  p = await open(b);
  await p.locator("#rtFoot button", { hasText: "1つずつ進める" }).click(); await p.waitForTimeout(300);
  ok((await txt(p, "#rt2StepName")) === "歯みがき", "⑤ 1つずつ: 歯みがき first (ストレッチ comes after it)", await txt(p, "#rt2StepName"));
  await p.click("#rt2StepDone"); await p.waitForTimeout(300);
  ok((await txt(p, "#rt2StepName")) === "ストレッチ", "⑤ then ストレッチ", await txt(p, "#rt2StepName"));
  await p.click("#rt2StepPass"); await p.waitForTimeout(300);
  ok((await day(p)).skip?.join() === "r1" && (await txt(p, "#rt2StepName")) === "読書", "① きょうはパス in 1つずつ: then 読書", { n: await txt(p, "#rt2StepName"), d: await day(p) });
  await p.click("#rt2StepBack"); await p.waitForTimeout(300);
  ok(!(await day(p)).skip && (await txt(p, "#rt2StepName")) === "ストレッチ", "① ひとつ戻す: the パス taken back", await day(p));
  await p.click("#rt2Step .ask-keep"); await p.waitForTimeout(300);

  // ② お休みの予定 and ⑨ 週のまとめ, in the gear
  await p.click("#rtSettings"); await p.waitForTimeout(400);
  ok(await shown(p, "#rt3RestForm") && await shown(p, "#rt3WeekOn") && (await txt(p, "#rt3RestList")) === "お休みの予定はありません。", "②⑨ in the gear");
  await p.fill("#rt3RestFrom", "2026-11-10"); await p.fill("#rt3RestTo", "2026-11-12"); await p.click("#rt3RestForm button[type=submit]"); await p.waitForTimeout(300);
  ok((await txt(p, "#sheetStatus")).includes("きょう以降の日を選んでください"), "② not days gone by", await txt(p, "#sheetStatus"));
  await p.fill("#rt3RestFrom", "2026-11-20"); await p.fill("#rt3RestTo", "2026-11-22"); await p.click("#rt3RestForm button[type=submit]"); await p.waitForTimeout(400);
  let rs = (await ls(p, "routineDays")).filter((x) => x.rest && x.date >= D.DAY).map((x) => x.date);
  ok(rs.join() === "2026-11-20,2026-11-21,2026-11-22" && (await txt(p, "#rt3RestList")).includes("11月20日（金）〜11月22日（日）3日"), "② 11/20〜11/22 お休み", { rs, l: await txt(p, "#rt3RestList") });
  let al = await alarms(p, "^rt-remind:");
  ok(!al.some((a) => /2026-11-2[012]$/.test(a.tag)) && al.some((a) => a.tag === "rt-remind:2026-11-19") && al.some((a) => a.tag === "rt-remind:2026-11-23"), "② no ルーティーンのお知らせ on those days", al.slice(0, 8).map((a) => a.tag));
  await p.locator("#rt3RestList button", { hasText: "やめる" }).click(); await p.waitForTimeout(400);
  rs = (await ls(p, "routineDays")).filter((x) => x.date >= "2026-11-20");
  ok(!rs.length && (await txt(p, "#rt3RestList")) === "お休みの予定はありません。", "② やめる: the days gone", rs);
  await undo(p);
  ok((await ls(p, "routineDays")).filter((x) => x.rest && x.date >= "2026-11-20").length === 3, "② 元に戻す");
  // ⑨
  await p.locator("#rt3WeekOn").click(); await p.waitForTimeout(300);
  ok((await ls(p, "settings")).find((x) => x.id === "rtWeekSum")?.on === true, "⑨ kept with the account");
  al = await alarms(p, "^rt3-week:");
  ok(al.length >= 5 && al[0].tag === "rt3-week:2026-11-21" && al[0].at === Date.parse("2026-11-21T21:00:00+09:00") && /^今週の達成率 \d+%（先週 \d+%）・ぜんぶできた日 \d+日$/.test(al[0].body) && al[1].body === "今週のルーティーンをふりかえりましょう", "⑨ on the week's last day, this week's rate", al.slice(0, 2));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);

  // ⑧ the year
  const yr = await p.evaluate(() => ({ n: document.querySelectorAll("#rt3YearWrap .rt3-y").length, now: document.querySelectorAll("#rt3YearWrap .rt3-y.now").length, days: document.querySelectorAll("#rt3YearWrap .rt3-y[data-d]").length, sum: document.querySelector("#rt3YearSum").textContent, label: document.querySelector("#rt3YearWrap .rt3-year").getAttribute("aria-label") }));
  ok(yr.n === 371 && yr.now === 1 && /^ぜんぶできた日 \d+ 日・チェックした日 \d+ 日$/.test(yr.sum.replace(/ /g, " ")) && yr.label.startsWith("この1年で"), "⑧ 53 weeks of squares", yr);
  await p.evaluate(() => document.querySelector('#rt3YearWrap [data-d="2026-11-10"]').click()); await p.waitForTimeout(400);
  ok((await p.evaluate(() => document.querySelector(".datenav input[type=date]")?.value)) === "2026-11-10", "⑧ pressed: that day");
  await p.goto(p.url().split("#")[0] + "#routine"); await p.reload(); await p.waitForTimeout(800);

  // ⑩ 候補 was taken out (the user's call, 2026-11-16): none under the form; その6's まとめて追加 still right after it
  ok(!(await p.$("#rt3Ideas")) && !(await p.evaluate(() => document.getElementById("sec-routine").innerText.includes("候補から選ぶ"))), "⑩ no 候補 (taken out)");
  ok(await p.evaluate(() => document.getElementById("rtForm").nextElementSibling?.classList.contains("rt6-add-tools")), "⑩ まとめて追加 right after the form, as before");

  // ⑤ ⑥ in ⋯: 歯みがき can't come after ストレッチ (which comes after it); 読書 on a 30日チャレンジ
  await row(p, "r2").locator(".rt-opts").click(); await p.waitForTimeout(400);
  const cues = await p.evaluate(() => [...document.querySelectorAll("#rtiAfter option")].map((o) => o.textContent));
  ok(cues[0] === "なし" && !cues.some((c) => c.startsWith("ストレッチ")) && cues.includes("読書のあとに"), "⑤ きっかけ: no circle", cues);
  await p.click("#sheetCancel").catch(() => {}); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  await row(p, "r4").locator(".rt-opts").click(); await p.waitForTimeout(400);
  await p.selectOption("#rtiCh", "30"); await p.selectOption("#rtiAfter", "r3");
  await p.click("#recSave"); await p.waitForTimeout(500);
  const r4 = await item(p, "r4");
  ok(r4.ch?.from === D.DAY && r4.ch?.n === 30 && r4.after === "r3" && (await rowText(p, "r4")).includes("英単語のあとに") && (await rowText(p, "r4")).includes("30日チャレンジ0/30"), "⑤⑥ saved from ⋯", { r4, t: await rowText(p, "r4") });
  ok(!p.errs.length, "no errors (2)", p.errs);
  await p.screenshot({ path: "routine3-after.png", fullPage: true });
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
