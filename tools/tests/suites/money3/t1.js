// 家計簿 その3 ②③④⑩: ひとことで足し算, 並べ方, 選ぶ, 今週
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  // ⑩ 今週 (from Sunday 11/8): 6,000 + 500 + 3,000 + 700 = 10,200; the aim 30,000 / 30 × 7 = 7,000
  const wk = await txt(p, "#mo3Week");
  ok(wk.includes("今週（11/8（日）〜）の支出は 10,200 円") && wk.includes("週の目安 7,000 円 を 3,200 円 超えています"), "⑩ this week: " + wk);
  // ② a sum
  await p.fill("#mo2QuickText", "ランチ 800+120"); await p.waitForTimeout(200);
  ok((await txt(p, "#mo2QuickSay")).includes("920 円"), "② said as 920: " + (await txt(p, "#mo2QuickSay")));
  await p.press("#mo2QuickText", "Enter"); await p.waitForTimeout(400);
  let ex = (await ls(p, "expenses")).filter((e) => e.memo === "ランチ" && e.date === today);
  ok(ex.some((e) => e.amount === 920), "② put in as 920", ex);
  await p.fill("#mo2QuickText", "ジュース 150×3"); await p.press("#mo2QuickText", "Enter"); await p.waitForTimeout(400);
  ok((await ls(p, "expenses")).some((e) => e.memo === "ジュース" && e.amount === 450), "② 150×3 as 450");
  await p.fill("#mo2QuickText", "給料 +52000"); await p.press("#mo2QuickText", "Enter"); await p.waitForTimeout(400);
  ok((await ls(p, "expenses")).some((e) => e.kind === "in" && e.amount === 52000), "② + first is still 収入");
  // ③ in order of amount
  await p.selectOption("#mo3Sort", "amt"); await p.waitForTimeout(300);
  const first = await p.evaluate(() => [...document.querySelectorAll("#exList li[data-ex]")].slice(0, 3).map((li) => li.dataset.ex));
  ok(first[0] === "n7" || first[0] === (await ls(p, "expenses")).find((e) => e.amount === 52000).id, "③ the biggest first: " + first);
  ok(!(await p.$("#exList li.dayhead")), "③ no day heads");
  ok((await txt(p, '#exList li[data-ex="n2"]')).includes("11/6"), "③ each says its day");
  await p.reload(); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.getElementById("mo3Sort").value) === "amt", "③ kept on this device");
  await p.selectOption("#mo3Sort", ""); await p.waitForTimeout(300);
  ok(!!(await p.$("#exList li.dayhead")), "③ by date again");
  // ④ 選ぶ
  await p.click("#mo3Pick"); await p.waitForTimeout(300);
  ok(!(await p.isHidden("#mo3Sel")) && (await txt(p, "#mo3Sel")).includes("明細を押して選びます"), "④ the bar");
  await p.click('#exList li[data-ex="n2"] .body'); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.querySelector("dialog[open]"))), "④ a row pressed is not opened");
  await p.click('#exList li[data-ex="n4"] input.mo3-box-in'); await p.waitForTimeout(300);
  let bar = await txt(p, "#mo3Sel");
  ok(bar.includes("2 件を選んでいます") && bar.includes("支出 12,500 円"), "④ two picked: " + bar);
  await p.selectOption("#mo3Sel select", "日用品"); await p.waitForTimeout(400);
  ex = await ls(p, "expenses");
  ok(["n2", "n4"].every((id) => ex.find((e) => e.id === id).category === "日用品"), "④ their 費目 changed");
  await p.click('#exList li[data-ex="n4"]'); await p.click('#exList li[data-ex="n6"]'); await p.waitForTimeout(300);
  await p.click("#mo3SelDel"); await p.waitForTimeout(400);
  ex = await ls(p, "expenses");
  ok(!ex.some((e) => e.id === "n4" || e.id === "n6") && ex.some((e) => e.id === "n2"), "④ two deleted");
  await p.click("#mo3Pick"); await p.waitForTimeout(300);
  ok(await p.isHidden("#mo3Sel") && !!(await p.$('#exList li[data-ex="n2"] .del, #exList li[data-ex="n2"] button[aria-label*="削除"]')), "④ done picking: the × back");
  await p.screenshot({ path: (process.argv[2] || __dirname) + "/money3-book.png" });
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
