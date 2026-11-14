// 目標 その11 ①〜⑩, through the hook build at 8831 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8831/";
const { chromium } = require("playwright");
const fs = require("fs");
const { P, URL0, phone, seed } = require("./lib");
const { all, settings, todos, events } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status").textContent, document.getElementById("sheetStatus").textContent].join("｜"));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g11[f](...a), { f, a });
const open = async (p, name) => { await p.locator(".goal-open", { hasText: name }).first().click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const nows = (p) => p.evaluate(() => Date.now());
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T20:30:00+09:00"), { deviceScaleFactor: 1, acceptDownloads: true });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings, todos, events }, "goal"); await p.waitForTimeout(1000);

  // ⑨ 目標のつながり
  let t = await txt(p, "#goalLinks");
  ok(t.startsWith("目標のつながり 2 件") && t.includes("社会人になるまでに") && t.includes("↳ マス「英語」 📚 TOEIC 800点".replace("📚 ", "")) && t.includes("→ 達成したら次に ハーフマラソンを走る 12/1から"), "⑨ the goals joined", t);
  // ④ 進行中の目標を画像で保存
  let [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), p.click("#goalImgSave")]);
  ok(dl && dl.suggestedFilename() === "tsumikasane-goals-2026-11-11.png", "④ the goals under way as a picture", dl && dl.suggestedFilename());
  // ⑧ 期限のお知らせを増やす: 1か月前 and 当日
  await p.click("#goalSettings"); await p.waitForTimeout(600);
  await p.locator("#goalDueMore .chip-btn", { hasText: "1か月前" }).click(); await p.waitForTimeout(300);
  await p.locator("#goalDueMore .chip-btn", { hasText: "当日" }).click(); await p.waitForTimeout(300);
  ok(JSON.stringify((await ls(p, "settings")).find((x) => x.id === "goalDueMore")?.days) === "[30,0]", "⑧ kept");
  const al = (await W(p, "alarms", await nows(p))).find((a) => a.tag === "goal:g3:30");
  ok(al && new Date(al.at).toISOString() === "2026-12-01T00:00:00.000Z" && al.body === "目標の期限まで、あと30日です（12/31・いま 33%）", "⑧ a month before, 9:00", al);
  // ⑥ 2回押す on
  await p.click("#goalUn2"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => localStorage.getItem("tsumikasane:goalUncheck2") === "on"), "⑥ on, this device's");
  await done(p);

  await open(p, "TOEIC");
  // ① この目標のToDo
  t = await txt(p, "#mTodos");
  ok(t.includes("単語の復習 期限 11/12") && t.includes("模試の申し込み") && t.endsWith("まだ 1件・完了 1件") && !t.includes("ほかのToDo"), "① its ToDos", t);
  await p.locator("#mTodos li", { hasText: "単語の復習" }).locator(".check").click(); await p.waitForTimeout(700);
  ok((await ls(p, "todos")).find((x) => x.id === "t1")?.done === true, "① checked there");
  // ③ これまでを再生
  ok((await p.$$eval("#mReplay .rp-sq", (x) => x.length)) === 81 && (await txt(p, "#mReplay .rp-label")).startsWith("いま "), "③ the chart, small", await txt(p, "#mReplay .rp-label"));
  await p.click("#mReplayPlay");
  await p.waitForTimeout(700);
  const mid = await txt(p, "#mReplay .rp-label");
  await p.waitForTimeout(5500);
  t = await txt(p, "#mReplay .rp-label");
  ok(/^\d+月\d+日（.）：\d+ \/ \d+ マス$/.test(mid) && t.startsWith("11月11日（水）：") && t.endsWith("（いままで）"), "③ played day by day to today", [mid, t]);
  // ⑤ ファイルで送る
  [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), p.click("#mJson")]);
  const file = dl ? await dl.path() : null, data = file ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
  ok(dl.suggestedFilename() === "tsumikasane-goal-2026-11-11.json" && data?.kind === "goal" && data.goal.title === "TOEIC 800点" && data.goal.mandala[0].c[1].m === "公式の単語帳" && !JSON.stringify(data).includes('"ev"') && data.goal.mandala[1].c[0].d === true, "⑤ the goal as a file", data && Object.keys(data.goal));
  // ⑥ 2回押す: 文法書1周 (done)
  await p.click('.m-cell[data-k="1"] [data-role="open"]'); await p.waitForTimeout(500);
  await p.locator('.m-cell[data-k="0"] [data-role="check"]').click(); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).mandala[1].c[0].d === true && (await status(p)).includes("もう一度押すと、達成を取り消します"), "⑥ the first press only says so");
  await p.locator('.m-cell[data-k="0"] [data-role="check"]').click(); await p.waitForTimeout(400);
  ok(!(await goal(p, "g1")).mandala[1].c[0].d, "⑥ the second takes it off");
  await p.locator('.m-cell[data-k="0"] [data-role="check"]').click(); await p.waitForTimeout(400);
  ok((await goal(p, "g1")).mandala[1].c[0].d === true, "⑥ checking it again: at once");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  // ⑦ 候補で埋める: the two empty places around TOEIC
  ok(await shown(p, "mSugRow"), "⑦ offered");
  const words = (await txt(p, "#mSugFill"));
  await p.click("#mSugFill"); await p.waitForTimeout(500);
  let g = await goal(p, "g1");
  ok(words === "候補で 2マスを埋める" && g.mandala[6]?.t && g.mandala[7]?.t && !(await shown(p, "mSugRow")), "⑦ filled", [words, g.mandala[6], g.mandala[7]]);
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(400);
  g = await goal(p, "g1");
  ok(!g.mandala[6] && !g.mandala[7], "⑦ 元に戻す");
  // ⑩ 全体を大きく
  await p.click('#mView button[data-view="whole"]'); await p.waitForTimeout(500);
  ok(await shown(p, "mZoomRow"), "⑩ offered in 全体");
  await p.click("#mZoom"); await p.waitForTimeout(400);
  const wz = await p.evaluate(() => { const w = document.querySelector(".m-zoomwrap"); return [w.classList.contains("zoom"), Math.round(document.getElementById("mGrid").getBoundingClientRect().width / w.clientWidth * 10) / 10]; });
  ok(wz[0] && wz[1] >= 1.9 && (await p.evaluate(() => localStorage.getItem("tsumikasane:goalZoom"))) === "on", "⑩ twice as wide, moved sideways", wz);
  await p.click("#mZoom"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.querySelector(".m-zoomwrap").classList.contains("zoom"))), "⑩ back");
  await p.click('#mView button[data-view="cells"]'); await p.waitForTimeout(400);
  ok(!(await shown(p, "mZoomRow")), "⑩ not in 8マス");
  // ② この目標の予定: pressed, the calendar's day
  t = await txt(p, "#mPlans");
  ok(t.startsWith("11/20 19:00 シャドーイング") && t.endsWith("これから 1件・すんだ予定 1件"), "② its plans", t);
  await p.locator("#mPlans .row-btn").click(); await p.waitForTimeout(1200);
  ok((await W(p, "tab")) === "calendar" && (await p.evaluate(() => document.getElementById("daySheet").open && document.getElementById("sheetTitle").textContent.includes("11月20日"))), "② the day in the calendar", await txt(p, "#sheetTitle"));
  await p.evaluate(() => document.getElementById("sheetDone").click()); await p.waitForTimeout(500);

  // ⑤ ファイルから目標を読み込む (checks left out)
  await p.goto(URL0 + "#goal"); await p.reload(); await p.waitForTimeout(900);
  await p.click("#goalAdd"); await p.waitForTimeout(700);
  await p.setInputFiles("#goalFileIn", file); await p.waitForTimeout(500);
  ok((await txt(p, "#goalFromFileSay")).startsWith("「TOEIC 800点」・マス ") && (await txt(p, "#goalFromFileSay")).endsWith("・期限 1/31"), "⑤ what it reads", await txt(p, "#goalFromFileSay"));
  await p.click("#goalFromFileGo"); await p.waitForTimeout(900);
  const copies = (await ls(p, "goals")).filter((x) => x.title === "TOEIC 800点");
  const ng = copies.find((x) => x.id !== "g1");
  ok(copies.length === 2 && ng && ng.mandala[0].c[1].m === "公式の単語帳" && !ng.mandala[1].c[0].d && ng.deadline === "2027-01-31" && ng.depth === 2, "⑤ read in as a new goal, unchecked", ng && ng.mandala[1]);
  ok((await status(p)).includes("ファイルから「TOEIC 800点」を読み込みました"), "⑤ said");
  await done(p);

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
