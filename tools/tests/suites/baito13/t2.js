// バイト その13 ①②④⑤⑥⑨⑩: what is pressed and typed
process.env.URL0 = process.env.URL0 || "http://localhost:8864/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const setting = async (p, id) => (await ls(p, "settings")).find((s) => s.id === id);
const shift = async (p, id) => (await ls(p, "shifts")).find((x) => x.id === id);
const tags = (p) => p.evaluate(() => window.__bt13.alarms(Date.now()).filter((a) => a.url === "./#job").map((a) => a.tag));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await p.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); window.__copied = ""; Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true }); });
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ⑨ the week before, and back
  await p.click('#bt13Week [aria-label="前の週"]'); await p.waitForTimeout(300);
  ok((await txt(p, "#bt13Week .bt13-week-head strong")) === "11/8〜11/14の勤務" && (await txt(p, "#bt13Week p.sub")) === "この週 2 回・10 時間・約 10,600 円", "⑨ the week before: " + (await txt(p, "#bt13Week")));
  await p.click("#bt13Week .bt13-navs .link-btn"); await p.waitForTimeout(300);
  ok((await txt(p, "#bt13Week .bt13-week-head strong")) === "11/15〜11/21の勤務", "⑨ 今週");
  // ② a goal put in, one taken off and back
  await p.click("#bt13GoalAdd"); await p.waitForTimeout(200);
  await p.fill('#bt13Goal [data-g="name"]', "12月"); await p.fill('#bt13Goal [data-g="from"]', "2026-12-01"); await p.fill('#bt13Goal [data-g="to"]', "2026-12-31"); await p.fill('#bt13Goal [data-g="amount"]', "30000");
  await p.click('#bt13Goal [data-g="go"]'); await p.waitForTimeout(400);
  const gs = (await setting(p, "bt13Goal")).items;
  ok(gs.length === 2 && gs[1].name === "12月" && gs[1].amount === 30000 && (await txt(p, "#bt13Goal")).includes("12月 12/1〜12/31・目標 30,000 円 いま 0 円（予定をふくめると 5,300 円）"), "② put in: " + (await txt(p, "#bt13Goal")));
  await p.click('#bt13Goal [data-goal="g1"] .bt4-adv-x'); await p.waitForTimeout(300);
  ok((await setting(p, "bt13Goal")).items.length === 1 && !(await p.$('#bt13Goal [data-goal="g1"]')), "② taken off");
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(300);
  ok((await setting(p, "bt13Goal")).items.length === 2, "② back");
  // ⑥ 佐藤 taken off r2; 鈴木 covered 11/7
  await p.click('#shiftList [data-edit="r2"]'); await p.waitForTimeout(500);
  ok((await p.inputValue("#reShiftCover")) === "佐藤", "⑥ in the sheet");
  await p.fill("#reShiftCover", ""); await p.locator("#recSave").click(); await p.waitForTimeout(500);
  ok(!("coverFor" in (await shift(p, "r2"))) && !(await txt(p, "#bt13Swap")).includes("佐藤"), "⑥ taken off");
  await p.click('#shiftList [data-edit="p2026-11-07"]'); await p.waitForTimeout(500);
  await p.fill("#bt13SwapBy", "鈴木さん"); await p.click('[data-off="swap"]'); await p.waitForTimeout(500);
  const off = (await setting(p, "bt5Off")).items.find((o) => o.shift.id === "p2026-11-07");
  ok(off && off.why === "swap" && off.by === "鈴木さん" && (await txt(p, "#bt13Swap")).includes("鈴木 代わりに入った 0 回・代わってもらった 1 回 してもらったほうが 1 回多い"), "⑥ 鈴木: " + JSON.stringify(off));
  // ①④ the お知らせ held no more; ① off
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  await p.click("#bt13MuteOff"); await p.waitForTimeout(300);
  const s = await setting(p, "bt13");
  ok(!("muteFrom" in s) && !("muteTo" in s) && (await tags(p)).includes("bt13-next:2026-11-22") && (await tags(p)).includes("bt7-eve:2026-11-20"), "④ held no more: " + JSON.stringify(await tags(p)));
  await p.click("#bt13NextOn"); await p.waitForTimeout(300);
  ok((await setting(p, "bt13")).nextOn === false && !(await tags(p)).some((t) => t.startsWith("bt13-next")), "① off");
  await p.fill("#bt13MuteFrom", "2026-11-21"); await p.fill("#bt13MuteTo", "2026-11-19"); await p.dispatchEvent("#bt13MuteTo", "change"); await p.waitForTimeout(300);
  const s2 = await setting(p, "bt13");
  ok(s2.muteFrom === "2026-11-19" && s2.muteTo === "2026-11-21" && !(await tags(p)).includes("bt7-eve:2026-11-20"), "④ held again (the days put in order): " + JSON.stringify(s2));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  // ⑩ 出勤 17:00, 休憩 30 分 at 18:00: its お知らせ at 18:30, past it at 18:40; ⑤ 退勤 at 22:05, home at 22:35
  await p.clock.setFixedTime(at("17:00", today)); await p.reload(); await p.waitForTimeout(900);
  await p.click('#bt2Clock .bt2-clock-row .btn'); await p.waitForTimeout(400);
  await p.clock.setFixedTime(at("18:00", today)); await p.reload(); await p.waitForTimeout(900);
  ok((await p.inputValue("#bt13BreakFor")) === "45", "⑩ 45 分 to begin with");
  await p.selectOption("#bt13BreakFor", "30"); await p.click("#bt10Break"); await p.waitForTimeout(400);
  const c = await setting(p, "bt2Clock");
  ok(c.breakFor === 30 && c.breakAt === at("18:00", today).getTime(), "⑩ kept: " + JSON.stringify(c));
  const br = await p.evaluate(() => window.__bt13.alarms(Date.now()).find((a) => a.tag.startsWith("bt13-break")));
  ok(br && new Date(br.at).toISOString() === "2026-11-18T09:30:00.000Z" && br.title === "休憩の終わりの時刻です", "⑩ its お知らせ: " + JSON.stringify(br));
  ok((await txt(p, "#bt2Clock .bt10-break")).includes("あと 30 分（18:30まで）"), "⑩ " + (await txt(p, "#bt2Clock .bt10-break")));
  await p.clock.setFixedTime(at("18:40", today)); await p.reload(); await p.waitForTimeout(900);
  ok((await txt(p, "#bt2Clock .bt10-break")).includes("18:30をすぎています"), "⑩ past it: " + (await txt(p, "#bt2Clock .bt10-break")));
  await p.click("#bt10Break"); await p.waitForTimeout(400);
  const c2 = await setting(p, "bt2Clock");
  ok(!("breakFor" in c2) && c2.rest === 40, "⑩ back: " + JSON.stringify(c2));
  await p.clock.setFixedTime(at("22:05", today)); await p.reload(); await p.waitForTimeout(900);
  await p.click('#bt2Clock .bt2-clock-row .btn'); await p.waitForTimeout(500);
  await p.click("#bt13Home"); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__copied)) === "いまバイトが終わりました。22:35 ごろ家に着きます。", "⑤ " + (await p.evaluate(() => window.__copied)));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
