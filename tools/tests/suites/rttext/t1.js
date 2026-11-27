// ルーティーンの文字 (the user's call, 2026-11-27, asked twice): the words under the form (名前はタップすると… and the
// 長押し one put after them) and, under the list, 「ぜんぶできた日が ○日続いています。あと ○ 項目です」 taken off. Neither
// shows (on a day all done the two days before, too); what stays stays (a name renamed by a tap, ⋯, ×, the 長押し menu,
// まとめて追加 and やめる習慣を追加, the tools under the list, 「のこり ○ 項目・約○分」 when an item has its minutes,
// 「ぜんぶできました（○日連続）」 once all are done); the records as they were; no errors
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-27";
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const R = (id, name, extra = {}) => ({ id, name, createdAt: T("2026-11-01", 9) + id.charCodeAt(1), ...extra });
const D = (date, done) => ({ id: date, date, done, at: Object.fromEntries(done.map((x) => [x, T(date, 8)])), updatedAt: T(date, 8) });
// all done on 11/25 and 11/26 (a run of 2 going today), one of today's done
const DAYS = (ids) => [D("2026-11-24", [ids[0]]), D("2026-11-25", ids), D("2026-11-26", ids), D(today, [ids[0]])];
const DATA1 = { routines: [R("r1", "ストレッチ"), R("r2", "水を飲む")], routineDays: DAYS(["r1", "r2"]) };
const DATA2 = { routines: [R("r1", "ストレッチ"), R("r2", "水を飲む"), R("r3", "英単語", { mins: 10 })], routineDays: DAYS(["r1", "r2", "r3"]) };
const GONE = [/名前はタップすると書きかえられます/, /絵文字・メモ・回数・かかる時間/, /を決められます/, /× を2回押すと/, /その項目を消します/,
  /項目を長押しすると/, /パス・ひとこと・複製などをすぐ選べます/, /ぜんぶできた日が/, /日続いています/, /項目です/];
const gone = (s) => GONE.filter((r) => r.test(s)).map(String);
const row = (p, id) => p.locator(`#rtList li[data-rt="${id}"]`);
const hold = async (p, id) => {
  const l = row(p, id).locator(".check").first(); await l.scrollIntoViewIfNeeded();
  const bx = await l.boundingBox();
  await l.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true, pointerId: 9, clientX: bx.x + 4, clientY: bx.y + 4 });
  await p.waitForTimeout(650);
};
const menu = (p) => p.evaluate(() => [...document.querySelectorAll("#rt6MenuGroup .ask-btn")].map((b) => b.textContent).join(","));
(async () => {
  const b = await chromium.launch();
  // 1. no minutes: the run of 2 going today, one of two left
  let p = await phone(b, at("12:00", today));
  await seed(p, DATA1, "routine");
  ok((await txt(p, "#rtHead")) === "きょうのルーティーン" && (await txt(p, "#rtCount")) === "1 / 2", "1. the routine page, today 1 / 2", [await txt(p, "#rtHead"), await txt(p, "#rtCount")]);
  let page = await txt(p, "#sec-routine");
  ok(!gone(page).length, "1. none of the words on the page", gone(page));
  ok(!(await p.evaluate(() => document.querySelector("#sec-routine #rtForm ~ p.group-foot"))), "1. no words under the form");
  ok(!(await p.locator("#rtFoot .rt-all").count()), "1. no line of words under the list (the run going today not said)", await txt(p, "#rtFoot"));
  const foot1 = await txt(p, "#rtFoot");
  ok(foot1.includes("項目をパスする") && (await p.locator("#rtFoot button").count()) >= 1, "1. the tools under the list kept", foot1);
  ok(await p.isVisible(".rt6-add-tools button:has-text('まとめて追加')") && await p.isVisible(".rt6-add-tools button:has-text('やめる習慣を追加')") && await p.isVisible("#rtName"), "1. the form, まとめて追加 and やめる習慣を追加 kept");
  ok((await row(p, "r1").locator(".rt-opts").count()) === 1 && (await row(p, "r1").locator(".rt-name").count()) === 1 && (await row(p, "r1").locator("button[aria-label*='削除']").count()) >= 1, "1. a row's name, ⋯ and × kept");
  await p.screenshot({ path: out + "/rttext-1.png", fullPage: false });
  // a name renamed by a tap, as before
  await row(p, "r2").locator(".rt-name").fill("水を1杯飲む"); await row(p, "r2").locator(".rt-name").press("Enter"); await p.waitForTimeout(400);
  ok((await ls(p, "routines")).find((r) => r.id === "r2")?.name === "水を1杯飲む", "1. renamed by a tap", (await ls(p, "routines")).map((r) => r.name));
  // the 長押し menu, as before
  await hold(p, "r2");
  const m = await menu(p);
  ok(m.includes("きょうはパス") && m.includes("複製"), "1. the 長押し menu kept", m);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  ok(!p.errs.length, "1. no errors", p.errs);
  await p.context().close();
  // 2. one with its minutes: 「のこり ○ 項目・…約10分」 as on a day with no run, then all done: ぜんぶできました（3日連続）
  p = await phone(b, at("12:00", today));
  await seed(p, DATA2, "routine");
  const foot2 = await txt(p, "#rtFoot .rt-all");
  ok(foot2 === "のこり 2 項目・時間を決めた 1 項目で約10分", "2. the minutes left said (the run going today not)", foot2);
  page = await txt(p, "#sec-routine");
  ok(!gone(page).length, "2. none of the words on the page", gone(page));
  await row(p, "r2").locator(".check").click(); await p.waitForTimeout(250);
  ok((await txt(p, "#rtFoot .rt-all")) === "のこり 1 項目・約10分", "2. one left, its minutes", await txt(p, "#rtFoot .rt-all"));
  await row(p, "r3").locator(".check").click(); await p.waitForTimeout(500);
  const all = await txt(p, "#rtFoot .rt-all");
  ok(/^12:00にぜんぶできました（3日連続）$/.test(all) && await p.evaluate(() => document.querySelector("#rtFoot .rt-all")?.classList.contains("on")), "2. all done: ぜんぶできました（3日連続） kept", all);
  const days = await ls(p, "routineDays");
  ok(["2026-11-24", "2026-11-25", "2026-11-26"].every((d) => JSON.stringify(days.find((x) => x.id === d)?.done) === JSON.stringify(DAYS(["r1", "r2", "r3"]).find((x) => x.id === d).done))
    && JSON.stringify([...(days.find((x) => x.id === today)?.done || [])].sort()) === '["r1","r2","r3"]', "2. the records as they were (today's checks put in)", days.map((d) => d.id + ":" + d.done.join("+")));
  ok(!p.errs.length, "2. no errors", p.errs);
  await p.context().close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
