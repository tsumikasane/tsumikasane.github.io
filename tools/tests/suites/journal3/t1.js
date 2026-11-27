// 日記 その3 ①〜⑩, as a user would (no hook build)
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
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(500); };
const go = async (p, d) => { await p.fill("#sec-journal .datenav input[type=date]", d); await p.dispatchEvent("#sec-journal .datenav input[type=date]", "change"); await p.waitForTimeout(500); };
const photos = (p) => p.evaluate(() => new Promise((res) => { const r = indexedDB.open("tsumikasane-photos", 1); r.onsuccess = () => { const q = r.result.transaction("photos").objectStore("photos").getAll(); q.onsuccess = () => res(q.result.map((x) => ({ jnDay: x.jnDay, draw: !!x.draw, type: x.blob?.type }))); }; r.onerror = () => res([]); }));
// a picture already on this device (絵を描く taken out, 2026-11-19), put in as the app kept one: { id, jnDay, blob (PNG), w,
// h, draw: true, createdAt }; the page is opened again after, as it reads them once
const putPicture = (p, day) => p.evaluate((day) => new Promise((res, rej) => {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 64, 64); g.strokeStyle = "#000"; g.lineWidth = 4; g.beginPath(); g.moveTo(8, 8); g.lineTo(56, 40); g.stroke();
  c.toBlob((blob) => {
    const r = indexedDB.open("tsumikasane-photos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" });
    r.onerror = () => rej(r.error);
    r.onsuccess = () => {
      const tx = r.result.transaction("photos", "readwrite");
      tx.objectStore("photos").put({ id: "t-draw-" + day, jnDay: day, blob, w: 64, h: 64, draw: true, createdAt: Date.now() });
      tx.oncomplete = () => { r.result.close(); res(); };
      tx.onerror = () => rej(tx.error);
    };
  }, "image/png");
}), day);
async function open(b, when) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, acceptDownloads: true });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "journal"); await p.waitForTimeout(1000);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-14T21:00:00+09:00");
  await p.context().grantPermissions(["clipboard-read", "clipboard-write"]);

  // ① the versions of a 日記 gone for good go too
  ok(JSON.stringify(Object.keys(await ls(p, "jnHist"))) === '["2026-11-03"]', "① a day gone for good: its versions go", await ls(p, "jnHist"));

  // ⑦ 書く時間帯
  ok((await txt(p, "#jn3HourFoot")) === flat("いちばん多いのは夜で、よく書きはじめるのは 21時台です。（書いた 7 日から）"), "⑦ 夜 the most, 21時台", await txt(p, "#jn3HourFoot"));
  const hrs = await p.evaluate(() => [...document.querySelectorAll("#jn3HourList .st-row-top")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(hrs.join() === "朝5〜11時1日,昼11〜15時―,夕方15〜19時―,夜19〜23時4日,深夜23〜5時2日", "⑦ each part", hrs);

  // ⑥ 日記の1年: taken out at the user's call (2026-11-27, tools/REMOVED.md): no card, its words nowhere on the page. 月の
  // 日記を読む kept: 10月 read there by its ‹ (as a month's bar of 日記の1年 once took it there)
  const page = await txt(p, "#sec-journal");
  ok(!(await p.$("#jn3YearCard")) && !(await p.$("#jn3Year")) && !page.includes("日記の1年") && !page.includes("いちばん長い日") && !page.includes("日のうち"), "⑥ no 日記の1年", page.slice(0, 200));
  await p.click("#jn2ReadNav [aria-label=前の月]"); await p.waitForTimeout(300);
  await p.locator("#jn2Read .jn2-read-btn").click(); await p.waitForTimeout(400);
  ok((await txt(p, "#jn2ReadNav")).includes("2026年10月") && (await p.locator("#jn2Read .jn2-day").count()) === 1, "⑥ (月の日記を読む kept: 10月 read there)", await txt(p, "#jn2ReadNav"));
  ok(!(await txt(p, "#jn2Words")).includes("日記"), "(よく書いた言葉: not 日記 itself)", await txt(p, "#jn2Words"));

  // ⑩ the dates as links, and the 日記 that name the day
  await go(p, "2026-11-05");
  ok((await txt(p, "#jn2ReadNav")).includes("2026年10月"), "⑥ (the month picked stays in 月の日記を読む within the month)");
  await p.click("#jn2ReadNav [aria-label=次の月]"); await p.waitForTimeout(300);
  const links = await p.evaluate(() => [...document.querySelectorAll("#jn2Read .jn2-day.on .jn3-date-link")].map((x) => x.textContent));
  ok(links.join() === "11/3,11月3日", "⑩ 11/3 and 11月3日 are links", links);
  await p.locator("#jn2Read .jn2-day.on .jn3-date-link").first().click(); await p.waitForTimeout(600);
  ok((await val(p)).startsWith("文化の日"), "⑩ pressed: 11/3", await val(p));
  const refs = await p.evaluate(() => [...document.querySelectorAll("#jn3RefList .jn-back-head span")].map((x) => x.textContent));
  ok(refs.length === 2 && refs[0].startsWith("11月12日") && refs[1].startsWith("11月5日"), "⑩ この日が出てくる日記", refs);

  // ① 変更の履歴: a version kept as the writing begins, put back, and 元に戻す
  await go(p, "2026-11-13");
  ok(!(await shown(p, "#jn3HistBtn")), "① no history yet");
  ok((await txt(p, "#jn3Times")) === "23:30に書きはじめ", "⑦ the day's begun", await txt(p, "#jn3Times"));
  await p.click("#journalText"); await p.keyboard.press("End"); await p.keyboard.type("追記"); await p.waitForTimeout(1800);
  const h1 = await ls(p, "jnHist");
  ok(h1 && h1["2026-11-13"]?.length === 1 && h1["2026-11-13"][0].t === "あしたは雨。", "① the one before kept", h1);
  ok((await txt(p, "#jn3Times")) === "23:30に書きはじめ・11/1421:00に最後に直しました", "⑦ last put right", await txt(p, "#jn3Times"));
  await p.click("#jn3HistBtn"); await p.waitForTimeout(200);
  ok((await txt(p, "#jn3Hist")).startsWith("前の版1つ") && (await txt(p, "#jn3Hist")).includes("23:30の版"), "① the list", await txt(p, "#jn3Hist"));
  await p.locator("#jn3Hist button", { hasText: "この版に戻す" }).click(); await p.waitForTimeout(800);
  ok((await val(p)) === "あしたは雨。" && (await entry(p, "2026-11-13")).text === "あしたは雨。", "① put back", await val(p));
  ok((await ls(p, "jnHist"))["2026-11-13"].length === 2, "① what was there kept too", await ls(p, "jnHist"));
  await undo(p); await p.waitForTimeout(400);
  ok((await val(p)) === "あしたは雨。追記", "① 元に戻す", await val(p));

  // ⑨ the part picked, made a ToDo
  await p.evaluate(() => { const t = document.getElementById("journalText"); t.focus(); t.setSelectionRange(0, 5); t.dispatchEvent(new Event("select")); });
  await p.waitForTimeout(200);
  ok(await shown(p, "#jn3Sel"), "⑨ the button shows with words picked");
  await p.click("#jn3SelTodo"); await p.waitForTimeout(500);
  const td = await ls(p, "todos");
  ok(td.length === 1 && td[0].text === "あしたは雨" && td[0].memo === "11/13の日記から" && !td[0].done, "⑨ a ToDo", td);
  await undo(p);
  ok(((await ls(p, "todos")) || []).length === 0, "⑨ 元に戻す");

  // ④ この日を送る (copied: no share sheet here)
  await p.click("#jn3Send"); await p.waitForTimeout(500);
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  ok(clip === "2026年11月13日（金）の日記\n\nあしたは雨。追記", "④ the day as words", clip);

  // ② 絵を描く: taken out (the user's call, 2026-11-19, tools/REMOVED.md): no button, no page to draw on. A picture drawn
  // before stays with the day's photos and under the field
  ok(!(await p.$("#jn3Draw")) && !(await p.$("#jn3DrawView")), "② (taken out) no 絵を描く");
  await putPicture(p, D.DAY); await p.reload(); await p.waitForTimeout(1200);
  await go(p, D.DAY); // (the day shown already: 写真と絵 below is as the page opened, drawn once the photos are read, fixed 2026-11-20)
  const ph = await photos(p);
  ok(ph.length === 1 && ph[0].jnDay === D.DAY && ph[0].draw && ph[0].type === "image/png", "② (a picture drawn before) with the day's photos", ph);
  ok((await p.locator("#jn2Photos .td-thumb").count()) === 1, "② under the field");

  // ③ 写真と絵
  ok((await txt(p, "#jn3AlbumCount")) === "1枚" && (await p.locator("#jn3Album .jn3-cell").count()) === 1, "③ in the list", await txt(p, "#jn3Album"));
  await go(p, "2026-11-13");
  await p.click("#jn3Album .jn3-cell"); await p.waitForTimeout(300);
  ok(await shown(p, "#jn2PhotoOpen"), "③ この日を開く from another day");
  await p.click("#jn2PhotoOpen"); await p.waitForTimeout(600);
  ok((await p.inputValue("#sec-journal .datenav input[type=date]")) === D.DAY, "③ opened its day");

  // ⑧ 文字の大きさと書体: taken out at the user's call (2026-11-24, tools/REMOVED.md): not under the gear; a size and face
  // chosen before not used (the letters as they are), kept on this device. ⑤ 写真ごと書き出す (この月), under the gear
  const fs0 = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById("journalText")).fontSize));
  await p.evaluate((P) => localStorage.setItem(P + "jnFont", JSON.stringify({ size: "xl", face: "serif" })), P);
  await p.reload(); await p.waitForTimeout(1200);
  const f1 = await p.evaluate(() => { const s = getComputedStyle(document.getElementById("journalText")); return { size: parseFloat(s.fontSize), face: s.fontFamily }; });
  await p.click("#jnSettings"); await p.waitForTimeout(800);
  ok(!(await p.$("#jn3FontSize")) && !(await p.$("#jn3FontFace")) && Math.abs(f1.size - fs0) < 0.1 && !/Mincho/.test(f1.face) && (await ls(p, "jnFont"))?.size === "xl", "⑧ gone: no fields, the letters as they are, what was chosen kept", [fs0, f1]);
  ok((await txt(p, "#jn3OutMonth")) === "この月（11月）", "⑤ the month named", await txt(p, "#jn3OutMonth"));
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 20000 }), p.click("#jn3OutMonth")]);
  const html = fs.readFileSync(await dl.path(), "utf8");
  ok(dl.suggestedFilename() === "nikki-2026-11.html", "⑤ its name", dl.suggestedFilename());
  ok(html.includes("<title>日記 2026年11月</title>") && (html.match(/<article>/g) || []).length === 7 && html.includes('src="data:image/jpeg') && html.includes("あしたは雨。追記"), "⑤ the days, words and the picture in it", html.length);
  ok(!html.includes("10月の日記"), "⑤ only the month");
  await p.click("#sheetDone"); await p.waitForTimeout(600);
  await p.screenshot({ path: "journal3-page.png", fullPage: true });

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails} failed` : "ALL OK");
})().catch((e) => { console.log("FAIL " + e.message); process.exit(1); });
