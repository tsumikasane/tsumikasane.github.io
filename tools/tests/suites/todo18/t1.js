// ToDo その18 ①〜⑩, through the hook build at 8826 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8826/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const todo = async (p, id) => (await ls(p, "todos")).find((t) => t.id === id);
const byText = async (p, text) => (await ls(p, "todos")).filter((t) => t.text === text);
const flat = (s) => (s ?? "").replace(/[\s   ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const status = (p) => p.evaluate(() => [document.getElementById("status")?.textContent || "", document.getElementById("sheetStatus").textContent].join("｜")).then(flat);
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__td18[f](...a), { f, a });
const menu = async (p, words) => { await p.click("#todoMore"); await p.waitForTimeout(300); await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(600); };
const hold = async (p, id) => { await p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`).closest("li").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), id); await p.waitForTimeout(300); };
const items = (p) => p.evaluate(() => [...document.querySelectorAll("#todoMenuGroup button")].map((x) => x.textContent));
const press = async (p, words) => { await p.locator("#todoMenuGroup button", { hasText: words }).first().click(); await p.waitForTimeout(500); };
const undo = async (p) => { await p.locator("#sheetStatus button:visible, #status button:visible").first().click(); await p.waitForTimeout(500); };
const heads = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList .dayhead [role=heading]")].map((x) => x.textContent));
const rowSub = (p, id) => p.evaluate((id) => document.querySelector(`#todoList [data-check="${id}"]`)?.closest("li")?.querySelector(".sub.due")?.innerText ?? null, id).then(flat);
const firstRows = (p, n) => p.evaluate((n) => [...document.querySelectorAll("#todoList [data-check]")].slice(0, n).map((x) => x.dataset.check), n);
const { T } = D;
async function open(b, when, o = {}) {
  const p = await phone(b, new Date(when), { deviceScaleFactor: 1, ...o });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  const data = D.all();
  // ⑤ the turn of ゴミ出し before this one, done with a ひとこと and a 経過メモ
  data.todos = [...data.todos, { id: "r0", text: "ゴミ出し", done: true, doneAt: T("2026-11-09", 8), due: "2026-11-09", next: "r1", doneNote: "袋が足りなかった", log: [{ text: "分別を確認", at: T("2026-11-09", 7) }], createdAt: T("2026-11-02") }];
  await seed(p, data, "todo"); await p.waitForTimeout(1200);
  return p;
}
const sheetTitle = (p) => p.evaluate(() => document.getElementById("sheetTitle").textContent);
const closeSheet = async (p) => { await p.evaluate(() => { const b = ["sheetDone", "sheetCancel"].map((id) => document.getElementById(id)).find((x) => x && !x.hidden); b?.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { if (document.getElementById("discardAsk").open) document.getElementById("discardYes").click(); }); await p.waitForTimeout(300); };
const moreItems = async (p) => { await p.click("#todoMore"); await p.waitForTimeout(300); const xs = await items(p); await p.keyboard.press("Escape"); await p.waitForTimeout(300); return xs.map(flat); };
const shown = (p) => p.evaluate(() => [...document.querySelectorAll("#todoList [data-check]")].map((x) => x.dataset.check).sort().join(","));
const find = async (p, q) => { await p.fill("#todoSearch", q); await p.waitForTimeout(400); return shown(p); };
(async () => {
  const b = await chromium.launch();
  const p = await open(b, "2026-11-11T08:30:00+09:00");
  const NOW = Date.parse("2026-11-11T08:30:00+09:00");

  // ---- ① はかる
  await hold(p, "c");
  ok((await items(p)).includes("はかり始める（かかった時間を残す）"), "① はかり始める in a row's menu", await items(p));
  await press(p, "はかり始める");
  ok((await todo(p, "c")).runAt === NOW, "① its start kept", await todo(p, "c"));
  ok((await rowSub(p, "c")).includes("はかっている0分"), "① on its row", await rowSub(p, "c"));
  await W(p, "update", "c", { runAt: NOW - 25 * 60e3 }); await p.waitForTimeout(400);
  ok((await rowSub(p, "c")).includes("はかっている25分"), "① the minutes since", await rowSub(p, "c"));
  await hold(p, "c");
  ok((await items(p)).map(flat).includes("はかるのをやめる（25分を足す）"), "① はかるのをやめる with the minutes", await items(p));
  await press(p, "はかるのをやめる");
  let c = await todo(p, "c");
  ok(c.focus === 25 && !c.runAt, "① stopped: its minutes added to the time spent", c);
  ok((await status(p)).includes("「メールに返信」に25分を足しました"), "① said so", await status(p));
  await undo(p);
  c = await todo(p, "c");
  ok(c.runAt === NOW - 25 * 60e3 && !c.focus, "① 元に戻す: measured still, nothing added", c);
  await p.click('#todoList [data-check="c"]'); await p.waitForTimeout(900);
  c = await todo(p, "c");
  ok(c.done && c.focus === 25 && !c.runAt, "① checked off: its minutes added", c);
  ok((await status(p)).includes("はかった25分を足しました") && (await status(p)).includes("見積もり15分→実際25分"), "① said as it is done", await status(p));
  await undo(p); await p.waitForTimeout(400);
  c = await todo(p, "c");
  ok(!c.done && c.runAt === NOW - 25 * 60e3 && !c.focus, "① taken back at once: measured still", c);
  await W(p, "update", "c", { runAt: undefined }); await p.waitForTimeout(300);
  ok(!(await rowSub(p, "c")).includes("はかっている"), "① gone from its row once it isn't measured", await rowSub(p, "c"));

  // ---- ② 次にやるサブタスク
  await W(p, "update", "g", { steps: [{ id: "g1", text: "スライドを作る", due: "2026-11-11" }, { id: "g2", text: "練習する" }] }); await p.waitForTimeout(300);
  const st = await W(p, "steps");
  ok(JSON.stringify(st) === JSON.stringify([["g", "g1"], ["b", "s2"]]), "② the first step to do of each, in the list's order", st);
  await menu(p, "次にやるサブタスク");
  let body = await txt(p, "#tdPanelBody");
  ok((await sheetTitle(p)) === "次にやるサブタスク" && body.includes("スライドを作る（きょうまで）") && body.includes("単語帳2章") && body.includes("英単語を覚える（1/3）"), "② its panel", body);
  await p.locator(".td18-steps li", { hasText: "単語帳 2章" }).locator(".td18-step").click(); await p.waitForTimeout(600);
  ok((await todo(p, "b")).steps.find((s) => s.id === "s2").done === true, "② its ring checks it off");
  body = await txt(p, "#tdPanelBody");
  ok(body.includes("小テスト") && body.includes("英単語を覚える（2/3）") && !body.includes("単語帳2章"), "② the next one in its place", body);
  await p.locator(".td18-step-of", { hasText: "プレゼン準備" }).click(); await p.waitForTimeout(900);
  ok((await p.inputValue("#reText")) === "プレゼン準備", "② its ToDo's name opens it");
  await closeSheet(p);

  // ---- ③ チェックリストを毎朝リセット
  await p.locator("#todoTabs button", { hasText: "持ち物" }).click(); await p.waitForTimeout(500);
  await menu(p, "「持ち物」を毎朝リセットする");
  let l = (await W(p, "lists")).find((x) => x.id === "l-pack");
  ok(l.ckDaily === true && l.ckDay === "2026-11-11", "③ set on the list, from tomorrow", l);
  ok((await status(p)).includes("あしたから毎朝チェックを外します"), "③ said so", await status(p));
  ok((await todo(p, "p1")).done && !(await todo(p, "p1")).ckOff, "③ nothing taken off today");
  await W(p, "list", "l-pack", { ckDay: "2026-11-10" }); await p.waitForTimeout(1500); // (as the next morning would find it)
  const p1 = await todo(p, "p1"), p2 = await todo(p, "p2"), fresh = (await byText(p, "財布")).filter((t) => !t.done);
  ok(p1.ckOff === true && fresh.length === 1 && fresh[0].listId === "l-pack", "③ the one checked before today checked again", { p1, fresh });
  ok(p2.done && !p2.ckOff, "③ the one checked today left checked", p2);
  ok((await W(p, "lists")).find((x) => x.id === "l-pack").ckDay === "2026-11-11", "③ once a day");
  ok((await status(p)).includes("けさは「持ち物」の1件のチェックを外しました（毎朝）"), "③ said so", await status(p));
  await undo(p);
  ok(!(await todo(p, "p1")).ckOff && !(await byText(p, "財布")).some((t) => !t.done), "③ 元に戻す");
  await p.waitForTimeout(900);
  ok(!(await byText(p, "財布")).some((t) => !t.done), "③ not again that day");
  await menu(p, "「持ち物」の毎朝のリセットをやめる");
  ok(!(await W(p, "lists")).find((x) => x.id === "l-pack").ckDaily, "③ taken off");
  await p.locator("#todoTabs button", { hasText: "すべて" }).click(); await p.waitForTimeout(500);
  ok(!(await moreItems(p)).some((x) => x.includes("毎朝リセット")), "③ only on a checklist's tab");

  // ---- ④ コンパクト表示
  const hA = () => p.evaluate(() => document.querySelector('#todoList [data-check="a"]').closest("li").getBoundingClientRect().height);
  const memoShown = () => p.evaluate(() => { const m = document.querySelector('#todoList [data-check="a"]').closest("li").querySelector(".ev-memo"); return !!m && getComputedStyle(m).display !== "none"; });
  const h0 = await hA();
  ok(await memoShown(), "④ a memo on its row at first");
  await menu(p, "コンパクトに表示する");
  ok(await p.evaluate(() => document.getElementById("sec-todo").classList.contains("td18-compact")), "④ the list compact");
  ok(!(await memoShown()) && (await hA()) < h0, "④ its memo left out, the row lower", [h0, await hA()]);
  ok((await p.evaluate((P) => localStorage.getItem(P + "td18Compact"), P)) === "true", "④ kept on this device");
  ok((await moreItems(p)).includes("ふつうの表示に戻す"), "④ and back");
  await menu(p, "ふつうの表示に戻す");
  ok((await memoShown()) && !(await p.evaluate(() => document.getElementById("sec-todo").classList.contains("td18-compact"))), "④ back as it was");

  // ---- ⑤ 前回のこと
  await W(p, "edit", "r1"); await p.waitForTimeout(900);
  const prev = await txt(p, "#rePrev18");
  ok(prev && prev === "前回11/9（月）：ひとこと「袋が足りなかった」・経過メモ「分別を確認」", "⑤ in the repeat's sheet", prev);
  await closeSheet(p);
  await W(p, "edit", "c"); await p.waitForTimeout(900);
  ok((await p.$("#rePrev18")) === null, "⑤ not on one with no turn before");
  await closeSheet(p);

  // ---- ⑥ 写真のあるToDo
  ok(!(await moreItems(p)).includes("写真のあるToDo"), "⑥ not offered with no photos");
  await W(p, "photo", "f"); await p.waitForTimeout(900);
  await menu(p, "写真のあるToDo");
  body = await txt(p, "#tdPanelBody");
  ok((await sheetTitle(p)) === "写真のあるToDo" && body.includes("銀行で振り込み") && (await p.locator(".td18-photos .td-thumb").count()) === 1, "⑥ its panel, with the photo", body);
  await p.locator(".td18-photo-name", { hasText: "銀行で振り込み" }).click(); await p.waitForTimeout(900);
  ok((await p.inputValue("#reText")) === "銀行で振り込み", "⑥ its name opens it");
  await closeSheet(p);

  // ---- ⑦ 探す条件
  ok((await find(p, "!")) === "a,b,e,g", "⑦ ! for 重要", await shown(p));
  ok((await txt(p, "#td18OpsLine")) === "条件：重要", "⑦ said under the field", await txt(p, "#td18OpsLine"));
  ok((await find(p, "! @大学 期限:あした")) === "a,g", "⑦ conditions together", await shown(p));
  ok((await txt(p, "#td18OpsLine")) === "条件：重要・リスト「大学」・期限があした", "⑦ each said", await txt(p, "#td18OpsLine"));
  ok((await find(p, "時間:30")) === "c", "⑦ 時間:30", await shown(p));
  ok((await find(p, "メール 期限:きょう")) === "c", "⑦ with words", await shown(p));
  ok((await find(p, "期限:切れ")) === "e", "⑦ 期限:切れ", await shown(p));
  ok((await find(p, "ギター 期限:なし")) === "sd1", "⑦ 期限:なし", await shown(p));
  ok((await find(p, "#")) === "", "⑦ # alone is a word", await shown(p));
  await p.fill("#todoSearch", ""); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById("td18OpsLine").hidden), "⑦ the line gone with the words");

  // ---- ⑧ 人ごとのToDo
  ok(!(await moreItems(p)).includes("人ごとのToDo"), "⑧ not offered with nobody named");
  await W(p, "update", "a", { from: "田中先生" }); await W(p, "update", "f", { wait: { since: "2026-11-09", who: "田中先生", days: 3 } }); await W(p, "update", "lw", { wait: { since: "2026-11-10", who: "佐藤さん", days: 3 } });
  await p.waitForTimeout(400);
  const ps = await W(p, "people");
  ok(JSON.stringify(ps) === JSON.stringify([{ who: "田中先生", from: ["a"], wait: ["f"] }, { who: "佐藤さん", from: [], wait: ["lw"] }]), "⑧ who asked and who is waited on", ps);
  await menu(p, "人ごとのToDo");
  body = await txt(p, "#tdPanelBody");
  ok(body.includes("田中先生（2件）") && body.includes("レポートを書く頼まれごと・期限") && body.includes("銀行で振り込み返事待ち・3日目") && body.includes("佐藤さん（1件）本を返す返事待ち・2日目"), "⑧ its panel", body);
  await closeSheet(p);

  // ---- ⑨ 完了カレンダー
  await menu(p, "完了カレンダー");
  ok((await sheetTitle(p)) === "完了カレンダー" && (await txt(p, ".td18-cal .td14-cal-title")) === "12件完了・8日" && (await txt(p, ".td18-cal .td14-cal-month")) === "11月", "⑨ the month's done ones", await txt(p, ".td18-cal .td14-cal-title"));
  const cell = (d) => p.locator(`.td18-cd[aria-label^="${d}、"]`);
  ok((await cell("11/10").getAttribute("class")).includes("l3") && (await cell("11/1").getAttribute("class")).includes("l2") && (await cell("11/9").getAttribute("class")).includes("l1"), "⑨ deeper the more", [await cell("11/10").getAttribute("class"), await cell("11/1").getAttribute("class")]);
  ok(await cell("11/12").isDisabled(), "⑨ the days to come not pressed");
  await cell("11/10").click(); await p.waitForTimeout(400);
  body = await txt(p, "#tdPanelBody");
  ok(body.includes("に終えたToDo（4件）") && /済んだこと4.*財布.*洗濯.*日記を書く/.test(body), "⑨ a day pressed: its done ones, in their order", body);
  await p.click('.td18-cal button[aria-label="前の月"]'); await p.waitForTimeout(400);
  ok((await txt(p, ".td18-cal .td14-cal-title")) === "8件完了・8日" && (await txt(p, ".td18-cal .td14-cal-month")) === "10月", "⑨ the month before", await txt(p, ".td18-cal .td14-cal-title"));
  await p.click('.td18-cal button[aria-label="次の月"]'); await p.waitForTimeout(400);
  ok(await p.locator('.td18-cal button[aria-label="次の月"]').isDisabled(), "⑨ no month after this one");
  await closeSheet(p);

  // ---- ⑩ きょうやるの上限
  await p.click("#todoSettings"); await p.waitForTimeout(900);
  ok((await p.locator("#td18TodayMax").count()) === 1 && (await p.inputValue("#td18TodayMax")) === "0", "⑩ in ToDo's 編集, none at first");
  await p.selectOption("#td18TodayMax", "3"); await p.waitForTimeout(400);
  ok((await W(p, "set")).todayMax === 3, "⑩ set", await W(p, "set"));
  await closeSheet(p);
  for (const id of ["c", "h", "k8"]) await W(p, "update", id, { today: "2026-11-11" });
  await p.waitForTimeout(400);
  await hold(p, "rp3"); await press(p, "きょうやるに入れる");
  ok(!(await todo(p, "rp3")).today && (await status(p)).includes("きょうやるは3件までにしています（いま3件）"), "⑩ one more not put in", await status(p));
  ok((await p.locator("#sheetStatus button:visible, #status button:visible").first().textContent()) === "それでも入れる", "⑩ with それでも入れる");
  await undo(p);
  ok((await todo(p, "rp3")).today === "2026-11-11", "⑩ それでも入れる puts it in");
  await W(p, "pick", "ra10"); await p.waitForTimeout(300);
  ok(!(await todo(p, "ra10")).today, "⑩ きょうやるを選ぶ too");
  await W(p, "pickMany", ["ra10", "j1"]); await p.waitForTimeout(300);
  ok(!(await todo(p, "ra10")).today && !(await todo(p, "j1")).today, "⑩ and several at once");
  await W(p, "max", 0); await p.waitForTimeout(300);
  await W(p, "pick", "ra10"); await p.waitForTimeout(300);
  ok((await todo(p, "ra10")).today === "2026-11-11", "⑩ none: as before");

  // ---- the guide
  const g = await W(p, "guide");
  ok(["はかる", "次にやるサブタスク", "探す条件", "チェックリストを毎朝リセット", "人ごとのToDo", "コンパクトに表示する", "きょうやるの上限", "完了カレンダー", "前回のこと", "写真のあるToDo"].every((w) => g.includes(`"${w}"`)), "the guide has them");

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
