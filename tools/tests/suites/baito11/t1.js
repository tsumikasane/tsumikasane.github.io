// バイト その11 ①②③④⑤⑨⑩: what is shown (③ and the words on each shift's row: taken out with the month's list of shifts
// at the user's call, 2026-11-26)
process.env.URL0 = process.env.URL0 || "http://localhost:8862/";
const { chromium } = require("playwright");
const { P, at, phone, seed } = require("./lib");
const { DATA, today } = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() || "", sel);
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, at("12:00", today));
  await seed(p, DATA, "money");
  await p.evaluate((P) => localStorage.setItem(P + "moneyPart", "job"), P); await p.reload(); await p.waitForTimeout(900);
  // ② 次のバイト: there and back, 傘, home at 23:30
  // (the weather there and back, 行き … ・帰り …, and 傘を持っていきましょう on 次のバイト: taken out at the user's call,
  // 2026-11-27, tools/REMOVED.md; when home is reached stays, and the 傘 in その7's お知らせ, below)
  const wx = await txt(p, "#bt3Next .bt11-wx");
  ok(wx === "家に着くのは 23:30 ごろ" && !(await p.$("#bt3Next .bt11-wx p.warn")) && !(await txt(p, "#bt3Next")).includes("行き"), "② home at 23:30 alone: " + wx);
  // ① 前の勤務から 8 時間（短め） on a shift's row: went with the month's list at the user's call (2026-11-26,
  // tools/REMOVED.md); said as a shift goes in (t2)
  // ③ シフト希望とのちがい (11月のシフト希望とくらべると…, and シフト希望では × on a row): taken out with the month's list
  ok(!(await p.$("#bt11AskSum")) && !(await p.$("#shiftList")) && !(await p.$("#shiftCard")), "③ gone, with the month's list");
  // ⑤ 休業手当: 8〜10月 12 回 × 5,300 円 → 平均賃金 3,180 円（日数で割ると 691 円）→ 6割 1,908 円
  const cafe = await p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ"))?.querySelector(".bt11-notes")?.innerText.replace(/\s+/g, " ").trim() || "");
  ok(cafe.startsWith("お店の都合でなくなったのなら、休業手当が出ることがあります（めやす 約 1,908 円、1日あたり平均賃金の6割）"), "⑤ " + cafe);
  ok(!(await p.evaluate(() => [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("塾"))?.querySelector(".bt11-notes"))), "⑤ not 塾's");
  // ⑨ colours: the jobs' blocks, the calendar's days (each shift's row: went with the month's list, 2026-11-26)
  const st = await p.evaluate(() => ({ blk: [...document.querySelectorAll("#jobSum .job-block.bt11-c")].length,
    cafe: [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("カフェ"))?.getAttribute("style") || "",
    juku: [...document.querySelectorAll("#jobSum .job-block")].find((x) => x.innerText.includes("塾"))?.getAttribute("style") || "",
    dots: [...document.querySelectorAll('#bt6Cal .bt6-d[data-day="2026-11-17"] .bt11-dots i')].map((i) => i.getAttribute("style")) }));
  ok(/--jc:\s*var\(--lc-blue\)/.test(st.cafe) && /--lc-green/.test(st.juku) && st.blk === 2 && st.dots.length === 2 && /--lc-blue/.test(st.dots[0]) && /--lc-green/.test(st.dots[1]), "⑨ " + JSON.stringify(st));
  // ④ 週のはじめ (日曜 8:00): 11/22's week; ⑩ 有給 3 日 on 11/30, 7 days before; ② 傘 in その7's
  const al = await p.evaluate(() => window.__bt11.alarms(Date.now()).filter((a) => /^(bt11|bt7)/.test(a.tag)).map((a) => ({ tag: a.tag, at: new Date(a.at).toISOString(), title: a.title, body: a.body })));
  const by = (t) => al.find((a) => a.tag === t);
  const wk = by("bt11-week:2026-11-22");
  ok(wk && wk.at === "2026-11-21T23:00:00.000Z" && wk.title === "今週のバイトは 2 回（8 時間）" && wk.body === "月 17:00〜22:00（カフェ）・水 18:00〜21:00（塾）　見込み 約 9,800円", "④ " + JSON.stringify(wk));
  ok(al.filter((a) => a.tag.startsWith("bt11-week")).length === 1, "④ the weeks without shifts: none");
  // ⑩ 有給が使えなくなる前: went with その4 ⑧ 有給休暇のめやす (taken out at the user's call (2026-11-19, tools/REMOVED.md))
  ok(!al.some((a) => a.tag.startsWith("bt11-leave")), "⑩ none");
  ok((by("bt7-eve:2026-11-16")?.body || "").endsWith("雨の予報です。傘を持っていきましょう") && (by("bt7-go:g1:2026-11-16:17:00")?.body || "").endsWith("雨の予報です。傘を持っていきましょう"), "② in その7's: " + JSON.stringify([by("bt7-eve:2026-11-16"), by("bt7-go:g1:2026-11-16:17:00")]));
  ok(!(by("bt7-eve:2026-11-17")?.body || "").includes("傘"), "② not on a day without rain");
  // ①④⑨⑩ the settings
  await p.click("#moneySettings"); await p.waitForTimeout(500);
  const f = await p.evaluate(() => ({ gap: document.getElementById("bt11Gap").value, week: document.getElementById("bt11WeekOn").checked, at: document.getElementById("bt11WeekAt").value,
    color: document.querySelector('#jobForms [data-job="j1"] [data-f="color"]').value, sw: document.querySelector('#jobForms [data-job="j1"] .bt11-swatch').getAttribute("style") }));
  ok(f.gap === "11" && f.week && f.at === "08:00" && f.color === "blue" && /--lc-blue/.test(f.sw), "①④⑨⑩ the settings: " + JSON.stringify(f));
  ok((await txt(p, "#bt11WeekFoot")).length > 0 && !(await p.$("#bt11LeaveOn")) && !(await p.$("#bt11LeaveFoot")), "④ said, ⑩ gone");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
