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

  // ① きょうの問いかけ: taken out (the user's call, 2026-11-19, tools/REMOVED.md): no card, no ほかの問い nor 書く. Today
  // written by hand instead, to go on with
  ok(!(await p.$("#jnAsk")) && !(await p.locator("#sec-journal button", { hasText: "ほかの問い" }).count()), "① (taken out) no きょうの問いかけ");
  await p.click("#journalText"); await p.keyboard.type("カフェで"); await p.waitForTimeout(1600);
  ok((await jn(p, D.DAY))?.text === "カフェで", "(today written by hand: saved as typed)", await jn(p, D.DAY));

  // ② いまの時刻: taken out (the user's call, 2026-11-19)
  ok(!(await chip(p, "#jnTools", "いまの時刻").count()), "② (taken out) no いまの時刻");

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

  // ④ その日の記録を入れる: taken out (the user's call, 2026-11-19)
  ok(!(await chip(p, "#jnTools", "その日の記録").count()), "④ (taken out) no その日の記録を入れる");

  // ③ テンプレート: none yet opens the gear at it; put in there by hand (its 例を入れる taken out, 2026-11-19: no example
  // in a field), then it goes in
  await chip(p, "#jnTools", "テンプレートを作る").click(); await p.waitForTimeout(800);
  ok(await shown(p, "#jnSetGroup") && (await p.evaluate(() => document.activeElement?.id)) === "jnTpl", "③ the gear opens at テンプレート");
  ok(!(await p.$("#jnTplSample")), "③ (taken out) no 例を入れる");
  await p.fill("#jnTpl", "よかったこと：\nがんばったこと：\nあしたやりたいこと：\n"); await p.dispatchEvent("#jnTpl", "change"); await p.waitForTimeout(300);
  ok((await ls(p, "settings")).find((s) => s.id === "jnTemplate")?.text.startsWith("よかったこと："), "③ kept", await ls(p, "settings"));
  // ⑨ 書く時間のお知らせ: in つみかさね's 毎日の記録のお知らせ since 2026-11-23 (the user's call; suites/recremind): none here
  ok(!(await p.$("#jnRemindOn, #jnRemindAt")) && !(await txt(p, "#jnSetGroup")).includes("書く時間のお知らせ"), "⑨ (in 毎日の記録のお知らせ) no 書く時間のお知らせ here");
  // ①'s switch: taken out with it
  ok(!(await p.$("#jnAskOn")), "① (taken out) no switch for the questions");
  await p.click("#sheetDone"); await p.waitForTimeout(800);
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

  // ⑧ 日記カレンダー: back to today, the days written all in one colour (the user's call, 2026-11-19: no steps by
  // letters any more); pressed, that day
  await p.locator("#sec-journal .datenav .chip-btn", { hasText: "きょうへ" }).click(); await p.waitForTimeout(800);
  const cal = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("#jnCal button.jnc-d")].map((b) => [b.querySelector(".dn").textContent, (b.classList.contains("wrote") ? "wrote" : "-") + (/\blv\d/.test(b.className) ? "+lv" : "")])));
  ok(cal["12"] === "wrote" && cal["11"] === "wrote" && cal["2"] === "-" && cal["13"] === "wrote", "⑧ the days written, in one colour (no steps)", cal);
  ok((await txt(p, "#jnCalKey")).includes("書いた日6日"), "⑧ the month's days", await txt(p, "#jnCalKey"));
  await p.locator("#jnCal button.jnc-d", { hasText: /^\s*10/ }).first().click(); await p.waitForTimeout(800);
  ok((await p.inputValue("#journalText")).startsWith("友だちとカフェへ"), "⑧ pressed: that day", await p.inputValue("#journalText"));
  await p.click("#jnCalNav [aria-label=前の月]"); await p.waitForTimeout(200);
  ok((await txt(p, "#jnCalNav")).includes("2026年10月"), "⑧ ‹: the month before", await txt(p, "#jnCalNav"));
  await p.screenshot({ path: "journal1-cards.png", fullPage: true });

  // ⑨ (its alarms: 毎日の記録のお知らせ's since 2026-11-23, suites/recremind) a 日記 written today, its old setting kept
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
