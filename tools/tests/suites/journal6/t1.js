// 日記 その6 ①〜⑩, through the hook build at 8871 (⑩'s お知らせ) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8871/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const shown = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; }, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "null"), { P, k });
const setting = async (p, id) => ((await ls(p, "settings")) || []).find((s) => s.id === id);
const val = (p) => p.inputValue("#journalText");
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(600); };
const go = async (p, d) => { await p.fill("#sec-journal .datenav input[type=date]", d); await p.dispatchEvent("#sec-journal .datenav input[type=date]", "change"); await p.waitForTimeout(500); };
const store = (p) => p.evaluate(() => new Promise((res) => { const r = indexedDB.open("tsumikasane-photos", 1); r.onsuccess = () => { const q = r.result.transaction("photos").objectStore("photos").getAll(); q.onsuccess = () => res(q.result.filter((x) => x.jnDay).map((x) => x.jnDay).sort()); }; r.onerror = () => res([]); }));
const PNG64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
// photos already on this device (写真を付ける and ⑤ 撮った日にまとめて付ける taken out, 2026-11-19), put in as the app kept
// them: { id, jnDay, blob, w, h, createdAt }; the page is opened again after, as it reads them once
const putPhotos = (p, days) => p.evaluate(({ days, b64 }) => new Promise((res, rej) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), r = indexedDB.open("tsumikasane-photos", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" });
  r.onerror = () => rej(r.error);
  r.onsuccess = () => {
    const tx = r.result.transaction("photos", "readwrite");
    days.forEach((d, i) => tx.objectStore("photos").put({ id: "t" + i + Math.random().toString(36).slice(2, 8), jnDay: d, blob: new Blob([bytes], { type: "image/png" }), w: 1, h: 1, createdAt: Date.now() + i }));
    tx.oncomplete = () => { r.result.close(); res(); };
    tx.onerror = () => rej(tx.error);
  };
}), { days, b64: PNG64 });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-14T21:00:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "journal"); await p.waitForTimeout(1000);

  // ⑧ 毎年おなじ問い and ⑨ 自分の問いかけ: taken out (the user's call, 2026-11-19, tools/REMOVED.md) with きょうの問いかけ;
  // the setting jnAsk6 (one's own questions) is kept, read by nothing
  ok(!(await p.$("#jnAsk")) && !(await p.$(".jn6-past")), "⑧⑨ (taken out) no question of one's own, no last year's answer");

  // ① 見出しの目次
  const toc = await p.evaluate(() => [...document.querySelectorAll("#jn6Toc .jn6-toc-row")].map((x) => (x.classList.contains("sub") ? "  " : "") + x.innerText.replace(/\s+/g, "")));
  ok(toc.join("|") === "  11/3文化の日|11/111月のはじまり|  11/1朝", "① the 目次, the latest first", toc);
  await p.locator("#jn6Toc button", { hasText: "文化の日" }).click(); await p.waitForTimeout(600);
  ok((await val(p)).startsWith("## 文化の日"), "① pressed: that day", await val(p));

  // ② タグの提案 and ③ マーカー (today)
  await go(p, D.DAY);
  await p.click("#journalText"); await p.keyboard.type("きょうもカフェに行った"); await p.waitForTimeout(700);
  ok((await txt(p, "#jn6TagIdea")) === "タグにする？＋#カフェ", "② #カフェ offered", await txt(p, "#jn6TagIdea"));
  await p.locator("#jn6TagIdea button").click(); await p.waitForTimeout(700);
  ok((await val(p)) === "きょうもカフェに行った #カフェ" && !(await shown(p, "#jn6TagIdea")), "② put in", await val(p));
  await p.evaluate(() => { const t = document.getElementById("journalText"); t.focus(); t.setSelectionRange(4, 7); t.dispatchEvent(new Event("select")); });
  await p.waitForTimeout(150);
  await p.click("#jn6Mark"); await p.waitForTimeout(1600);
  ok((await val(p)) === "きょうも==カフェ==に行った #カフェ", "③ マーカー", await val(p));
  ok(!(await txt(p, "#jn6TagIdea")), "② (not offered once it is a tag)");

  // ⑥ 引用する (1年前 in 読み返す)
  await p.locator("#jnBack li", { has: p.locator("strong", { hasText: /^1年前$/ }) }).locator("button", { hasText: "引用する" }).click(); await p.waitForTimeout(500);
  ok((await val(p)).endsWith("\n\n> 2025/11/14の日記より\n> 【自分の問い？】\n> 去年の答え\n"), "⑥ quoted at the end", await val(p));
  await p.waitForTimeout(1500);
  await p.locator("#jn2Read button", { hasText: "続けて読む" }).click(); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const a = document.querySelector('#jn2Read .jn2-day[data-day="2026-11-14"]'); return { mark: a.querySelector(".jn6-mark")?.textContent, quotes: a.querySelectorAll(".jn6-quote").length, link: a.querySelector(".jn6-quote .jn3-date-link")?.textContent }; });
  ok(r.mark === "カフェ" && r.quotes === 3 && r.link === "2025/11/14", "③⑥ in 月の日記を読む: the マーカー, the quote (its date a link)", r);

  // ⑦ 書きたいこと: taken out (the user's call, 2026-11-19)
  ok(!(await p.$("#jn6IdeaText")) && !(await p.$("#jn6IdeaList")) && !(await p.$("#jn6IdeaCard")), "⑦ (taken out) no 書きたいこと");

  // ⑤ 撮った日にまとめて付ける: taken out (the user's call, 2026-11-19). ④ 写真カレンダー, on photos already on this device
  ok(!(await p.$("#jn6Bulk")) && !(await p.$("#jn6BulkFile")), "⑤ (taken out) no 撮った日にまとめて付ける");
  await putPhotos(p, ["2026-11-03", D.DAY, D.DAY]); await p.reload(); await p.waitForTimeout(1200);
  // (写真カレンダー as the page opened, no day moved to: drawn once the photos are read. It stayed hidden until the page was
  // drawn again before, fixed 2026-11-20)
  ok(JSON.stringify(await store(p)) === '["2026-11-03","2026-11-14","2026-11-14"]', "(the photos on this device)", await store(p));
  const pc = await p.evaluate(() => [...document.querySelectorAll("#jn6PhotoCal .jn6-pc.has .dn")].map((x) => x.textContent).join());
  ok(pc === "3,14", "④ 写真カレンダー: the days with one", pc);
  await p.click('#jn6PhotoCal .jn6-pc.has[aria-label^="11月3日"]'); await p.waitForTimeout(600);
  ok((await val(p)).startsWith("## 文化の日"), "④ pressed: that day", await val(p));

  // ⑩ 週のふりかえりのお知らせ (the week's last day, 土曜 20:00 at first): this week's, then none once its ひとこと is written
  await p.click("#jnSettings"); await p.waitForTimeout(800);
  ok((await p.inputValue("#jn6WeekWd")) === "6", "⑩ 土曜 at first (the week begins on 日曜)");
  await p.click("#jn6WeekOn"); await p.waitForTimeout(300);
  let al = await p.evaluate((n) => window.__jn6.alarms(n), Date.parse("2026-11-14T06:00:00+09:00"));
  ok(al.length >= 1 && al[0].at === Date.parse("2026-11-14T20:00:00+09:00") && al[0].body === "今週は 3 日書きました。今週をひとことで、ふりかえってみませんか" && al[0].url === "./#journal", "⑩ today's", al[0]);
  // ⑧⑨ (taken out) nothing for one's own questions under the gear; those of before kept
  ok(!(await p.$("#jn6AskNew")) && !(await p.$("#jn6AskList")) && !(await p.$("#jn6AskMode")) && !(await p.$("#jn6AskOnly")), "⑧⑨ (taken out) not under the gear");
  ok(JSON.stringify((await setting(p, "jnAsk6"))?.mine) === '["自分の問い？"]', "⑨ (one's own questions of before: kept)", await setting(p, "jnAsk6"));
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  await go(p, D.DAY);
  await p.fill("#jn4WeekText", "いい週"); await p.dispatchEvent("#jn4WeekText", "input"); await p.waitForTimeout(1600);
  al = await p.evaluate((n) => window.__jn6.alarms(n), Date.parse("2026-11-14T06:00:00+09:00"));
  ok(!al.some((a) => a.at === Date.parse("2026-11-14T20:00:00+09:00")) && al[0]?.at === Date.parse("2026-11-21T20:00:00+09:00"), "⑩ not once the week's ひとこと is written", al.map((a) => a.at));
  await p.screenshot({ path: "journal6-page.png", fullPage: true });

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails} failed` : "ALL OK");
})().catch((e) => { console.log("FAIL " + e.message); process.exit(1); });
