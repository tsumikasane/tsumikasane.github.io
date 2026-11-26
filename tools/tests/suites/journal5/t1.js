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
const PNG64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
// photos already on this device (写真を付ける taken out, 2026-11-19), put in as the app kept them: { id, jnDay, blob, w, h,
// createdAt }; the page is opened again after, as it reads them once
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
  const p = await phone(b, new Date("2026-11-14T21:00:00+09:00"), { deviceScaleFactor: 1, acceptDownloads: true });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "journal"); await p.waitForTimeout(1000);

  // ⑩ あとで書く: taken out (the user's call, 2026-11-19, tools/REMOVED.md): no button, no list of the days. The days marked
  // before (the setting jnLater) are kept, read by nothing
  ok(!(await p.$("#jn5Later")) && !(await p.$("#jn5LaterList")) && !(await p.$("#jn5LaterCard")), "⑩ (taken out) no あとで書く");
  ok(JSON.stringify((await ls(p, "settings")).find((s) => s.id === "jnLater")?.days) === '["2026-11-10"]', "⑩ (the days marked before: kept)", await ls(p, "settings"));

  // ⑨ この1年: the twelve months to this one, a small calendar each, three to a row on a phone, so the whole year is seen
  // without scrolling (the user's call, 2026-11-27: the 53 weeks side by side, scrolled across, before); a square a day,
  // the days written coloured
  const heat = await p.evaluate(() => { const bs = [...document.querySelectorAll("#jn5Heat button.jn5-c")], w = bs.filter((x) => x.classList.contains("wrote"));
    const wrap = document.getElementById("jn5HeatWrap"), card = document.getElementById("jn5HeatCard").getBoundingClientRect(), mons = [...document.querySelectorAll("#jn5Heat .jn5-mon")], top = (m) => Math.round(m.getBoundingClientRect().top);
    return { all: document.querySelectorAll("#jn5Heat .jn5-c").length, wrote: w.length, steps: bs.some((x) => /\blv\d/.test(x.className)), colours: [...new Set(w.map((x) => getComputedStyle(x).backgroundColor))].length,
      months: mons.map((m) => m.querySelector(".jn5-mon-head").textContent).join(" "), rows: new Set(mons.map(top)).size, firstRow: mons.filter((m) => top(m) === top(mons[0])).length,
      across: wrap.scrollWidth <= wrap.clientWidth, h: Math.round(card.height) }; });
  ok(heat.all === 365 && heat.wrote === 5 && !heat.steps && heat.colours === 1, "⑨ 2025年12月〜11月, a square a day, 5 days written, in one colour however much (the user's call, 2026-11-25)", heat);
  ok(heat.months === "2025年12月 1月 2月 3月 4月 5月 6月 7月 8月 9月 10月 11月" && heat.firstRow === 3 && heat.rows === 4 && heat.across && heat.h < 600, "⑨ three months to a row, four rows: nothing to scroll across, the whole year within the screen", heat);
  ok((await txt(p, "#jn5HeatSum")).startsWith("5日"), "⑨ the sum", await txt(p, "#jn5HeatSum"));
  ok(await p.evaluate(() => !!document.querySelector('#jn5Heat button[aria-label^="2025年12月1日"]')), "⑨ last year's said with its year");
  await p.click('#jn5Heat button[aria-label^="11月12日"]'); await p.waitForTimeout(600);
  ok((await val(p)).startsWith("カフェで勉強"), "⑨ pressed: that day", await val(p));

  // ③ 太字にする: taken out at the user's call (2026-11-25, tools/REMOVED.md)
  await pick(p, 0, 3); await p.waitForTimeout(150);
  ok(!(await p.$("#jn5Bold")) && !(await p.evaluate(() => document.getElementById("jn3Sel")?.textContent.includes("太字"))), "③ (taken out) no 太字にする");

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

  // ③ 飾り in 月の日記を読む (taken out at the user's call (2026-11-25, tools/REMOVED.md): the marks as typed), and ① 縦書きで読む
  await go(p, "2026-11-01");
  await p.locator("#jn2Read button", { hasText: "続けて読む" }).click(); await p.waitForTimeout(300);
  const deco = await p.evaluate(() => { const a = document.querySelector('#jn2Read .jn2-day[data-day="2026-11-01"]'), t = a.querySelector(".jn2-read-text"); return { marks: !!t.querySelector(".jn5-h, .jn5-b, .jn5-hr, .jn5-link, a[href^='http']"), text: t.textContent, date: a.querySelector(".jn3-date-link")?.textContent }; });
  ok(!deco.marks && deco.text.startsWith("# 11月のはじまり\n**たのしい**一日だった。\n---\nhttps://example.com/page と 11/3 の話。") && deco.date === "11/3", "③ (taken out) no 見出し・太字・区切り線・リンク: the marks as typed (the date still a link)", deco);
  const snip = await p.evaluate(() => [...document.querySelectorAll("#jnTagList .jn-snip, #jnBack .jn-snip")].map((x) => x.textContent).join("|"));
  ok(!snip.includes("たのしい") || snip.includes("**たのしい**"), "③ (taken out) elsewhere too, the marks as typed", snip);
  await p.click("#jn5Read"); await p.waitForTimeout(400);
  const rd = await p.evaluate(() => ({ open: document.getElementById("jn5Reader").open, mode: getComputedStyle(document.getElementById("jn5RdBody")).writingMode, title: document.getElementById("jn5RdTitle").textContent, tcy: [...document.querySelectorAll("#jn5RdBody .jn5-tcy")].map((x) => x.textContent).join(","), h: document.querySelector("#jn5RdBody .jn5-h")?.textContent }));
  ok(rd.open && rd.mode === "vertical-rl" && rd.title === "2026年11月1日（日）" && rd.tcy.startsWith("11") && !rd.h, "① 縦書き, two digits upright (no 見出し: ③ taken out)", rd);
  await p.click("#jn5RdNext"); await p.waitForTimeout(300);
  ok((await txt(p, "#jn5RdTitle")) === "2026年11月3日（火）", "① ‹ 次に書いた日", await txt(p, "#jn5RdTitle"));

  // ② the day read out (日記を聞く, and 聞く in the reader): taken out at the user's call (2026-11-24, tools/REMOVED.md)
  ok(!(await p.$("#jn5RdSpeak")) && !(await p.$("#jn5Speak")) && !(await p.evaluate(() => document.getElementById("jn5Reader").innerText.includes("聞く"))), "② no reading out (taken out)");
  await p.click("#jn5RdClose"); await p.waitForTimeout(400);
  ok((await val(p)).startsWith("文化の日"), "① closed on the day read last", await val(p));

  // ⑤ コラージュ, of photos already on this device (写真を付ける taken out, 2026-11-19)
  await putPhotos(p, ["2026-11-14", "2026-11-13"]); await p.reload(); await p.waitForTimeout(1200);
  // (写真と絵 as the page opened: drawn once the photos are read, fixed 2026-11-20)
  await p.locator("#jn3Album .jn5-collage-btn").first().click(); await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.getElementById("jn5PicView").open && document.getElementById("jn5PicImg").naturalWidth === 1080) && (await txt(p, "#jn5PicTitle")) === "2026年11月のコラージュ", "⑤ the collage");
  const [dl2] = await Promise.all([p.waitForEvent("download", { timeout: 15000 }), p.click("#jn5PicSave")]);
  ok(dl2.suggestedFilename() === "nikki-2026-11-collage.png", "⑤ saved", dl2.suggestedFilename());
  await p.click("#jn5PicClose"); await p.waitForTimeout(300);

  // ⑧ 紙 and ⑥ 日記を取り込む: taken out at the user's call (2026-11-24, tools/REMOVED.md): not under the gear; a paper
  // chosen before not used (the field as it is), kept on this device
  await p.evaluate((P) => localStorage.setItem(P + "jnPaper", "lined"), P);
  await p.reload(); await p.waitForTimeout(1200);
  ok(!(await p.evaluate(() => [...document.getElementById("sec-journal").classList].some((c) => /^jn5-(lined|grid|cream)$/.test(c)) || getComputedStyle(document.getElementById("journalText")).backgroundImage.includes("gradient"))), "⑧ the paper chosen before not used");
  await p.click("#jnSettings"); await p.waitForTimeout(800);
  ok(!(await p.$("#jn5Paper")) && !(await p.$("#jn5ImpText")) && !(await p.$("#jn5ImpRead")) && (await p.evaluate((P) => localStorage.getItem(P + "jnPaper"), P)) === "lined", "⑧⑥ not under the gear, the paper kept on this device");
  await p.click("#sheetDone"); await p.waitForTimeout(600);
  await p.screenshot({ path: "journal5-page.png", fullPage: true });

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails} failed` : "ALL OK");
})().catch((e) => { console.log("FAIL " + e.message); process.exit(1); });
