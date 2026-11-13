// 目標 ①〜⑩ (on the hooked copy at 8768 for the alarms)
process.env.URL0 = process.env.URL0 || "http://localhost:8768/";
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-10"; // a Tuesday
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim(), sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast.show")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" / "));
const goalOf = async (p, id) => (await ls(p, "goals")).find((g) => g.id === id);
const G1 = { id: "g1", title: "TOEIC 800点", criterion: "TOEIC 800点", deadline: "2027-01-31", depth: 2, done: false, createdAt: T("2026-10-01"),
  link: { kind: "study", target: 100, since: "2026-10-01" }, memo: "毎日コツコツ",
  mandala: [{ t: "単語", c: [{ t: "単語帳1周", d: true, at: T("2026-11-08", 21) }, { t: "単語帳2周" }, null, null, null, null, null, null] },
    { t: "文法", d: true, at: T("2026-11-01", 20) }, { t: "模試", m: "公式問題集 https://example.com/mock" }, { t: "リスニング", c: [{ t: "シャドーイング" }, null, null, null, null, null, null, null] }, null, null, null, null] };
const G2 = { id: "g2", title: "体重 60kg", criterion: "体重 60kg", deadline: "2026-12-31", depth: 2, done: false, createdAt: T("2026-10-01"), link: { kind: "weight", target: 60 }, mandala: [] };
const DATA = { goals: [G1, G2], study: [{ id: "s1", date: "2026-11-05", minutes: 600, subjectId: "sb1", createdAt: 1 }, { id: "s2", date: "2026-11-09", minutes: 300, createdAt: 2 }, { id: "s0", date: "2026-09-20", minutes: 600, createdAt: 0 }],
  subjects: [{ id: "sb1", name: "英語", color: "blue", createdAt: 1 }],
  weights: [{ id: "2026-10-01", date: "2026-10-01", kg: 64, createdAt: 1 }, { id: "2026-11-09", date: "2026-11-09", kg: 62.5, createdAt: 2 }] };
async function open(b, data = DATA, hash = "goal", when = "20:00") {
  const p = await phone(b, at(when, today), { deviceScaleFactor: 1 });
  await seed(p, data, hash);
  return p;
}
const openGoal = async (p, title) => { await p.locator(".goal-open", { hasText: title }).first().click(); await p.waitForTimeout(700); };
const close = async (p) => { for (let i = 0; i < 3 && await p.evaluate(() => document.getElementById("daySheet").open); i++) { if (await p.isVisible("#sheetDone")) await p.click("#sheetDone"); else await p.keyboard.press("Escape"); await p.waitForTimeout(600); } };
const img = async (p) => Buffer.from(await p.evaluate(() => { const c = document.createElement("canvas"); c.width = 64; c.height = 36; const g = c.getContext("2d"); g.fillStyle = "#2a8"; g.fillRect(0, 0, 64, 36); return c.toDataURL("image/jpeg").split(",")[1]; }), "base64");

(async () => {
  const b = await chromium.launch();
  let p = await open(b);
  // ①② on the blocks: the records' progress, the pace
  let list = await txt(p, "#goalList");
  ok(/TOEIC 800点.*記録 15%.*遅れています/.test(list), "①② the block: 記録 15%, 遅れています (15 of 100 hours, a third of the time gone)", list);
  ok(/体重 60kg.*記録 37%/.test(list), "① 体重: 64 → 62.5 of 64 → 60 is 37%", list);
  // ①②③ in the sheet
  await openGoal(p, "TOEIC");
  let prog = await txt(p, "#mProgress");
  ok(prog.includes("マス 37%") && prog.includes("記録 15%") && prog.includes("勉強の時間 15.0 / 100 時間") && prog.includes("遅れています。期限に間に合うには、1週間に 7 時間 11 分") && prog.includes("最後に進めたのは 2 日前"), "①②③ the sheet's progress", prog);
  ok(await p.inputValue("#mLinkKind") === "study" && await p.inputValue("#mLinkTarget") === "100" && await p.inputValue("#mLinkSince") === "2026-10-01" && (await txt(p, "#mLinkFoot")).includes("10/1（木）からの記録"), "① its link in the form");
  // ① a subject: only 英語's 10 hours
  await p.selectOption("#mLinkSub", "sb1"); await p.waitForTimeout(300);
  ok((await txt(p, "#mProgress")).includes("勉強の時間（英語） 10.0 / 100 時間") || (await txt(p, "#mProgress")).includes("英語 10.0 / 100 時間"), "① a subject alone", await txt(p, "#mProgress"));
  ok((await goalOf(p, "g1")).link.sub === "sb1", "① kept");
  // ① the target met: said, 達成 by hand offered
  await p.fill("#mLinkTarget", "8"); await p.dispatchEvent("#mLinkTarget", "change"); await p.waitForTimeout(300);
  ok((await txt(p, "#mProgress")).includes("記録の上では達成しています"), "① met: said", await txt(p, "#mProgress"));
  await p.selectOption("#mLinkSub", ""); await p.fill("#mLinkTarget", "100"); await p.dispatchEvent("#mLinkTarget", "change"); await p.waitForTimeout(300);
  // ③ the steps: newest first, the cell lit at its level
  let steps = await txt(p, "#mSteps");
  ok(steps.indexOf("単語帳1周") < steps.indexOf("文法") && steps.includes("11/8（日） 単語帳1周 単語"), "③ the steps, newest first, with where", steps);
  await p.locator("#mSteps button", { hasText: "単語帳1周" }).click(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById("mTrail").textContent) === "TOEIC 800点" && await p.evaluate(() => document.querySelector('.m-cell[data-k="0"]').classList.contains("spot") && document.querySelector('.m-cell[data-k="0"] .m-text').textContent === "単語帳1周"), "③ pressed: its level, lit");
  await p.click("#sheetCancel"); await p.waitForTimeout(400); // 戻る
  // ⑦ a cell's memo: the mark, opened from its menu, written, its link
  ok(await p.locator('.m-cell[data-k="2"] .m-memo-mark').count() === 1 && await p.locator('.m-cell[data-k="0"] .m-memo-mark').count() === 0, "⑦ a cell with a memo marked");
  await p.locator('.m-cell[data-k="2"]').dispatchEvent("contextmenu"); await p.waitForTimeout(300);
  let menuWords = await p.evaluate(() => [...document.querySelectorAll("#mMenu button")].map((x) => x.textContent));
  if (!menuWords.length) { // (a long press in place of contextmenu)
    const bx = await p.locator('.m-cell[data-k="2"]').boundingBox();
    await p.mouse.move(bx.x + 20, bx.y + 20); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(300);
    menuWords = await p.evaluate(() => [...document.querySelectorAll("#mMenu button")].map((x) => x.textContent));
  }
  ok(menuWords.includes("メモを見る・書く"), "⑦ in the cell's menu", menuWords);
  await p.locator("#mMenu button", { hasText: "メモを見る・書く" }).click(); await p.waitForTimeout(300);
  ok(await p.isVisible("#mNote") && await p.inputValue("#mNoteText") === "公式問題集 https://example.com/mock" && await p.locator("#mNoteLinks a").count() === 1, "⑦ its memo open, its link to open");
  await p.fill("#mNoteText", "公式問題集を2回"); await p.waitForTimeout(900);
  ok((await goalOf(p, "g1")).mandala[2].m === "公式問題集を2回", "⑦ saved as it is typed");
  await p.click("#mNoteClose"); await p.waitForTimeout(200);
  ok(await p.isHidden("#mNote"), "⑦ closed");
  // ④ ふりかえり
  await p.fill("#mReflect", "単語は順調。文法が弱い"); await p.click("#mReflectAdd"); await p.waitForTimeout(300);
  await p.fill("#mReflect", "模試を申し込んだ"); await p.click("#mReflectAdd"); await p.waitForTimeout(300);
  let notes = (await goalOf(p, "g1")).notes;
  ok(notes?.length === 2 && notes[0].text === "単語は順調。文法が弱い" && (await txt(p, "#mReflectList")).indexOf("模試を申し込んだ") < (await txt(p, "#mReflectList")).indexOf("単語は順調"), "④ written, the newest first", notes);
  const del = p.locator("#mReflectList li", { hasText: "模試を申し込んだ" }).locator(".link-btn");
  await del.click(); await del.click(); await p.waitForTimeout(300);
  ok((await goalOf(p, "g1")).notes.length === 1 && (await toast(p)).includes("ふりかえりを削除しました"), "④ deleted (a second press), with 元に戻す");
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(300);
  ok((await goalOf(p, "g1")).notes.length === 2, "④ 元に戻す");
  // ⑧ a photo: in the sheet, over the block
  await p.setInputFiles("#mPhoto input[type=file]", { name: "a.jpg", mimeType: "image/jpeg", buffer: await img(p) }); await p.waitForTimeout(900);
  ok(await p.locator("#mPhoto img").count() === 1 && (await toast(p)).includes("写真を付けました"), "⑧ a photo in the sheet");
  await close(p);
  ok(await p.locator(".goal", { hasText: "TOEIC" }).locator("img.goal-photo").count() === 1, "⑧ over its block");
  // ⑥ a copy
  await openGoal(p, "TOEIC");
  await p.click("#mCopy"); await p.waitForTimeout(800);
  const gs = await ls(p, "goals"), cp = gs.find((g) => !["g1", "g2"].includes(g.id));
  ok(cp && cp.title === "TOEIC 800点" && cp.deadline === "2027-01-31" && cp.mandala[0].c[0].t === "単語帳1周" && !cp.mandala[0].c[0].d && !cp.mandala[1].d && cp.mandala[2].m === "公式問題集を2回" && cp.link.since === today && !cp.notes, "⑥ a copy: its cells and memos, unchecked, counted from today", cp);
  ok((await txt(p, "#mProgress")).includes("マス 0%") && (await toast(p)).includes("複製しました"), "⑥ opened straight away", await toast(p));
  await p.click(".toast.show .toast-undo"); await p.waitForTimeout(600);
  ok((await ls(p, "goals")).length === 2, "⑥ 元に戻す");
  await p.goto(URL0 + "#goal"); await p.reload(); await p.waitForTimeout(800);
  // ⑨ looked for: a goal, its cells and a cell's memo
  await p.fill("#goalFind", "問題集"); await p.waitForTimeout(300);
  let found = await txt(p, "#goalFound");
  ok(await p.isHidden("#goalList") && found.includes("「問題集」：目標 1 件・マス 1 件") && found.includes("模試") && found.includes("メモに"), "⑨ a cell by its memo", found);
  await p.fill("#goalFind", "シャドー"); await p.waitForTimeout(300);
  found = await txt(p, "#goalFound");
  ok(found.includes("シャドーイング") && found.includes("リスニング"), "⑨ a cell inside, with where", found);
  await p.locator("#goalFound .goal-hit", { hasText: "シャドーイング" }).click(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.getElementById("daySheet").open && document.getElementById("mTrail").textContent === "TOEIC 800点") && await p.evaluate(() => document.querySelector('.m-cell[data-k="0"] .m-text').textContent) === "シャドーイング", "⑨ pressed: the chart at that cell");
  await close(p);
  await p.click("#goalFindClear"); await p.waitForTimeout(200);
  ok(await p.isVisible("#goalList") && await p.isHidden("#goalFound"), "⑨ cleared: the list back");
  // ⑩ a 雛形
  await p.click("#goalAdd"); await p.waitForTimeout(600);
  ok((await txt(p, "#goalTpl")).includes("資格試験") && (await txt(p, "#goalTpl")).includes("就活"), "⑩ the 雛形 in the new goal's sheet");
  await p.locator("#goalTpl .chip-btn", { hasText: "語学" }).click(); await p.waitForTimeout(200);
  ok(await p.inputValue("#goalTitle") === "TOEIC ○点をとる" && await p.inputValue("#goalCriterion") === "TOEIC ○点", "⑩ its name and 達成基準 put in");
  await p.fill("#goalTitle", "TOEIC 900点をとる"); await p.fill("#goalDeadline", "2027-06-30"); await p.dispatchEvent("#goalDeadline", "change");
  await p.click("#goalSave"); await p.waitForTimeout(900);
  const ng = (await ls(p, "goals")).find((g) => g.title === "TOEIC 900点をとる");
  ok(ng && ng.mandala.length === 8 && ng.mandala[0].t === "単語" && ng.mandala[0].c[0].t === "単語帳を1冊決める" && ng.link.kind === "study" && ng.link.since === today, "⑩ the chart made from it, joined to 勉強", ng && { m0: ng.mandala[0], link: ng.link });
  ok(await p.evaluate(() => [...document.querySelectorAll(".m-cell .m-text")].map((x) => x.textContent).filter(Boolean).length) === 8, "⑩ its eight shown straight away");
  await close(p);
  // ⑤ 見直しのお知らせ: off at first; on, Sunday 20:00 by default, once a week, the goals under way
  await p.click("#goalSettings"); await p.waitForTimeout(500);
  ok(await p.isVisible("#goalReviewForm") && !(await p.isChecked("#goalReviewOn")) && await p.inputValue("#goalReviewWd") === "0" && await p.inputValue("#goalReviewAt") === "20:00", "⑤ in 目標's 設定, off at first");
  await p.click("#goalReviewOn"); await p.waitForTimeout(300);
  await p.selectOption("#goalReviewWd", "6"); await p.fill("#goalReviewAt", "09:30"); await p.dispatchEvent("#goalReviewAt", "change"); await p.waitForTimeout(300);
  await close(p);
  const al = await p.evaluate(() => window.__alarmTimes(Date.now()).filter((a) => a.tag.startsWith("goal-review")));
  ok(al.length >= 5 && al[0].at === Date.parse("2026-11-14T09:30:00+09:00") && al[0].title === "目標の見直し（進行中 3件）" && al[0].body.includes("TOEIC 800点 37%") && al[0].url === "./#goal", "⑤ each Saturday 9:30, the goals under way", al[0]);
  ok(!p.errs.length, "no errors: " + p.errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
})();
