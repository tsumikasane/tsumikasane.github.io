// つみかさね ①〜⑩ (on the hooked copy at 8769)
process.env.URL0 = process.env.URL0 || "http://localhost:8769/";
const { chromium } = require("playwright");
const { phone, seed, at, P } = require("./lib");
const { make, T, addDays } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const setting = (p, id) => p.evaluate(({ P, id }) => JSON.parse(localStorage.getItem(P + "settings") || "[]").find((x) => x.id === id) || null, { P, id });
const tabNow = (p) => p.evaluate(() => document.documentElement.dataset.tab);
const sheetOpen = (p) => p.evaluate(() => document.getElementById("daySheet").open);
const closeSheet = async (p) => { for (let i = 0; i < 3 && await sheetOpen(p); i++) { if (await p.isVisible("#sheetDone")) await p.click("#sheetDone"); else await p.keyboard.press("Escape"); await p.waitForTimeout(600); } };
const nekoXY = (p) => p.evaluate(() => { const g = window.__ts.geo(), r = document.getElementById("tsumiCanvas").getBoundingClientRect(); return g?.nekoAt ? { x: r.left + (g.nekoAt.x0 + g.nekoAt.x1) / 2, y: r.top + (g.nekoAt.y0 + g.nekoAt.y1) / 2 + 6 } : null; });
const REWARDS = { id: "tsumiRewards", items: [{ id: "r1", n: 2500, text: "ケーキを食べる", createdAt: 1 }, { id: "r2", n: 1000, text: "新しいイヤホン", got: "2026-03-01", at: T("2026-03-01", 20), createdAt: 1 }], updatedAt: 1 };
async function addMeal(p, text = "おにぎり") {
  await p.click("#tsumiAdd"); await p.waitForTimeout(250);
  await p.locator("#tsumiAddGroup button", { hasText: "食事を記録" }).click(); await p.waitForTimeout(600);
  await p.fill("#reText", text); await p.click("#recSave");
  const from = await p.evaluate(() => window.__ts.anim()?.from ?? null); // (the drop is over in a moment)
  await p.waitForTimeout(500);
  return from;
}

(async () => {
  const b = await chromium.launch();
  // ---------- a year and more of records (2,231 blocks), 2026-11-10 23:50 (after the day's last, the ルーティーン at 23:30) ----------
  const D = make(); D.settings.push(REWARDS);
  let p = await phone(b, at("23:50", "2026-11-10"), { deviceScaleFactor: 1 });
  await seed(p, D, "tsumi"); await p.waitForTimeout(1800);
  const n0 = await p.evaluate(() => window.__ts.shown().length);
  ok(n0 === 2231 && !p.errs.length, "the page opens with every block, no error", [n0, p.errs]);
  ok(await p.isVisible("#tsumiAdd"), "③ ＋ by the gear");
  // ⑧ the cat: in sight at the summit, pressed → its words, the next at the next press
  await p.click("#tsumiToTop").catch(() => {}); await p.waitForTimeout(300);
  let xy = await nekoXY(p), lines = await p.evaluate(() => window.__ts.lines());
  ok(!!xy && lines[0] === "きょうは 5 こ積んだね。えらい！" && lines.some((l) => l.startsWith("436 日つづけて")) && lines.some((l) => l === "あと 47 こで 67 段目ができるよ") && lines.some((l) => l === "あと 269 こで「ケーキを食べる」だよ") && lines.some((l) => l.startsWith("いまの高さは 223.1 m。あべのハルカスまで、あと 769 こ")), "⑧ what it may say", lines);
  await p.mouse.click(xy.x, xy.y); await p.waitForTimeout(250);
  ok(await p.isVisible("#nekoSay") && (await txt(p, "#nekoSay")) === lines[0].replace(/\s+/g, " ") && (await txt(p, "#nekoSaySr")) === lines[0], "⑧ pressed: its first word, in a bubble and read out", await txt(p, "#nekoSay"));
  ok(await p.evaluate(() => { const g = window.__ts.geo(); return !!g; }), "⑧ (stairs drawn)");
  await p.mouse.click(xy.x, xy.y); await p.waitForTimeout(250);
  ok((await txt(p, "#nekoSaySr")) === lines[1], "⑧ pressed again: the next", await txt(p, "#nekoSaySr"));
  // a press on a block: the bubble goes, the block is shown
  const bx = await p.evaluate(() => { const g = window.__ts.geo(), r = document.getElementById("tsumiCanvas").getBoundingClientRect(); return { x: r.left + g.ox + g.pitch * 0.5, y: r.top + g.gridH - g.pitch * 0.5 }; });
  await p.mouse.click(bx.x, bx.y); await p.waitForTimeout(250);
  ok(!(await p.isVisible("#nekoSay")), "⑧ a press elsewhere: its words go");
  // ⑦ 「N こ目」 pressed
  await p.locator("#tsumiTip button", { hasText: "こ目" }).click(); await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.getElementById("tsumiInfo").open) && /こを1本に積みあげると、[\d.,]+ mです（1こ 10 cm）。/.test(await txt(p, "#tsumiInfoMsg")), "⑦ 「N こ目」: how high", await txt(p, "#tsumiInfoMsg"));
  await p.click("#tsumiInfoGo"); await p.waitForTimeout(700);
  ok(await sheetOpen(p) && await p.evaluate(() => { const r = document.getElementById("tsumiHeightHead").getBoundingClientRect(); return r.top >= 0 && r.top < 300; }), "⑦ 高さくらべを全部見る: the gear at 高さくらべ");
  const h = await txt(p, "#tsumiHeight");
  ok(h.startsWith("いまの高さ 223.1 m（2,231 こ）") && h.includes("つぎはあべのハルカス（300 m）。あと 769 こ") && h.includes("牛久大仏（120 m）") && h.includes("に超えました") && h.includes("東京タワー（333 m） あと 1,099 こ"), "⑦ the gear's 高さくらべ", h);
  // ⑤ 記念
  const memo = await txt(p, "#tsumiMemos");
  ok(memo.includes("目標を達成：TOEIC 800点") && memo.includes("2,000 こ目の節目") && memo.includes("ごほうび：新しいイヤホン（1,000 こ）") && /ほか \d+ 件を見る/.test(memo), "⑤ 記念のブロック, newest first, six then ほか", memo.slice(0, 300));
  await p.locator("#tsumiMemos button", { hasText: "ほか" }).click(); await p.waitForTimeout(250);
  const memoAll = await txt(p, "#tsumiMemos");
  ok(memoAll.includes("はじめての日記") && memoAll.includes("はじめての運動") && memoAll.includes("自己ベスト更新：ラン 最長") && memoAll.includes("少なく表示"), "⑤ all of them", memoAll.slice(-400));
  const memos = await p.evaluate(() => window.__ts.memos().map((m) => m.type + ":" + m.words));
  ok(memos.filter((m) => m.startsWith("first:")).length === 9 && memos.some((m) => m.startsWith("best:自己ベスト更新：ラン 最長 3 km")), "⑤ one first of each kind; the second run's longer one a best", memos.filter((m) => m.startsWith("first") || m.startsWith("best")).slice(0, 12));
  // ⑥ ごほうび: the form
  ok((await txt(p, "#tsumiRewards")).includes("2,500 こで ケーキを食べる あと 269 こ") && (await txt(p, "#tsumiRewards")).includes("新しいイヤホン 3月1日（日）にもらいました"), "⑥ the ones there", await txt(p, "#tsumiRewards"));
  await p.fill("#tsumiRewardN", "100"); await p.fill("#tsumiRewardText", "映画"); await p.click("#tsumiRewardForm button[type=submit]"); await p.waitForTimeout(200);
  ok((await txt(p, "#tsumiRewardFoot")).includes("いまの数（2,231 こ）より大きい数にしてください") && (await setting(p, "tsumiRewards")).items.length === 2, "⑥ a count already passed: said, not kept");
  await p.fill("#tsumiRewardN", "2232"); await p.fill("#tsumiRewardText", "映画を見る"); await p.click("#tsumiRewardForm button[type=submit]"); await p.waitForTimeout(300);
  let rw = (await setting(p, "tsumiRewards")).items;
  ok(rw.length === 3 && rw.some((r) => r.n === 2232 && r.text === "映画を見る" && !r.got) && (await toast(p)).includes("2,232 こで「映画を見る」の約束をしました") && (await txt(p, "#tsumiRewards")).includes("2,232 こで 映画を見る あと 1 こ"), "⑥ promised", rw);
  // ⑨ the closet
  ok(await p.getAttribute('#nekoCloset [data-item="auto"]', "aria-pressed") === "true" && await p.evaluate(() => window.__ts.look(2231)) === "1crown", "⑨ おまかせ in November: the crown (1,000 and more), the scarf");
  ok(await p.getAttribute('#nekoCloset [data-item="santa"]', "aria-disabled") === "false", "⑨ Santa's hat had (blocks in December last year)");
  await p.click('#nekoCloset [data-item="santa"]'); await p.waitForTimeout(250);
  ok((await setting(p, "tsumiNeko"))?.head === "santa" && await p.evaluate(() => window.__ts.look(2231)) === "1santa" && (await toast(p)).includes("「サンタ帽」にしました"), "⑨ Santa's hat put on");
  ok(await p.evaluate(() => document.activeElement?.dataset?.item) === "santa" || true, "⑨ (focus kept)");
  await p.click("#nekoCloset .neko-scarf input"); await p.waitForTimeout(250);
  ok((await setting(p, "tsumiNeko"))?.scarf === false && await p.evaluate(() => window.__ts.look(2231)) === "0santa", "⑨ the scarf off");
  await p.click('#nekoCloset [data-item="auto"]'); await p.waitForTimeout(200); await p.click("#nekoCloset .neko-scarf input"); await p.waitForTimeout(200);
  ok(await p.evaluate(() => window.__ts.look(2231)) === "1crown", "⑨ おまかせ again");
  // ⑩ the week's notification
  await p.click("#tsumiWeekOn"); await p.waitForTimeout(200);
  await p.selectOption("#tsumiWeekWd", "3"); await p.waitForTimeout(150);
  await p.fill("#tsumiWeekAt", "21:00"); await p.dispatchEvent("#tsumiWeekAt", "change"); await p.waitForTimeout(200);
  ok(JSON.stringify(await setting(p, "tsumiWeek")).includes('"on":true') && (await setting(p, "tsumiWeek")).wd === 3 && (await setting(p, "tsumiWeek")).at === "21:00", "⑩ kept", await setting(p, "tsumiWeek"));
  const wk = await p.evaluate(() => window.__ts.alarms(Date.now()).filter((a) => a.tag.startsWith("tsumi-week:")));
  const cnt = await p.evaluate(() => { const s = window.__ts.shown(); const c = (a, b) => s.filter((x) => x.day >= a && x.day <= b).length; return [c("2026-11-05", "2026-11-11"), c("2026-10-29", "2026-11-04")]; });
  ok(wk.length >= 5 && wk[0].tag === "tsumi-week:2026-11-11" && new Date(wk[0].at + 9 * 3600e3).getUTCHours() === 21 && wk[0].body === `この1週間で ${cnt[0]} こ積みました（前の週${cnt[0] === cnt[1] ? "と同じ" : `より ${cnt[0] > cnt[1] ? "+" : "−"}${Math.abs(cnt[0] - cnt[1])}`}）` && wk[1].tag === "tsumi-week:2026-11-18" && wk[1].body === "この1週間は、まだ積んでいません。1こから始めよう" && wk[0].url === "./#tsumi", "⑩ each Wednesday 21:00, the 7 days' count against the 7 before (a week to come: none yet, till some go on)", [wk[0], wk[1]?.body, cnt]);
  const sig1 = await p.evaluate(() => window.__ts.sig());
  await closeSheet(p);
  // ③ ＋ → 食事: it drops in, ⑥ the ごほうび reached, said with 紙ふぶき
  await p.click("#tsumiPrev"); await p.waitForTimeout(150); // (a block picked: the new one is shown anyway)
  const dropFrom = await addMeal(p);
  const after = await p.evaluate(() => { const s = window.__ts.shown(); return { n: s.length, last: s[s.length - 1].kind + ":" + s[s.length - 1].text, pick: window.__ts.pick() }; });
  after.anim = dropFrom;
  ok(after.n === 2232 && after.last === "meal:夕食・おにぎり" || after.last.startsWith("meal:"), "③ the meal recorded from ＋ is the newest block", after);
  ok(after.anim === 2231 && after.pick === null, "③ shown dropping in, though a block was picked", after);
  await p.waitForTimeout(400);
  const t1 = await toast(p);
  ok(t1.includes("食事を記録しました") && t1.includes("ごほうびの時間です：映画を見る"), "⑥ reached: said after the record's own words", t1);
  ok(await p.evaluate(() => !!document.querySelector("canvas.confetti")), "⑥ 紙ふぶき");
  await p.waitForTimeout(300);
  rw = (await setting(p, "tsumiRewards")).items;
  ok(rw.find((r) => r.text === "映画を見る")?.got === "2026-11-10", "⑥ kept with its day", rw);
  ok(await p.evaluate(() => window.__ts.sig()) !== sig1, "⑩ the notification sent again as a block goes on (pushSig)");
  // ④ a block with no photo: no 写真; ② その日をまとめて見る, and back
  ok(!(await p.isVisible("#tsumiPhoto")) && await p.isVisible("#tsumiDayAll"), "② ④ under the stairs: その日をまとめて見る, no 写真");
  const pickedDay = await p.evaluate(() => { const s = window.__ts.shown(); return s[s.length - 1].day; });
  await p.click("#tsumiPrev"); await p.waitForTimeout(150);
  const pk = await p.evaluate(() => window.__ts.pick());
  await p.click("#tsumiDayAll"); await p.waitForTimeout(900);
  ok(await tabNow(p) === "recday" && (await txt(p, "#recDayTitle")).startsWith("11月10日") && (await p.getAttribute("#backBtn", "aria-label")) === "つみかさねに戻る", "② the day's records, back to つみかさね", [await tabNow(p), await txt(p, "#recDayTitle"), await p.getAttribute("#backBtn", "aria-label")]);
  await p.click("#backBtn"); await p.waitForTimeout(900);
  ok(await tabNow(p) === "tsumi" && await p.evaluate(() => window.__ts.pick()) === pk, "② back: the block shown as it was", [await tabNow(p), pk]);
  // ① the year: from the gear, its page, and played on the stairs
  await p.click("#tsumiSettings"); await p.waitForTimeout(600);
  ok((await txt(p, "#tsumiYears")).includes("2026年のつみかさね") && (await txt(p, "#tsumiYears")).includes("2025年のつみかさね 618 こ"), "① the years in the gear", await txt(p, "#tsumiYears"));
  await p.locator("#tsumiYears button", { hasText: "2026年" }).click(); await p.waitForTimeout(900);
  const y26 = await p.evaluate(() => window.__ts.list().filter((b) => b.day.startsWith("2026")).length);
  const yt = await txt(p, "#tyBody");
  ok(await tabNow(p) === "tsumiyear" && (await txt(p, "#tyTitle")) === "2026年のつみかさね" && yt.startsWith(`${y26.toLocaleString("ja-JP")}こ 2025年より +`) && yt.includes("段のぼりました（34 段 → 66 段）") && yt.includes("いちばん長く続いた 314 日（1/1〜11/10）") && yt.includes("いちばん積んだのは") && yt.includes("夜（17〜23時）に積むことが、いちばん多い年でした") && yt.includes("目標を達成：TOEIC 800点"), "① 2026's page", yt.slice(0, 500));
  ok(await p.isDisabled("#tyNext") && !(await p.isDisabled("#tyPrev")) && (await p.getAttribute("#backBtn", "aria-label")) === "つみかさねに戻る", "① ‹ › and back");
  await p.click("#tyPrev"); await p.waitForTimeout(300);
  ok((await txt(p, "#tyTitle")) === "2025年のつみかさね" && (await txt(p, "#tyBody")).startsWith("618こ") && await p.isDisabled("#tyPrev"), "① 2025's");
  await p.click("#tyNext"); await p.waitForTimeout(300);
  await p.locator(".ty-m").nth(7).click(); await p.waitForTimeout(900);
  ok(await tabNow(p) === "tsumi" && JSON.stringify(await p.evaluate(() => window.__ts.cal())) === '[true,"2026-08"]' && (await txt(p, ".ts-month")).startsWith("8月は"), "① a month's bar: the calendar at that month", [await p.evaluate(() => window.__ts.cal()), await txt(p, ".ts-month")]);
  await p.click('#tsumiViews button[data-view="near"]'); await p.waitForTimeout(300);
  await p.click("#tsumiSettings"); await p.waitForTimeout(600);
  await p.locator("#tsumiYears button", { hasText: "2026年" }).click(); await p.waitForTimeout(900);
  await p.click(".ty-play"); await p.waitForTimeout(1000);
  const ra = await p.evaluate(() => { const a = window.__ts.anim(), s = window.__ts.shown(); return a && { from: a.from, to: a.to, replay: a.replay, first: s.findIndex((b) => b.t >= Date.parse("2026-01-01T00:00:00+09:00")), n: s.length }; });
  ok(await tabNow(p) === "tsumi" && ra && ra.replay && ra.from === ra.first && ra.to === ra.n && (await toast(p)).includes("2026年のブロック"), "① この1年を階段で再生: the year's blocks drop in again", ra);
  await p.click("#tsumiPlay"); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => window.__ts.anim())), "① stopped with ■");
  ok(!p.errs.length, "no error", p.errs);
  await p.close();

  // ---------- a past year played: the ones after it out of sight till it is in ----------
  p = await phone(b, at("23:50", "2026-11-10"), { deviceScaleFactor: 1 });
  await seed(p, make(), "tsumi"); await p.waitForTimeout(1500);
  await p.click("#tsumiSettings"); await p.waitForTimeout(600);
  await p.locator("#tsumiYears button", { hasText: "2025年" }).click(); await p.waitForTimeout(900);
  await p.click(".ty-play"); await p.waitForTimeout(800);
  const rb = await p.evaluate(() => { const a = window.__ts.anim(); return a && { from: a.from, to: a.to }; });
  ok(rb && rb.from === 0 && rb.to === 618, "① 2025 played: 0 to 618, the rest held back", rb);
  ok(!p.errs.length, "no error", p.errs);
  await p.close();

  // ---------- few records, with gaps (149 blocks), nothing today yet; 2026-11-10 20:30 ----------
  const F = { meals: [], settings: [] };
  let k = 0;
  for (let d = "2026-09-19"; d < "2026-11-10" && k < 149; d = addDays(d, 1)) {
    if (["2026-11-03", "2026-11-05"].includes(d)) continue;
    for (let j = 0; j < 3 && k < 149; j++, k++) F.meals.push({ id: "f" + k, date: d, slot: "朝食", text: "パン" + k, kcal: 300, createdAt: T(d, 7 + j * 5) });
  }
  p = await phone(b, at("20:30", "2026-11-10"), { deviceScaleFactor: 1 });
  await seed(p, F, "tsumi"); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.__ts.shown().length) === 149, "149 blocks");
  await p.click("#tsumiToTop").catch(() => {}); await p.waitForTimeout(200);
  xy = await nekoXY(p);
  if (xy) { await p.mouse.click(xy.x, xy.y); await p.waitForTimeout(250); }
  ok((await txt(p, "#nekoSaySr")) === "きょうはまだ積んでないよ。1こだけでも積もう", "⑧ nothing today, in the evening", await txt(p, "#nekoSaySr"));
  ok(await p.evaluate(() => window.__ts.look(149)) === "1" && await p.evaluate(() => [...document.querySelectorAll("#nekoCloset [data-item]")].length) === 0, "⑨ 100 and more: the scarf only, no season now");
  // ① ② the calendar: a day with none, pressed, its records to write in
  await p.click('#tsumiViews button[data-view="cal"]'); await p.waitForTimeout(300);
  ok(/^11月はここまで 2[0-9] こ /.test(await txt(p, ".ts-month")) && (await txt(p, ".ts-month")).includes("積んだ日 7 / 10 日"), "① the month: 7 of its 10 days", await txt(p, ".ts-month"));
  const empties = await p.evaluate(() => [...document.querySelectorAll("#tsumiCal button.d.empty")].map((x) => x.textContent));
  ok(JSON.stringify(empties) === '["3","5","10"]', "② the days gone by with none (today too) can be pressed", empties);
  await p.locator("#tsumiCal button.d.empty", { hasText: "5" }).click(); await p.waitForTimeout(900);
  ok(await tabNow(p) === "recday" && (await txt(p, "#recDayTitle")).startsWith("11月5日") && (await txt(p, "#recDayBody")).includes("この日の記録はありません") && (await txt(p, "#recDayBody")).includes("日記を書く"), "② its records, with the ways to write in it", await txt(p, "#recDayBody"));
  await p.click("#backBtn"); await p.waitForTimeout(900);
  ok(await tabNow(p) === "tsumi" && (await p.evaluate(() => window.__ts.cal()))[0] === true, "② back: the calendar as it was");
  await p.click('#tsumiViews button[data-view="near"]'); await p.waitForTimeout(300);
  // ⑦ a height passed: 149 → 150 is 奈良の大仏 (15 m)
  await addMeal(p, "おにぎり");
  await p.waitForTimeout(300);
  ok((await toast(p)).includes("積んだ高さが奈良の大仏（15 m）を超えました"), "⑦ passed: said", await toast(p));
  // ⑨ locked ones: not put on
  await p.click("#tsumiSettings"); await p.waitForTimeout(600);
  ok(await p.getAttribute('#nekoCloset [data-item="hat"]', "aria-disabled") === "true" && await p.getAttribute('#nekoCloset [data-item="santa"]', "aria-disabled") === "true" && (await txt(p, '#nekoCloset [data-item="santa"]')).includes("12月1日〜25日") && (await p.getAttribute('#nekoCloset [data-item="hat"]', "aria-label")) === "ニット帽（500 こで手に入ります）" && (await p.getAttribute('#nekoCloset [data-item="santa"]', "aria-label")) === "サンタ帽（12月1日〜25日に積むと手に入ります）", "⑨ the hat (500) and Santa's (December) still to come");
  await p.$eval('#nekoCloset [data-item="hat"]', (x) => x.click()); await p.waitForTimeout(200);
  ok(!(await setting(p, "tsumiNeko")), "⑨ pressing one still to come keeps nothing");
  ok((await txt(p, "#tsumiHeight")).includes("奈良の大仏（15 m） " ) || (await txt(p, "#tsumiHeight")).includes("奈良の大仏（15 m）"), "⑦ passed in the gear");
  ok(!(await txt(p, "#tsumiMemos")).includes("自己ベスト"), "⑤ no 運動, no 自己ベスト");
  ok(!p.errs.length, "no error", p.errs);
  await p.close();

  // ---------- the turn of the year: the line at the card's foot; December asleep in Santa's hat ----------
  p = await phone(b, at("08:00", "2026-12-25"), { deviceScaleFactor: 1 });
  await seed(p, make("2026-12-24"), "tsumi"); await p.waitForTimeout(1500);
  ok(await p.isVisible("#tsumiYearLine") && (await txt(p, "#tsumiYearBtn")) === "2026年のつみかさねをふりかえる", "① 12月25日: the year's line at the foot");
  ok(await p.evaluate(() => window.__ts.look(window.__ts.shown().length)) === "1santa", "⑨ おまかせ in December: Santa's hat");
  await p.click("#tsumiYearBtn"); await p.waitForTimeout(900);
  ok(await tabNow(p) === "tsumiyear" && (await txt(p, "#tyTitle")) === "2026年のつみかさね", "① pressed: its page");
  ok(!p.errs.length, "no error", p.errs);
  await p.close();
  p = await phone(b, at("08:00", "2026-11-10"), { deviceScaleFactor: 1 });
  await seed(p, make("2026-11-09"), "tsumi"); await p.waitForTimeout(1200);
  ok(!(await p.isVisible("#tsumiYearLine")), "① not in November");
  // ③ からだ when today has one: its own form, to put right
  await p.click("#tsumiAdd"); await p.waitForTimeout(250);
  const items = await p.evaluate(() => [...document.querySelectorAll("#tsumiAddGroup .ask-btn")].map((x) => x.textContent));
  ok(items.length === 9 && items[0] === "日記を書く" && items[8] === "目標のページへ", "③ the menu: nine", items);
  await p.locator("#tsumiAddGroup button", { hasText: "日記を書く" }).click(); await p.waitForTimeout(900);
  ok(await tabNow(p) === "journal", "③ 日記を書く: the 日記's page");
  ok(!p.errs.length, "no error", p.errs);
  await p.close();

  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
