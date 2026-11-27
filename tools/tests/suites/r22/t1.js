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
  const D = make(); D.settings.push(REWARDS, { id: "tsumiNeko", head: "santa", scarf: false, updatedAt: 1 }); // (着せかえ's, picked before it was taken out)
  D.settings.push({ id: "tsumiDaySum", on: true, at: "23:59", updatedAt: 1 }); // (1日のまとめのお知らせ's, on before it was taken out)
  let p = await phone(b, at("23:50", "2026-11-10"), { deviceScaleFactor: 1 });
  await seed(p, D, "tsumi"); await p.waitForTimeout(1800);
  const n0 = await p.evaluate(() => window.__ts.shown().length);
  ok(n0 === 2231 && !p.errs.length, "the page opens with every block, no error", [n0, p.errs]);
  ok(await p.isVisible("#tsumiAdd"), "③ ＋ by the gear");
  // ⑧ the cat: in sight at the summit, pressed → its words, the next at the next press
  await p.click("#tsumiToTop").catch(() => {}); await p.waitForTimeout(300);
  let xy = await nekoXY(p), lines = await p.evaluate(() => window.__ts.lines());
  ok(!!xy && lines[0] === "きょうは 5 こ積んだね。えらい！" && lines.some((l) => l.startsWith("436 日つづけて")) && lines.some((l) => l === "あと 47 こで 67 段目ができるよ") && lines.some((l) => l === "あと 269 こで「ケーキを食べる」だよ") && !lines.some((l) => /^(いまの高さは|このペースなら|きょうの目標まで|今月の目標まで)/.test(l)), "⑧ what it may say (高さ, このペースなら, the goals: taken out with them, 2026-11-21)", lines);
  await p.mouse.click(xy.x, xy.y); await p.waitForTimeout(250);
  ok(await p.isVisible("#nekoSay") && (await txt(p, "#nekoSay")) === lines[0].replace(/\s+/g, " ") && (await txt(p, "#nekoSaySr")) === lines[0], "⑧ pressed: its first word, in a bubble and read out", await txt(p, "#nekoSay"));
  ok(await p.evaluate(() => { const g = window.__ts.geo(); return !!g; }), "⑧ (stairs drawn)");
  await p.mouse.click(xy.x, xy.y); await p.waitForTimeout(250);
  ok((await txt(p, "#nekoSaySr")) === lines[1], "⑧ pressed again: the next", await txt(p, "#nekoSaySr"));
  // a press on a block: the bubble goes, the block is shown
  const bx = await p.evaluate(() => { const g = window.__ts.geo(), r = document.getElementById("tsumiCanvas").getBoundingClientRect(); return { x: r.left + g.ox + g.pitch * 0.5, y: r.top + g.gridH - g.pitch * 0.5 }; });
  await p.mouse.click(bx.x, bx.y); await p.waitForTimeout(250);
  ok(!(await p.isVisible("#nekoSay")), "⑧ a press elsewhere: its words go");
  // ⑦ 高さくらべ: taken out at the user's call (2026-11-21, tools/REMOVED.md): 「N こ目」 a word again, no press for the height
  ok(await p.locator("#tsumiTip button", { hasText: "こ目" }).count() === 0 && (await txt(p, "#tsumiTip")).includes("こ目") && !(await p.$("#tsumiInfo")), "⑦ 「N こ目」: no press for the height", await txt(p, "#tsumiTip"));
  await p.click("#tsumiSettings"); await p.waitForTimeout(700);
  ok(await sheetOpen(p) && !(await p.$("#tsumiHeight")) && !(await txt(p, "#tsumiGroup")).includes("高さくらべ"), "⑦ the gear: no 高さくらべ");
  // ③ (2026-11-21) the gear's ten taken out at the user's call: none of them, and its contents without 手紙 and つみねこ
  const gear = await txt(p, "#tsumiGroup");
  const left = ["未来の自分への手紙", "高さくらべ", "このペースなら", "今月の目標", "ことしの目標", "きょうの目標", "つみねこの名前", "なかよし度", "つみねこの日記", "着せかえ", "おすすめ："].filter((w) => gear.includes(w));
  ok(!left.length, "the gear: none of the ten", left);
  const toc = await p.evaluate(() => [...document.querySelectorAll("#tsumiToc button")].map((x) => `${x.textContent}:${x.dataset.to}`));
  ok(JSON.stringify(toc) === JSON.stringify(["探す:tsumiFindHead", "記録:tsumiKindsHead", "ふりかえり:tsumiYearsHead tsumiMemoryHead", "記念:tsumiMemoHead", "写真:tsumiAlbumHead", "送る:ts6SendHead", "クイズ:ts7QuizHead", "目標:ts8AimHead", "見え方:tsumiLookHead", "お知らせ:recRemindHead"]), "the gear's contents: no 手紙, no つみねこ; 目標 at きょう・あしたのめあて", toc);
  await p.locator("#tsumiToc button", { hasText: "目標" }).click(); // (a smooth scroll, a long way: about a second and a half)
  ok(await p.waitForFunction(() => { const r = document.getElementById("ts8AimHead").getBoundingClientRect(); return r.top >= 0 && r.top < 400; }, null, { timeout: 5000 }).then(() => true, () => false), "目標 pressed: at きょう・あしたのめあて");
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
  // ⑨ 着せかえ: taken out at the user's call (2026-11-21, tools/REMOVED.md): what it wears by the season and its count stays,
  // the one picked before (kept with the account: Santa's hat, the scarf off) read by nothing
  ok(!(await p.$("#nekoCloset")) && await p.evaluate(() => window.__ts.look(2231)) === "1crown" && (await setting(p, "tsumiNeko"))?.head === "santa", "⑨ no 着せかえ: in November the crown (1,000 and more) and the scarf, as おまかせ had it", await p.evaluate(() => window.__ts.look(2231)));
  // ⑩ the week's notification
  await p.click("#tsumiWeekOn"); await p.waitForTimeout(200);
  await p.selectOption("#tsumiWeekWd", "3"); await p.waitForTimeout(150);
  await p.fill("#tsumiWeekAt", "21:00"); await p.dispatchEvent("#tsumiWeekAt", "change"); await p.waitForTimeout(200);
  ok(JSON.stringify(await setting(p, "tsumiWeek")).includes('"on":true') && (await setting(p, "tsumiWeek")).wd === 3 && (await setting(p, "tsumiWeek")).at === "21:00", "⑩ kept", await setting(p, "tsumiWeek"));
  const wk = await p.evaluate(() => window.__ts.alarms(Date.now()).filter((a) => a.tag.startsWith("tsumi-week:")));
  const cnt = await p.evaluate(() => { const s = window.__ts.shown(); const c = (a, b) => s.filter((x) => x.day >= a && x.day <= b).length; return [c("2026-11-05", "2026-11-11"), c("2026-10-29", "2026-11-04")]; });
  ok(wk.length >= 5 && wk[0].tag === "tsumi-week:2026-11-11" && new Date(wk[0].at + 9 * 3600e3).getUTCHours() === 21 && wk[0].body === `この1週間で ${cnt[0]} こ積みました（前の週${cnt[0] === cnt[1] ? "と同じ" : `より ${cnt[0] > cnt[1] ? "+" : "−"}${Math.abs(cnt[0] - cnt[1])}`}）` && wk[1].tag === "tsumi-week:2026-11-18" && wk[1].body === "この1週間は、まだ積んでいません。1こから始めよう" && wk[0].url === "./#tsumi", "⑩ each Wednesday 21:00, the 7 days' count against the 7 before (a week to come: none yet, till some go on)", [wk[0], wk[1]?.body, cnt]);
  // 1日のまとめのお知らせ: taken out at the user's call (2026-11-27, tools/REMOVED.md): not in the gear (its お知らせ, 時刻 and
  // words), none sent though it was on before (at 23:59, today with blocks), its setting kept as it was; 週のまとめ (above),
  // 月のまとめ and 毎日の記録のお知らせ kept
  const gearWords = await p.evaluate(() => document.getElementById("daySheet").innerText);
  ok(!/1日のまとめのお知らせ|その日に積んだ数と種類を通知で/.test(gearWords) && !(await p.$("#tsumiDayOn")) && !(await p.$("#tsumiDayAt"))
    && gearWords.includes("週のまとめのお知らせ") && gearWords.includes("月のまとめのお知らせ") && gearWords.includes("毎日記録するもの") && !!(await p.$("#tsumiMonthSumOn")), "1日のまとめのお知らせ: not in the gear (週のまとめ, 月のまとめ, 毎日の記録 kept)", gearWords.length);
  const daySum = await p.evaluate(() => window.__ts.alarms(Date.now()).filter((a) => a.tag.startsWith("tsumi-day:")));
  ok(!daySum.length && (await setting(p, "tsumiDaySum"))?.on === true && (await setting(p, "tsumiDaySum"))?.at === "23:59", "1日のまとめのお知らせ: none sent though on before, its setting kept", daySum);
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
  // (この記録を開く under a block, and a ToDo's 同じToDoをきょうも入れる: taken out at the user's call (2026-11-25, tools/REMOVED.md); 食事's きょうも同じ… stays)
  ok(await p.isHidden("#tsumiOpen") && (await txt(p, "#tsumiAgain")) === "きょうも同じ食事を記録", "no この記録を開く; 食事's きょうも同じ食事を記録 still", await txt(p, ".tsumi-acts"));
  const pickedDay = await p.evaluate(() => { const s = window.__ts.shown(); return s[s.length - 1].day; });
  await p.click("#tsumiPrev"); await p.waitForTimeout(150);
  const pk = await p.evaluate(() => window.__ts.pick());
  await p.click("#tsumiDayAll"); await p.waitForTimeout(900);
  ok(await tabNow(p) === "recday" && (await txt(p, "#recDayTitle")).startsWith("11月10日") && (await p.getAttribute("#backBtn", "aria-label")) === "つみかさねに戻る", "② the day's records, back to つみかさね", [await tabNow(p), await txt(p, "#recDayTitle"), await p.getAttribute("#backBtn", "aria-label")]);
  await p.click("#backBtn"); await p.waitForTimeout(900);
  ok(await tabNow(p) === "tsumi" && await p.evaluate(() => window.__ts.pick()) === pk, "② back: the block shown as it was", [await tabNow(p), pk]);
  // a ToDo's block: neither この記録を開く nor 同じToDoをきょうも入れる (taken out, 2026-11-25); Enter on the stairs opens nothing
  for (let i = 0; i < 60 && !String(await p.evaluate(() => window.__ts.pick())).startsWith("todo:"); i++) { await p.click("#tsumiPrev"); await p.waitForTimeout(60); }
  ok(String(await p.evaluate(() => window.__ts.pick())).startsWith("todo:") && await p.isHidden("#tsumiOpen") && await p.isHidden("#tsumiAgain") && !(await txt(p, ".tsumi-acts")).includes("同じToDo"), "a ToDo's block: no 同じToDoをきょうも入れる, no この記録を開く", [await p.evaluate(() => window.__ts.pick()), await txt(p, ".tsumi-acts")]);
  await p.focus("#tsumiCanvas"); await p.keyboard.press("Enter"); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.getElementById("daySheet").open)) && await tabNow(p) === "tsumi", "Enter on a block: nothing opened");
  // ① the year: from the gear, its page, and played on the stairs
  await p.click("#tsumiSettings"); await p.waitForTimeout(600);
  ok((await txt(p, "#tsumiYears")).includes("2026年のつみかさね") && (await txt(p, "#tsumiYears")).includes("2025年のつみかさね 618 こ"), "① the years in the gear", await txt(p, "#tsumiYears"));
  await p.locator("#tsumiYears button", { hasText: "2026年" }).click(); await p.waitForTimeout(900);
  const y26 = await p.evaluate(() => window.__ts.list().filter((b) => b.day.startsWith("2026")).length);
  const yt = await txt(p, "#tyBody");
  ok(await tabNow(p) === "tsumiyear" && (await txt(p, "#tyTitle")) === "2026年のつみかさね" && yt.startsWith(`${y26.toLocaleString("ja-JP")}こ 2025年より +`) && yt.includes("段のぼりました（34 段 → 66 段）") && yt.includes("いちばん長く続いた 314 日（1/1〜11/10）") && yt.includes("いちばん積んだのは") && yt.includes("夜（17〜23時）に積むことが、いちばん多い年でした") && yt.includes("目標を達成：TOEIC 800点"), "① 2026's page", yt.slice(0, 500));
  ok(await p.isDisabled("#tyNext") && !(await p.isDisabled("#tyPrev")) && (await p.getAttribute("#backBtn", "aria-label")) === "つみかさねに戻る", "① ‹ › and back");
  // 月のひとこと: written on the year's page now (under the calendar view's month, till that was taken out, 2026-11-21)
  await p.locator("#tyBody .ts-month-note button", { hasText: "11月にひとこと" }).click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("tsTextAsk").open), "月のひとこと: 11月にひとこと, on the year's page");
  await p.fill("#tsTextInput", "よく積んだ月"); await p.click("#tsTextSave"); await p.waitForTimeout(500);
  const notes = await p.evaluate(() => [...document.querySelectorAll("#tyBody .ty-notes li")].map((li) => li.querySelector(".m").textContent + "|" + li.querySelector("button")?.textContent));
  ok((await setting(p, "tsumiMonthNotes"))?.words?.["2026-11"] === "よく積んだ月" && JSON.stringify(notes) === '["11月|よく積んだ月"]' && !(await p.$("#tyBody .ts-month-note")), "月のひとこと: kept, listed, this month's written", notes);
  await p.locator("#tyBody .ty-notes button").click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("tsTextAsk").open) && (await p.inputValue("#tsTextInput")) === "よく積んだ月", "月のひとこと: pressed, to change it");
  await p.click("#tsTextNo"); await p.waitForTimeout(300);
  await p.click("#tyPrev"); await p.waitForTimeout(300);
  ok((await txt(p, "#tyTitle")) === "2025年のつみかさね" && (await txt(p, "#tyBody")).startsWith("618こ") && await p.isDisabled("#tyPrev"), "① 2025's");
  await p.click("#tyNext"); await p.waitForTimeout(300);
  await p.locator(".ty-m").nth(7).click(); await p.waitForTimeout(900);
  const aug = await p.evaluate(() => { const k = window.__ts.pick(), s = window.__ts.shown(); return [s.find((x) => x.key === k)?.day, s.find((x) => x.day >= "2026-08-01")?.day]; });
  ok(await tabNow(p) === "tsumi" && aug[0] && aug[0] === aug[1] && await p.evaluate(() => window.__ts.cal()) === false && await p.isVisible("#tsumiCanvas"), "① a month's bar: the stairs at its first block (at the calendar, till that was taken out, 2026-11-21)", aug);
  await p.click("#tsumiSettings"); await p.waitForTimeout(600);
  await p.locator("#tsumiYears button", { hasText: "2026年" }).click(); await p.waitForTimeout(900);
  await p.click(".ty-play"); await p.waitForTimeout(1000);
  const ra = await p.evaluate(() => { const a = window.__ts.anim(), s = window.__ts.shown(); return a && { from: a.from, to: a.to, replay: a.replay, first: s.findIndex((b) => b.t >= Date.parse("2026-01-01T00:00:00+09:00")), n: s.length }; });
  ok(await tabNow(p) === "tsumi" && ra && ra.replay && ra.from === ra.first && ra.to === ra.n && (await toast(p)).includes("2026年のブロック"), "① この1年を階段で再生: the year's blocks drop in again", ra);
  ok(!(await p.$("#tsumiPlay")), "① ▶ (and ■) by the gear: taken out (2026-11-21)");
  await p.click("#tsumiCanvas", { position: { x: 4, y: 4 } }); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => window.__ts.anim())), "① the stairs pressed: the year's replay stops");
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
  // (three a day: a 食事 and two ToDos done, 食事 being one block a day since 2026-11-25)
  const F = { meals: [], todos: [], settings: [] };
  let k = 0;
  for (let d = "2026-09-19"; d < "2026-11-10" && k < 149; d = addDays(d, 1)) {
    if (["2026-11-03", "2026-11-05"].includes(d)) continue;
    for (let j = 0; j < 3 && k < 149; j++, k++) {
      if (!j) F.meals.push({ id: "f" + k, date: d, slot: "朝食", text: "パン" + k, kcal: 300, createdAt: T(d, 7 + j * 5) });
      else F.todos.push({ id: "f" + k, text: "パン" + k, done: true, doneAt: T(d, 7 + j * 5), createdAt: T(d, 7 + j * 5) });
    }
  }
  p = await phone(b, at("20:30", "2026-11-10"), { deviceScaleFactor: 1 });
  await seed(p, F, "tsumi"); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.__ts.shown().length) === 149, "149 blocks");
  await p.click("#tsumiToTop").catch(() => {}); await p.waitForTimeout(200);
  xy = await nekoXY(p);
  if (xy) { await p.mouse.click(xy.x, xy.y); await p.waitForTimeout(250); }
  ok((await txt(p, "#nekoSaySr")) === "きょうはまだ積んでないよ。1こだけでも積もう", "⑧ nothing today, in the evening (first: つみねこのおねがい was taken out, 2026-11-19)", await txt(p, "#nekoSaySr"));
  ok(await p.evaluate(() => window.__ts.look(149)) === "1" && await p.evaluate(() => [...document.querySelectorAll("#nekoCloset [data-item]")].length) === 0, "⑨ 100 and more: the scarf only, no season now (着せかえ taken out: nothing to pick)");
  // ② カレンダー: taken out at the user's call (2026-11-21, tools/REMOVED.md): the switch 大きく・全体・種類; カレンダー kept as
  // the view on this phone before, the stairs; 種類 still in their place
  const views = await p.evaluate(() => [...document.querySelectorAll("#tsumiViews button")].map((x) => x.dataset.view));
  ok(JSON.stringify(views) === '["near","all","kinds"]' && !(await txt(p, "#tsumiViews")).includes("カレンダー"), "② the switch: no カレンダー", views);
  await p.evaluate((P) => localStorage.setItem(P + "tsumiCal", "1"), P); await p.reload(); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.__ts.cal()) === false && await p.isVisible("#tsumiCanvas") && !(await p.isVisible("#tsumiCal")), "② カレンダー kept as the view before: the stairs");
  await p.click('#tsumiViews button[data-view="kinds"]'); await p.waitForTimeout(400);
  ok(await p.isVisible("#tsumiCal .ts-pillars") && !(await p.isVisible("#tsumiCanvas")), "② 種類 still in the stairs' place");
  await p.click('#tsumiViews button[data-view="near"]'); await p.waitForTimeout(300);
  // ⑦ a height passed (149 → 150 was 奈良の大仏, 15 m): said no more, with 高さくらべ taken out (2026-11-21)
  await addMeal(p, "おにぎり");
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__ts.shown().length) === 150 && !(await toast(p)).includes("積んだ高さ"), "⑦ a height passed: not said", await toast(p));
  await p.click("#tsumiSettings"); await p.waitForTimeout(600);
  ok(!(await p.$("#nekoCloset")) && !(await p.$("#tsumiHeight")), "⑦ ⑨ the gear: no 高さくらべ, no 着せかえ");
  ok(!(await txt(p, "#tsumiMemos")).includes("自己ベスト"), "⑤ no 運動, no 自己ベスト");
  ok(!p.errs.length, "no error", p.errs);
  await p.close();

  // ---------- the turn of the year: the line at the card's foot; December asleep in Santa's hat ----------
  p = await phone(b, at("08:00", "2026-12-25"), { deviceScaleFactor: 1 });
  await seed(p, make("2026-12-24"), "tsumi"); await p.waitForTimeout(1500);
  ok(await p.isVisible("#tsumiYearLine") && (await txt(p, "#tsumiYearBtn")) === "2026年のつみかさねをふりかえる", "① 12月25日: the year's line at the foot");
  ok(await p.evaluate(() => window.__ts.look(window.__ts.shown().length)) === "1santa", "⑨ December: Santa's hat, by the season");
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

  // 種類: every pillar level, its name in one line or more (ルーティーン's in two lifted its pillar before: the user's
  // call, 2026-11-27). Seven kinds, as on the phone it was seen on
  p = await phone(b, new Date("2026-11-27T13:52:00+09:00"), { deviceScaleFactor: 1 });
  const d1 = "2026-11-26", d2 = "2026-11-27", t = (d, h) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
  await seed(p, { todos: [{ id: "t1", text: "a", done: true, doneAt: t(d1, 9), createdAt: t(d1, 8) }, { id: "t2", text: "b", done: true, doneAt: t(d2, 9), createdAt: t(d2, 8) }],
    journal: [{ id: d1, date: d1, text: "日記1", createdAt: t(d1, 22) }, { id: d2, date: d2, text: "日記2", createdAt: t(d2, 1) }],
    routines: [{ id: "r1", name: "ストレッチ", createdAt: t("2026-11-01", 8) }], routineDays: [{ id: d1, date: d1, done: ["r1"], updatedAt: t(d1, 8) }, { id: d2, date: d2, done: ["r1"], updatedAt: t(d2, 8) }],
    expenses: [{ id: "e1", date: d1, kind: "out", category: "食費", amount: 500, createdAt: t(d1, 12) }, { id: "e2", date: d2, kind: "out", category: "交通費", amount: 169, createdAt: t(d2, 12) }],
    meals: [{ id: "m1", date: d2, slot: "朝食", text: "パン", kcal: 300, at: "08:00", createdAt: t(d2, 8) }], workouts: [{ id: "w1", date: d2, type: "ランニング", minutes: 30, createdAt: t(d2, 7) }],
    weights: [{ id: d2, date: d2, kg: 60, createdAt: t(d2, 7) }] }, "tsumi");
  await p.waitForTimeout(800);
  await p.click('#tsumiViews button[data-view="kinds"]'); await p.waitForTimeout(500);
  const lv = await p.evaluate(() => [...document.querySelectorAll("#tsumiCal .ts-pillar")].map((b) => { const k = b.querySelector(".k").getBoundingClientRect();
    return { k: b.querySelector(".k").textContent, low: Math.round(b.querySelector("svg").getBoundingClientRect().bottom), top: Math.round(k.top), h: Math.round(k.height) }; }));
  const rtK = lv.find((x) => x.k === "ルーティーン");
  ok(lv.length === 7 && rtK && rtK.h > Math.min(...lv.map((x) => x.h)) && new Set(lv.map((x) => x.low)).size === 1 && new Set(lv.map((x) => x.top)).size === 1,
    "種類: the blocks of each on one line, the names under them from one line (ルーティーン's in two)", lv);
  ok(!p.errs.length, "no error (種類)", p.errs);
  await p.close();

  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
