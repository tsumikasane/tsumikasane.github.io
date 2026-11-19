// きょう その4 ①〜⑩, through the hook build at 8802 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8802/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s  ]+/g, "");
const tileTxt = (p, k) => p.evaluate((k) => document.querySelector(`.tile[data-tile="${k}"]`)?.innerText ?? null, k).then(flat);
const H = (p, f, ...a) => p.evaluate(({ f, a }) => window.__h4[f](...a), { f, a });
const lsOf = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setOf = async (p, id) => (await lsOf(p, "settings")).find((x) => x.id === id);
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(500); };
async function open(b, when) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  // (the phone's voice: what it would say, kept)
  await p.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speaking: false, cancel() {}, getVoices: () => [], speak(u) { window.__spoken = u.text; } } });
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  });
  await seed(p, D.all(), "home"); await p.waitForTimeout(1000);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, "2026-11-14T07:30:00+09:00");
  const keys = await p.$$eval("#homeTiles > .tile", (l) => l.map((t) => t.dataset.tile));
  ok(["h4week", "h4mood", "h4sleep", "h4watch", "h4breath", "h4memo"].every((k) => keys.includes(k)), "the new tiles on きょう", keys);

  // ①② すぐに記録 (its line and its buttons) was taken out (the user's call, 2026-11-19): no tile, nothing for it in the gear's sheet
  ok(!keys.includes("quick") && !(await p.$("#h4LineIn")), "①② no すぐに記録 (taken out)", keys);
  await p.click("#homeSettings"); await p.waitForTimeout(700);
  ok(!(await p.$("#h4QkPick")) && !!(await p.$("#h4Set")) && !!(await p.$("#h5Set")), "② no すぐに記録のボタン (taken out), その5's part still after its place");
  // ⑤ the season was taken out (the user's call, 2026-11-16): no switch for it
  ok(!(await p.$("#h4KoyomiOn")) && !(await p.textContent("#h4Set")).includes("暦"), "⑤ no 暦 switch (taken out)");
  await p.screenshot({ path: out + "/h4-settings.png" });
  await p.click("#sheetCancel").catch(() => {}); await p.keyboard.press("Escape"); await p.waitForTimeout(600);

  // ③ mood
  await p.click('.h4-face[data-mood="4"]'); await p.waitForTimeout(300);
  ok((await setOf(p, "h4mood"))?.days?.[D.DAY] === 4 && (await p.getAttribute('.h4-face[data-mood="4"]', "aria-pressed")) === "true" && !!(await p.$('.tile[data-tile="h4mood"].h2-done')), "③ picked, kept, the tile done");
  await p.click('.h4-face[data-mood="4"]'); await p.waitForTimeout(300);
  ok(!(await setOf(p, "h4mood"))?.days?.[D.DAY], "③ pressed again: none");
  await p.click('.h4-face[data-mood="5"]'); await p.waitForTimeout(300);

  // ④ memo
  await p.click(".h4-memo-write"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.activeElement?.id) === "h4MemoIn", "④ the field ready to type in");
  await p.fill("#h4MemoIn", "牛乳\nたまご"); await p.click(".h4-memo-save"); await p.waitForTimeout(400);
  ok((await setOf(p, "h4memo"))?.text === "牛乳\nたまご" && (await tileTxt(p, "h4memo")).startsWith("メモ牛乳たまご"), "④ kept and shown", await tileTxt(p, "h4memo"));
  await p.click(".h4-memo-clear"); await p.waitForTimeout(300);
  ok(!(await setOf(p, "h4memo")), "④ cleared");
  await undo(p);
  ok((await setOf(p, "h4memo"))?.text === "牛乳\nたまご", "④ 元に戻す");

  // ⑤ the season was taken out (the user's call, 2026-11-16): nothing of it under the date
  ok(!(await p.$("#h4Koyomi")) && !(await p.evaluate(() => document.getElementById("sec-home").innerText.includes("二十四節気"))), "⑤ no 暦 under the date (taken out)");

  // ⑥ stopwatch: はかる, 25 minutes on, 止める, to 勉強's form
  await p.click(".h4-start"); await p.waitForTimeout(300);
  ok((await tileTxt(p, "h4watch")).startsWith("時間をはかる0:00") && (await lsOf(p, "h4watch")).start > 0, "⑥ started (this device)", await tileTxt(p, "h4watch"));
  await p.clock.setFixedTime(new Date("2026-11-14T07:55:10+09:00")); await p.waitForTimeout(1300);
  ok((await tileTxt(p, "h4watch")).startsWith("時間をはかる25:10"), "⑥ the time going", await tileTxt(p, "h4watch"));
  await p.click(".h4-stop"); await p.waitForTimeout(300);
  ok((await tileTxt(p, "h4watch")).startsWith("時間をはかる25分"), "⑥ stopped: 25 minutes", await tileTxt(p, "h4watch"));
  await p.click(".h4-to-study"); await p.waitForTimeout(800);
  ok((await p.textContent("#sheetTitle")) === "勉強を記録" && (await p.inputValue("#reMin")) === "25", "⑥ 勉強's form with its minutes");
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  ok((await tileTxt(p, "h4watch")).startsWith("時間をはかる0:00"), "⑥ ready again");
  // too short
  await p.click(".h4-start"); await p.waitForTimeout(200); await p.click(".h4-stop"); await p.waitForTimeout(300);
  ok((await tileTxt(p, "h4watch")).startsWith("時間をはかる0:00") && !(await p.evaluate((P) => localStorage.getItem(P + "h4watch"), P)), "⑥ under 30 seconds: nothing kept");

  // ⑦ a minute's breathing
  await p.clock.setFixedTime(new Date("2026-11-14T08:00:00+09:00"));
  await p.click(".h4-breathe"); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById("h4Breath")?.open) && flat(await p.textContent("#h4BreathSay")) === "ゆっくりすって…", "⑦ open: breathe in");
  await p.clock.setFixedTime(new Date("2026-11-14T08:00:05+09:00")); await p.waitForTimeout(400);
  ok(flat(await p.textContent("#h4BreathSay")) === "ゆっくりはいて…" && flat(await p.textContent("#h4BreathLeft")) === "あと55秒", "⑦ then out");
  await p.screenshot({ path: out + "/h4-breath.png" });
  await p.clock.setFixedTime(new Date("2026-11-14T08:01:01+09:00")); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.getElementById("h4Breath").open)) && (await setOf(p, "h4breath"))?.days?.[D.DAY] === 1 && (await tileTxt(p, "h4breath")).startsWith("ひと息1回"), "⑦ a minute on: closed, counted", await tileTxt(p, "h4breath"));
  await p.click(".h4-breathe"); await p.waitForTimeout(300); await p.click("#h4BreathStop"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.getElementById("h4Breath").open)) && (await setOf(p, "h4breath"))?.days?.[D.DAY] === 1, "⑦ やめる: not counted");

  // ⑧ the week ahead
  const days = await p.$$eval(".h4-day", (l) => l.map((x) => [x.querySelector(".h4-dl").textContent, x.querySelector(".h4-date").textContent, x.querySelector(".h4-n").textContent, x.querySelectorAll(".h4-s")[0].textContent].join("|")));
  ok(days.length === 7 && days[0] === "きょう|14|1|" && days[1] === "あした|15|1|1" && days[2] === "月|16|−|" && days[3] === "火|17|1|" && days[6] === "金|20|−|", "⑧ seven days: plans, a ToDo tomorrow", days);
  ok(await p.$eval('.h4-day[data-day="2026-11-16"] .h4-job .icon', () => true).catch(() => false) && (await p.getAttribute('.h4-day[data-day="2026-11-16"]', "aria-label")).includes("バイト"), "⑧ バイト on Monday");
  ok((await p.getAttribute('.h4-day[data-day="2026-11-15"]', "aria-label")) === "あした、11月15日（日）、予定 1件、ToDo 1件", "⑧ read out", await p.getAttribute('.h4-day[data-day="2026-11-15"]', "aria-label"));

  // ⑨ read aloud was taken out (the user's call, 2026-11-16): no button, nor its switch
  ok(!(await p.$("#h4Speak")) && !(await p.evaluate(() => document.getElementById("sec-home").innerText.includes("読み上げる"))), "⑨ no きょうを読み上げる (taken out)");

  // ⑩ おはよう in the morning: from last night's 23:30
  ok((await tileTxt(p, "h4sleep")).startsWith("睡眠まだゆうべ23:30→−"), "⑩ before", await tileTxt(p, "h4sleep"));
  await p.clock.setFixedTime(new Date("2026-11-14T07:45:00+09:00"));
  await p.click(".h4-wake"); await p.waitForTimeout(400);
  const bd = (await lsOf(p, "bodyDays")).find((x) => x.id === D.DAY);
  ok(bd && bd.wake === "07:45" && bd.bed === "23:30" && bd.water === 200, "⑩ wake into からだ's record, the rest kept", bd);
  ok((await tileTxt(p, "h4sleep")).startsWith("睡眠8時間15分ゆうべ23:30→07:45") && !!(await p.$('.tile[data-tile="h4sleep"].h2-done')), "⑩ last night's hours", await tileTxt(p, "h4sleep"));
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: out + "/h4-home.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();

  // the evening: おやすみ goes to tomorrow's record; the week's day pressed opens カレンダー there
  p = await open(b, "2026-11-14T22:40:00+09:00");
  await p.click(".h4-bed"); await p.waitForTimeout(400);
  const bt = (await lsOf(p, "bodyDays")).find((x) => x.id === "2026-11-15");
  ok(bt && bt.bed === "22:40" && bt.date === "2026-11-15", "⑩ おやすみ: tomorrow's bed", bt);
  ok((await tileTxt(p, "h4sleep")).includes("おやすみ22:40を記録しました"), "⑩ said on the tile", await tileTxt(p, "h4sleep"));
  ok(!(await p.$(".h4-wake")), "⑩ no おはよう at night");
  // (pressed where it is: not under the tile's own head, which opens カレンダー as a whole)
  const top = await p.$eval('.h4-day[data-day="2026-11-17"]', (b) => { b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!x && b.contains(x); });
  ok(top, "⑧ a day's button is on top where it is pressed");
  await p.click('.h4-day[data-day="2026-11-17"]'); await p.waitForTimeout(700);
  ok((await H(p, "tab")) === "calendar" && (await H(p, "calDay")) === "2026-11-17", "⑧ a day pressed: カレンダー at it");
  await p.emulateMedia({ colorScheme: "dark" }); await p.goto(process.env.URL0 + "#home"); await p.waitForTimeout(900);
  await p.screenshot({ path: out + "/h4-dark.png", fullPage: true });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no sideways scroll");
  ok(!p.errs.length, "no page errors (evening)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
