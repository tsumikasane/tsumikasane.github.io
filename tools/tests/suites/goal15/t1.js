// 目標 その15 ①〜⑩, through the hook build at 8835 (the insides) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8835/";
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
const W = (p, f, ...a) => p.evaluate(({ f, a }) => window.__g15[f](...a), { f, a });
const block = (p, name) => p.locator(".goal-open").filter({ has: p.locator(".title", { hasText: name }) }).first();
const open = async (p, name) => { await block(p, name).click(); await p.waitForTimeout(900); };
const done = async (p) => { await p.click("#sheetDone"); await p.waitForTimeout(500); };
const shown = (p, id) => p.evaluate((id) => { const x = document.getElementById(id); return !!x && !x.hidden && getComputedStyle(x).display !== "none"; }, id);
const sheetOpen = (p) => p.evaluate(() => document.getElementById("daySheet").open);
const undo = async (p) => { await p.locator((await sheetOpen(p)) ? "#sheetStatus button" : "#status button").first().click(); await p.waitForTimeout(600); };
const menuOf = (p, k) => p.evaluate((k) => document.querySelector(`.m-cell[data-k="${k}"]`).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), k);
const SAYINGS = ["継続は力なり", "千里の道も一歩から", "塵も積もれば山となる", "石の上にも三年", "急がば回れ", "七転び八起き", "雨垂れ石を穿つ", "初心忘るべからず", "好きこそ物の上手なれ", "習うより慣れろ",
  "案ずるより産むが易し", "失敗は成功のもと", "思い立ったが吉日", "為せば成る", "早起きは三文の徳", "今日できることを明日に延ばすな", "一念岩をも通す", "日進月歩", "有言実行", "一歩一歩、前へ"];
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-15T20:30:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, { goals: all(), settings, todos, events, journal }, "goal"); await p.waitForTimeout(1000);

  // ⑩ きょうのことば: an old saying, another at つぎ
  const word = async () => (await txt(p, "#goalWord .g15-word")) || "";
  const w1 = await word();
  ok((await txt(p, "#goalWord .g15-word-head")) === "きょうのことば" && SAYINGS.includes(w1), "⑩ a word for the day", w1);
  await p.click("#goalWordNext"); await p.waitForTimeout(200);
  const w2 = await word();
  ok(SAYINGS.includes(w2) && w2 !== w1, "⑩ つぎ: another", w2);
  // ⑧ 習慣になるまで: 単語帳2周 (counted, 月水金), four days so far
  ok((await txt(p, "#goalHabit")).startsWith("習慣になるまで（66日） 1 マス 単語帳2周 TOEIC 800点 4 / 66日") && (await p.$$eval("#goalHabit .g15-dots i.on", (x) => x.length)) === 3, "⑧ the counted cell on its way to a habit", await txt(p, "#goalHabit"));
  // ③ この1年の進めた日
  const yh = await txt(p, "#goalYear365 .goal-head");
  const sq = await p.$$eval("#goalYear365 .y3-sq", (xs) => [xs.length, xs.filter((x) => !x.classList.contains("out")).length, xs.filter((x) => x.classList.contains("today")).length, xs[xs.length - 1].title]);
  ok(/^この1年の進めた日 \d+日・\d+マス$/.test(yh || "") && sq[1] === 365 && sq[2] === 1 && sq[3].startsWith("11/15："), "③ the year's days, as grass", [yh, sq]);

  // ⑨ 30日前とくらべる・週末 (TOEIC), ⑦ 週のノルマのおすすめ
  await open(p, "TOEIC 800点");
  const cmp = await txt(p, "#mProgress .m-30");
  ok(/^30日前 \d+% → いま 46%（\+\d+%）・期限まで 週末はあと 12回$/.test(cmp || ""), "⑨ 30 days ago, and the weekends left", cmp);
  ok((await txt(p, "#mQuotaRec")) === "おすすめ：1週間に 1マス（期限まで 12週・のこり 7マス） これにする", "⑦ a 週のノルマ to suit", await txt(p, "#mQuotaRec"));
  await p.click("#mQuotaRecGo"); await p.waitForTimeout(500);
  ok((await goal(p, "g1")).quota === 1 && (await txt(p, "#mQuotaRec")).endsWith("いまのノルマです"), "⑦ put", await txt(p, "#mQuotaRec"));
  // ① 空き時間に入れる: 長文, 30 minutes from now
  const evs = (await ls(p, "events")).length;
  await menuOf(p, 4); await p.waitForTimeout(300);
  await p.locator("#mMenu button", { hasText: "空き時間に入れる" }).click(); await p.waitForTimeout(300);
  const slots = await p.$$eval("#mMenu button", (xs) => xs.map((x) => x.textContent));
  ok((await txt(p, "#mMenu .m-menu-head")) === "「長文」を入れる空き時間（30分）" && slots[0] === "きょう 20:30〜21:00" && slots.length === 6, "① the free times", slots);
  await p.locator("#mMenu button").first().click(); await p.waitForTimeout(700);
  let es = await ls(p, "events"), e = es.find((x) => x.title === "長文");
  let g1 = await goal(p, "g1");
  ok(es.length === evs + 1 && e?.date === "2026-11-15" && e.time === "20:30" && e.endTime === "21:00" && g1.mandala[4].ev?.includes(e.id) && (await status(p)).includes("「長文」を 11月15日（日） 20:30〜21:00 の予定に入れました"), "① a plan there, kept by the cell", [e, await status(p)]);
  await undo(p);
  es = await ls(p, "events"); g1 = await goal(p, "g1");
  ok(es.length === evs && !(g1.mandala[4].ev || []).includes(e.id), "① 元に戻す");
  // ⑤ ★ first; ⑥ sent as words
  await p.fill("#mReflect", "2つ目のふりかえり"); await p.click("#mReflectAdd"); await p.waitForTimeout(500);
  let rows = await p.$$eval("#mReflectList li .text", (xs) => xs.map((x) => x.textContent));
  ok(rows[0] === "2つ目のふりかえり" && rows[1] === "単語を毎日続けられた", "⑤ before: the newest first", rows);
  await p.locator("#mReflectList li", { hasText: "単語を毎日続けられた" }).locator(".note-star").click(); await p.waitForTimeout(500);
  rows = await p.$$eval("#mReflectList li .text", (xs) => xs.map((x) => x.textContent));
  ok((await goal(p, "g1")).notes.find((n) => n.id === "n1").star === true && rows[0] === "単語を毎日続けられた" && (await p.locator("#mReflectList li").first().locator(".note-star").getAttribute("aria-pressed")) === "true", "⑤ ★: first", rows);
  await p.evaluate(() => { window.__shared = null; Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => { window.__shared = d; } }); });
  ok((await txt(p, "#mNotesSendBtn")) === "ふりかえりを文字で送る（2件）", "⑥ offered", await txt(p, "#mNotesSendBtn"));
  await p.click("#mNotesSendBtn"); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__shared?.text)) === "「TOEIC 800点」のふりかえり（2件）\n11/15　2つ目のふりかえり\n11/10 ★　単語を毎日続けられた", "⑥ every ふりかえり as words", await p.evaluate(() => window.__shared));
  // ② 1マスずつ: 毎日15分 (いまやる) first; passed over, 模試2回目 (期限 past); できた
  ok((await txt(p, "#mOneRow")) === "1マスずつ片づける（のこり 7）", "② offered", await txt(p, "#mOneRow"));
  await p.click("#mOneStart"); await p.waitForTimeout(300);
  ok((await txt(p, "#mOne .one-name")) === "毎日15分" && (await txt(p, "#mOne .one-path")) === "リスニング" && !(await shown(p, "mOneRow")), "② the one in いまやる first", await txt(p, "#mOne"));
  await p.click("#mOneSkip"); await p.waitForTimeout(300);
  ok((await txt(p, "#mOne .one-name")) === "模試2回目" && (await txt(p, "#mOne .one-facts")) === "期限を 6日過ぎています" && (await txt(p, "#mOne .one-head strong")) === "1マスずつ（のこり 6・とばした 1）", "② passed over: the one past its 期限 next", await txt(p, "#mOne"));
  await p.click("#mOneDone"); await p.waitForTimeout(700);
  g1 = await goal(p, "g1");
  ok(g1.mandala[2].c[1].d === true && JSON.stringify(await W(p, "path")) === "[2]" && (await txt(p, "#mOne .one-name")) === "毎日30語", "② できた: checked, the chart at its level, the next", [JSON.stringify(await W(p, "path")), await txt(p, "#mOne .one-name")]);
  await p.click("#mOneEnd"); await p.waitForTimeout(300);
  ok(!(await shown(p, "mOne")), "② おわる");
  await done(p);

  // ④ これから届くお知らせ, ⑩ words of the user's own
  await p.click("#goalSettings"); await p.waitForTimeout(700);
  const up = await p.$$eval("#goalUpcoming li", (xs) => xs.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
  const ups = (await W(p, "alarms", await p.evaluate(() => Date.now()))).filter((a) => /^goal[:-]/.test(a.tag)).slice(0, 8);
  ok(up.length === ups.length && up.length >= 2 && up.every((x, i) => x.includes(ups[i].title)) && up.some((x) => /20:00 目標の見直し/.test(x)), "④ the goals' notifications to come, in order", up.slice(0, 6));
  await p.fill("#goalWordsText", "毎日すこしずつ\nやればできる"); await p.dispatchEvent("#goalWordsText", "change"); await p.waitForTimeout(400);
  ok(JSON.stringify((await setting(p, "goalWords"))?.list) === '["毎日すこしずつ","やればできる"]', "⑩ words of the user's own, kept");
  await done(p);
  ok(["毎日すこしずつ", "やればできる"].includes(await word()), "⑩ shown from them", await word());

  ok(!p.errs.length, "no errors", p.errs);
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  await b.close();
})();
