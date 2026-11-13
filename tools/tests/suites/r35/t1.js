// ToDo その5 ①〜⑩, through the hook build at 8780 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8780/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const byText = async (p, text) => (await ls(p, "todos")).filter((t) => t.text === text);
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜"));
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td5[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const title = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const WHEN = new Date("2026-11-11T08:30:00+09:00");
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, WHEN, { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "todo"); await p.waitForTimeout(1200);

  // ① 重要と急ぎ: four boxes; the flag pressed moves one, 元に戻す puts it back
  await menu(p, "重要と急ぎで分けて見る");
  const q = await W(p, "quads");
  ok((await title(p)) === "重要と急ぎ" && JSON.stringify(q) === JSON.stringify({ do: ["e", "a", "g"], plan: ["b"], quick: ["h", "c", "f"], drop: ["d"] }), "① the four boxes", q);
  const boxText = await p.evaluate(() => [...document.querySelectorAll(".td5-quad")].map((s) => s.querySelector("h3").textContent + ":" + [...s.querySelectorAll(".td5-quad-name")].map((x) => x.textContent).join("/")));
  ok(boxText.join(" ") === "重要・急ぎ:資料を読む/レポートを書く/プレゼン準備 重要・急がない:英単語を覚える 急ぎ・重要でない:薬を飲む/メールに返信/銀行で振り込み どちらでもない:部屋の片付け", "① drawn in the sheet", boxText);
  await p.click('.td5-quad.q-quick .td5-flag[aria-label*="メールに返信"]'); await p.waitForTimeout(500);
  ok((await todo(p, "c")).flag === true && (await W(p, "quads")).do.includes("c") && (await p.$('.td5-quad.q-do .td5-flag[aria-label*="メールに返信"]')), "① flag on: into 重要・急ぎ, at once");
  await undo(p);
  ok(!(await todo(p, "c")).flag && (await W(p, "quads")).quick.includes("c"), "① 元に戻す");
  await p.click('.td5-quad-name:text("部屋の片付け")'); await p.waitForTimeout(700);
  ok((await p.inputValue("#reText")) === "部屋の片付け", "① a name opens it");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);

  // ② 授業・予定: 英語's next class (tomorrow 10:40) puts in the 期限, its time and its room; 前日にする; kept, said on the row
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.locator("#todoByBox button", { hasText: "授業・予定から選ぶ" }).click(); await p.waitForTimeout(300);
  const opts = await p.evaluate(() => [...document.querySelectorAll("#todoByList .td5-by-opt")].map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  ok(opts[0] === "英語 あした 10:40" && opts.includes("ゼミ 11/18（水） 08:00") && opts.includes("面接 11/18（水） 14:00") && !opts.some((x) => x.startsWith("ゼミ きょう")), "② the next classes, then plans (today's ゼミ begun)", opts);
  await p.locator("#todoByList .td5-by-opt", { hasText: "英語" }).click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#todoDue")) === "2026-11-12" && (await p.inputValue("#todoTime")) === "10:40" && (await p.inputValue("#todoPlace")) === "3号館201" && !(await p.isChecked("#todoRemind")),
    "② its day, time and room (お知らせ left as it was)", [await p.inputValue("#todoDue"), await p.inputValue("#todoTime"), await p.inputValue("#todoPlace")]);
  ok((await txt(p, "#todoByBox .td5-by-now")) === "授業「英語」（11/12（木） 10:40）まで", "② said", await txt(p, "#todoByBox .td5-by-now"));
  await p.locator("#todoByBox button", { hasText: "前日にする" }).click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#todoDue")) === "2026-11-11" && (await p.inputValue("#todoTime")) === "" && (await txt(p, "#todoByBox .td5-by-now")) === "授業「英語」の前日（11/11（水））まで", "② 前日にする");
  await p.fill("#todoText", "英語の課題を出す"); await p.click("#todoSave"); await p.waitForTimeout(600);
  let t = (await byText(p, "英語の課題を出す"))[0];
  ok(JSON.stringify(t?.by) === JSON.stringify({ k: "cls", n: "英語", d: "2026-11-12", time: "10:40", pre: 1, due: "2026-11-11" }) && t.place === "3号館201", "② kept with it", t);
  ok(!(await p.$("#todoByBox .td5-by-now")) && (await p.inputValue("#todoPlace")) === "", "② the form cleared for the next");
  // a plan: 面接, its time and place
  await p.locator("#todoByBox button", { hasText: "授業・予定から選ぶ" }).click(); await p.waitForTimeout(300);
  await p.locator("#todoByList .td5-by-opt", { hasText: "面接" }).click(); await p.waitForTimeout(300);
  ok((await p.inputValue("#todoDue")) === "2026-11-18" && (await p.inputValue("#todoTime")) === "14:00" && (await p.inputValue("#todoPlace")) === "本社ビル 5階", "② a plan: its day, time and place");
  // its 期限 changed by hand: let go
  await p.fill("#todoDue", "2026-11-17"); await p.dispatchEvent("#todoDue", "change"); await p.waitForTimeout(200);
  ok(!(await p.$("#todoByBox .td5-by-now")), "② a 期限 changed by hand: let go");
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  const row = await p.evaluate(() => { const b = [...document.querySelectorAll("#todoList [data-edit]")].find((x) => x.textContent === "英語の課題を出す"); return b?.closest("li").querySelector(".td5-by-chip")?.textContent || null; });
  ok(row === "授業「英語」の前日まで", "② on its row", row);

  // ③ 再通知: shown with お知らせ; 10分ごと kept; five more after; its own sheet; done, they stop
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  ok(await p.isHidden("#todoNagRow"), "③ no お知らせ: no 再通知");
  await p.fill("#todoText", "洗濯物を取りこむ"); await p.fill("#todoDue", "2026-11-11"); await p.dispatchEvent("#todoDue", "change");
  await p.fill("#todoTime", "18:00"); await p.dispatchEvent("#todoTime", "change"); await p.waitForTimeout(300);
  ok((await p.isChecked("#todoRemind")) && (await p.isVisible("#todoNagRow")), "③ a time: お知らせ on, 再通知 shown");
  await p.selectOption("#todoNag", "10"); await p.click("#todoSave"); await p.waitForTimeout(600);
  t = (await byText(p, "洗濯物を取りこむ"))[0];
  const nags = (await W(p, "nag", WHEN.getTime())).filter((a) => a.tag.startsWith(`todo-nag:${t.id}:`)).map((a) => new Date(a.at).toISOString().slice(11, 16));
  ok(t.nag === 10 && t.remind && JSON.stringify(nags) === '["09:10","09:20","09:30","09:40","09:50"]', "③ kept; 18:10〜18:50 (JST)", { nag: t.nag, nags });
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  await p.click('#todoList [data-edit="h"]'); await p.waitForTimeout(700);
  ok((await p.inputValue("#reNag")) === "30" && (await p.isVisible("#reNagRow")), "③ in its own sheet");
  const sig0 = await W(p, "sig");
  await p.selectOption("#reNag", "60"); await p.click("#recSave"); await p.waitForTimeout(600);
  ok((await todo(p, "h")).nag === 60 && (await W(p, "sig")) !== sig0, "③ changed there: what's sent changes");
  await p.click('#todoList [data-check="h"]'); await p.waitForTimeout(1800);
  ok(!(await W(p, "nag", WHEN.getTime())).some((a) => a.tag.startsWith("todo-nag:h:")), "③ done: they stop");

  // ④ 場所: 📍 on its row, the map
  const place = await p.evaluate(() => { const a = document.querySelector('#todoList [data-edit="f"]')?.closest("li").querySelector("a.td5-place"); return a ? [a.textContent, a.getAttribute("href"), a.getAttribute("target")] : null; });
  ok(place && place[0] === "駅前の銀行" && place[1] === "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("駅前の銀行") && place[2] === "_blank", "④ on its row, opening the map", place);

  // ⑥ 間に合うか: the card, its sheet, put away for the day
  // (5 to begin with; 2 added above for today, 30 minutes each, and 薬を飲む done: 6, 9時間45分)
  ok((await txt(p, "#td5RiskCard")).replace(/\s/g, "").includes("あしたまでのToDo6件で、9時間45分ほどかかります。それまでの空き時間は8時間です（予定・バイトを除く）。"), "⑥ over the list", await txt(p, "#td5RiskCard"));
  await p.locator("#td5RiskCard button", { hasText: "くわしく" }).click(); await p.waitForTimeout(700);
  const rk = await p.evaluate(() => [...document.querySelectorAll(".td5-risk > li")].map((li) => li.innerText.replace(/\s+/g, "")));
  ok((await title(p)) === "間に合うかチェック" && rk.length === 4 && rk[1].includes("たりません") && rk[1].startsWith("あした11/12（木）"), "⑥ its sheet, each 期限", rk);
  ok((await txt(p, ".td5-risk-todos li:first-child")).startsWith("レポートを書く"), "⑥ the longest first");
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  await p.click("#td5RiskCard .td5-x"); await p.waitForTimeout(300);
  ok(await p.isHidden("#td5RiskCard"), "⑥ × : put away for today");

  // ⑦ すっきり: from 絞り込みと並べ方; the memo goes
  ok(await p.evaluate(() => { const b = document.querySelector('#todoList [data-edit="a"]'); return !!b && b.closest("li").querySelector(".ev-memo")?.offsetHeight > 0; }), "⑦ before: a memo under its name");
  await p.click("#td4View"); await p.waitForTimeout(600);
  await p.locator(".td4-opt", { hasText: "すっきり" }).click(); await p.waitForTimeout(400);
  ok((await p.getAttribute('.td4-opt:has-text("すっきり")', "aria-checked")) === "true", "⑦ picked");
  await p.click("#sheetDone"); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById("todoList").classList.contains("td5-compact") && document.querySelector('#todoList [data-edit="a"]').closest("li").querySelector(".ev-memo").offsetHeight === 0), "⑦ a line each: no memo");

  // ⑧ 期限カレンダー: 見通し's 1か月; a day's ToDos; この日に追加
  await p.click("#todoWeek"); await p.waitForTimeout(700);
  ok((await title(p)) === "週の見通し" && !!(await p.$(".td5-week-seg")), "⑧ 見通し with 1週間 / 1か月");
  await p.locator(".td5-week-seg button", { hasText: "1か月" }).click(); await p.waitForTimeout(500);
  const c12 = await p.evaluate(() => { const b = [...document.querySelectorAll(".td5-cal-day")].find((x) => x.querySelector(".td5-cal-n")?.textContent === "12"); return b ? [b.className, b.querySelector(".td5-cal-c")?.textContent, b.getAttribute("aria-label")] : null; });
  ok((await title(p)) === "期限カレンダー" && c12 && c12[1] === "2" && /lv4/.test(c12[0]) && c12[2] === "11月12日（木）、まだ 2 件・6 時間 30 分", "⑧ the month: 11/12 with 2 and the most time", c12);
  const c10 = await p.evaluate(() => [...document.querySelectorAll(".td5-cal-day")].find((x) => x.querySelector(".td5-cal-n")?.textContent === "10")?.className);
  ok(/late/.test(c10), "⑧ one gone by: red", c10);
  await p.click('.td5-cal-day[aria-label^="11月12日"]'); await p.waitForTimeout(400);
  const day = await p.evaluate(() => [...document.querySelectorAll(".td5-cal-list .row-link")].map((x) => x.textContent));
  ok(JSON.stringify(day) === '["レポートを書く","プレゼン準備"]', "⑧ a day pressed: its ToDos", day);
  await p.locator("#tdPanelBody button", { hasText: "11/12（木）に追加" }).click(); await p.waitForTimeout(800);
  ok((await p.inputValue("#todoDue")) === "2026-11-12" && (await title(p)) === "新しいToDo", "⑧ この日に追加: a new one due then", await p.inputValue("#todoDue"));
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  await p.click("#todoWeek"); await p.waitForTimeout(700);
  ok((await title(p)) === "期限カレンダー", "⑧ 1か月 kept");
  await p.click("#sheetDone"); await p.waitForTimeout(500);

  // ⑨ はかどる時間帯: in 完了のふりかえり
  await menu(p, "完了のふりかえり");
  const hs = await txt(p, ".td5-hours-say");
  ok(hs && hs.replace(/\s/g, "").startsWith("午前（9〜12時）に、いちばん多く終えています（") && hs.includes("曜日では火曜日がいちばん多めです"), "⑨ the hours said", hs);
  await p.click("#sheetDone"); await p.waitForTimeout(500);

  // ⑤ チェックリスト: 持ち物 — 2 of 4, yesterday's in its place, the old one out; all taken off and back; all checked
  await p.locator("#todoTabs button", { hasText: "持ち物" }).click(); await p.waitForTimeout(500);
  ok((await txt(p, "#td5CheckCard .td-fc-n")) === "2 / 4", "⑤ 2 of 4", await txt(p, "#td5CheckCard"));
  const rows = await p.evaluate(() => [...document.querySelectorAll("#todoList > li")].map((li) => (li.querySelector("[data-edit]")?.textContent || li.textContent).trim() + (li.classList.contains("done") ? "✓" : "")));
  ok(JSON.stringify(rows.filter((x) => /財布|鍵|学生証|充電器/.test(x))) === '["財布✓","鍵✓","学生証","充電器"]', "⑤ checked ones in their places, the old one out", rows);
  await p.locator("#td5CheckCard button", { hasText: "すべてのチェックを外す" }).click(); await p.waitForTimeout(600);
  const after = (await ls(p, "todos")).filter((x) => x.listId === "l-pack");
  ok((await txt(p, "#td5CheckCard .td-fc-n")) === "0 / 4" && after.filter((x) => x.ckOff).length === 3 && after.filter((x) => !x.done).length === 4, "⑤ taken off: done ones kept apart, each in again", after.map((x) => [x.text, !!x.done, !!x.ckOff]));
  await undo(p);
  ok((await txt(p, "#td5CheckCard .td-fc-n")) === "2 / 4" && (await ls(p, "todos")).filter((x) => x.listId === "l-pack").length === 5, "⑤ 元に戻す");
  for (const id of ["p3", "p4"]) { await p.click(`#todoList [data-check="${id}"]`); await p.waitForTimeout(300); }
  await p.waitForTimeout(1500);
  ok((await status(p)).includes("「持ち物」をぜんぶチェックしました"), "⑤ all checked: said", await status(p));
  // 大学 made one from その他, and back
  await p.locator("#todoTabs button", { hasText: "大学" }).click(); await p.waitForTimeout(400);
  await menu(p, "「大学」をチェックリストにする");
  ok((await ls(p, "todoLists")).find((l) => l.id === "l-uni").check === true && !!(await p.$('#todoTabs button:has-text("大学") use[href="#i-checklist"]')), "⑤ made one, its tab marked");
  await p.click("#todoMore"); await p.waitForTimeout(300);
  ok(!(await p.$('#todoMenuGroup button:has-text("買い物リスト")')) && !!(await p.$('#todoMenuGroup button:has-text("チェックリストをやめる")')), "⑤ その他: not a 買い物リスト too; やめる");
  await p.locator("#todoMenuGroup button", { hasText: "チェックリストをやめる" }).click(); await p.waitForTimeout(400);
  ok(!(await ls(p, "todoLists")).find((l) => l.id === "l-uni").check, "⑤ back to a list");

  // ⑩ いつものセット by the days before a date: asked for, then from the 期限
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(400);
  await p.click("#todoAdd"); await p.waitForTimeout(700);
  await p.fill("#todoDue", ""); await p.dispatchEvent("#todoDue", "change"); await p.waitForTimeout(200);
  const chips = await p.evaluate(() => [...document.querySelectorAll("#todoSetPick .chip-btn")].map((x) => x.textContent));
  ok(JSON.stringify(chips) === '["レポート提出4件・日付つき","旅行の準備2件"]', "⑩ a set with days before says so", chips);
  await p.locator("#todoSetPick .chip-btn", { hasText: "レポート提出" }).click(); await p.waitForTimeout(300);
  ok(!!(await p.$("#td5SetDay")), "⑩ no 期限 in: the day asked");
  await p.fill("#td5SetDay", "2026-11-25"); await p.locator("#todoSetPick button", { hasText: "この日に合わせて追加" }).click(); await p.waitForTimeout(600);
  const got = (await ls(p, "todos")).filter((x) => ["資料を集める", "下書きを書く", "見直す", "提出する"].includes(x.text)).map((x) => `${x.text}:${x.due}`);
  ok(JSON.stringify(got) === '["資料を集める:2026-11-18","下書きを書く:2026-11-22","見直す:2026-11-24","提出する:2026-11-25"]', "⑩ each by its days before", got);
  await undo(p);
  await p.fill("#todoDue", "2026-11-14"); await p.dispatchEvent("#todoDue", "change"); await p.waitForTimeout(200);
  await p.locator("#todoSetPick .chip-btn", { hasText: "レポート提出" }).click(); await p.waitForTimeout(600);
  const got2 = (await ls(p, "todos")).filter((x) => ["資料を集める", "下書きを書く", "見直す", "提出する"].includes(x.text)).map((x) => `${x.text}:${x.due}`);
  ok(JSON.stringify(got2) === '["資料を集める:2026-11-11","下書きを書く:2026-11-11","見直す:2026-11-13","提出する:2026-11-14"]' && (await status(p)).includes("1 件は日が過ぎるので、きょうにしました"), "⑩ from the 期限 in; one past today: today", [got2, await status(p)]);
  await p.click("#sheetCancel"); await p.waitForTimeout(600);
  // its lines in 編集 say the days, and are read back
  await p.click("#todoSettings"); await p.waitForTimeout(800);
  await p.locator("#tdSetRows button", { hasText: "レポート提出" }).click(); await p.waitForTimeout(300);
  const ta = await p.inputValue("#tdSetRows textarea");
  ok(ta === "資料を集める（7日前）\n下書きを書く（3日前）\n見直す（前日）\n提出する", "⑩ in 編集, a line each with its days", ta);
  await p.fill("#tdSetRows textarea", ta + "\n印刷する（2日前）\n読み直す（1週間前）"); await p.locator("#tdSetRows button", { hasText: "保存" }).click(); await p.waitForTimeout(500);
  const s1 = (await ls(p, "settings")).find((x) => x.id === "todoSets").list.find((s) => s.id === "s1");
  ok(JSON.stringify(s1.items.slice(4)) === JSON.stringify([{ text: "印刷する", off: 2 }, { text: "読み直す", off: 7 }]) && s1.items[0].off === 7, "⑩ read back（2日前, 1週間前）", s1.items);
  ok(JSON.stringify(await W(p, "made", ["a", "b", "d"])) === JSON.stringify([{ text: "レポートを書く", memo: "テーマは環境問題", flag: true, listId: "l-uni", mins: 300, off: 8 }, { text: "英単語を覚える", flag: true, listId: "l-uni", mins: 60 }, { text: "部屋の片付け" }]),
    "⑩ made from ToDos picked: the days to the last 期限", await W(p, "made", ["a", "b", "d"]));
  ok(p.errs.length === 0, "no errors on the page", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
