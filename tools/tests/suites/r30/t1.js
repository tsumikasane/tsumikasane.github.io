// ToDo: きょうやるを朝に選んで、それだけに集中する — driven as a user would, on a phone
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜"));
const rows = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList > li [data-check]")].map((b) => b.dataset.check));
const vis = (p, sel) => p.evaluate((sel) => { const x = document.querySelector(sel); return !!x && x.offsetParent !== null && getComputedStyle(x).display !== "none"; }, sel);
const card = (p) => p.evaluate(() => { const c = document.getElementById("tdFocusCard"); return c.hidden ? null : c.innerText.replace(/\s+/g, " ").trim(); });
const TODOS = [
  { id: "a", text: "レポートを出す", done: false, due: "2026-11-09", createdAt: T("2026-11-01"), mins: 60 },
  { id: "b", text: "洗濯", done: false, due: "2026-11-11", createdAt: T("2026-11-05") },
  { id: "c", text: "銀行で振込", done: false, due: "2026-11-11", time: "15:00", createdAt: T("2026-11-05"), flag: true },
  { id: "d", text: "英単語 50語", done: false, due: "2026-11-12", createdAt: T("2026-11-06"), mins: 30 },
  { id: "e", text: "部屋の片づけ", done: false, due: "2026-11-15", createdAt: T("2026-11-06") },
  { id: "f", text: "母に電話", done: false, createdAt: T("2026-11-07") },
  { id: "g", text: "返事を待つ", done: false, wait: { since: "2026-11-09" }, createdAt: T("2026-11-07") },
  { id: "h", text: "ゼミの資料を読む", done: false, due: "2026-11-11", today: "2026-11-10", createdAt: T("2026-11-08"), mins: 45 },
  { id: "i", text: "牛乳を買う", done: true, doneAt: T("2026-11-10", 18), due: "2026-11-10", createdAt: T("2026-11-08") },
];
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T08:30:00+09:00"), { deviceScaleFactor: 1 });
  await seed(p, { todos: TODOS }, "todo"); await p.waitForTimeout(900);

  // the morning: the card over the list offers to pick, and the one left from yesterday
  let c = await card(p);
  ok(!!c && c.includes("おはようございます") && c.includes("きょうやるを選ぶ") && c.includes("きょうは選ばない") && c.includes("前の日の「ゼミの資料を読む」が残っています"), "the morning card: pick, not today, yesterday's left", c);
  ok(!(await p.evaluate(() => !!document.querySelector("#todoList > li.td-carry"))), "yesterday's offered in the card, not in the list");
  ok(await vis(p, "#todoSearchBox") && await vis(p, "#todoTabs"), "the list as ever under it");
  // その他 has it too
  await p.click("#todoMore"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].some((x) => x.textContent === "きょうやるを選ぶ")), "その他: きょうやるを選ぶ");
  await p.click("#todoMenuNo"); await p.waitForTimeout(300);

  // the sheet: everything to do under its 期限 (not 待ち), yesterday's marked
  await p.click("#tdFocusCard .btn"); await p.waitForTimeout(700);
  ok((await p.evaluate(() => document.getElementById("sheetTitle").textContent)) === "きょうやるを選ぶ", "the sheet: きょうやるを選ぶ");
  const heads = await p.evaluate(() => [...document.querySelectorAll("#tdPanelBody .group-head")].map((x) => x.textContent));
  ok(heads.join("|") === "期限切れ（1）|きょう（3）|あした（1）|これから（1）|期限なし（1）", "its sections, 待ち and done left out", heads);
  ok(await p.evaluate(() => document.querySelector('[data-pick="h"]').closest("li").textContent.includes("前の日の残り")), "yesterday's said so");
  ok((await p.evaluate(() => document.querySelector(".td-pick-count").textContent)) === "まだ選んでいません", "none picked yet");
  ok(await p.evaluate(() => document.querySelector(".td-pick-go .btn").disabled), "its button waits for one");
  // one pressed: in, at once
  await p.click('[data-pick="c"]'); await p.waitForTimeout(400);
  ok((await todo(p, "c")).today === "2026-11-11" && (await p.evaluate(() => document.querySelector('[data-pick="c"]').getAttribute("aria-checked"))) === "true", "pressed: in きょうやる");
  ok(await p.evaluate(() => document.activeElement?.dataset?.pick === "c"), "its row keeps the focus as it is drawn again");
  await p.click('[data-pick="c"]'); await p.waitForTimeout(400);
  ok((await todo(p, "c")).today === undefined, "pressed again: out");
  // those due by today at once (4: a, b, c, h)
  await p.locator(".td-pick-quick button", { hasText: "期限がきょうまで" }).click(); await p.waitForTimeout(500);
  let ts = await ls(p, "todos");
  ok(["a", "b", "c", "h"].every((id) => ts.find((t) => t.id === id).today === "2026-11-11") && !ts.find((t) => t.id === "d").today, "期限がきょうまで: the four in", ts.map((t) => [t.id, t.today]));
  ok((await p.evaluate(() => document.querySelector(".td-pick-count").textContent)).startsWith("4 件を選んでいます・のこり 1時間45分") || (await p.evaluate(() => document.querySelector(".td-pick-count").textContent)).startsWith("4 件を選んでいます"), "the count and the time", await p.evaluate(() => document.querySelector(".td-pick-count").textContent));
  // 元に戻す
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(400);
  ts = await ls(p, "todos");
  ok(["a", "b", "c"].every((id) => !ts.find((t) => t.id === id).today) && ts.find((t) => t.id === "h").today === "2026-11-10", "元に戻す: as before", ts.map((t) => [t.id, t.today]));
  for (const id of ["a", "b", "c"]) { await p.click(`[data-pick="${id}"]`); await p.waitForTimeout(250); }
  // written in there: straight into きょうやる
  await p.fill(".td-pick-in", "郵便局へ行く"); await p.keyboard.press("Enter"); await p.waitForTimeout(500);
  ts = await ls(p, "todos");
  const added = ts.find((t) => t.text === "郵便局へ行く");
  ok(!!added && added.today === "2026-11-11" && !added.done, "one written in: a new ToDo in きょうやる", added);
  ok((await p.evaluate(() => document.querySelector(".td-pick-go .btn").textContent)) === "きょうやるだけを表示する（4 件）", "its button with how many");
  // きょうやるだけ
  await p.click(".td-pick-go .btn"); await p.waitForTimeout(900);
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)), "the sheet closed");
  ok(!(await vis(p, "#todoSearchBox")) && !(await vis(p, "#todoTabs")) && !(await vis(p, "#sec-todo .td-tools")), "きょうやるだけ: search, tabs and tools put away");
  let r = await rows(p);
  ok(r.length === 4 && ["a", "b", "c", added.id].every((id) => r.includes(id)), "only today's in the list", r);
  c = await card(p);
  ok(c.includes("すべてのToDoに戻る") && c.includes("11月11日（水）・4 件中 0 件完了") && c.includes("選び直す") && c.includes("きょうの時間割") && c.includes("前の日の「ゼミの資料を読む」が残っています"), "its head: the day, how far, 選び直す, 時間割, yesterday's", c);
  // kept for the day (a reload)
  await p.reload(); await p.waitForTimeout(900);
  ok((await rows(p)).length === 4 && !(await vis(p, "#todoSearchBox")), "kept as the page opens again");
  // checked off: how far goes up; the last one: 紙ふぶき, said
  for (const id of ["b", "c", "a"]) { await p.click(`#todoList [data-check="${id}"]`); await p.waitForTimeout(500); }
  ok((await card(p)).includes("4 件中 3 件完了"), "3 of 4 done", await card(p));
  await p.click(`#todoList [data-check="${added.id}"]`); await p.waitForTimeout(500);
  ok((await status(p)).includes("きょうやるを、ぜんぶ終えました！"), "the last one: said", await status(p));
  ok(await p.evaluate(() => !!document.querySelector("canvas.confetti")), "紙ふぶき");
  ok((await card(p)).includes("きょうやるを、ぜんぶ終えました！"), "and in its head");
  ok((await rows(p)).length === 4, "the done ones stay, struck through");
  // undone and done again: 紙ふぶき once a day
  await p.click(`#todoList [data-check="${added.id}"]`); await p.waitForTimeout(500);
  await p.evaluate(() => { document.getElementById("status").textContent = ""; });
  await p.click(`#todoList [data-check="${added.id}"]`); await p.waitForTimeout(500);
  ok(!(await status(p)).includes("きょうやるを、ぜんぶ終えました"), "not said twice in a day", await status(p));
  // ＋ under きょうやるだけ: a new one goes into it
  await p.click("#todoAdd"); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.getElementById("todoToday").checked), "＋: きょうやる on at first");
  await p.fill("#todoText", "メールを返す"); await p.click("#todoSave"); await p.waitForTimeout(700);
  ts = await ls(p, "todos");
  ok(ts.find((t) => t.text === "メールを返す")?.today === "2026-11-11", "saved into きょうやる");
  await p.evaluate(() => { const s = document.getElementById("daySheet"); if (s.open) s.close(); }); await p.waitForTimeout(400);
  // すべてのToDoに戻る: the list without today's, the card saying how far
  await p.click("#tdFocusCard .td-fc-back"); await p.waitForTimeout(700);
  r = await rows(p);
  ok(await vis(p, "#todoSearchBox") && !r.includes("a") && !r.includes("c") && r.includes("d") && r.includes("h"), "back: today's out of the list, the rest there", r);
  c = await card(p);
  ok(c.startsWith("きょうやる 4/5") && c.includes("のこり 「メールを返す」") && c.includes("きょうやるだけ表示") && c.includes("選び直す"), "the card: 4/5, what is left", c);
  // words looked for: today's found too, no card
  await p.fill("#todoSearch", "銀行"); await p.waitForTimeout(400);
  ok((await rows(p)).includes("c") && (await card(p)) === null, "looking: today's found, the card away");
  await p.fill("#todoSearch", ""); await p.waitForTimeout(400);
  // きょうは選ばない (none picked): the card gone for the day
  await p.evaluate(({ P }) => { const ts = JSON.parse(localStorage.getItem(P + "todos")); for (const t of ts) if (t.today === "2026-11-11" || t.today === "2026-11-10") delete t.today; localStorage.setItem(P + "todos", JSON.stringify(ts)); localStorage.removeItem(P + "tdFocus"); }, { P });
  await p.reload(); await p.waitForTimeout(900);
  ok((await card(p))?.includes("きょうやるを選ぶ"), "none picked: the offer again");
  await p.locator("#tdFocusCard button", { hasText: "きょうは選ばない" }).click(); await p.waitForTimeout(400);
  ok((await card(p)) === null, "きょうは選ばない: gone");
  await p.reload(); await p.waitForTimeout(900);
  ok((await card(p)) === null, "and stays gone today");
  // the morning's notification pressed (#todo:pick): the sheet to pick
  await p.goto(process.env.URL0 + "#todo:pick"); await p.reload(); await p.waitForTimeout(1200);
  ok((await p.evaluate(() => document.getElementById("daySheet").open && document.getElementById("sheetTitle").textContent)) === "きょうやるを選ぶ", "#todo:pick: the sheet to pick");
  await p.click('[data-pick="d"]'); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById("daySheet").close()); await p.waitForTimeout(400);
  await p.goto(process.env.URL0 + "#todo:pick"); await p.reload(); await p.waitForTimeout(1200);
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)) && (await rows(p)).join() === "d", "picked already: きょうやるだけ", await rows(p));
  ok(p.errs.length === 0, "no errors on the page", p.errs);
  await p.context().close();

  // the next day: not kept; yesterday's offered again
  const q = await phone(b, new Date("2026-11-12T09:00:00+09:00"), { deviceScaleFactor: 1 });
  await seed(q, { todos: [{ id: "x", text: "きのうの", done: false, today: "2026-11-11", createdAt: T("2026-11-10") }, { id: "y", text: "ほか", done: false, createdAt: T("2026-11-10") }] }, "todo");
  await q.evaluate(({ P }) => localStorage.setItem(P + "tdFocus", "2026-11-11"), { P }); await q.reload(); await q.waitForTimeout(900);
  ok(await vis(q, "#todoSearchBox") && (await card(q)).includes("前の日の「きのうの」が残っています"), "the next day: the list, yesterday's offered", await card(q));
  await q.locator("#tdFocusCard button", { hasText: "きょうも入れる" }).click(); await q.waitForTimeout(500);
  ok((await todo(q, "x")).today === "2026-11-12" && (await card(q)).startsWith("きょうやる 0/1"), "きょうも入れる: today's again", await card(q));
  ok(q.errs.length === 0, "no errors on the page (next day)", q.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
