// 目標 その2 ①〜⑩: each feature driven as a user would, on a phone
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id = "g1") => (await ls(p, "goals")).find((g) => g.id === id);
const menu = (p) => p.evaluate(() => (document.getElementById("mMenu").hidden ? [] : [...document.querySelectorAll("#mMenu button[role=menuitem]")].map((x) => x.textContent)));
const status = (p) => p.evaluate(() => document.getElementById("sheetStatus").textContent);
const hold = (p, sel, ms = 700) => p.evaluate(async ({ sel, ms }) => {
  const t = document.querySelector(sel), r = t.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const o = { pointerType: "touch", isPrimary: true, pointerId: 3, clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true };
  t.dispatchEvent(new PointerEvent("pointerdown", o)); await new Promise((f) => setTimeout(f, ms)); t.dispatchEvent(new PointerEvent("pointerup", o));
  t.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, bubbles: true, cancelable: true, detail: 1 }));
}, { sel, ms });
const G1 = { id: "g1", title: "TOEIC 800点", criterion: "TOEIC 800点", deadline: "2027-01-31", depth: 2, done: false, createdAt: T("2026-09-20"),
  mandala: [{ t: "単語", c: [{ t: "単語帳1周", d: true, at: T("2026-11-08", 21) }, { t: "単語帳2周" }, { t: "毎日30語" }, null, null, null, null, null] },
    { t: "文法", d: true, at: T("2026-11-01", 20) }, { t: "模試", c: [{ t: "模試1回目", d: true, at: T("2026-10-10", 15) }, { t: "模試2回目", due: "2026-11-12" }, null, null, null, null, null, null] },
    { t: "リスニング" }, { t: "長文" }, { t: "語彙アプリ" }, null, null] };
const G2 = { id: "g2", title: "体重を60kgにする", criterion: "体重 60kg", deadline: "2027-03-31", depth: 2, done: false, createdAt: T("2026-10-20"),
  mandala: [{ t: "食事" }, { t: "運動", c: [{ t: "週3回筋トレ", d: true, at: T("2026-10-25") }, { t: "1日8000歩" }, null, null, null, null, null, null] }, null, null, null, null, null, null] };
const G3 = { id: "g3", title: "簿記3級に合格する", criterion: "合格", deadline: "2026-10-31", depth: 2, done: true, doneAt: T("2026-10-30", 18), createdAt: T("2026-09-01"),
  notes: [{ id: "n1", at: T("2026-10-30", 21), text: "毎朝30分の過去問が効いた。次は2級。" }],
  mandala: [{ t: "仕訳", c: [{ t: "テキスト1周", d: true, at: T("2026-09-10") }, { t: "問題集1周", d: true, at: T("2026-09-24") }, null, null, null, null, null, null] },
    { t: "過去問", c: [{ t: "過去問5回分", d: true, at: T("2026-10-12") }, { t: "時間を計って解く", d: true, at: T("2026-10-14") }, { t: "合格点を超える", d: true, at: T("2026-10-20") }, null, null, null, null, null] },
    { t: "本番", d: true, at: T("2026-10-30", 12) }, null, null, null, null, null] };
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T12:00:00+09:00"), { deviceScaleFactor: 1 });
  await seed(p, { goals: [G1, G2, G3] }, "goal"); await p.waitForTimeout(900);

  // ③ 次の一歩: three, each from another element, the 期限 one first; pressed, the cell lit at its level
  const next = await p.evaluate(() => [...document.querySelectorAll("#goalNext li")].map((li) => li.querySelector(".text").textContent + "｜" + li.querySelector(".sub").textContent));
  ok(!(await p.evaluate(() => document.getElementById("goalNext").hidden)) && next.length === 3, "③ three next steps over the goals", next);
  ok(next[0].startsWith("模試2回目｜期限はあしたです"), "③ the one due tomorrow first", next[0]);
  ok(next.some((x) => /あと \d マスで「.+」が終わります/.test(x)), "③ an element nearly done", next);
  ok(next.some((x) => /は \d+ 日進めていません|まだ1マスも進めていません/.test(x)), "③ an element left alone", next);
  await p.locator("#goalNext button").first().click(); await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.getElementById("mTrail").textContent.includes("TOEIC") && !!document.querySelector('.m-cell[data-k="1"].spot') && document.querySelector('.m-cell[data-k="1"] .m-text').textContent === "模試2回目"), "③ pressed: its chart at 模試, the cell lit");
  await p.click("#sheetCancel"); await p.waitForTimeout(400);
  // ③ gone while words are looked for, back after
  await p.click("#sheetDone").catch(() => {}); await p.waitForTimeout(500);
  await p.fill("#goalFind", "単語"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("goalNext").hidden), "③ hidden while searching");
  await p.click("#goalFindClear"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.getElementById("goalNext").hidden)), "③ back once the words are gone");

  // open TOEIC's chart
  await p.locator(".goal-open", { hasText: "TOEIC" }).first().click(); await p.waitForTimeout(900);
  // ① held 長文: 回数・量を数える; 10 ページ
  await hold(p, '.m-cell[data-k="4"]'); await p.waitForTimeout(300);
  const m1 = await menu(p);
  ok(m1.includes("回数・量を数える（＋1で進める）") && m1.includes("色を付ける"), "① ⑦ the menu has 数える and 色", m1);
  await p.locator("#mMenu button", { hasText: "回数・量を数える" }).click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.activeElement?.classList.contains("m-cnt-in")), "① its form, the number focused");
  await p.keyboard.type("4"); await p.locator("#mMenu .m-cnt-units button", { hasText: "ページ" }).click();
  await p.locator("#mMenu button[type=submit]").click(); await p.waitForTimeout(500);
  let c = (await goal(p)).mandala[4];
  ok(c.n === 4 && c.v === 0 && c.u === "ページ" && !c.d, "① saved: 0/4ページ", c);
  ok(await p.evaluate(() => document.querySelector('.m-cell[data-k="4"] .m-num').textContent === "0/4ページ" && !!document.querySelector('.m-cell[data-k="4"] .m-cnt')), "① its ring and 0/4ページ");
  const pct0 = await p.evaluate(() => document.querySelector(".m-center .m-pct").textContent);
  // ＋1 twice: 2/4, the cell half filled, the goal's % up by half a cell
  await p.click('.m-cell[data-k="4"] .m-cnt'); await p.waitForTimeout(300);
  await p.click('.m-cell[data-k="4"] .m-cnt'); await p.waitForTimeout(400);
  c = (await goal(p)).mandala[4];
  ok(c.v === 2 && c.log?.["2026-11-11"] === 2 && !c.d, "① ＋1 twice: 2, two today", c);
  ok((await status(p)).includes("「長文」2/4ページ"), "① said with its count", await status(p));
  ok(await p.evaluate(() => document.querySelector('.m-cell[data-k="4"]').style.getPropertyValue("--cnt") === "50%"), "① the cell half filled");
  const pct1 = await p.evaluate(() => document.querySelector(".m-center .m-pct").textContent);
  ok(parseInt(pct1) > parseInt(pct0), "① the goal's % went up with it", [pct0, pct1]);
  // 元に戻す: back to 1
  await p.locator("#sheetStatus button").click(); await p.waitForTimeout(400);
  ok((await goal(p)).mandala[4].v === 1, "① 元に戻す: one back", (await goal(p)).mandala[4]);
  // to 4: done, with the day
  for (let i = 0; i < 3; i++) { await p.click('.m-cell[data-k="4"] .m-cnt'); await p.waitForTimeout(300); }
  c = (await goal(p)).mandala[4];
  ok(c.v === 4 && c.d === true && c.at > 0, "① to 4: done", c);
  ok(await p.evaluate(() => document.querySelector('.m-cell[data-k="4"]').classList.contains("done") && document.querySelector('.m-cell[data-k="4"] .m-date')?.textContent === "11/11"), "① shown done, with the day");
  // its check pressed: one back
  await p.click('.m-cell[data-k="4"] [data-role="check"]'); await p.waitForTimeout(400);
  c = (await goal(p)).mandala[4];
  ok(c.v === 3 && !c.d, "① the check pressed once done: 3/4, to do", c);
  // 数を直す: いま 4 → done; やめる
  await hold(p, '.m-cell[data-k="4"]'); await p.waitForTimeout(300);
  ok((await menu(p)).some((x) => x === "回数・量を直す（3/4ページ）"), "① held again: 直す with its count", await menu(p));
  await p.locator("#mMenu button", { hasText: "回数・量を直す" }).click(); await p.waitForTimeout(300);
  await p.fill('#mMenu input[aria-label="いまの数"]', "4"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  ok((await goal(p)).mandala[4].d === true, "① いまの数 4: done");
  await hold(p, '.m-cell[data-k="4"]'); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "回数・量を直す" }).click(); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "数えるのをやめる" }).click(); await p.waitForTimeout(400);
  c = (await goal(p)).mandala[4];
  ok(!c.n && !c.v && c.d === true && c.log?.["2026-11-11"] === 3 && c.u === "ページ", "① やめる: a plain cell (done), its days kept (a correction is no count)", c);

  // ⑦ 色: 単語 blue; its cell tinted, inside it the view in blue, 全体 too
  await hold(p, '.m-cell[data-k="0"]'); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "色を付ける" }).click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll("#mMenu .pal-c").length === 12), "⑦ twelve colours");
  await p.locator('#mMenu .pal-c[aria-label="青"]').click(); await p.waitForTimeout(400);
  ok((await goal(p)).mandala[0].co === "#1e6ef4" && (await status(p)).includes("「単語」を青にしました"), "⑦ saved and said", (await goal(p)).mandala[0]);
  ok(await p.evaluate(() => { const b = document.querySelector('.m-cell[data-k="0"]'); return b.classList.contains("el-c") && b.style.getPropertyValue("--goal-c") === "#1e6ef4" && getComputedStyle(b).boxShadow.includes("inset"); }), "⑦ its cell tinted, a line along the top");
  await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => { const v = document.getElementById("mandalaView"); return v.classList.contains("el-view") && v.style.getPropertyValue("--goal-c") === "#1e6ef4"; }), "⑦ inside 単語: the chart in its colour");
  // ⑥ an empty cell written in: words for it (単語's from the 雛形 and the list)
  await p.locator('.m-cell[data-k="3"]').click(); await p.waitForTimeout(300);
  const sug = await p.evaluate(() => (document.getElementById("mSuggest").hidden ? [] : [...document.querySelectorAll("#mSuggest button")].map((x) => x.textContent)));
  ok(sug.length >= 5 && sug.includes("単語帳を1冊決める") && sug.includes("音声で覚える") && !sug.includes("単語帳1周"), "⑥ words for an empty cell in 単語", sug);
  await p.locator("#mSuggest button", { hasText: "音声で覚える" }).click(); await p.waitForTimeout(500);
  ok((await goal(p)).mandala[0].c[3]?.t === "音声で覚える", "⑥ pressed: written in", (await goal(p)).mandala[0].c[3]);
  ok(await p.evaluate(() => document.activeElement?.dataset?.k === "4" && !document.getElementById("mSuggest").hidden && ![...document.querySelectorAll("#mSuggest button")].some((x) => x.textContent === "音声で覚える")), "⑥ on to the next empty one, the word used gone from the list");
  await p.keyboard.type("x"); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById("mSuggest").hidden), "⑥ typing: the words go");
  await p.keyboard.press("Backspace"); await p.click("#sheetTitle"); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById("mSuggest").hidden), "⑥ left: the words go");
  await p.click("#sheetCancel"); await p.waitForTimeout(500);
  // ⑦ 全体: 単語's block and its cell in the goal's block
  await p.click('button[data-view="whole"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => { const bl = [...document.querySelectorAll("#mGrid .m-block")]; return bl[0].classList.contains("el-c") && bl[4].children[0].classList.contains("el-c") && !bl[1].classList.contains("el-c"); }), "⑦ 全体: its block, its cell in the goal's block");
  await p.click('button[data-view="cells"]'); await p.waitForTimeout(400);
  // ⑥ at the goal's level: elements (TOEIC → the 語学 雛形)
  await p.locator('.m-cell[data-k="6"]').click(); await p.waitForTimeout(300);
  const sug2 = await p.evaluate(() => [...document.querySelectorAll("#mSuggest button")].map((x) => x.textContent));
  ok(sug2.includes("リーディング") && sug2.includes("スピーキング") && !sug2.includes("単語") && !sug2.includes("リスニング"), "⑥ the goal's level: elements for TOEIC, not those written", sug2);
  await p.click("#sheetTitle"); await p.waitForTimeout(300);

  // ② 週のノルマ: 3 a week; this week's in the progress and on the block
  await p.selectOption("#mQuota", "3"); await p.waitForTimeout(500);
  let g = await goal(p);
  ok(g.quota === 3 && JSON.stringify(g.quotaLog) === '[["2026-11-11",3]]', "② saved with its day", [g.quota, g.quotaLog]);
  const qrow = await p.evaluate(() => [...document.querySelectorAll("#mProgress .m-quota, #mProgress .m-quota + p")].map((x) => x.textContent).join("｜"));
  ok(/今週.*\/3マス/.test(qrow) && qrow.includes("今週のノルマまで、あと"), "② this week's in the progress", qrow);
  ok((await p.evaluate(() => document.getElementById("mQuotaFoot").textContent)).includes("1週間で 3 マス"), "② its foot");

  // ⑩ しばらく進めていないお知らせ: 7 days
  await p.selectOption("#mNudge", "7"); await p.waitForTimeout(500);
  ok((await goal(p)).nudge === 7, "⑩ saved");
  const foot = await p.evaluate(() => document.getElementById("mNudgeFoot").textContent);
  ok(foot.includes("最後に進めたのは") && foot.includes("9:00 にお知らせします"), "⑩ its foot says when", foot);

  // ④ 進めた日: grass and bars
  const mv = await p.evaluate(() => ({ days: document.querySelectorAll("#mMoves .mv-grass .mv-d").length, lit: document.querySelectorAll("#mMoves .mv-grass .mv-d:not(.l0)").length,
    bars: document.querySelectorAll("#mMoves .mv-bar").length, read: document.querySelector("#mMoves .mv-read").textContent, months: [...document.querySelectorAll("#mMoves .mv-m")].map((x) => x.textContent) }));
  ok(mv.days === 84 && mv.bars === 8 && mv.lit >= 3, "④ 12 weeks of days, 8 bars, some lit", mv);
  ok(mv.read.includes("この12週で") && mv.read.includes("いちばん進んだのは"), "④ said in words", mv.read);
  await p.locator('#mMoves .mv-d[title^="11月8日"]').click(); await p.waitForTimeout(200);
  ok((await p.evaluate(() => document.querySelector("#mMoves .mv-read").textContent)).startsWith("11月8日（日）：1 マス進めました"), "④ a day pressed: what it holds", await p.evaluate(() => document.querySelector("#mMoves .mv-read").textContent));
  await p.locator("#mMoves .mv-bar.now").click(); await p.waitForTimeout(200);
  ok((await p.evaluate(() => document.querySelector("#mMoves .mv-read").textContent)).includes("（今週）"), "④ a bar pressed: its week");

  // ① the steps: a day counted
  ok(await p.evaluate(() => [...document.querySelectorAll("#mSteps li")].some((li) => li.textContent.includes("長文 ＋3ページ"))), "① これまでの歩み: 長文 ＋3ページ", await p.evaluate(() => document.getElementById("mSteps").innerText));

  // ⑧ 文字で送る: copied (no share sheet here)
  await p.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await p.evaluate(() => { delete navigator.share; Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
  await p.click("#mShare"); await p.waitForTimeout(500);
  const text = await p.evaluate(() => navigator.clipboard.readText());
  ok(text.startsWith("【目標】TOEIC 800点\n達成基準：TOEIC 800点\n期限：2027年1月31日（日）・あと 81 日\n進み具合："), "⑧ its head", text.slice(0, 80));
  ok(text.includes("⬜ 単語（") && text.includes("　✅ 単語帳1周") && text.includes("　⬜ 単語帳2周") && text.includes("✅ 文法") && text.includes("今週のノルマ："), "⑧ the cells, done and not, inside a step in", text);
  ok((await status(p)).includes("コピーしました"), "⑧ said");
  await p.click("#sheetDone"); await p.waitForTimeout(600);
  // ② on the block
  ok(await p.evaluate(() => [...document.querySelectorAll(".goal")].find((x) => x.textContent.includes("TOEIC"))?.querySelector(".goal-quota")?.textContent.startsWith("今週 ")), "② 今週 n/3 on the block");

  // ⑤ 節目: 体重 at 25% (運動 half done, 食事 not); 運動's last one checked: 50%, and 運動 finished, with 紙ふぶき, said once
  await p.locator(".goal-open", { hasText: "体重" }).first().click(); await p.waitForTimeout(800);
  await p.click('.m-cell[data-k="1"] [data-role="open"]'); await p.waitForTimeout(400);
  await p.click('.m-cell[data-k="1"] [data-role="check"]'); await p.waitForTimeout(400);
  g = await goal(p, "g2");
  ok(Array.isArray(g.miles) && g.miles.includes("p25") && g.miles.includes("p50") && g.miles.includes("e運動"), "⑤ 25% (already) and 50% and 運動 kept as said", g.miles);
  ok((await status(p)).includes("「体重を60kgにする」が 50% まで来ました。「運動」の2マスがぜんぶ終わりました"), "⑤ said", await status(p));
  ok(await p.evaluate(() => !!document.querySelector("canvas.confetti")), "⑤ 紙ふぶき");
  await p.click('.m-cell[data-k="1"] [data-role="check"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { document.getElementById("sheetStatus").textContent = ""; });
  await p.click('.m-cell[data-k="1"] [data-role="check"]'); await p.waitForTimeout(400);
  ok((await status(p)) === "", "⑤ off and on again: not said twice", await status(p));
  // the goal achieved: its own words
  await p.click("#sheetCancel"); await p.waitForTimeout(400);
  await p.click('.m-cell[data-k="0"] [data-role="check"]'); await p.waitForTimeout(400);
  ok((await status(p)).includes("「体重を60kgにする」を達成しました") && !(await status(p)).includes("まで来ました"), "⑤ the last one: the goal achieved (its own words only)", await status(p));
  await p.click("#sheetDone"); await p.waitForTimeout(500);

  // ⑨ 達成の記録: the achieved goal's card
  await p.click('#goalFilters button[data-filter="done"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById("goalNext").hidden), "③ none over the achieved");
  await p.locator(".goal-open", { hasText: "簿記" }).first().click(); await p.waitForTimeout(800);
  const rec = await p.evaluate(() => ({ hidden: document.getElementById("mRecord").hidden, text: document.getElementById("mRecord").innerText, plan: document.getElementById("mTwoPlan").hidden }));
  ok(!rec.hidden && rec.text.includes("達成の記録") && rec.text.includes("2026年") === false && rec.text.includes("10月30日（金）に達成"), "⑨ the card, the day achieved", rec.text);
  ok(rec.text.includes("60日") && rec.text.includes("6/6") && rec.text.includes("6日") && rec.text.includes("毎朝30分の過去問が効いた"), "⑨ days, cells, days moved, the last ふりかえり", rec.text);
  ok(rec.plan, "⑨ no quota or nudge once achieved");
  const dl = p.waitForEvent("download", { timeout: 4000 }).catch(() => null);
  await p.locator("#mRecord button", { hasText: "画像で保存" }).click();
  const file = await dl;
  ok(!!file && /tsumikasane-goal-2026-10-30\.png/.test(file.suggestedFilename()), "⑨ saved as a picture", file && file.suggestedFilename());

  ok(p.errs.length === 0, "no errors on the page", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
