// 日記 ①〜⑩, as a user would (no hook build)
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const shown = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; }, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const jn = async (p, d) => (await ls(p, "journal")).find((j) => j.id === d);
const chip = (p, sel, words) => p.locator(sel + " button", { hasText: words }).first();
async function open(b, when) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "journal"); await p.waitForTimeout(1000);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-13T20:00:00+09:00");
  await p.screenshot({ path: "journal1-top.png" });

  // ① きょうの問いかけ: shown, ほかの問い changes it, 書く puts it in
  ok(await shown(p, "#jnAsk"), "① the day's question shows");
  const q1 = await txt(p, "#jnAsk .jn-ask-q");
  ok(q1.startsWith("きょうの問いかけ") && q1.length > 10, "① it says きょうの問いかけ", q1);
  await chip(p, "#jnAsk", "ほかの問い").click(); await p.waitForTimeout(200);
  const q2 = await txt(p, "#jnAsk .jn-ask-q");
  ok(q2 !== q1, "① ほかの問い: another", [q1, q2]);
  await chip(p, "#jnAsk", "書く").click(); await p.waitForTimeout(1600);
  const v1 = await p.inputValue("#journalText");
  ok(/^【.+？】\n?$/.test(v1), "① 書く: the question in the field", v1);
  ok((await jn(p, D.DAY))?.text?.startsWith("【"), "① saved as typed", await jn(p, D.DAY));

  // ② いまの時刻: at the caret
  await p.click("#journalText"); await p.keyboard.press("End"); await p.keyboard.type("カフェで");
  await chip(p, "#jnTools", "いまの時刻").click(); await p.waitForTimeout(200);
  ok((await p.inputValue("#journalText")).endsWith("カフェで20:00 "), "② the time at the caret", await p.inputValue("#journalText"));

  // ⑤ the letters, written as typed
  const n = [...(await p.inputValue("#journalText")).trim()].length;
  ok((await txt(p, "#jnCount")) === `・${n}字`, "⑤ the letters", await txt(p, "#jnCount"));
  // ⑤ the days in a row: 11/9〜11/13 (today written now)
  await p.waitForTimeout(1500);
  const sk = await txt(p, "#jnStreak");
  ok(sk.includes("5日続けて書いています") && sk.includes("今月6日") && sk.includes("これまで9日") && sk.includes("最長5日"), "⑤ run, month, all, longest", sk);

  // ⑥ #タグ: typed one shows under the field; the card counts them, one pressed lists its days
  await p.keyboard.type(" #大学");
  await p.waitForTimeout(300);
  ok((await txt(p, "#jnTags")) === "#大学", "⑥ the entry's tag under the field", await txt(p, "#jnTags"));
  await p.waitForTimeout(1500);
  const all = await p.evaluate(() => [...document.querySelectorAll("#jnTagAll .jn-tag")].map((b) => b.innerText.replace(/\s+/g, "")));
  ok(all[0] === "#大学3" && all.includes("#旅行2") && all.includes("#カフェ2") && all.includes("#友だち1"), "⑥ every tag with its count, the most first", all);
  await p.locator("#jnTagAll .jn-tag", { hasText: "旅行" }).click(); await p.waitForTimeout(300);
  const hits = await p.evaluate(() => [...document.querySelectorAll("#jnTagList .jn-snip")].map((x) => x.textContent));
  ok(hits.length === 2 && hits[0].startsWith("1か月前") && hits[1].startsWith("1年前"), "⑥ #旅行's days, the latest first", hits);

  // ④ その日の記録を入れる, with 元に戻す
  const before = await p.inputValue("#journalText");
  await chip(p, "#jnTools", "その日の記録").click(); await p.waitForTimeout(300);
  const v4 = await p.inputValue("#journalText");
  for (const w of ["― この日の記録 ―", "予定：10:00 ゼミ", "勉強：1時間 30分（英語）", "運動：", "食事：トースト、カレーライス（1,050 kcal）", "体重：60.2 kg", "ルーティーン：ストレッチ", "家計簿：支出 1,200 円"])
    ok(flat(v4).includes(flat(w)), "④ " + w, v4);
  await p.locator("#status button:visible").first().click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#journalText")) === before, "④ 元に戻す");

  // ③ テンプレート: none yet opens the gear at it; 例を入れる, then it goes in
  await chip(p, "#jnTools", "テンプレートを作る").click(); await p.waitForTimeout(800);
  ok(await shown(p, "#jnSetGroup") && (await p.evaluate(() => document.activeElement?.id)) === "jnTpl", "③ the gear opens at テンプレート");
  await p.click("#jnTplSample"); await p.waitForTimeout(300);
  ok((await ls(p, "settings")).find((s) => s.id === "jnTemplate")?.text.startsWith("よかったこと："), "③ 例を入れる: kept", await ls(p, "settings"));
  // ⑨ the reminder: on, its time
  await p.click("#jnRemindOn"); await p.waitForTimeout(300);
  await p.fill("#jnRemindAt", "22:15"); await p.dispatchEvent("#jnRemindAt", "change"); await p.waitForTimeout(300);
  const rm = (await ls(p, "settings")).find((s) => s.id === "jnRemind");
  ok(rm?.on === true && rm.at === "22:15", "⑨ on at 22:15", rm);
  ok((await txt(p, "#jnRemindFoot")).length > 5, "⑨ its foot says", await txt(p, "#jnRemindFoot"));
  // ① the questions off
  await p.click("#jnAskOn"); await p.waitForTimeout(300);
  await p.click("#sheetDone"); await p.waitForTimeout(800);
  ok(!(await shown(p, "#jnAsk")), "① turned off: gone");
  await chip(p, "#jnTools", "テンプレート").click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#journalText")).includes("よかったこと：\nがんばったこと：\nあしたやりたいこと：\n"), "③ テンプレート put in", await p.inputValue("#journalText"));

  // ⑦ 読み返す: a week ago is none; a month ago and a year ago; ⑩ ランダムに1日読む
  const back = await p.evaluate(() => [...document.querySelectorAll("#jnBack .jn-back-head strong")].map((x) => x.textContent));
  ok(back.join() === "1か月前,1年前", "⑦ 1か月前 and 1年前", back);
  await chip(p, "#jnBack", "ランダムに1日読む").click(); await p.waitForTimeout(300);
  const pick = await p.evaluate(() => [...document.querySelectorAll("#jnBack li")].pop()?.querySelector("strong")?.textContent);
  ok(pick === "思い出す", "⑩ a day picked", pick);
  await chip(p, "#jnBack", "ほかの日").click(); await p.waitForTimeout(200);
  await p.locator("#jnBack li").filter({ has: p.locator("strong", { hasText: /^1年前$/ }) }).locator("button", { hasText: "この日を開く" }).click(); await p.waitForTimeout(800);
  ok((await p.inputValue("#sec-journal .datenav input[type=date]")) === "2025-11-13" && (await p.inputValue("#journalText")).startsWith("1年前の日記"), "⑦ この日を開く: that day");

  // ⑧ 日記カレンダー: back to today, the month's days by letters; pressed, that day
  await p.locator("#sec-journal .datenav .chip-btn", { hasText: "きょうへ" }).click(); await p.waitForTimeout(800);
  const cal = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("#jnCal button.jnc-d")].map((b) => [b.querySelector(".dn").textContent, b.className.match(/lv\d/)[0]])));
  ok(cal["12"] === "lv4" && cal["11"] === "lv1" && cal["2"] === "lv0" && cal["13"] !== "lv0", "⑧ the days by how much was written", cal);
  ok((await txt(p, "#jnCalKey")).includes("書いた日6日"), "⑧ the month's days", await txt(p, "#jnCalKey"));
  await p.locator("#jnCal button.jnc-d", { hasText: /^\s*10/ }).first().click(); await p.waitForTimeout(800);
  ok((await p.inputValue("#journalText")).startsWith("友だちとカフェへ"), "⑧ pressed: that day", await p.inputValue("#journalText"));
  await p.click("#jnCalNav [aria-label=前の月]"); await p.waitForTimeout(200);
  ok((await txt(p, "#jnCalNav")).includes("2026年10月"), "⑧ ‹: the month before", await txt(p, "#jnCalNav"));
  await p.screenshot({ path: "journal1-cards.png", fullPage: true });

  // ⑨ the alarms: today's while it isn't written, then not (another day, today written)
  await p.close();
  const q = await open(b, "2026-11-13T20:00:00+09:00");
  await q.evaluate((P) => { const s = JSON.parse(localStorage.getItem(P + "settings") || "[]"); s.push({ id: "jnRemind", on: true, at: "21:30", updatedAt: 1 }); localStorage.setItem(P + "settings", JSON.stringify(s)); }, P);
  await q.reload(); await q.waitForTimeout(1200);
  ok(await q.evaluate(() => typeof window.__jnAlarms === "undefined"), "(no hook)");
  await q.fill("#journalText", "きょうも書いた"); await q.dispatchEvent("#journalText", "input"); await q.waitForTimeout(1800);
  ok((await jn(q, D.DAY))?.text === "きょうも書いた", "⑨ (today written)");

  const errs = [...p.errs, ...q.errs];
  ok(!errs.length, "no errors", errs);
  await b.close();
  console.log(fails ? `FAIL ${fails} failed` : "ALL OK");
})().catch((e) => { console.log("FAIL " + e.message); process.exit(1); });
