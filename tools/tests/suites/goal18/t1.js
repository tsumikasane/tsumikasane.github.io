// 目標 その18 ①〜⑩, through the hook build at 8897 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8897/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g18[f](...a), { f, a });
const block = (p, name) => p.locator(".goal-open").filter({ has: p.locator(".title", { hasText: name }) }).first();
const open = async (p, name) => { await block(p, name).click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const sheetOpen = (p) => p.evaluate(() => document.getElementById("daySheet").open);
const undo = async (p) => { await p.locator((await sheetOpen(p)) ? "#sheetStatus button" : "#status button").first().click(); await p.waitForTimeout(600); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const tops = (p) => p.$$eval(".m-cell[data-k] .m-top", (xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
const order = (p) => p.evaluate(() => [...document.getElementById("goalFindBox").parentElement.children].map((x) => x.id).filter((id) => ["goalDayPace", "goalAfter", "goalNow", "goalNext", "goalDue"].includes(id)));
const guard = async (p) => (await W(p, "alarms", await p.evaluate(() => Date.now()))).filter((a) => a.tag.startsWith("goal-guard:"));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-15T17:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings, todos, events, journal }, "goal"); await p.waitForTimeout(1000);

  // ① カードをたたむ: 次の一歩, by its heading; kept on this device
  const head = p.locator("#goalNext > .goal-head");
  ok((await head.getAttribute("role")) === "button" && (await head.getAttribute("aria-expanded")) === "true", "① a card's heading, a button");
  await head.click(); await p.waitForTimeout(300);
  ok((await p.evaluate(() => document.getElementById("goalNext").classList.contains("g18-folded"))) && !(await p.isVisible("#goalNext ul")) && (await head.getAttribute("aria-expanded")) === "false"
    && JSON.stringify(await ls(p, "goalFold")) === '["goalNext"]', "① folded: its heading only");
  await p.reload(); await p.waitForTimeout(1200);
  ok(!(await p.isVisible("#goalNext ul")) && (await p.isVisible("#goalNext > .goal-head")), "① still folded, opened again");
  await p.focus("#goalNext > .goal-head"); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  ok((await p.isVisible("#goalNext ul")) && JSON.stringify(await ls(p, "goalFold")) === "[]" && (await p.evaluate(() => document.activeElement?.parentElement?.id)) === "goalNext", "① Enter on it: open again, still in focus");

  // ⑤ おくれ・すすみを日数で
  const paces = await p.$$eval(".goal", (xs) => xs.map((x) => [x.querySelector(".title")?.textContent, x.querySelector(".goal-pace")?.textContent || ""]));
  const room = paces.find((x) => x[0] === "部屋を片づける")?.[1], toeic = paces.find((x) => x[0] === "TOEIC 800点")?.[1];
  ok(/^少し遅れ気味（\d+日分おくれ）$/.test(room || "") && toeic === "順調", "⑤ days behind, on the block (none when on time)", paces);

  // ④ 連続を守るお知らせ: 部屋を片づける, two days in a row up to yesterday, not yet today
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  ok((await guard(p)).length === 0, "④ off at first");
  await p.click("#goalGuardOn"); await p.waitForTimeout(400);
  let al = await guard(p);
  ok((await setting(p, "goalGuard"))?.on === true && al[0]?.tag === "goal-guard:2026-11-15" && new Date(al[0].at).toISOString() === "2026-11-15T11:00:00.000Z" && al[0].body === "「部屋を片づける」は 2日つづけて進めています。きょうも1マス進めると 3日です"
    && al[1]?.tag === "goal-guard:2026-11-16" && al[1].body === "つづけて進めている目標は、きょうも進められましたか？", "④ that evening, and the next", al);
  // ② カードの並び順: 次の一歩 to the top, and back
  ok(JSON.stringify(await order(p)) === '["goalDayPace","goalAfter","goalNow","goalNext","goalDue"]', "② as they were", await order(p));
  for (let i = 0; i < 4; i++) { await p.locator('#goalOrderList [data-mv="goalNext:-1"]').click(); await p.waitForTimeout(150); }
  ok(JSON.stringify(await order(p)) === '["goalNext","goalDayPace","goalAfter","goalNow","goalDue"]' && (await ls(p, "goalOrder"))[0] === "goalNext" && (await p.locator("#goalOrderList li").first().textContent()).startsWith("次の一歩")
    && (await p.evaluate(() => document.activeElement?.dataset?.mv)) === "goalNext:1", "② 次の一歩 moved up to the top", await order(p));
  await p.click("#goalOrderReset"); await p.waitForTimeout(300);
  ok(JSON.stringify(await order(p)) === '["goalDayPace","goalAfter","goalNow","goalNext","goalDue"]', "② はじめの順にもどす");
  await done(p);

  // ③ 集中モード: TOEIC put first
  await p.click("#goalFocusBtn"); await p.waitForTimeout(400);
  const titles = await p.$$eval("#goalList .title", (xs) => xs.map((x) => x.textContent));
  const nextGoals = await p.$$eval("#goalNext .sub", (xs) => xs.map((x) => x.textContent.split("・").pop()));
  ok(JSON.stringify(titles) === '["TOEIC 800点"]' && nextGoals.every((x) => x === "TOEIC 800点") && (await txt(p, "#goalFocusLine")) === "🎯 集中モード：重点目標（TOEIC 800点）だけを出しています やめる"
    && (await p.getAttribute("#goalFocusBtn", "aria-pressed")) === "true", "③ the goal put first only", [titles, nextGoals]);
  await p.click("#goalFocusLine .link-btn"); await p.waitForTimeout(400);
  ok((await p.$$eval("#goalList .title", (xs) => xs.length)) > 1 && !(await shown(p, "goalFocusLine")), "③ やめる: all again");
  // ⑥ 待ち: シャドーイング not among 次の一歩's (毎日15分 is)
  ok(!(await txt(p, "#goalNext")).includes("シャドーイング"), "⑥ a cell waiting: not among 次の一歩");

  // ⑧ 週ごとの時間, ⑤ in 進み具合 (TOEIC; 部屋を片づける)
  await open(p, "TOEIC 800点");
  ok((await txt(p, "#mTimeWeeks")) === "週ごとの時間（この8週） 9/27 10/4 10/11 10/18 10/25 11/1 11/8 11/15 計 2時間20分・1週間の平均 18分・今週 15分" && (await p.$$eval("#mTimeWeeks .g18-wk i", (xs) => xs.map((x) => x.style.height))).join() === "0%,0%,0%,0%,32%,0%,100%,16%", "⑧ the time week by week", await txt(p, "#mTimeWeeks"));
  // ⑦ チェックリスト in 模試2回目
  await p.click('.m-cell[data-k="2"] [data-role="open"]'); await p.waitForTimeout(500);
  ok((await tops(p))[1].startsWith("☑1/3"), "⑦ 1/3 over its words", await tops(p));
  await menuOf(p, 1); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: /^メモを(見る・)?書く$/ }).click(); await p.waitForTimeout(400);
  ok((await txt(p, "#mNoteList .m-note-log-head")) === "チェックリスト（1/3）" && (await p.$$eval("#mNoteList .g18-list li", (xs) => xs.length)) === 3, "⑦ in its memo", await txt(p, "#mNoteList"));
  await p.fill("#mNoteListText", "見直しノートを作る"); await p.press("#mNoteListText", "Enter"); await p.waitForTimeout(500);
  let g1 = await goal(p, "g1");
  ok(g1.mandala[2].c[1].list.length === 4 && g1.mandala[2].c[1].list[3].t === "見直しノートを作る" && (await p.evaluate(() => document.activeElement?.id)) === "mNoteListText", "⑦ one more, the field ready for the next");
  await p.locator("#mNoteList .g18-list li", { hasText: "見直しノートを作る" }).locator(".link-btn").click(); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).mandala[2].c[1].list.length === 3 && (await status(p)).includes("「見直しノートを作る」を消しました"), "⑦ one taken off");
  await undo(p);
  ok((await goal(p, "g1")).mandala[2].c[1].list.length === 4, "⑦ 元に戻す");
  for (const t of ["採点する", "復習する", "見直しノートを作る"]) { await p.locator("#mNoteList .g18-list li", { hasText: t }).locator("input").click(); await p.waitForTimeout(400); }
  ok((await p.evaluate(() => document.activeElement?.closest?.("li")?.textContent)).includes("見直しノートを作る"), "⑦ the box ticked keeps the focus");
  g1 = await goal(p, "g1");
  ok(g1.mandala[2].c[1].list.every((x) => x.d) && (await txt(p, "#mNoteList .g18-list-all")) === "ぜんぶ済みました。 マスを達成にする" && (await tops(p))[1].startsWith("☑4/4"), "⑦ all ticked: the cell offered", await txt(p, "#mNoteList"));
  await p.click("#mNoteListDone"); await p.waitForTimeout(600);
  ok((await goal(p, "g1")).mandala[2].c[1].d === true, "⑦ the cell checked");
  await p.click("#mNoteClose"); await p.waitForTimeout(300);
  // ⑥ 待ち and ⑩: in リスニング, 毎日15分 then シャドーイング
  await p.click("#mSide .g17-side-next"); await p.waitForTimeout(500);
  ok(JSON.stringify(await W(p, "path")) === "[3]" && (await tops(p))[1].includes("待ち"), "⑥ 待ち over シャドーイング", await tops(p));
  await p.click('.m-cell[data-k="0"] [data-role="check"]'); await p.waitForTimeout(700);
  ok((await txt(p, "#mG18Say")) === "「毎日15分」が済んだので、「シャドーイング」に進めます。 閉じる" && !(await tops(p))[1].includes("待ち"), "⑥ done: シャドーイング let go, said", await txt(p, "#mG18Say"));
  await p.click('.m-cell[data-k="1"] [data-role="check"]'); await p.waitForTimeout(700);
  ok((await txt(p, "#mG18Say")) === "🎉「リスニング」のマスが、ぜんぶ終わりました。ふりかえりを書いておきませんか？ ふりかえりを書く あとで", "⑩ the element done: its ふりかえり asked for", await txt(p, "#mG18Say"));
  await p.click("#mG18Write"); await p.waitForTimeout(700);
  ok(JSON.stringify(await W(p, "path")) === "[]" && (await p.inputValue("#mReflect")) === "【リスニング】" && (await p.evaluate(() => document.activeElement?.id)) === "mReflect" && !(await p.isDisabled("#mReflectAdd")), "⑩ the field at hand, its name in it");
  await p.fill("#mReflect", "【リスニング】毎日続けられた"); await p.click("#mReflectAdd"); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).notes.some((n) => n.text === "【リスニング】毎日続けられた"), "⑩ written");
  await done(p);
  ok((await guard(p)).length === 2, "④ 部屋を片づける still not moved today: as it was");
  // ⑤ in 進み具合: 部屋を片づける; ④ once it is moved on today
  await open(p, "部屋を片づける");
  ok(/^少し遅れ気味（予定より \d+日分おくれています）。期限に間に合うには、/.test(await txt(p, "#mProgress .m-pace")), "⑤ in 進み具合", await txt(p, "#mProgress .m-pace"));
  await p.click('.m-cell[data-k="2"] [data-role="check"]'); await p.waitForTimeout(600);
  await done(p);
  al = await guard(p);
  ok(al.length === 1 && al[0].tag === "goal-guard:2026-11-16", "④ moved on today: none for this evening", al);

  // ⑨ 目標の棚卸し: one by one
  const live = await p.locator("#goalTanaStart").textContent();
  await p.click("#goalTanaStart"); await p.waitForTimeout(400);
  const names = [];
  const cur = async () => { const n = await txt(p, "#goalTana .one-name"); names.push(n); return n; };
  ok(live === "目標の棚卸し（進行中 4）" && (await txt(p, "#goalTana .one-head strong")) === "目標の棚卸し（1 / 4）" && (await cur()) === "TOEIC 800点" && /^\d+%・のこり \d+マス/.test(await txt(p, "#goalTana .g18-tana-facts")), "⑨ the first, and how it stands", await txt(p, "#goalTana"));
  await p.click("#goalTanaKeep"); await p.waitForTimeout(300);
  const n2 = await cur();
  await p.click("#goalTanaExt"); await p.waitForTimeout(200); await p.click('#goalTana [data-ext="30"]'); await p.waitForTimeout(400);
  const g8 = await goal(p, "g8");
  ok(n2 === "朝ランを習慣に" && g8.deadline === "2026-12-15" && g8.extends?.length === 1 && (await status(p)).includes("期限を 12/15（火） にしました"), "⑨ past its 期限: a month on, from today", [n2, g8.deadline, await status(p)]);
  const n3 = await cur();
  await p.click("#goalTanaPause"); await p.waitForTimeout(400);
  const n4 = await cur();
  await p.click("#goalTanaQuit"); await p.waitForTimeout(400);
  ok(n3 === "部屋を片づける" && (await goal(p, "g3")).pausedAt > 0 && n4 === "社会人になるまでに" && (await goal(p, "g2")).quit?.at > 0, "⑨ 保留, やめる", names);
  ok((await txt(p, "#goalTana")) === "目標の棚卸し おわる ぜんぶ見ました 続ける 1・期限を延ばした 1・保留 1・やめた 1", "⑨ at the end, what was decided", await txt(p, "#goalTana"));
  await p.click("#goalTana .one-head .link-btn"); await p.waitForTimeout(300);
  ok(!(await shown(p, "goalTana")) && (await txt(p, "#goalTanaStart")) === "目標の棚卸し（進行中 2）", "⑨ おわる");

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
