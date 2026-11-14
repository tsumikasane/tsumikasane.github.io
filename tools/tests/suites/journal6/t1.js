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
// a JPEG (made on the page) with an EXIF 撮影日時 put in after its start
function exif(date) {
  const t = Buffer.alloc(64);
  t.write("MM", 0); t.writeUInt16BE(42, 2); t.writeUInt32BE(8, 4);
  t.writeUInt16BE(1, 8); t.writeUInt16BE(0x8769, 10); t.writeUInt16BE(4, 12); t.writeUInt32BE(1, 14); t.writeUInt32BE(26, 18); t.writeUInt32BE(0, 22);
  t.writeUInt16BE(1, 26); t.writeUInt16BE(0x9003, 28); t.writeUInt16BE(2, 30); t.writeUInt32BE(20, 32); t.writeUInt32BE(44, 36); t.writeUInt32BE(0, 40);
  t.write(date + "\0", 44, "latin1");
  const head = Buffer.alloc(10); head.writeUInt16BE(0xffe1, 0); head.writeUInt16BE(2 + 6 + 64, 2); head.write("Exif\0\0", 4, "latin1");
  return Buffer.concat([head, t]);
}
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-14T21:00:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "journal"); await p.waitForTimeout(1000);

  // ⑧⑨ one's own question, the same each year, with last year's answer under it
  ok((await txt(p, "#jnAsk .jn-ask-q")) === "きょうの問いかけ自分の問い？", "⑨ one's own question", await txt(p, "#jnAsk .jn-ask-q"));
  ok((await txt(p, "#jnAsk .jn6-past")) === "2025年の答え去年の答え", "⑧ last year's answer", await txt(p, "#jnAsk .jn6-past"));

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

  // ⑦ 書きたいこと
  await p.fill("#jn6IdeaText", "旅行の計画"); await p.press("#jn6IdeaText", "Enter"); await p.waitForTimeout(400);
  ok((await setting(p, "jnIdeas"))?.list?.[0]?.text === "旅行の計画" && (await txt(p, "#jn6IdeaList")).startsWith("旅行の計画"), "⑦ noted", await setting(p, "jnIdeas"));
  await p.locator("#jn6IdeaList button", { hasText: "日記に書く" }).click(); await p.waitForTimeout(500);
  ok((await val(p)).endsWith("\n\n## 旅行の計画\n") && (await setting(p, "jnIdeas")).list.length === 0, "⑦ 日記に書く: a 見出し, off the list", await val(p));
  await undo(p);
  ok((await setting(p, "jnIdeas")).list.length === 1 && !(await val(p)).includes("旅行の計画"), "⑦ 元に戻す");

  // ④ 写真カレンダー and ⑤ 撮った日にまとめて付ける
  const jpg = Buffer.from(await p.evaluate(async () => { const c = document.createElement("canvas"); c.width = 8; c.height = 8; c.getContext("2d").fillRect(0, 0, 8, 8); const bl = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9)); return [...new Uint8Array(await bl.arrayBuffer())]; }));
  const withDate = Buffer.concat([jpg.slice(0, 2), exif("2026:11:03 10:00:00"), jpg.slice(2)]), future = Buffer.concat([jpg.slice(0, 2), exif("2027:01:01 10:00:00"), jpg.slice(2)]);
  await p.setInputFiles("#jn6BulkFile", [{ name: "a.jpg", mimeType: "image/jpeg", buffer: withDate }, { name: "b.jpg", mimeType: "image/jpeg", buffer: jpg }, { name: "c.jpg", mimeType: "image/jpeg", buffer: future }]);
  await p.waitForTimeout(1500);
  ok(JSON.stringify(await store(p)) === '["2026-11-03","2026-11-14","2026-11-14"]', "⑤ each on the day it was taken (none or later: the day shown)", await store(p));
  ok((await txt(p, "#status")).includes("写真3枚を付けました（11/3に1枚、11/14に2枚）"), "⑤ said", await txt(p, "#status"));
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
  // ⑨ another question of one's own, and one's own only off
  await p.fill("#jn6AskNew", "二つ目の問い？"); await p.press("#jn6AskNew", "Enter"); await p.waitForTimeout(300);
  ok(JSON.stringify((await setting(p, "jnAsk6")).mine) === '["自分の問い？","二つ目の問い？"]', "⑨ added", await setting(p, "jnAsk6"));
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
