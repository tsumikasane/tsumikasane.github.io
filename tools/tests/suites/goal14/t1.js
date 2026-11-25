// 目標 その14 ①〜⑩, through the hook build at 8834 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8834/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const { all, settings, todos, events, journal } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const setting = async (p, id) => (await ls(p, "settings")).find((x) => x.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g14[f](...a), { f, a });
const block = (p, name) => p.locator(".goal-open").filter({ has: p.locator(".title", { hasText: name }) }).first();
const open = async (p, name) => { await block(p, name).click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const sheetOpen = (p) => p.evaluate(() => document.getElementById("daySheet").open);
const undo = async (p) => { await p.locator((await sheetOpen(p)) ? "#sheetStatus button" : "#status button").first().click(); await p.waitForTimeout(600); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-15T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings, todos, events, journal }, "goal"); await p.waitForTimeout(1000);

  // ② 1週間のマス: 単語帳2周 (月水金), シャドーイング (水)
  const week = await p.$$eval("#goalWeek7 li", (xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  ok(week.length === 7 && week[0] === "きょう 11/15 なし" && week[1] === "あした 11/16 単語帳2周" && week[3] === "水曜日 11/18 単語帳2周 シャドーイング" && week[5] === "金曜日 11/20 単語帳2周" && week[6] === "土曜日 11/21 なし", "② the week's cells by the day", week);
  // ④ しばらく進めていない目標: 社会人になるまでに (10/30)
  ok((await txt(p, "#goalStale")) === "しばらく進めていない目標 1 件 社会人になるまでに 最後に進めたのは 16日前（10/30） 保留", "④ the goal left standing still", await txt(p, "#goalStale"));
  await p.locator("#goalStale .g14-pause").click(); await p.waitForTimeout(600);
  ok((await goal(p, "g2")).pausedAt > 0 && (await status(p)).includes("「社会人になるまでに」を保留にしました") && !(await shown(p, "goalStale")), "④ put on hold there", await status(p));
  await undo(p);
  ok(!(await goal(p, "g2")).pausedAt, "④ 元に戻す");

  // ① できること, ⑤ 上限 in 目標's 設定 (③ 曜日のマスのお知らせ was taken out, the user's call, 2026-11-20)
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  await p.click("#goalHelpOpen"); await p.waitForTimeout(300);
  const n = Number((await txt(p, "#goalHelp .help-head strong")).match(/（(\d+)）/)?.[1]);
  ok(n >= 60 && (await p.$$eval("#goalHelpList .help-group", (x) => x.length)) === 6 && (await p.evaluate(() => document.activeElement?.id)) === "goalHelpFind", "① what 目標 can do, by place", n);
  await p.fill("#goalHelpFind", "経過"); await p.waitForTimeout(200);
  const found = await txt(p, "#goalHelpList");
  ok(found.startsWith("マスの長押し メモ・経過メモ") && !found.includes("目標のページ"), "① looked for", found);
  await p.click("#goalHelpClose"); await p.waitForTimeout(200);
  ok(!!(await p.$("#goalHelpOpen")), "① closed");
  ok(!(await p.$("#goalWdOn")) && !(await W(p, "alarms", await p.evaluate(() => Date.now()))).some((a) => a.tag.startsWith("goal-wd:")), "③ (taken out) no switch, no morning notification");
  // ⑤ 進行中の目標の上限: taken out at the user's call (2026-11-25, tools/REMOVED.md)
  ok(!(await p.$("#goalWipMax")), "⑤ (taken out) not in 設定");
  await done(p);
  // ⑤ four under way: nothing said over the page (taken out)
  ok(!(await p.$("#goalWipLine")), "⑤ (taken out) nothing over the page");
  // ⑥ a new goal like one there (⑤ asked first: taken out)
  await p.click("#goalAdd"); await p.waitForTimeout(700);
  await p.fill("#goalTitle", "TOEIC 900点"); await p.waitForTimeout(200);
  ok((await txt(p, "#goalSimilar")) === "似た目標があります：「TOEIC 800点」（進行中・46%）", "⑥ one like it, said", await txt(p, "#goalSimilar"));
  await p.fill("#goalTitle", "ギターを弾けるようになる"); await p.waitForTimeout(200);
  ok(!(await shown(p, "goalSimilar")), "⑥ none for one unlike any");
  await p.fill("#goalTitle", "TOEIC 900点"); await p.fill("#goalCriterion", "900点をとる");
  await p.locator("#goalDeadlinePicks .chip-btn", { hasText: "半年後" }).click(); await p.waitForTimeout(200);
  await p.click("#goalSave"); await p.waitForTimeout(600);
  await p.waitForTimeout(300);
  const gs = await ls(p, "goals"), ng = gs.find((g) => g.title === "TOEIC 900点");
  ok(gs.length === 9 && ng?.deadline === "2027-05-15" && !(await p.$("#goalWipSay")), "⑤ (taken out) added at once, nothing asked", ng);
  await done(p);

  // ⑦ the 期限 put at the day the pace gives (TOEIC)
  await open(p, "TOEIC 800点");
  const fix = await txt(p, "#mPaceFix");
  ok(/^期限を予想の 2027\/\d+\/\d+ にする$/.test(fix || ""), "⑦ offered for one behind its pace", fix);
  await p.click("#mPaceFix"); await p.waitForTimeout(600);
  let g1 = await goal(p, "g1");
  ok(g1.deadline > "2027-01-31" && fix.includes(`${Number(g1.deadline.slice(5, 7))}/${Number(g1.deadline.slice(8))}`) && g1.dlog?.length === 1 && (await status(p)).includes("期限を予想の"), "⑦ put, kept by その13 ②", [g1.deadline, g1.dlog]);
  await undo(p);
  ok((await goal(p, "g1")).deadline === "2027-01-31", "⑦ 元に戻す");
  // ⑧ 経過メモ on 長文
  await menuOf(p, 4); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "メモを見る・書く" }).click(); await p.waitForTimeout(400);
  await p.fill("#mNoteLogText", "15分読んだ"); await p.press("#mNoteLogText", "Enter"); await p.waitForTimeout(500);
  await p.fill("#mNoteLogText", "要約を書いた"); await p.click("#mNoteLogAdd"); await p.waitForTimeout(500);
  g1 = await goal(p, "g1");
  const log = await p.$$eval("#mNoteLog li", (xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  ok(g1.mandala[4].jl?.length === 2 && g1.mandala[4].jl[0].t === "15分読んだ" && log[0] === "11/15 要約を書いた 削除" && (await p.inputValue("#mNoteLogText")) === "" && g1.mandala[4].m === "教材はここ https://example.com/toeic を見る", "⑧ dated lines on the cell, the newest first", [g1.mandala[4].jl, log]);
  await p.locator("#mNoteLog li", { hasText: "15分読んだ" }).locator(".link-btn").click(); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).mandala[4].jl.length === 1, "⑧ one deleted");
  await undo(p);
  ok((await goal(p, "g1")).mandala[4].jl.length === 2, "⑧ 元に戻す");
  await p.click("#mNoteClose"); await p.waitForTimeout(300);
  // ⑩ the goal read out: taken out at the user's call (2026-11-24, tools/REMOVED.md): no button in the goal's sheet
  ok(!(await p.$("#mSpeak")) && !(await p.evaluate(() => document.getElementById("mRoot").innerText.includes("読み上げ"))), "⑩ no reading out (taken out)");
  // ⑨ 日記でふれた日
  ok((await txt(p, "#mJn")).startsWith("日記で 1日ふれています 11月10日（火） きょうはTOEICの単語を50語やった。") && (await p.inputValue("#mJnWords")) === "TOEIC 800点", "⑨ the 日記 that speak of it", await txt(p, "#mJn"));
  await p.fill("#mJnWords", "ゆっくり 単語"); await p.press("#mJnWords", "Enter"); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).jnw === "ゆっくり 単語" && (await txt(p, "#mJn")).startsWith("日記で 2日ふれています 11月12日（木） ゆっくりした一日 11月10日（火）"), "⑨ words of its own", await txt(p, "#mJn"));
  await p.locator('#mJn .row-btn[data-day="2026-11-12"]').click(); await p.waitForTimeout(900);
  ok((await W(p, "tab")) === "journal" && (await W(p, "viewDate")) === "2026-11-12" && !(await sheetOpen(p)), "⑨ pressed: that day's 日記", [await W(p, "tab"), await W(p, "viewDate")]);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
