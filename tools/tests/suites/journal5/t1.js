// 日記 その5 ①〜⑩, as a user would (no hook build; 聞く through a stand-in for the phone's voice)
const { chromium } = require("playwright");
const fs = require("fs");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const shown = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; }, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "null"), { P, k });
const entry = async (p, d) => ((await ls(p, "journal")) || []).find((j) => j.id === d);
const val = (p) => p.inputValue("#journalText");
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(600); };
const go = async (p, d) => { await p.fill("#sec-journal .datenav input[type=date]", d); await p.dispatchEvent("#sec-journal .datenav input[type=date]", "change"); await p.waitForTimeout(500); };
const pick = (p, a, b) => p.evaluate(({ a, b }) => { const t = document.getElementById("journalText"); t.focus(); t.setSelectionRange(a, b); t.dispatchEvent(new Event("select")); }, { a, b });
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-14T21:00:00+09:00"), { deviceScaleFactor: 1, acceptDownloads: true });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await p.context().addInitScript(() => { window.__said = []; const ss = window.speechSynthesis; if (ss) { ss.speak = (u) => { window.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 50); }; ss.cancel = () => {}; } });
  await seed(p, D.all(), "journal"); await p.waitForTimeout(1000);

  // ⑩ あとで書く: 11/10 listed; today marked; 11/10 taken off
  ok((await txt(p, "#jn5LaterList")) === "11月10日（火）まだ書いていません書く外す", "⑩ the day marked", await txt(p, "#jn5LaterList"));
  await p.click("#jn5Later"); await p.waitForTimeout(400);
  ok(JSON.stringify((await ls(p, "settings")).find((s) => s.id === "jnLater").days) === '["2026-11-10","2026-11-14"]' && (await txt(p, "#jn5Later")) === "あとで書く✓", "⑩ today marked", await txt(p, "#jn5Later"));
  await p.locator("#jn5LaterList li", { hasText: "11月10日" }).locator("button", { hasText: "外す" }).click(); await p.waitForTimeout(400);
  ok(JSON.stringify((await ls(p, "settings")).find((s) => s.id === "jnLater").days) === '["2026-11-14"]', "⑩ 外す");

  // ⑨ この1年: a square a day, the days written coloured
  const heat = await p.evaluate(() => ({ all: document.querySelectorAll("#jn5Heat .jn5-c").length, wrote: [...document.querySelectorAll("#jn5Heat button.jn5-c")].filter((x) => !x.classList.contains("lv0")).length }));
  ok(heat.all === 371 && heat.wrote === 5, "⑨ 53 weeks, 5 days written", heat);
  ok((await txt(p, "#jn5HeatSum")).startsWith("5日"), "⑨ the sum", await txt(p, "#jn5HeatSum"));
  ok(await p.evaluate(() => !!document.querySelector('#jn5Heat button[aria-label^="2025年12月1日"]')), "⑨ last year's said with its year");
  await p.click('#jn5Heat button[aria-label^="11月12日"]'); await p.waitForTimeout(600);
  ok((await val(p)).startsWith("カフェで勉強"), "⑨ pressed: that day", await val(p));

  // ③ 太字にする, and off again
  await pick(p, 0, 3); await p.waitForTimeout(150);
  await p.click("#jn5Bold"); await p.waitForTimeout(150);
  ok((await val(p)) === "**カフェ**で勉強。#カフェ", "③ 太字", await val(p));
  await pick(p, 0, 7); await p.waitForTimeout(150);
  await p.click("#jn5Bold"); await p.waitForTimeout(1600);
  ok((await val(p)) === "カフェで勉強。#カフェ", "③ off again", await val(p));

  // ④ ことばのカード (the day's), 夜, and saved
  await p.click("#jn5DayCard"); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.getElementById("jn5PicView").open && document.getElementById("jn5PicImg").naturalWidth === 1080), "④ the card, 1,080 px");
  ok((await p.locator("#jn5PicStyle button").count()) === 2, "④ 生成り and 夜 (no photo that day)");
  await p.locator("#jn5PicStyle button", { hasText: "夜" }).click(); await p.waitForTimeout(600);
  ok((await p.getAttribute('#jn5PicStyle button:has-text("夜")', "aria-pressed")) === "true", "④ 夜");
  const [dl1] = await Promise.all([p.waitForEvent("download", { timeout: 15000 }), p.click("#jn5PicSave")]);
  ok(dl1.suggestedFilename() === "nikki-2026-11-12-card.png" && fs.statSync(await dl1.path()).size > 5000, "④ saved", dl1.suggestedFilename());
  await p.click("#jn5PicClose"); await p.waitForTimeout(300);

  // ⑦ タグの名前を変える: #カフェ → #喫茶店 (not inside 伏せ字), and 元に戻す
  await p.locator("#jnTagAll .jn-tag", { hasText: "カフェ" }).click(); await p.waitForTimeout(300);
  await p.locator("#jn5TagEdit button", { hasText: "の名前を変える" }).click(); await p.waitForTimeout(200);
  await p.fill("#jn5TagName", "喫茶店"); await p.locator("#jn5TagEdit button", { hasText: "変える" }).click(); await p.waitForTimeout(700);
  ok((await entry(p, "2026-11-03")).text === "文化の日。#喫茶店 に行った。｟#カフェ ひみつ｠" && (await entry(p, "2026-11-12")).text.endsWith("#喫茶店") && (await entry(p, "2026-11-01")).text.endsWith("#喫茶店"), "⑦ changed in every 日記, not in 伏せ字", (await entry(p, "2026-11-03")).text);
  ok((await txt(p, "#jnTagAll")).includes("#喫茶店3") && (await val(p)).endsWith("#喫茶店"), "⑦ the tag card and the field", await txt(p, "#jnTagAll"));
  await undo(p);
  ok((await entry(p, "2026-11-12")).text.endsWith("#カフェ") && (await entry(p, "2026-11-03")).text.startsWith("文化の日。#カフェ"), "⑦ 元に戻す");

  // ③ 飾り in 月の日記を読む, and ① 縦書きで読む
  await go(p, "2026-11-01");
  await p.locator("#jn2Read button", { hasText: "続けて読む" }).click(); await p.waitForTimeout(300);
  const deco = await p.evaluate(() => { const a = document.querySelector('#jn2Read .jn2-day[data-day="2026-11-01"]'); return { h: a.querySelector(".jn5-h")?.textContent, b: a.querySelector(".jn5-b")?.textContent, hr: !!a.querySelector(".jn5-hr"), href: a.querySelector(".jn5-link")?.getAttribute("href"), link: a.querySelector(".jn5-link")?.textContent, date: a.querySelector(".jn3-date-link")?.textContent, raw: a.querySelector(".jn2-read-text").textContent.includes("**") }; });
  ok(deco.h === "11月のはじまり" && deco.b === "たのしい" && deco.hr && deco.href === "https://example.com/page" && deco.link === "example.com/page" && deco.date === "11/3" && !deco.raw, "③ 見出し, 太字, 区切り線, a link (and the date)", deco);
  const snip = await p.evaluate(() => [...document.querySelectorAll("#jnTagList .jn-snip, #jnBack .jn-snip")].map((x) => x.textContent).join("|"));
  ok(!/\*\*|^# /m.test(snip), "③ the marks left out elsewhere", snip);
  await p.click("#jn5Read"); await p.waitForTimeout(400);
  const rd = await p.evaluate(() => ({ open: document.getElementById("jn5Reader").open, mode: getComputedStyle(document.getElementById("jn5RdBody")).writingMode, title: document.getElementById("jn5RdTitle").textContent, tcy: [...document.querySelectorAll("#jn5RdBody .jn5-tcy")].map((x) => x.textContent).join(","), h: document.querySelector("#jn5RdBody .jn5-h")?.textContent }));
  ok(rd.open && rd.mode === "vertical-rl" && rd.title === "2026年11月1日（日）" && rd.tcy.startsWith("11"), "① 縦書き, two digits upright", rd);
  await p.click("#jn5RdNext"); await p.waitForTimeout(300);
  ok((await txt(p, "#jn5RdTitle")) === "2026年11月3日（火）", "① ‹ 次に書いた日", await txt(p, "#jn5RdTitle"));

  // ② 聞く (in the reader): 伏せ字 as ふせじ, # left out
  await p.click("#jn5RdSpeak"); await p.waitForTimeout(300);
  const said = await p.evaluate(() => window.__said);
  ok(said.length === 1 && said[0] === "11月3日（火）。文化の日。カフェ に行った。（ふせじ）", "② read out", said);
  await p.click("#jn5RdClose"); await p.waitForTimeout(400);
  ok((await val(p)).startsWith("文化の日"), "① closed on the day read last", await val(p));

  // ⑤ コラージュ
  await p.setInputFiles("#jn2PhotoFile", { name: "a.png", mimeType: "image/png", buffer: PNG }); await p.waitForTimeout(700);
  await go(p, "2026-11-13");
  await p.setInputFiles("#jn2PhotoFile", { name: "b.png", mimeType: "image/png", buffer: PNG }); await p.waitForTimeout(700);
  await p.locator("#jn3Album .jn5-collage-btn").first().click(); await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.getElementById("jn5PicView").open && document.getElementById("jn5PicImg").naturalWidth === 1080) && (await txt(p, "#jn5PicTitle")) === "2026年11月のコラージュ", "⑤ the collage");
  const [dl2] = await Promise.all([p.waitForEvent("download", { timeout: 15000 }), p.click("#jn5PicSave")]);
  ok(dl2.suggestedFilename() === "nikki-2026-11-collage.png", "⑤ saved", dl2.suggestedFilename());
  await p.click("#jn5PicClose"); await p.waitForTimeout(300);

  // ⑧ 紙 and ⑥ 日記を取り込む (under the gear)
  await p.click("#jnSettings"); await p.waitForTimeout(800);
  await p.selectOption("#jn5Paper", "lined"); await p.waitForTimeout(200);
  ok((await p.evaluate(() => document.getElementById("sec-journal").classList.contains("jn5-lined") && getComputedStyle(document.getElementById("journalText")).backgroundImage.includes("repeating-linear-gradient"))) && (await p.evaluate((P) => localStorage.getItem(P + "jnPaper"), P)) === "lined", "⑧ 罫線");
  await p.fill("#jn5ImpText", "つみかさね　日記\n2026年10月1日（木）〜2026年11月13日（金）（3 日）\n\n────────────\n2026年10月1日（木）\n\n十月のはじめ。\n\n────────────\n2026/10/2\nふつかめ\n2026-11-13 追記です\n2027/01/01 先の日");
  await p.click("#jn5ImpRead"); await p.waitForTimeout(300);
  ok((await txt(p, "#jn5ImpAsk")).startsWith(flat("10/1〜11/13の 3 日分を取り込みます。（あしたより先の 1 日はとばします）そのうち 1 日は、もう日記があります。")), "⑥ seen first", await txt(p, "#jn5ImpAsk"));
  await p.click("#jn5ImpGo"); await p.waitForTimeout(800);
  ok((await entry(p, "2026-10-01"))?.text === "十月のはじめ。" && (await entry(p, "2026-10-02"))?.text === "ふつかめ" && (await entry(p, "2026-11-13")).text === "あしたは雨。\n\n追記です" && !(await entry(p, "2027-01-01")), "⑥ brought in (and 書き足す on 11/13)", [await entry(p, "2026-10-01"), (await entry(p, "2026-11-13")).text]);
  await undo(p); await p.waitForTimeout(300);
  ok(!(await entry(p, "2026-10-01")) && !(await entry(p, "2026-10-02")) && (await entry(p, "2026-11-13")).text === "あしたは雨。", "⑥ 元に戻す", (await entry(p, "2026-11-13")).text);
  await p.click("#sheetDone"); await p.waitForTimeout(600);
  await p.screenshot({ path: "journal5-page.png", fullPage: true });

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails} failed` : "ALL OK");
})().catch((e) => { console.log("FAIL " + e.message); process.exit(1); });
