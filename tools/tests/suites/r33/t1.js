// ToDo その4 ①〜⑩, through the hook build at 8776 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8776/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const byText = async (p, text) => (await ls(p, "todos")).filter((t) => t.text === text);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜"));
const rows = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList > li [data-check]")].map((b) => b.dataset.check));
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td4[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const hold = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id);
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const heads = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList > li.dayhead [role=heading], #todoList > li.td4-slot-head")].map((x) => x.textContent.trim()));
const WHEN = new Date("2026-11-11T08:30:00+09:00");
const base = () => ({ todos: D.todos(), todoLists: D.lists(), events: D.events(), ...D.weather(WHEN.getTime() - 60000) });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, base(), "todo"); await p.waitForTimeout(1000);

  // ④ 朝・昼・夜: their small headings under 期限切れ and きょう, in that order; on a row
  const h0 = await heads(p);
  ok(h0.slice(0, 6).join("|") === "期限切れ|昼|きょう|朝|夜|いつでも", "④ the small headings, 朝 → 夜 → いつでも", h0);
  ok((await txt(p, '#todoList li:has([data-check="b"]) .due')).includes("朝 晴れの日"), "④⑤ on its row: 朝・晴れの日 (the ・ drawn)", await txt(p, '#todoList li:has([data-check="b"]) .due'));

  // ① 絞り込み: 重要だけ, then かかる時間が短い順; the line over the list; each taken off there
  await p.click("#td4View"); await p.waitForTimeout(600);
  ok((await txt(p, "#sheetTitle")) === "絞り込みと並べ方", "① its sheet");
  await p.locator("#tdPanelBody .td4-opt", { hasText: "重要だけ" }).click(); await p.waitForTimeout(400);
  ok((await rows(p)).join(",") === "f,a", "① 重要だけ: 銀行で振込, レポートを書く", await rows(p));
  ok(await p.evaluate(() => document.getElementById("td4WxCard").hidden && document.getElementById("td4RepCard").hidden), "① narrowed: the weather's and the repeat's cards put away");
  await p.locator("#tdPanelBody .td4-opt", { hasText: "かかる時間が短い順" }).click(); await p.waitForTimeout(400);
  ok((await rows(p)).join(",") === "a,f" && (await heads(p))[0] === "かかる時間が短い順", "① in the order picked, under its name (none set last)", [await rows(p), await heads(p)]);
  await done(p);
  ok((await txt(p, "#td4ViewBar")) === "絞り込み：重要だけ 並べ方：かかる時間が短い順" && (await p.getAttribute("#td4View", "aria-pressed")) === "true", "① said over the list; its button lit", await txt(p, "#td4ViewBar"));
  await p.locator("#td4ViewBar button", { hasText: "重要だけ" }).click(); await p.waitForTimeout(300);
  await p.locator("#td4ViewBar button", { hasText: "かかる時間" }).click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("td4ViewBar").hidden) && (await p.getAttribute("#td4View", "aria-pressed")) === "false" && (await heads(p))[0] === "期限切れ", "① taken off: as it was");
  await p.click("#td4View"); await p.waitForTimeout(500);
  await p.locator("#tdPanelBody .td4-opt", { hasText: "返事待ちだけ" }).click(); await p.waitForTimeout(300);
  ok((await rows(p)).join(",") === "i", "① 返事待ちだけ", await rows(p));
  await done(p);
  await p.locator("#todoTabs button", { hasText: "学校" }).click(); await p.waitForTimeout(300);
  ok((await txt(p, "#todoList")) === "「返事待ちだけ」に合うToDoはありません。", "① none in 学校: said so", await txt(p, "#todoList"));
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(300);
  await p.locator("#td4ViewBar button").click(); await p.waitForTimeout(300);

  // ② すき間時間: till 英語の授業 at 9:00, 30 minutes; what fits, and 始める
  await menu(p, "すき間時間でできるToDo");
  ok((await txt(p, ".td-panel-lead")) === "次の予定「英語の授業」（09:00）まで、あと 30 分です。", "② till the next plan", await txt(p, ".td-panel-lead"));
  let gap = await p.evaluate(() => [...document.querySelectorAll(".td4-gap .row-link")].map((x) => x.textContent));
  ok(gap.join(",") === "図書館の本を返す,英単語 50語,母に電話", "② what takes 30 minutes or less, the 期限 soonest first", gap);
  await p.locator(".td4-gap-chips button", { hasText: /^5\s?分$/ }).click(); await p.waitForTimeout(300);
  gap = await p.evaluate(() => [...document.querySelectorAll(".td4-gap .row-link")].map((x) => x.textContent));
  ok(gap.join(",") === "図書館の本を返す", "② 5 minutes: one", gap);
  await p.locator(".td4-go").first().click(); await p.waitForTimeout(600);
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)) && (await txt(p, "#focusName")) === "図書館の本を返す", "② 始める: the timer on it", await txt(p, "#focusName"));
  await p.click("#focusStop"); await p.waitForTimeout(300);

  // ③ 日に分ける: レポート 4時間 by 11/16, 1時間 a day → 4 days; 2時間 → 2; made, each in its day's きょうやる
  await hold(p, "a"); await p.waitForTimeout(300);
  await p.locator("#todoMenuGroup button", { hasText: "日に分ける" }).click(); await p.waitForTimeout(600);
  let plan = await p.evaluate(() => [...document.querySelectorAll(".td4-split .td4-split-day")].map((x) => x.textContent));
  ok(plan.join(",") === "11/11（水）,11/12（木）,11/14（土）,11/15（日）", "③ 4 days of 1時間, spread to the day before its 期限", plan);
  await p.locator(".td4-gap-chips button", { hasText: /^2\s?時間$/ }).click(); await p.waitForTimeout(300);
  plan = await p.evaluate(() => [...document.querySelectorAll(".td4-split .td4-split-day")].map((x) => x.textContent));
  ok(plan.join(",") === "11/11（水）,11/15（日）", "③ 2時間 a day: 2 days", plan);
  await p.locator("#tdPanelBody .btn", { hasText: "この案で 2 回に分ける" }).click(); await p.waitForTimeout(700);
  const parts = (await ls(p, "todos")).filter((t) => t.part?.of === "a").sort((x, y) => x.part.k - y.part.k);
  ok(parts.length === 2 && parts[0].text === "レポートを書く（1/2）" && parts[0].due === "2026-11-11" && parts[0].today === "2026-11-11" && parts[1].due === "2026-11-15" && parts[1].mins === 120 && parts[0].listId === "L2", "③ two made, each on its day, in its きょうやる", parts.map((x) => [x.text, x.due, x.today, x.mins]));
  ok(JSON.stringify((await todo(p, "a")).parts) === JSON.stringify(parts.map((x) => x.id)) && (await txt(p, '#todoList li:has([data-check="a"]) .due')).includes("2 回に分けた・0 回完了"), "③ the whole one knows them, and says so", await txt(p, '#todoList li:has([data-check="a"]) .due'));
  // both done: the whole one too; one taken back: it comes back
  await p.click(`#todoList [data-check="${parts[1].id}"]`); await p.waitForTimeout(300);
  await p.evaluate((id) => { document.querySelector("#tdFocusCard .btn").click(); }, null); await p.waitForTimeout(400);
  await p.click(`#todoList [data-check="${parts[0].id}"]`); await p.waitForTimeout(2400);
  ok((await todo(p, "a")).done === true && (await todo(p, "a")).partsDone === true && (await status(p)).includes("分けた 2 回をすべて終えたので、「レポートを書く」も完了にしました"), "③ the last part done: the whole one done too", await status(p));
  await p.click(`#todoList [data-check="${parts[0].id}"]`); await p.waitForTimeout(800);
  ok((await todo(p, "a")).done === false, "③ a part taken back: the whole one back too");
  await p.evaluate(() => document.querySelector("#tdFocusCard .td-fc-back").click()); await p.waitForTimeout(400);

  // ⑤ 天気: the card; きょうやるに入れる; tomorrow's rain; the morning's notification
  let wx = await txt(p, "#td4WxCard");
  ok(wx.includes("きょうは晴れ（降水確率 10%）") && wx.includes("「洗濯」「布団を干す」") && wx.includes("あしたは雨の予報です（降水確率 80%）") && wx.includes("「部屋の片づけ」"), "⑤ the card: today's sun, tomorrow's rain", wx);
  await p.locator("#td4WxCard button", { hasText: "きょうやるに入れる" }).click(); await p.waitForTimeout(500);
  ok((await todo(p, "b")).today === "2026-11-11" && (await todo(p, "c")).today === "2026-11-11" && (await txt(p, "#td4WxCard")).includes("きょうやるに入っています"), "⑤ both put in きょうやる");
  await p.click("#todoSettings"); await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById("tdMorningOn").scrollIntoView({ block: "center" }));
  await p.click("#tdMorningOn"); await p.waitForTimeout(400);
  let mo = (await W(p, "morning", WHEN.getTime())).filter((a) => /td-morning:2026-11-1[24]/.test(a.tag));
  ok(mo[0]?.body.endsWith("\n雨の日にやる：部屋の片づけ") && mo[1]?.body.endsWith("\n晴れの日にやる：布団を干す"), "⑤ the morning's: 雨の日 tomorrow, 晴れの日 on 11/14", mo.map((a) => a.body));

  // ④ お知らせ for 朝・昼・夜 (in the same 編集): on, then today's 昼 and 夜, tomorrow's 朝
  await p.evaluate(() => document.getElementById("td4SlotOn").scrollIntoView({ block: "center" }));
  ok((await txt(p, "#td4SlotFoot")).startsWith("ToDoに「朝・昼・夜」を付けると"), "④ its words in 編集");
  await p.click("#td4SlotOn"); await p.waitForTimeout(400);
  const sl = await W(p, "slot", WHEN.getTime());
  ok(sl.some((a) => a.tag === "td-slot:2026-11-11:noon" && a.title === "昼にやること 1件" && a.body === "図書館の本を返す") && sl.some((a) => a.tag === "td-slot:2026-11-11:pm" && a.body === "英単語 50語") && sl.some((a) => a.tag === "td-slot:2026-11-12:am" && a.body === "洗濯") && !sl.some((a) => a.tag === "td-slot:2026-11-11:am"), "④ 昼 and 夜 today, 朝 tomorrow (today's 朝 gone by)", sl.slice(0, 4).map((a) => a.tag));
  const sig0 = await W(p, "sig");
  await done(p);

  // ⑨ やったこととして記録, and ④ a 時間帯 from the new ToDo's form
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.getElementById("todoDoneRow").hidden), "⑨ nothing typed: no やったこと");
  await p.fill("#todoText", "部屋の掃除"); await p.waitForTimeout(200);
  await p.click("#todoDoneNow"); await p.waitForTimeout(700);
  let x = (await byText(p, "部屋の掃除"))[0];
  ok(x?.done === true && x.doneAt > 0 && !x.repeat && (await status(p)).includes("「部屋の掃除」を、やったこととして記録しました"), "⑨ put in as done, said so", [x, await status(p)]);
  await p.fill("#todoText", "シーツを洗う"); await p.selectOption("#todoSlot", "pm"); await p.click("#todoSave"); await p.waitForTimeout(600);
  x = (await byText(p, "シーツを洗う"))[0];
  ok(x?.slot === "pm" && !x.done, "④ 夜 from the form", x);
  ok((await W(p, "sig")) !== sig0, "④ its notifications made again");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);

  // ⑦ 入力の候補: ゼミ → ゼミの発表スライド; 英単語 50語 (the same) carries 夜, 15分, 学校
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoText", "ゼミ"); await p.waitForTimeout(300);
  ok((await txt(p, "#todoSuggest")).includes("ゼミの発表スライド"), "⑦ offered as it is typed", await txt(p, "#todoSuggest"));
  await p.fill("#todoText", "英単語 50語"); await p.waitForTimeout(300);
  await p.locator("#todoSuggest button").first().click(); await p.waitForTimeout(400);
  ok((await p.inputValue("#todoSlot")) === "pm" && (await p.inputValue("#todoMins")) === "15" && (await p.evaluate(() => document.querySelector('#todoListPick input:checked')?.closest("label")?.textContent || "")).includes("学校") && await p.evaluate(() => document.getElementById("todoSuggest").hidden),
    "⑦ picked: 夜, 15分, 学校 as before; offered no more", [await p.inputValue("#todoSlot"), await p.inputValue("#todoMins")]);
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  ok((await W(p, "sugs", "バナ")).join(",") === "バナナ", "⑦ from a 買い物リスト too", await W(p, "sugs", "バナ"));

  // ⑥ 買い物リスト: its tab's cart; often bought; the basket and 買い物を終える into 家計簿
  ok(await p.evaluate(() => [...document.querySelectorAll("#todoTabs .td-tab")].find((x) => x.textContent.includes("買い物"))?.querySelector("use")?.getAttribute("href") === "#i-cart"), "⑥ its tab's cart");
  await p.locator("#todoTabs button", { hasText: "買い物" }).click(); await p.waitForTimeout(400);
  let sc = await txt(p, "#td4ShopCard");
  ok(sc.includes("カゴ 1 件・280 円") && sc.includes("バナナ") && sc.includes("ヨーグルト") && !/よく買うもの.*牛乳/.test(sc), "⑥ the card: the basket, often bought (not 牛乳, on the list)", sc);
  await p.locator("#td4ShopCard .td4-often button", { hasText: "バナナ" }).click(); await p.waitForTimeout(500);
  const ban = (await byText(p, "バナナ")).find((t) => !t.done);
  ok(ban?.listId === "L1" && ban.price === 198, "⑥ often bought: added at a press, with its price", ban);
  await p.click('#todoList [data-check="s1"]'); await p.waitForTimeout(1800);
  ok((await txt(p, "#td4ShopCard")).includes("カゴ 2 件・500 円"), "⑥ checked off: in the basket", await txt(p, "#td4ShopCard"));
  await p.locator("#td4ShopCard button", { hasText: "買い物を終える" }).click(); await p.waitForTimeout(600);
  ok((await txt(p, ".td4-shop-sum")) === "合計 500 円" && (await p.inputValue("#td4ShopCat")) === "食費", "⑥ its sheet: the sum, 食費", await txt(p, ".td4-shop-sum"));
  await p.locator("#tdPanelBody .btn", { hasText: "家計簿に 500 円 を記録して終える" }).click(); await p.waitForTimeout(700);
  const ex = (await ls(p, "expenses")).find((e) => e.amount === 500);
  ok(ex?.category === "食費" && ex.memo === "買い物：牛乳、卵" && ex.date === "2026-11-11" && (await todo(p, "s1")).paid === ex.id, "⑥ in 家計簿 as one; they paid", ex);
  ok(!(await rows(p)).includes("s1") && !(await rows(p)).includes("s2") && !(await txt(p, "#td4ShopCard")).includes("カゴ"), "⑥ gone from the list, the basket empty", await rows(p));
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  ok(!(await p.evaluate(() => document.getElementById("todoShopRows").hidden)), "⑥ a new one in it: 数量 and 値段");
  await p.fill("#todoText", "トマト"); await p.fill("#todoQty", "3"); await p.fill("#todoPrice", "300"); await p.click("#todoSave"); await p.waitForTimeout(600);
  x = (await byText(p, "トマト"))[0];
  ok(x?.qty === 3 && x.price === 300 && x.listId === "L1", "⑥ saved with them", x);
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  const tom = await p.evaluate(() => [...document.querySelectorAll("#todoList > li")].find((li) => li.querySelector(".row-link")?.textContent === "トマト")?.querySelector(".due")?.innerText.replace(/\s+/g, " ").trim());
  ok((tom || "").includes("×3 300 円"), "⑥ on its row (the ・ is drawn between them)", tom);
  await p.locator("#todoTabs button", { hasText: "学校" }).click(); await p.waitForTimeout(300);
  await menu(p, "「学校」を買い物リストにする");
  ok((await ls(p, "todoLists")).find((l) => l.id === "L2").shop === true && !(await p.evaluate(() => document.getElementById("td4ShopCard").hidden)), "⑥ a list made one from その他");
  ok(!(await txt(p, "#td4ShopCard")).includes("カゴ") && (await ls(p, "todos")).filter((t) => t.listId === "L2" && t.done).every((t) => t.paid === true), "⑥ those done there before: not in the basket", await txt(p, "#td4ShopCard"));
  await menu(p, "買い物リストをやめる");
  ok(!(await ls(p, "todoLists")).find((l) => l.id === "L2").shop, "⑥ and back");
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(300);

  // ⑧ 繰り返しの提案: ゴミ出し on four Mondays
  const rep = await W(p, "rep");
  ok(rep?.repeat === "weekly" && JSON.stringify(rep.wds) === "[1]" && rep.n === 4 && rep.next === "2026-11-16", "⑧ found: every Monday, next 11/16", rep);
  ok((await txt(p, "#td4RepCard")).startsWith("「ゴミ出し」を、4 回（毎週（月曜日））手で追加しています。"), "⑧ offered over the list", await txt(p, "#td4RepCard"));
  await p.locator("#td4RepCard .btn").click(); await p.waitForTimeout(600);
  const gd = (await byText(p, "ゴミ出し")).find((t) => !t.done);
  ok(gd?.repeat === "weekly" && gd.due === "2026-11-16" && await p.evaluate(() => document.getElementById("td4RepCard").hidden), "⑧ made a repeat (next Monday); offered no more", gd);
  await p.locator("#status button").click(); await p.waitForTimeout(500);
  ok(!(await byText(p, "ゴミ出し")).some((t) => !t.done) && !(await p.evaluate(() => document.getElementById("td4RepCard").hidden)), "⑧ 元に戻す: offered again");
  await p.locator("#td4RepCard button", { hasText: "しない" }).click(); await p.waitForTimeout(500);
  ok((await W(p, "rep")) === null && await p.evaluate(() => document.getElementById("td4RepCard").hidden), "⑧ しない: not offered again");

  // ⑩ 日記: today's done ones, written in at a press
  ok((await W(p, "jn", "2026-11-11")).startsWith("きょうできたこと\n・レポートの資料集め\n・ジムに行く"), "⑩ the words", await W(p, "jn", "2026-11-11"));
  await p.goto(process.env.URL0 + "#journal"); await p.reload(); await p.waitForTimeout(1500);
  ok((await txt(p, "#td4JnTodos")).startsWith("きょう終えたToDo（"), "⑩ under 日記's writing", await txt(p, "#td4JnTodos"));
  await p.fill("#journalText", "いい天気だった"); await p.waitForTimeout(200);
  await p.locator("#td4JnTodos .btn").click(); await p.waitForTimeout(1800);
  const jt = await p.inputValue("#journalText");
  ok(jt.startsWith("いい天気だった\n\nきょうできたこと\n・レポートの資料集め\n・ジムに行く") && (await ls(p, "journal")).find((j) => j.date === "2026-11-11")?.text === jt.trim() && (await txt(p, "#td4JnTodos")).includes("日記に入っています"), "⑩ written in after what was there, saved, said so", jt);

  // ⑩ from ToDo's その他, on a fresh day's 日記
  const q = await phone(b, new Date("2026-11-11T21:30:00+09:00"), { deviceScaleFactor: 1 });
  await seed(q, base(), "todo"); await q.waitForTimeout(900);
  await menu(q, "きょう終えたToDoを日記に書き足す");
  const j2 = (await ls(q, "journal")).find((j) => j.date === "2026-11-11");
  ok(j2?.text.startsWith("きょうできたこと\n・レポートの資料集め") && (await status(q)).includes("日記に書き足しました"), "⑩ from その他: today's 日記", j2);
  await q.click("#todoMore"); await q.waitForTimeout(300);
  await q.locator("#todoMenuGroup button", { hasText: "きょう終えたToDoを日記に書き足す" }).click(); await q.waitForTimeout(500);
  ok((await status(q)).includes("もう日記に入っています"), "⑩ not twice", await status(q));
  ok(p.errs.length === 0 && q.errs.length === 0, "no errors on the page", [...p.errs, ...q.errs]);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
