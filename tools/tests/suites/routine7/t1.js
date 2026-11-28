// ルーティーン その7 ①〜⑩, through the hook build at 8771 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8771/";
const fs = require("fs");
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const shown = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; }, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const day = async (p, d = D.DAY) => (await ls(p, "routineDays")).find((x) => x.id === d) || { done: [] };
const item = async (p, id) => (await ls(p, "routines")).find((x) => x.id === id);
const row = (p, id) => p.locator(`#rtList li[data-rt="${id}"]`);
const rowText = async (p, id) => flat(await row(p, id).innerText());
const toast = (p) => p.evaluate(() => [document.querySelector("#status"), document.querySelector("#sheetStatus")].filter((x) => x?.classList.contains("show")).map((x) => x.innerText).join("")).then(flat);
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(400); };
const isOpen = (p, id) => p.evaluate((id) => !!document.getElementById(id)?.open, id);
const goDay = async (p, d) => { await p.fill("#sec-routine .datenav input[type=date]", d); await p.waitForTimeout(500); };
const hold = async (p, id) => {
  const l = row(p, id).locator(".check").first(); await l.scrollIntoViewIfNeeded();
  const bx = await l.boundingBox();
  await l.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true, pointerId: 9, clientX: bx.x + 4, clientY: bx.y + 4 });
  await p.waitForTimeout(650);
};
const menu = (p) => p.evaluate(() => [...document.querySelectorAll("#rt6MenuGroup .ask-btn")].map((b) => b.textContent).join(","));
async function open(b, data, hm = "09:00") {
  const p = await phone(b, new Date(`${D.DAY}T${hm}:00+09:00`), { deviceScaleFactor: 1, acceptDownloads: true });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, data, "routine"); await p.waitForTimeout(1000);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, D.all());
  await p.screenshot({ path: "routine7-top.png" });

  // ⑦ 先月のまとめ (the month's first week): October against September
  ok((await txt(p, "#rt7RecapCard")) === flat("2026年10月のまとめ 達成率 72%（9月から +5） ぜんぶできた日 11日 よくできた項目：歩く 30/30日 伸びた項目：英語 +20% お休み 1日 やめる習慣：夜ふかし 30日 文字で送る とじる"), "⑦ last month in short", await txt(p, "#rt7RecapCard"));
  await p.click("#rt7RecapCard button:has-text('とじる')"); await p.waitForTimeout(300);
  ok(!(await shown(p, "#rt7RecapCard")) && await p.evaluate((P) => localStorage.getItem(P + "rt7RecapShut") === "2026-10", P), "⑦ とじる: put away for October");
  await p.locator("#rt7RecapRow button").scrollIntoViewIfNeeded();
  ok(await shown(p, "#rt7RecapRow"), "⑦ 先月のまとめを見る under 月ごとの達成率");
  await p.click("#rt7RecapRow button"); await p.waitForTimeout(500);
  ok(await shown(p, "#rt7RecapCard") && !(await shown(p, "#rt7RecapRow")), "⑦ there again");

  // ⑧ 浮いたお金: 300 円 a day, 33 days kept (10/1〜11/3 but 10/15)
  ok((await txt(p, "#rt6QuitList .rt-sub")).endsWith("浮いたお金9,900円") && (await txt(p, ".rt7-yen-btn")) === "1日300円", "⑧ 9,900 円", await txt(p, "#rt6QuitList .rt-sub"));
  await p.click(".rt7-yen-btn"); await p.waitForTimeout(300);
  ok(await isOpen(p, "rt7YenAsk") && (await p.inputValue("#rt7YenIn")) === "300", "⑧ its ask, with 300");
  await p.fill("#rt7YenIn", "500"); await p.press("#rt7YenIn", "Enter"); await p.waitForTimeout(300);
  ok((await item(p, "q1")).yen === 500 && (await txt(p, "#rt6QuitList .rt-sub")).endsWith("浮いたお金16,500円") && (await toast(p)).includes("「夜ふかし」は1日500円で数えます"), "⑧ 500 円: 16,500 円", await txt(p, "#rt6QuitList .rt-sub"));
  await undo(p);
  ok((await item(p, "q1")).yen === 300, "⑧ 元に戻す");

  // ② 数を入れる: 歩く 5,200 / 8,000 歩 (its ring says 5k)
  ok((await rowText(p, "r4")).startsWith("5k5,200/8,000歩") && (await p.evaluate(() => document.querySelector('#rtList li[data-rt="r4"] .rt-ring-n').textContent)) === "5k", "② a big count, its ring short", await rowText(p, "r4"));
  await row(p, "r4").locator(".rt7-count").click(); await p.waitForTimeout(300);
  ok(await isOpen(p, "rt7CountAsk") && (await p.inputValue("#rt7CountIn")) === "5200" && (await txt(p, "#rt7CountTitle")) === "「歩く」のきょうの数（8,000歩でチェック）", "② its ask", await txt(p, "#rt7CountTitle"));
  await p.click("#rt7CountAsk .chip-btn:has-text('+100')"); await p.waitForTimeout(100);
  ok((await p.inputValue("#rt7CountIn")) === "5300", "② +100 on the field");
  await p.fill("#rt7CountIn", "8000"); await p.click("#rt7CountAsk .ask-go"); await p.waitForTimeout(400);
  let dd = await day(p);
  ok(dd.counts.r4 === 8000 && dd.done.includes("r4") && (await toast(p)).startsWith("「歩く」を8,000歩にしました"), "② 8,000: checked", { c: dd.counts, t: await toast(p) });
  await undo(p);
  dd = await day(p);
  ok(dd.counts.r4 === 5200 && !dd.done.includes("r4"), "② 元に戻す", dd);
  await hold(p, "r4");
  ok((await menu(p)).includes("数を入れる"), "② in its 長押し menu too", await menu(p));
  await p.click("#rt6MenuNo"); await p.waitForTimeout(300);

  // ⑨ 表で書き出す: November, a day a row and an item a column
  let [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }), p.click("#rt7CsvBtn")]);
  let lines = fs.readFileSync(await dl.path(), "utf8").replace(/^﻿/, "").trim().split("\r\n");
  ok(dl.suggestedFilename() === "tsumikasane-routine-2026-11.csv" && lines.join("|") === "日付,曜日,お休み,ストレッチ,日記を書く,英語,歩く,ぜんぶ|2026-11-01,日,,✓,✓,,8500,|2026-11-02,月,,,,✓,8500,|2026-11-03,火,,✓,,,5200,", "⑨ the month's table", { f: dl.suggestedFilename(), lines });
  [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }), p.click("#rt7CsvAll")]);
  lines = fs.readFileSync(await dl.path(), "utf8").replace(/^﻿/, "").trim().split("\r\n");
  ok(dl.suggestedFilename() === "tsumikasane-routine-2026-09-01_2026-11-03.csv" && lines.length === 65 && lines.includes("2026-10-10,土,休,,,,,") && lines[1] === "2026-09-01,火,,✓,✓,✓,8500,✓", "⑨ all of it (お休み said)", { f: dl.suggestedFilename(), n: lines.length, l1: lines[1] });

  // ⑥ この7日とその前の7日
  const two = await p.evaluate(() => [...document.querySelectorAll("#rt7Two li")].map((li) => li.innerText.replace(/\s+/g, "")));
  ok((await txt(p, "#rt7TwoSum")) === "この7日72%（その前68%）" && two.join("|") === "ストレッチその前4/7日→この7日5/7日+14|日記を書くその前4/7日→この7日4/6日+10|英語その前4/7日→この7日3/6日−7|歩くその前7/7日→この7日6/6日±0", "⑥ each, with the change", two);

  // ⑤ いっしょにできている項目: ストレッチ and 日記 on the same days
  ok((await txt(p, "#rt7Pairs")) === "「ストレッチ」をした日は、「日記を書く」も100%しなかった日は0%+100" && JSON.stringify(await p.evaluate(() => window.__rt7.pairs())) === JSON.stringify([["ストレッチ", "日記を書く", 100, 0]]), "⑤ the pair, once", await txt(p, "#rt7Pairs"));

  // ⑩ バッジ: those there kept without a word (no day), the next of each kind
  const facts = await p.evaluate(() => window.__rt7.facts());
  ok(JSON.stringify(facts) === JSON.stringify({ best: 62, total: 172, alls: 21, months: 0, quit: 19 }), "⑩ what they come from", facts);
  const got = (await ls(p, "settings")).find((x) => x.id === "rtBadges")?.got || {};
  ok(Object.keys(got).sort().join() === "a1,a10,c10,c100,q7,s14,s3,s30,s7" && Object.values(got).every((v) => v === "before"), "⑩ those got before: kept, no day", got);
  const bs = await p.evaluate(() => [...document.querySelectorAll("#rt7Badges li")].map((li) => (li.classList.contains("off") ? "-" : "+") + li.innerText.replace(/\s+/g, "")));
  ok((await txt(p, "#rt7BadgesSum")) === "9/19" && bs.join("|") === "+🔥3日連続もらった|+🔥7日連続もらった|+🔥14日連続もらった|+🔥30日連続もらった|-🔥66日連続あと4日|+⭐はじめてのぜんぶもらった|+⭐ぜんぶ10日もらった|-⭐ぜんぶ30日あと9日|+✅チェック10回もらった|+✅チェック100回もらった|-✅チェック500回あと328回|+🛡️やめて7日もらった|-🛡️やめて30日あと11日|-🏆パーフェクトな月ひと月ぜんぶ", "⑩ the card", bs);

  // ① できなかった理由: きのう's ストレッチ, from きのうのチェック忘れ
  const yd = () => p.evaluate(() => [...document.querySelectorAll("#rt3YdayCard li .body")].map((x) => x.textContent).join(","));
  ok((await yd()) === "ストレッチ,日記を書く", "① きのう's still to do", await yd());
  await p.locator("#rt3YdayCard li", { hasText: "ストレッチ" }).locator("button", { hasText: "できなかった" }).click(); await p.waitForTimeout(300);
  ok(await isOpen(p, "rt7WhyAsk") && (await txt(p, "#rt7WhyTitle")) === "「ストレッチ」がきのうできなかった理由" && (await p.evaluate(() => [...document.querySelectorAll("#rt7WhyGroup .ask-btn")].map((x) => x.textContent).join(","))) === "忘れた,忙しかった,体調がわるかった,気分がのらなかった,出かけていた,そのほか", "① its reasons");
  await p.click("#rt7WhyGroup .ask-btn:has-text('忙しかった')"); await p.waitForTimeout(400);
  ok((await item(p, "r1")).why?.["2026-11-02"] === "busy" && (await yd()) === "日記を書く" && (await toast(p)).includes("「ストレッチ」がきのうできなかった理由を「忙しかった」にしました"), "① given: put away from the card", await yd());
  ok(flat(await p.locator("#rtStats li.rt-stat", { hasText: "ストレッチ" }).innerText()).includes("できなかった理由（90日）：忙しかった1回"), "① in 項目ごとの記録");
  await goDay(p, "2026-11-02");
  ok((await rowText(p, "r1")).includes("理由：忙しかった") && (await rowText(p, "r2")).includes("理由"), "① said under its row that day; 理由 for another", [await rowText(p, "r1"), await rowText(p, "r2")]);
  await row(p, "r2").locator(".rt7-why-add").click(); await p.waitForTimeout(300);
  await p.click("#rt7WhyGroup .ask-btn:has-text('忘れた')"); await p.waitForTimeout(300);
  ok((await rowText(p, "r2")).includes("理由：忘れた"), "① 理由 from a day gone by's row");
  await undo(p);
  ok(!(await item(p, "r2")).why, "① 元に戻す");
  await row(p, "r1").locator(".rt7-why").click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector("#rt7WhyGroup .rt7-cur")?.textContent === "忙しかった") && await shown(p, "#rt7WhyGroup .ask-btn.danger"), "① its own marked; 理由を消す");
  await p.click("#rt7WhyGroup .ask-btn.danger"); await p.waitForTimeout(300);
  ok(!(await item(p, "r1")).why && !(await rowText(p, "r1")).includes("理由："), "① 理由を消す");
  await row(p, "r1").locator(".check").click(); await p.waitForTimeout(300);
  ok(!(await rowText(p, "r1")).includes("理由"), "① none once done");
  await goDay(p, D.DAY);
  await hold(p, "r2");
  ok((await menu(p)) === "やった,きょうはパス,できなかった理由,期間でまとめてチェック,複製,休止する,設定,削除", "① in the 長押し menu", await menu(p));
  await p.click("#rt6MenuNo"); await p.waitForTimeout(300);

  // ④ 日記に書き足す (きょうを日記に書き足す, beside 文字で送る): taken out at the user's call (2026-11-28, tools/REMOVED.md):
  // no button, nothing written in the 日記 by the page; the check as before
  ok(!(await p.$("#rt7JnBtn")) && !/日記に書き足す/.test(await p.evaluate(() => document.getElementById("sec-routine")?.innerText || "")), "④ 日記に書き足す: gone");
  await row(p, "r2").locator(".check").click(); await p.waitForTimeout(300);
  ok((await day(p)).done.includes("r2") && !(await ls(p, "journal")).some((x) => x.id === D.DAY && /【ルーティーン】/.test(x.text || "")), "④ checked: nothing put in the 日記", await ls(p, "journal"));
  await undo(p);

  // ③ 勉強の科目で連携: 英語 not checked by today's 数学; all subjects, it is
  ok((await rowText(p, "r3")).includes("「英語」を30分以上記録したら自動でチェック") && !(await day(p)).done.includes("r3"), "③ 英語's 勉強 alone", await rowText(p, "r3"));
  await row(p, "r3").locator(".rt-opts").click(); await p.waitForTimeout(700);
  ok((await p.inputValue("#rtiSub")) === "s1" && (await p.evaluate(() => [...document.querySelectorAll("#rtiSub option")].map((o) => o.textContent).join(","))) === "すべての科目,英語,数学", "③ 科目 in ⋯");
  await p.selectOption("#rtiSub", ""); await p.click("#recSave"); await p.waitForTimeout(800);
  ok(!(await item(p, "r3")).linkSub && (await rowText(p, "r3")).includes("勉強を30分以上記録したのでチェック"), "③ any subject: 数学 60 分 checks it", await rowText(p, "r3"));
  await undo(p);
  ok((await item(p, "r3")).linkSub === "s1", "③ 元に戻す");

  ok(!p.errs.length, "no error on the way", p.errs);
  await p.close();

  // ⑩ a new バッジ, cheered once: 歯みがき a third day running
  p = await open(b, D.badge());
  ok(!(await txt(p, "#status")), "⑩ none at first (a1 got)");
  await row(p, "b1").locator(".check").click(); await p.waitForTimeout(500);
  ok((await toast(p)).includes("バッジ「3日連続」をもらいました") && (await ls(p, "settings")).find((x) => x.id === "rtBadges")?.got?.s3 === D.DAY, "⑩ 3日連続: cheered, kept with its day", await toast(p));
  ok(flat(await p.locator("#rt7Badges li", { hasText: "3日連続" }).innerText()).endsWith("11/3"), "⑩ its day in the card");
  await row(p, "b2").locator(".check").click(); await p.waitForTimeout(500);
  ok((await toast(p)).includes("ぜんぶできました") && !(await toast(p)).includes("バッジ「3日連続」"), "⑩ not again", await toast(p));
  ok(!p.errs.length, "no error (バッジ)", p.errs);

  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL " + (e && e.stack || e)); process.exit(1); });
