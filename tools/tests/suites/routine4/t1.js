// ルーティーン その4 ①〜⑩, through the hook build at 8874 (⑨'s お知らせ) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8874/";
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
const alarms = (p, re) => p.evaluate((src) => window.__rt4.alarms(Date.now(), src), re);
const stat = (p, i) => p.locator("#rtStats li.rt-stat").nth(i);
async function open(b, hm = "08:00") {
  const p = await phone(b, new Date(`${D.DAY}T${hm}:00+09:00`), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "routine"); await p.waitForTimeout(800);
  await p.evaluate(() => { window.__shared = []; navigator.share = async (x) => { window.__shared.push(x.text); }; window.print = () => { window.__printed = document.querySelector("#rt4Print")?.innerText || null; }; });
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b);
  await p.screenshot({ path: "routine4-top.png" });

  // ② 絵文字 beside the name, in the week's table and 項目ごとの記録
  ok((await row(p, "r1").locator(".rt4-emoji").textContent()) === "🧘" && (await p.locator("#rtWeek tbody th").first().textContent()) === "🧘 ストレッチ" && flat(await stat(p, 0).innerText()).startsWith("🧘ストレッチ"), "② 🧘 on the row, the week, the record");
  // ⑩ ToDo done today: checked by it
  ok((await row(p, "r3").getAttribute("class")).includes("auto") && (await rowText(p, "r3")).includes("ToDoを1つ終えたのでチェック"), "⑩ checked by a ToDo done today", await rowText(p, "r3"));
  // ④ ふだんの時刻, ⑤ 定着度, ③ the last ひとこと
  const s0 = flat(await stat(p, 0).innerText()), s1 = flat(await stat(p, 1).innerText());
  ok(/定着度\d+%（1週間前から[+−±]\d+）・ふだん7:10ごろ/.test(s0), "④⑤ 定着度 and ふだん 7:10ごろ", s0);
  ok(s1.includes("11/14p.120まで11/13p.100まで"), "③ the last ひとこと in the record", s1);
  // ⑨ 連続を守るお知らせ, in the gear: 読書 (5日連続) still to do
  await p.click("#rtSettings"); await p.waitForTimeout(400);
  ok(await shown(p, "#rt4GuardOn") && await shown(p, "#rt4CompactOn"), "⑧⑨ in the gear");
  await p.locator("#rt4GuardOn").click(); await p.waitForTimeout(300);
  let al = await alarms(p, "^rt4-guard:");
  ok(al[0]?.tag === `rt4-guard:${D.DAY}` && al[0].at === Date.parse(`${D.DAY}T21:30:00+09:00`) && al[0].body === "「読書」（5日連続）がまだです" && al[1]?.body === "連続中の項目は、きょうもできましたか？", "⑨ today's names 読書; the days after a word", al.slice(0, 2));
  // ⑧ コンパクト表示
  await p.locator("#rt4CompactOn").click(); await p.waitForTimeout(300);
  ok((await ls(p, "settings")).find((x) => x.id === "rtCompact")?.on === true && (await p.getAttribute("#rtList", "class")).includes("rt4-compact"), "⑧ コンパクト on");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  ok(!(await shown(p, '#rtList li[data-rt="r2"] .rt-sub')), "⑧ no line under the names");
  await p.click("#rtSettings"); await p.waitForTimeout(400); await p.locator("#rt4CompactOn").click(); await p.waitForTimeout(300); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  // ③ ひとこと on 読書, once done; kept as another is checked
  await row(p, "r2").locator(".check").click(); await p.waitForTimeout(300);
  al = await alarms(p, "^rt4-guard:");
  ok(!al.some((a) => a.tag === `rt4-guard:${D.DAY}`), "⑨ today's gone once 読書 is done", al.slice(0, 1));
  await row(p, "r2").locator(".rt4-note-add").click(); await p.waitForTimeout(300);
  ok(await shown(p, "#rt4NoteAsk") && (await txt(p, "#rt4NoteTitle")) === "「読書」のきょうのひとこと", "③ asked", await txt(p, "#rt4NoteTitle"));
  await p.fill("#rt4NoteInput", "p.140まで"); await p.click("#rt4NoteSave"); await p.waitForTimeout(300);
  ok((await day(p)).notes?.r2 === "p.140まで" && (await row(p, "r2").locator(".rt4-note").textContent()) === "p.140まで", "③ kept, under the row", await day(p));
  await row(p, "r1").locator(".check").click(); await p.waitForTimeout(300);
  ok((await day(p)).notes?.r2 === "p.140まで", "③ kept as another is checked");
  // ③ on one checked by the ToDo alone (no day kept before)
  await row(p, "r3").locator(".rt4-note-add").click(); await p.waitForTimeout(300);
  await p.fill("#rt4NoteInput", "レポート"); await p.click("#rt4NoteSave"); await p.waitForTimeout(300);
  ok((await day(p)).notes?.r3 === "レポート", "③ on one another page's record checked", (await day(p)).notes);
  await undo(p);
  ok(!(await day(p)).notes?.r3 && (await day(p)).notes?.r2 === "p.140まで", "③ 元に戻す", (await day(p)).notes);
  // ① 文字で送る (きょうのルーティーンを文字で送る・この1週間を文字で送る), with その6 ⑨ 画像で送る and その7 ④ 日記に書き足す
  // beside them: taken out at the user's call (2026-11-28, tools/REMOVED.md): none of the row nor its words on the page
  const page1 = await p.evaluate(() => document.getElementById("sec-routine")?.innerText || "");
  ok(!(await p.$("#rt4Share")) && !(await p.$("#rt4SendDay")) && !(await p.$("#rt4SendWeek")) && !/きょうのルーティーンを文字で送る|この日のルーティーンを文字で送る|この1週間を文字で送る|きょうを画像で送る|この日を画像で送る|この月を画像で送る|きょうを日記に書き足す|この日を日記に書き足す/.test(page1) && page1.includes("項目ごとの記録"), "① 文字で送る and the row beside it: gone", page1.match(/きょうのルーティーンを文字で送る|この日のルーティーンを文字で送る|この1週間を文字で送る|きょうを画像で送る|この日を画像で送る|この月を画像で送る|きょうを日記に書き足す|この日を日記に書き足す/)?.[0]);
  // ② 絵文字 in ⋯
  await row(p, "r4").locator(".rt-opts").click(); await p.waitForTimeout(400);
  await p.locator(".rt4-emoji-pick", { hasText: "💧" }).click(); await p.click("#recSave"); await p.waitForTimeout(500);
  ok((await item(p, "r4")).emoji === "💧" && (await row(p, "r4").locator(".rt4-emoji").textContent()) === "💧", "② 💧 picked", await item(p, "r4"));
  // ⑥ the 12 weeks' squares pressed; 期間でまとめてチェック
  await stat(p, 3).locator(".rt2-grid-btn").click(); await p.waitForTimeout(300);
  await p.locator('#rtStats .rt2-grid[data-id="r4"] [data-d="2026-11-12"]').click(); await p.waitForTimeout(300);
  ok((await day(p, "2026-11-12")).done.includes("r4") && (await day(p, "2026-11-12")).counts.r4 === 8, "⑥ a square pressed: 11/12 checked", await day(p, "2026-11-12"));
  ok(await p.evaluate(() => document.activeElement?.dataset.d === "2026-11-12"), "⑥ the square keeps the focus");
  await p.locator("#rtStats li.rt-stat").nth(3).locator(".rt4-grid-foot button").click(); await p.waitForTimeout(300);
  ok(await shown(p, "#rt4RangeAsk") && (await p.inputValue("#rt4RangeFrom")) === "2026-11-09" && (await p.inputValue("#rt4RangeTo")) === "2026-11-14", "⑥ the span asked");
  await p.fill("#rt4RangeFrom", "2026-11-01"); await p.fill("#rt4RangeTo", "2026-11-20"); await p.click("#rt4RangeGo"); await p.waitForTimeout(200);
  ok(await shown(p, "#rt4RangeAsk") && (await txt(p, "#rt4RangeTitle")) === "きょうまでの日を選んでください", "⑥ not days to come");
  await p.fill("#rt4RangeTo", "2026-11-07"); await p.click("#rt4RangeGo"); await p.waitForTimeout(400);
  const wk = (await ls(p, "routineDays")).filter((x) => x.date >= "2026-11-01" && x.date <= "2026-11-07" && x.done.includes("r4"));
  ok(!(await shown(p, "#rt4RangeAsk")) && wk.length === 7 && (await toast(p)).includes("「水を飲む」を7日チェックしました"), "⑥ 11/1〜11/7 checked", { n: wk.length, t: await toast(p) });
  await undo(p);
  ok(!(await ls(p, "routineDays")).some((x) => x.date >= "2026-11-01" && x.date <= "2026-11-07" && x.done.includes("r4")) && (await day(p, "2026-11-12")).done.includes("r4"), "⑥ 元に戻す (11/12's kept)");
  // ⑦ この月のチェック表
  await p.click("#rt4PrintBtn"); await p.waitForTimeout(300);
  const pr = await p.evaluate(() => window.__printed);
  ok(pr && pr.includes("2026年11月のルーティーン") && pr.includes("🧘 ストレッチ") && pr.includes("✓") && pr.includes("ぜんぶ"), "⑦ the month's チェック表", (pr || "").slice(0, 120));
  const tb = await p.evaluate(() => ({ cols: document.querySelectorAll("#rt4Print thead th").length, rows: document.querySelectorAll("#rt4Print tbody tr").length, r2: [...document.querySelectorAll("#rt4Print tbody tr")][1]?.innerText.replace(/\s+/g, "") }));
  ok(tb.cols === 32 && tb.rows === 4 && tb.r2.startsWith("📖読書") && tb.r2.endsWith("6"), "⑦ 30 days and 計, an item a row", tb);
  await p.evaluate(() => { document.querySelector("#rt4Print")?.remove(); });
  ok(!p.errs.length, "no errors", p.errs);
  await p.screenshot({ path: "routine4-after.png", fullPage: true });
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
