// ルーティーン その6 ①〜⑩, through the hook build at 8878 and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8878/";
const fs = require("fs");
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const shown = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; }, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const day = async (p, d = D.DAY) => (await ls(p, "routineDays")).find((x) => x.id === d) || { done: [] };
const row = (p, id) => p.locator(`#rtList li[data-rt="${id}"]`);
const rowText = async (p, id) => flat(await row(p, id).innerText());
const toast = (p) => p.evaluate(() => [document.querySelector("#status"), document.querySelector("#sheetStatus")].filter((x) => x?.classList.contains("show")).map((x) => x.innerText).join("")).then(flat);
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(400); };
const names = (p) => p.evaluate(() => [...document.querySelectorAll("#rtList .rt-name")].map((i) => i.value).join(","));
const isOpen = (p, id) => p.evaluate((id) => !!document.getElementById(id)?.open, id);
async function open(b, data, hm = "09:00") {
  const p = await phone(b, new Date(`${D.DAY}T${hm}:00+09:00`), { deviceScaleFactor: 1, acceptDownloads: true });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  // ⑩'s sounds and buzzes, and ⑨'s words drawn, kept to look at
  await p.addInitScript(() => {
    window.__tones = []; window.__buzz = []; window.__drawn = [];
    const C = window.AudioContext;
    if (C) window.AudioContext = class extends C { createOscillator() { const o = super.createOscillator(), f = o.frequency, set = f.setValueAtTime.bind(f); f.setValueAtTime = (v, t) => { window.__tones.push(v); return set(v, t); }; return o; } };
    try { Object.defineProperty(navigator, "vibrate", { configurable: true, value: (x) => { window.__buzz.push(x); return true; } }); } catch {}
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { window.__drawn.push(String(s)); return fill.call(this, s, ...a); };
  });
  await seed(p, data, "routine"); await p.waitForTimeout(900);
  return p;
}
const hold = async (p, id, sel = ".check", move = 0) => {
  const l = row(p, id).locator(sel).first(); await l.scrollIntoViewIfNeeded();
  const bx = await l.boundingBox(), at = { pointerType: "touch", isPrimary: true, pointerId: 9, clientX: bx.x + 4, clientY: bx.y + 4 };
  await l.dispatchEvent("pointerdown", at);
  if (move) await l.dispatchEvent("pointermove", { ...at, clientY: at.clientY + move });
  await p.waitForTimeout(650);
};
const menu = (p) => p.evaluate(() => [...document.querySelectorAll("#rt6MenuGroup .ask-btn")].map((b) => b.textContent).join(","));
const png = (file) => { const b = fs.readFileSync(file); return b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
(async () => {
  const b = await chromium.launch();
  let p = await open(b, D.all());
  await p.screenshot({ path: "routine6-top.png" });

  // ⑤ 月ごとの達成率: 12 bars, the months before the first empty; June ストレッチ alone, July〜 all, 11/10's 日記 missed
  const mo = await p.evaluate(() => [...document.querySelectorAll("#rt6Months .st-day")].map((x) => [x.disabled, x.getAttribute("aria-label"), x.querySelector(".st-day-dn").textContent, x.querySelector(".st-day-v").textContent]));
  ok(mo.length === 12 && mo.filter((m) => m[0]).length === 6 && mo[6][1] === "2026年6月 25%（120 回のうち 30 回）" && mo[7][1] === "2026年7月 100%（124 回のうち 124 回）、ぜんぶできた日 31 日"
    && mo[11][1] === "2026年11月 98%（62 回のうち 61 回）、ぜんぶできた日 14 日" && mo[11][2] === "今月" && mo[7][2] === "7月" && mo[6][2] === "" && mo[6][3] === "25%", "⑤ 12 months", mo);
  ok((await txt(p, "#rt6MonthsSum")) === "12か月で86%" && (await txt(p, "#rt6MonthsFoot")).startsWith("いちばんよかったのは2026年7月（100%）です。"), "⑤ in all, and the best month", await txt(p, "#rt6MonthsFoot"));
  await p.locator("#rt6Months .st-day").nth(6).click(); await p.waitForTimeout(500);
  ok((await txt(p, ".rt-cal-mo")) === "2026年6月" && await p.evaluate(() => document.querySelectorAll("#rt6Months .st-day")[6].classList.contains("on")), "⑤ pressed: 達成カレンダー at June", await txt(p, ".rt-cal-mo"));

  // ⑥ かかった時間: today still to do, when they are usually all done; 11/15 all done 7:00〜22:00 (others 7:05〜22:30)
  ok(await p.evaluate(() => document.querySelector(".rt6-took")?.textContent) === "ふだんは 22:30ごろに、ぜんぶ終わっています", "⑥ today: the usual end", await p.evaluate(() => document.querySelector(".rt6-took")?.textContent));
  ok(JSON.stringify(await p.evaluate(() => { const x = window.__rt6.span("2026-11-15"), u = window.__rt6.usual("2026-11-15"); return [x.m, u.m, u.end]; })) === "[900,925,1350]", "⑥ the span and the usual");
  await p.fill("#sec-routine .datenav input[type=date]", "2026-11-15"); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector(".rt6-took")?.textContent) === "かかった時間 7:00〜22:00・15時間（ふだんより25分短い）" && (await txt(p, ".rt-all")).startsWith("22:00にぜんぶできました"), "⑥ 11/15: from the first to the last, against the usual", await p.evaluate(() => document.querySelector("#rtFoot")?.innerText));
  await p.fill("#sec-routine .datenav input[type=date]", "2026-11-10"); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.querySelector(".rt6-took"))), "⑥ none on a day not all done");
  await p.fill("#sec-routine .datenav input[type=date]", D.DAY); await p.waitForTimeout(500);

  // ⑦ チェックした時間帯: the last 30 days' checks by hand, by the part of the day, the items under each
  const hrs = await p.evaluate(() => [...document.querySelectorAll("#rt6HourList li")].map((li) => li.innerText.replace(/\s+/g, "")));
  ok(hrs.join("|") === "朝5〜11時51%ストレッチ・歯みがき|昼11〜15時25%水を飲む|夜19〜24時24%日記を書く" && await p.evaluate(() => document.querySelector("#rt6HourList li").classList.contains("top")), "⑦ the parts of the day", hrs);
  ok((await txt(p, "#rt6HourFoot")) === "いちばん多いのは朝です（チェックした117回から）。", "⑦ the most", await txt(p, "#rt6HourFoot"));

  // ⑨ 画像で送る: the day (and its やめる習慣) and the month, drawn and saved
  ok((await txt(p, "#rt6PicDay")) === "きょうを画像で送る" && (await txt(p, "#rt6PicMonth")) === "この月を画像で送る", "⑨ beside 文字で送る");
  await p.evaluate(() => { window.__drawn = []; });
  let [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }), p.click("#rt6PicDay")]);
  let drawn = await p.evaluate(() => window.__drawn.slice());
  ok(dl.suggestedFilename() === "tsumikasane-routine-2026-11-16.png" && JSON.stringify(png(await dl.path())) === "[1080,1014]", "⑨ the day saved as a picture", [dl.suggestedFilename(), png(await dl.path())]);
  ok(["11月16日（月）のルーティーン", "2 / 4 項目", "日記を書く", "ストレッチ", "7:02・169日連続", "7:31・139日連続", "3 / 8杯・138日連続", "やめる習慣", "夜ふかし", "やめて 6日目", "つみかさね"].every((w) => drawn.includes(w)), "⑨ the day drawn", drawn);
  // (the month 達成カレンダー shows: June, as ⑤ left it)
  await p.evaluate(() => { window.__drawn = []; });
  [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }), p.click("#rt6PicMonth")]);
  drawn = await p.evaluate(() => window.__drawn.slice());
  ok(dl.suggestedFilename() === "tsumikasane-routine-2026-06.png" && drawn.includes("2026年6月のルーティーン") && drawn.includes("ぜんぶできた日 0日・達成率 25%") && drawn.filter((w) => w === "1/4").length === 30, "⑨ the month the calendar shows", [dl.suggestedFilename(), drawn.slice(0, 3)]);
  await p.locator("#rt6Months .st-day").nth(11).click(); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__drawn = []; });
  [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }), p.click("#rt6PicMonth")]);
  drawn = await p.evaluate(() => window.__drawn.slice());
  ok(dl.suggestedFilename() === "tsumikasane-routine-2026-11.png" && JSON.stringify(png(await dl.path())) === "[1080,1200]", "⑨ the month saved", [dl.suggestedFilename(), png(await dl.path())]);
  ok(["2026年11月のルーティーン", "ぜんぶできた日 14日・達成率 98%", "ぜんぶ", "3/4", "2/4", "日", "土"].every((w) => drawn.includes(w)), "⑨ the month drawn", drawn);

  // ① やめる習慣: 夜ふかし from 11/1, done 11/10: 6日目, 最長 9日; no check, out of the day's list
  const q = () => p.evaluate(() => [...document.querySelectorAll("#rt6QuitList li")].map((li) => ({ n: li.querySelector(".rt6-q-n").textContent, name: li.querySelector("input").value, sub: li.querySelector(".rt-sub").innerText.replace(/\s+/g, ""),
    dots: [...li.querySelectorAll(".rt6-q-dot")].map((i) => i.className.replace("rt6-q-dot", "").trim()).join(","), btn: li.querySelector(".rt6-q-btn")?.textContent || "", mile: li.classList.contains("mile") })));
  const quits = async () => (await ls(p, "routines")).filter((x) => x.quit).sort((a, b) => a.createdAt - b.createdAt);
  let qs = await q();
  ok(qs.length === 1 && qs[0].n === "6日" && qs[0].name === "夜ふかし" && qs[0].sub === "やめて6日目・最長9日・30日で1回やってしまった・7日目まであと1日" && qs[0].dots === "bad,ok,ok,ok,ok,ok,ok now" && qs[0].btn === "やってしまった", "① 夜ふかし: 6日目", qs);
  ok(JSON.stringify(await p.evaluate(() => window.__rt6.run("q1", "2026-11-16"))) === "[6,9]" && (await txt(p, "#rtCount")) === "2/4" && !(await names(p)).includes("夜ふかし") && !(await txt(p, "#rtWeek")).includes("夜ふかし") && !(await txt(p, "#rtStats")).includes("夜ふかし"), "① its run; out of the day's list, the week and the records");
  await p.click("#rt6QuitList .rt6-q-btn"); await p.waitForTimeout(300);
  qs = await q();
  ok((await quits())[0].slips.join() === "2026-11-10,2026-11-16" && qs[0].n === "0日" && qs[0].sub === "やってしまった日・30日で2回やってしまった" && qs[0].btn === "取り消す" && qs[0].dots.endsWith("bad now")
    && (await toast(p)).includes("「夜ふかし」はきょうやってしまった日にしました。また次の日から数えます"), "① やってしまった", { qs, t: await toast(p) });
  await undo(p);
  ok((await quits())[0].slips.join() === "2026-11-10" && (await q())[0].n === "6日", "① 元に戻す", await q());
  await p.fill("#sec-routine .datenav input[type=date]", "2026-11-07"); await p.waitForTimeout(500);
  qs = await q();
  ok(qs[0].n === "7日" && qs[0].mile && qs[0].sub === "やめて7日目の節目です・最長9日・14日目まであと7日", "① a day gone by: 7日目, a 節目", qs);
  await p.fill("#sec-routine .datenav input[type=date]", "2026-10-30"); await p.waitForTimeout(500);
  qs = await q();
  ok(qs[0].n === "–" && qs[0].sub.startsWith("まだ始めていません・11月1日") && !qs[0].btn, "① before it began", qs);
  await p.fill("#sec-routine .datenav input[type=date]", D.DAY); await p.waitForTimeout(500);
  await p.click("#rt6QuitCard .rt6-quit-add"); await p.waitForTimeout(300);
  ok(await isOpen(p, "rt6QuitAsk") && (await p.inputValue("#rt6QuitFrom")) === D.DAY, "① 追加: はじめた日 today");
  await p.fill("#rt6QuitName", "間食"); await p.press("#rt6QuitName", "Enter"); await p.waitForTimeout(300);
  qs = await q();
  ok(qs.length === 2 && qs[1].name === "間食" && qs[1].n === "1日" && qs[1].sub === "やめて1日目・最長1日・3日目まであと2日" && (await toast(p)).includes("やめる習慣に「間食」を追加しました"), "① 間食 added", qs);
  const inp = p.locator("#rt6QuitList input").nth(1);
  await inp.fill("おやつ"); await inp.press("Enter"); await p.waitForTimeout(300);
  ok((await quits())[1].name === "おやつ", "① its name changed where it stands");
  const del = p.locator("#rt6QuitList li").nth(1).locator("button.del");
  await del.click(); await p.waitForTimeout(150); await del.click(); await p.waitForTimeout(300);
  const gone = (await ls(p, "deleted")).find((x) => x.store === "routines" && x.data?.name === "おやつ");
  ok((await quits()).length === 1 && gone?.data?.quit === D.DAY && (await toast(p)).includes("やめる習慣の「おやつ」を削除しました"), "① × twice: gone, into 最近削除した項目", gone);
  await undo(p);
  ok((await quits()).map((x) => x.name).join() === "夜ふかし,おやつ", "① 元に戻す");
  await p.click(".rt6-add-tools button:has-text('やめる習慣を追加')"); await p.waitForTimeout(300);
  ok(await isOpen(p, "rt6QuitAsk"), "① also from under the form");
  await p.fill("#rt6QuitFrom", "2026-12-01"); await p.fill("#rt6QuitName", "未来"); await p.click("#rt6QuitAsk .ask-go"); await p.waitForTimeout(200);
  ok(await isOpen(p, "rt6QuitAsk") && (await quits()).length === 2, "① not from a day to come");
  await p.click("#rt6QuitAsk .ask-keep"); await p.waitForTimeout(200);

  // ⑧ ふだんやる時刻の順に (in the gear)
  await p.click("#rtSettings"); await p.waitForTimeout(600);
  const order = () => p.evaluate(() => [...document.querySelectorAll("#rtOrderList .rt-o-name")].map((x) => x.firstChild.textContent).join(","));
  ok((await txt(p, "#rt6ByTimeFoot")) === "ふだんの時刻：7:05ストレッチ→7:25歯みがき→12:00水を飲む→22:30日記を書く（時刻のない項目は、そのあとに）" && (await order()) === "日記を書く,ストレッチ,歯みがき,水を飲む", "⑧ the usual times", await txt(p, "#rt6ByTimeFoot"));
  await p.click("#rt6ByTimeBtn"); await p.waitForTimeout(400);
  ok((await order()) === "ストレッチ,歯みがき,水を飲む,日記を書く" && await p.evaluate(() => document.querySelector("#rt6ByTimeBtn").disabled) && (await txt(p, "#rt6ByTimeFoot")) === "いまの並びは、ふだんやる時刻の順になっています。", "⑧ put in that order", await order());
  ok((await toast(p)).includes("ふだんやる時刻の順に並べました"), "⑧ said, with 元に戻す");
  await undo(p);
  ok((await order()) === "日記を書く,ストレッチ,歯みがき,水を飲む", "⑧ 元に戻す", await order());
  // ⑩ off at first; ふるえ where the device buzzes
  ok(!(await p.isChecked("#rt6SoundOn")) && await shown(p, "#rt6BuzzOn") && !(await p.isChecked("#rt6BuzzOn")), "⑩ off at first");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);

  // ② 長押し: 日記を書く held down
  await p.evaluate(() => { window.__buzz = []; });
  await hold(p, "r1");
  ok(await isOpen(p, "rt6Menu") && (await txt(p, "#rt6MenuMsg")) === "日記を書く" && (await menu(p)) === "やった,きょうはパス,期間でまとめてチェック,複製,休止する,設定,削除", "② held: its menu", await menu(p));
  ok(await p.evaluate(() => document.querySelector('#rtList li[data-rt="r1"]').classList.contains("rt6-held")) && (await p.evaluate(() => window.__buzz.join())) === "15", "② the row marked, a buzz");
  await p.evaluate(() => document.querySelector('#rtList li[data-rt="r1"] .check').click()); await p.waitForTimeout(200);
  ok(!(await day(p)).done.includes("r1"), "② the finger let go checks nothing");
  await p.click("#rt6MenuGroup .ask-btn:has-text('きょうはパス')"); await p.waitForTimeout(300);
  ok(!(await isOpen(p, "rt6Menu")) && (await day(p)).skip?.join() === "r1" && (await toast(p)).includes("「日記を書く」をきょうはパスにしました"), "② きょうはパス from it", await toast(p));
  await undo(p);
  await hold(p, "r4");
  ok((await menu(p)).startsWith("1つ増やす（3→4杯）,できた（8杯）".replace("3→4", "3 → 4")), "② a counted one's", await menu(p));
  await p.click("#rt6MenuGroup .ask-btn:has-text('1つ増やす')"); await p.waitForTimeout(300);
  ok((await day(p)).counts?.r4 === 4, "② 1つ増やす", (await day(p)).counts);
  await hold(p, "r2", ".rt-sub");
  ok((await menu(p)) === "チェックを外す,ひとことを書く,やった時刻を直す,期間でまとめてチェック,複製,休止する,設定,削除", "② a done one's", await menu(p));
  await p.click("#rt6MenuGroup .ask-btn:has-text('ひとことを書く')"); await p.waitForTimeout(300);
  ok(await isOpen(p, "rt4NoteAsk") && (await txt(p, "#rt4NoteTitle")) === "「ストレッチ」のきょうのひとこと", "② ひとことを書く opens its ask");
  await p.click("#rt4NoteAsk .ask-keep"); await p.waitForTimeout(200);
  await row(p, "r3").locator(".check").click({ button: "right" }); await p.waitForTimeout(300);
  ok(await isOpen(p, "rt6Menu") && (await txt(p, "#rt6MenuMsg")) === "歯みがき", "② right-click: the same");
  await p.click("#rt6MenuNo"); await p.waitForTimeout(300);
  ok(!(await isOpen(p, "rt6Menu")), "② やめる");
  await hold(p, "r3", "input.rt-name");
  ok(!(await isOpen(p, "rt6Menu")), "② not on the name's field (text to pick)");
  await hold(p, "r1", ".check", 40);
  ok(!(await isOpen(p, "rt6Menu")), "② moved (a scroll): none");

  // ④ 複製: from the menu, right under it, with its settings and days of its own
  await hold(p, "r3");
  await p.click("#rt6MenuGroup .ask-btn:has-text('複製')"); await p.waitForTimeout(400);
  const cp = (await ls(p, "routines")).find((x) => x.name === "歯みがき（コピー）");
  ok((await names(p)) === "日記を書く,ストレッチ,歯みがき,歯みがき（コピー）,水を飲む" && (await toast(p)).includes("「歯みがき」を複製しました"), "④ 複製: right under it", await names(p));
  ok(cp && cp.memo === "3分" && cp.by === "07:30" && !cp.pauses && !(await day(p)).done.includes(cp.id) && (await rowText(p, cp.id)).includes("7:30を過ぎています"), "④ its settings, its days its own", cp);
  await undo(p);
  ok((await names(p)) === "日記を書く,ストレッチ,歯みがき,水を飲む" && (await ls(p, "routines")).every((x) => x.order === undefined), "④ 元に戻す: gone, the order as it was", await names(p));
  await row(p, "r2").locator(".rt-opts").click(); await p.waitForTimeout(700);
  ok(await shown(p, ".rt6-copy-row button"), "④ この項目を複製 in ⋯");
  await p.click(".rt6-copy-row button"); await p.waitForTimeout(900);
  ok((await names(p)) === "日記を書く,ストレッチ,ストレッチ（コピー）,歯みがき,水を飲む" && !(await p.evaluate(() => document.querySelector("#daySheet").open)), "④ from ⋯: the sheet closed, the copy under it", await names(p));
  await undo(p);

  // ③ まとめて追加: lines, their marks dropped, an 絵文字 kept, none there already
  await p.click(".rt6-add-tools button:has-text('まとめて追加')"); await p.waitForTimeout(300);
  ok(await isOpen(p, "rt6BulkAsk") && await p.evaluate(() => document.querySelector("#rt6BulkGo").disabled), "③ the ask, 追加 off while empty");
  await p.fill("#rt6BulkText", "・散歩\n💧 水を飲む\n2. 読書\n🧘 ヨガ\n\n散歩"); await p.waitForTimeout(200);
  ok((await txt(p, "#rt6BulkGo")) === "3項目を追加" && (await txt(p, "#rt6BulkSay")) === "同じ名前の2項目は追加しません", "③ counted as typed", [await txt(p, "#rt6BulkGo"), await txt(p, "#rt6BulkSay")]);
  await p.click("#rt6BulkGo"); await p.waitForTimeout(400);
  const rs = await ls(p, "routines"), yoga = rs.find((x) => x.name === "ヨガ");
  ok((await names(p)) === "日記を書く,ストレッチ,歯みがき,水を飲む,散歩,読書,ヨガ" && yoga?.emoji === "🧘" && !rs.find((x) => x.name === "散歩").emoji && (await toast(p)).includes("3項目を追加しました（同じ名前の2項目は飛ばしました）"), "③ added in their order", { n: await names(p), t: await toast(p) });
  await undo(p);
  ok((await names(p)) === "日記を書く,ストレッチ,歯みがき,水を飲む", "③ 元に戻す");
  ok(JSON.stringify(await p.evaluate(() => window.__rt6.lines("1) ストレッチ\n- 腕立て 20回\n✓ 日記を書く\n□ 掃除"))) === JSON.stringify({ out: [{ name: "腕立て 20回", emoji: "" }, { name: "掃除", emoji: "" }], same: 2 }), "③ the marks a list begins with", await p.evaluate(() => window.__rt6.lines("1) ストレッチ\n- 腕立て 20回\n✓ 日記を書く\n□ 掃除")));

  // ⑩ 音・ふるえ: none while off; on, a sound as one is checked, a softer one for one more, another as all are done
  await p.evaluate(() => { window.__tones = []; window.__buzz = []; });
  await row(p, "r1").locator(".check").click(); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__tones.length)) === 0 && (await p.evaluate(() => window.__buzz.length)) === 0, "⑩ off: no sound");
  await row(p, "r1").locator(".check").click(); await p.waitForTimeout(300);
  await p.click("#rtSettings"); await p.waitForTimeout(600);
  await p.locator("#rt6SoundOn").click(); await p.waitForTimeout(200);
  await p.locator("#rt6BuzzOn").click(); await p.waitForTimeout(200);
  ok(await p.evaluate((P) => localStorage.getItem(P + "rt6Sound") === "1" && localStorage.getItem(P + "rt6Buzz") === "1", P) && (await p.evaluate(() => window.__tones.join())) === "880,1320" && (await p.evaluate(() => window.__buzz.join())) === "14", "⑩ turned on: heard and felt at once", await p.evaluate(() => [window.__tones, window.__buzz]));
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__tones = []; window.__buzz = []; });
  await row(p, "r1").locator(".check").click(); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__tones.join())) === "880,1320" && (await p.evaluate(() => window.__buzz.join())) === "14", "⑩ a check", await p.evaluate(() => [window.__tones, window.__buzz]));
  await p.evaluate(() => { window.__tones = []; window.__buzz = []; });
  await row(p, "r4").locator(".check").click(); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__tones.join())) === "660" && (await p.evaluate(() => window.__buzz.join())) === "8", "⑩ one more of a counted one: softer", await p.evaluate(() => [window.__tones, window.__buzz]));
  await p.evaluate(() => { window.__tones = []; window.__buzz = []; });
  await hold(p, "r4"); await p.click("#rt6MenuGroup .ask-btn:has-text('できた')"); await p.waitForTimeout(400);
  ok((await p.evaluate(() => window.__tones.join())) === "784,988,1175,1568" && (await p.evaluate(() => JSON.stringify(window.__buzz))) === "[15,[20,50,20,50,40]]" && (await txt(p, ".rt-all")).includes("ぜんぶできました"), "⑩ the last: all done's sound", await p.evaluate(() => [window.__tones, window.__buzz]));
  await p.evaluate(() => { window.__tones = []; window.__buzz = []; });
  await row(p, "r1").locator(".check").click(); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__tones.length)) === 0, "⑩ none as a check is taken off");
  ok(!p.errs.length, "no error on the way", p.errs);
  await p.close();

  // a first day: none of them yet (only the ways to add)
  p = await open(b, { routines: [], routineDays: [], settings: [] });
  ok(!(await shown(p, "#rt6QuitCard")) && !(await shown(p, "#rt6MonthsCard")) && !(await shown(p, "#rt6HoursCard")) && !(await p.evaluate(() => document.querySelector(".rt6-took"))) && await shown(p, ".rt6-add-tools"), "nothing yet: the cards hidden, the ways to add there");
  ok(!p.errs.length, "no error with nothing", p.errs);

  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})().catch((e) => { console.log("FAIL " + (e && e.stack || e)); process.exit(1); });
