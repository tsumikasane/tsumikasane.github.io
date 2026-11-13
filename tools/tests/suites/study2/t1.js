// 勉強 その2 ①〜⑩, as a user would (no hook build)
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const shown = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; }, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const rec = async (p, id) => (await ls(p, "study")).find((x) => x.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(400); };
async function open(b, when) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "study"); await p.waitForTimeout(1000);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-14T21:00:00+09:00");
  await p.screenshot({ path: "study2-top.png" });

  // ② きょうの復習: 11/13's (1日後) and 11/7's (7日後), the oldest first
  const rv = await p.evaluate(() => [...document.querySelectorAll("#st2RevList li .sub")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(rv.length === 2 && rv[0].includes("11/7の勉強の7日後") && rv[1].includes("11/13の勉強の1日後") && rv[1].includes("次は3日後"), "② the day's 復習", rv);
  await p.locator("#st2RevList li", { hasText: "二次関数" }).locator("button", { hasText: "やった" }).click(); await p.waitForTimeout(500);
  ok(JSON.stringify((await rec(p, "r2")).revDone) === "[1,3,7]", "② やった: 7日後 done", await rec(p, "r2"));
  await undo(p);
  ok(JSON.stringify((await rec(p, "r2")).revDone) === "[1,3]", "② 元に戻す", await rec(p, "r2"));
  await p.locator("#st2RevList li", { hasText: "関係代名詞" }).locator("button", { hasText: "やめる" }).click(); await p.waitForTimeout(500);
  ok((await rec(p, "r1")).rev === false && (await p.locator("#st2RevList li").count()) === 1, "② やめる", await rec(p, "r1"));

  // ① 始めと終わりの時刻 → 時間; ② 復習する; kept on the record
  await p.click("#st2TimeOpen"); await p.waitForTimeout(200);
  ok(await shown(p, "#st2TimeField") && (await p.inputValue("#st2To")) === "21:00", "① opens, 終わり now");
  await p.fill("#st2From", "19:15"); await p.dispatchEvent("#st2From", "input"); await p.waitForTimeout(100);
  ok((await p.inputValue("#stMin")) === "105", "① 105 分 worked out", await p.inputValue("#stMin"));
  await p.locator("#stSubjects label, #stSubjects button", { hasText: "数学" }).first().click();
  await p.check("#st2Rev");
  await p.click("#studyForm button[type=submit]"); await p.waitForTimeout(600);
  const nw = (await ls(p, "study")).find((x) => x.date === D.DAY);
  ok(nw && nw.minutes === 105 && nw.from === "19:15" && nw.to === "21:00" && nw.rev === true, "① ② kept on the record", nw);
  ok((await txt(p, "#studyList")).includes("19:15〜21:00・復習0/4"), "① ② on its row", await txt(p, "#studyList"));
  ok(!(await shown(p, "#st2TimeField")), "① closed after");

  // ③ a day with nothing: the last day studied before it, copied
  await p.locator("#sec-study .datenav button", { hasText: "前日" }).click(); await p.waitForTimeout(500); // 11/13 has r1
  await p.locator("#sec-study .datenav button", { hasText: "前日" }).click(); await p.waitForTimeout(500); // 11/12: none
  ok(await shown(p, "#st2Copy") && (await txt(p, "#st2Copy")).includes("11月10日（火）と同じにする"), "③ offered", await txt(p, "#st2Copy"));
  await p.click("#st2Copy button"); await p.waitForTimeout(600);
  const cp = (await ls(p, "study")).filter((x) => x.date === "2026-11-12");
  ok(cp.length === 2 && cp.some((x) => x.mat === "bk" && !x.upto && x.subjectId === "en") && cp.some((x) => x.subjectId === "ma" && x.note === "問題集"), "③ both copied (not how far)", cp);
  await undo(p);
  ok(!(await ls(p, "study")).some((x) => x.date === "2026-11-12"), "③ 元に戻す");
  await p.locator("#sec-study .datenav .chip-btn", { hasText: "きょうへ" }).click(); await p.waitForTimeout(500);

  // ④ 12 weeks
  const wk = await p.evaluate(() => [...document.querySelectorAll("#st2Weeks .st-day")].map((b) => b.getAttribute("aria-label")));
  ok(wk.length === 12 && wk[11].includes("記録なし") === false, "④ 12 bars, this week's", wk);
  // ⑤ the hours: most at night
  ok((await txt(p, "#st2HourFoot")).startsWith("いちばん多いのは夜"), "⑤ 夜 the most", await txt(p, "#st2HourFoot"));
  ok((await txt(p, "#st2HourList")).includes("朝5〜11時1時間"), "⑤ 朝 from the 始め (11/10)", await txt(p, "#st2HourList"));
  // ⑥ a subject pressed: its own record
  await p.click('#stSubSeg button:has-text("これまで")'); await p.waitForTimeout(200);
  await p.click('#stSubList li[data-st2-sub="ma"]'); await p.waitForTimeout(200);
  const more = await txt(p, '#stSubList li[data-st2-sub="ma"] .st2-sub-more');
  ok(more.includes("これまで") && more.includes("二次関数") === true, "⑥ its record", more);
  await p.click('#stSubList li[data-st2-sub="ma"] .st-row-top'); await p.waitForTimeout(200);
  ok(!(await p.$('#stSubList .st2-sub-more')), "⑥ pressed again: shut");
  // ⑦ 試験の結果
  const res = await txt(p, "#st2ResList");
  ok(res.startsWith("中間70%") && res.includes("前回（小テスト）より+10ポイント"), "⑦ 中間 70%, against 小テスト", res);
  await p.fill('#st2ResList input[aria-label="「中間」の点数"]', "85"); await p.dispatchEvent('#st2ResList input[aria-label="「中間」の点数"]', "change"); await p.waitForTimeout(300);
  await p.click("#st2Share"); await p.waitForTimeout(400); // (focus out)
  ok((await setting(p, "studyExams")).list.find((e) => e.id === "ex1").score === 85, "⑦ 点数 kept", await setting(p, "studyExams"));
  ok((await txt(p, "#st2ResList")).startsWith("中間85%"), "⑦ shown", await txt(p, "#st2ResList"));
  // ⑧ the 教材's pace: 40 pages in 29 days, 80 to go → 58 days → 1/11, after 期末 12/10
  ok((await txt(p, "#stMatList")).includes("このペースだと1/11ごろ終わり（期末の12/10には間に合いません）"), "⑧ its pace", await txt(p, "#stMatList"));
  // ⑩ the week in words (copied: no share in the test browser)
  await p.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await p.click("#st2Share"); await p.waitForTimeout(400);
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  ok(clip.startsWith("11/8〜11/14の勉強\n合計") && flat(clip).includes("・数学2時間45分") && clip.includes("試験：期末まであと26日"), "⑩ the week in words", clip);

  // ⑨ the お知らせ under the gear
  await p.click("#studySettings"); await p.waitForTimeout(800);
  await p.click("#st2RevOn"); await p.waitForTimeout(200);
  await p.fill("#st2RevAt", "08:00"); await p.dispatchEvent("#st2RevAt", "change"); await p.waitForTimeout(200);
  await p.click("#st2RemOn"); await p.waitForTimeout(200);
  const r = await setting(p, "studyRemind");
  ok(r && r.on === true && r.rev === true && r.revAt === "08:00" && r.at === "20:00", "⑨ kept", r);
  ok((await txt(p, "#st2RemFoot")).length > 5, "⑨ its foot", await txt(p, "#st2RemFoot"));
  await p.click("#sheetDone"); await p.waitForTimeout(600);
  await p.screenshot({ path: "study2-cards.png", fullPage: true });

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails} failed` : "ALL OK");
})().catch((e) => { console.log("FAIL " + e.message); process.exit(1); });
