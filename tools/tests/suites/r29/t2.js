// 目標 その2: the insides (through the hook build at 8773): ⑩'s notifications, ② the weeks gone by, ⑥ words for other goals,
// ⑧ deeper charts, ③ when little is left, ① the middle of a counted cell, a ToDo's, the copy, ⑦ the picture's colours
process.env.URL0 = process.env.URL0 || "http://localhost:8773/";
const { chromium } = require("playwright");
const fs = require("fs");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const T = (d, h = 9) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const goal = async (p, id = "g1") => (await ls(p, "goals")).find((g) => g.id === id);
const G = (id, title, extra = {}) => ({ id, title, criterion: "達成", deadline: "2027-03-31", depth: 2, done: false, createdAt: T("2026-08-01"), mandala: [{ t: "A" }, null, null, null, null, null, null, null], ...extra });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-11T12:00:00+09:00"), { deviceScaleFactor: 1 });
  const W = (f, ...a) => p.evaluate(({ f, a }) => window.__goal[f](...a), { f, a });
  const NOW = Date.parse("2026-11-11T12:00:00+09:00"); // the page's clock, not the real one (from 11/14 9:00 on, the real one had passed the 9:00 counted on)

  // ⑩ notifications: 7 days after the last step (11/8 21:00 → 11/15, then every 7 days), at 9:00, naming the next step
  const N1 = G("n1", "TOEIC 800点", { nudge: 7, mandala: [{ t: "単語", c: [{ t: "単語帳1周", d: true, at: T("2026-11-08", 21) }, { t: "単語帳2周" }, null, null, null, null, null, null] }, { t: "文法" }, null, null, null, null, null, null] });
  const N2 = G("n2", "ギター", { nudge: 3 }); // nothing done since 8/1: every 3 days, the next after today's 9:00
  const N3 = G("n3", "休止中", { nudge: 3, pausedAt: T("2026-11-01") });
  const N4 = G("n4", "通知なし");
  await seed(p, { goals: [N1, N2, N3, N4] }, "goal"); await p.waitForTimeout(900);
  let al = (await W("alarms", NOW)).filter((a) => a.tag.startsWith("goal-nudge:"));
  const a1 = al.filter((a) => a.tag.startsWith("goal-nudge:n1:")), a2 = al.filter((a) => a.tag.startsWith("goal-nudge:n2:"));
  ok(a1[0]?.tag === "goal-nudge:n1:2026-11-15" && new Date(a1[0].at).toISOString() === "2026-11-15T00:00:00.000Z" && a1[1]?.tag === "goal-nudge:n1:2026-11-22", "⑩ 7 days on, at 9:00, and 7 days after that", a1.map((a) => a.tag));
  ok(a1[0].title === "TOEIC 800点" && a1[0].body === "7日進めていません。次の一歩は「単語帳2周」はどうですか？" && a1[0].url === "./#goal:n1" && a1[1].body.startsWith("14日進めていません"), "⑩ its words", a1.slice(0, 2));
  ok(a1.every((a) => a.at <= NOW + 40 * 864e5), "⑩ within the 40 days");
  ok(a2[0]?.tag === "goal-nudge:n2:2026-11-14" && a2[0].body.startsWith("105日進めていません"), "⑩ long still: the next after today's 9:00 (today's has gone)", a2.slice(0, 1));
  ok(!al.some((a) => /:n3:|:n4:/.test(a.tag)), "⑩ none on hold, none when off");
  const sig0 = await W("sig");
  // a step today: from today
  await p.evaluate(({ P }) => { const gs = JSON.parse(localStorage.getItem(P + "goals")); gs[0].mandala[1].d = true; gs[0].mandala[1].at = Date.now(); localStorage.setItem(P + "goals", JSON.stringify(gs)); }, { P });
  await p.reload(); await p.waitForTimeout(900);
  al = (await W("alarms", NOW)).filter((a) => a.tag.startsWith("goal-nudge:n1:"));
  ok(al[0]?.tag === "goal-nudge:n1:2026-11-18", "⑩ moved on today: 7 days from today", al.map((a) => a.tag));
  ok((await W("sig")) !== sig0, "⑩ the notifications go again (their sign changed)");

  // ② the weeks gone by in これまでの歩み: judged by the quota each had
  const Q = G("q1", "週のノルマ", { quota: 3, quotaLog: [["2026-10-18", 2], ["2026-10-28", 3]],
    mandala: [{ t: "A", c: [{ t: "a1", d: true, at: T("2026-10-20") }, { t: "a2", d: true, at: T("2026-10-25") }, { t: "a3", d: true, at: T("2026-10-26") }, { t: "a4", d: true, at: T("2026-11-03") }, { t: "a5", d: true, at: T("2026-11-04") }, { t: "a6", d: true, at: T("2026-11-05") }, { t: "a7" }, { t: "a8", d: true, at: T("2026-11-09") }] }, null, null, null, null, null, null, null] });
  await seed(p, { goals: [Q] }, "goal"); await p.waitForTimeout(900);
  const st = await W("steps", "q1");
  ok(st.includes("10/18〜10/24の週：ノルマ 1/2マス") && st.includes("10/25〜10/31の週：ノルマ 2/3マス") && st.includes("11/1〜11/7の週：ノルマ 3/3マス（達成）"), "② each week by its own quota", st.filter((x) => x.includes("週")));
  ok(!st.some((x) => x.startsWith("11/8〜")), "② not this week (still going)");
  await p.locator(".goal-open").first().click(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => [...document.querySelectorAll("#mSteps .what.m-week.ok")].length >= 1 && document.querySelector("#mProgress .m-quota .num").textContent === "1/3マス"), "② shown: the week met in colour; this week 1/3");
  await p.click("#sheetDone"); await p.waitForTimeout(400);

  // ⑥ words for other goals and elements
  const S = [G("s1", "体重を60kgにする"), G("s2", "簿記3級に合格する"), G("s3", "フルマラソン完走"), G("s4", "ギターで1曲弾けるようになる"), G("s5", "なにか", { mandala: [{ t: "食事" }, null, null, null, null, null, null, null] }), G("s6", "ベンチプレス100kg", { mandala: [{ t: "食事" }, null, null, null, null, null, null, null] })];
  await seed(p, { goals: S }, "goal"); await p.waitForTimeout(900);
  ok((await W("sug", "s1", []))[0] === "食事" && !(await W("sug", "s1", [])).includes("A"), "⑥ ダイエット's elements", await W("sug", "s1", []));
  ok((await W("sug", "s2", []))[0] === "試験を知る", "⑥ 資格試験's", await W("sug", "s2", []));
  ok((await W("sug", "s3", []))[0] === "練習量", "⑥ マラソン's", await W("sug", "s3", []));
  ok((await W("sug", "s4", []))[0] === "基礎練習", "⑥ 楽器's", await W("sug", "s4", []));
  ok((await W("sug", "s5", [])).join() === "計画,習慣,時間の使い方,環境,体調,記録,仲間,ごほうび" || (await W("sug", "s5", [])).length === 8, "⑥ any goal's otherwise", await W("sug", "s5", []));
  const food = await W("sug", "s5", [0]);
  ok(food[0] === "カロリーの目安を決める" && food.includes("夜9時以降は食べない") && food.length === 8, "⑥ 食事's actions (the 雛形's)", food);
  ok((await W("sug", "s6", [0]))[0] === "体重×2gのたんぱく質" && (await W("sug", "s6", []))[0] === "胸", "⑥ ベンチプレス○kg: 筋トレ's first, its 食事 too", [await W("sug", "s6", []), await W("sug", "s6", [0])]);

  // ⑧ deeper (分割 3): steps in; × and empty left out; a counted one with its count; an achieved goal
  const D = G("d1", "deep", { depth: 3, mandala: [{ t: "A", c: [{ t: "A1", c: [{ t: "A1a", d: true, at: T("2026-11-01") }, { t: "A1b", n: 5, v: 2 }, { t: "", x: true }, null, null, null, null, null] }, { t: "", x: true }, null, null, null, null, null, null] }, { t: "B", n: 10, v: 10, d: true, at: T("2026-11-02"), u: "ページ" }, null, null, null, null, null, null] });
  const E = G("e1", "achieved", { done: true, doneAt: T("2026-11-05", 20), mandala: [{ t: "X", d: true, at: T("2026-11-05", 20) }, null, null, null, null, null, null, null] });
  await seed(p, { goals: [D, E] }, "goal"); await p.waitForTimeout(900);
  const tx = await W("text", "d1");
  ok(tx.split("\n").slice(5).join("\n") === "⬜ A（0/1）\n　⬜ A1（1/2）\n　　✅ A1a\n　　⬜ A1b（2/5回）\n✅ B", "⑧ deeper: a step in each level, × and empty out", tx);
  ok((await W("text", "e1")).includes("11月5日（木）に達成しました") && !(await W("text", "e1")).includes("期限："), "⑧ achieved: the day, no 期限", await W("text", "e1"));
  // ① the % with a count under way: A = A1 = (1 + .4)/2 = .7; B done → (0.7 + 1)/2 = 85%
  ok((await W("pct", "d1")) === 85, "① 2 of 5 counts as 40% of a cell", await W("pct", "d1"));
  // ④ the days: a count's days and a check's, a cell once a day
  const mv = Object.fromEntries(await W("moves", "d1"));
  ok(mv["2026-11-01"] === 1 && mv["2026-11-02"] === 1 && Object.keys(mv).length === 2, "④ the days it moved", mv);

  // ③ when every cell of a goal is done, it gives none; a goal with nothing but new cells: 次のマス
  const R1 = G("r1", "all done", { mandala: [{ t: "A", d: true, at: T("2026-11-10") }, null, null, null, null, null, null, null] });
  const R2 = G("r2", "fresh", { createdAt: T("2026-11-10"), mandala: [{ t: "first" }, { t: "second" }, null, null, null, null, null, null] });
  const R3 = G("r3", "paused", { pausedAt: T("2026-11-01"), mandala: [{ t: "p", due: "2026-11-11" }, null, null, null, null, null, null, null] });
  await seed(p, { goals: [R1, R2, R3] }, "goal"); await p.waitForTimeout(900);
  const nx = await W("next");
  ok(nx.length === 1 && nx[0][0] === "r2" && nx[0][1] === "first" && nx[0][3] === "次のマス", "③ only 次のマス when nothing else; none from done or paused", nx);
  ok(await p.evaluate(() => document.querySelectorAll("#goalNext li").length === 1), "③ shown as one");

  // ① a counted cell walked into (to split it): its ring in the middle; and its ToDo checked off at the number
  const C1 = G("c1", "count", { mandala: [{ t: "過去問", n: 3, v: 2, todo: "t1" }, { t: "B" }, null, null, null, null, null, null] });
  await seed(p, { goals: [C1], todos: [{ id: "t1", text: "過去問", done: false, goal: "c1", createdAt: T("2026-11-01") }] }, "goal"); await p.waitForTimeout(900);
  await p.locator(".goal-open").first().click(); await p.waitForTimeout(800);
  await p.click('.m-cell[data-k="0"] [data-role="open"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector(".m-center .m-pct").textContent === "2/3回" && !!document.querySelector(".m-center .m-cnt")), "① its middle: the count and the ring");
  await p.click(".m-center .m-cnt"); await p.waitForTimeout(500);
  const c1 = (await goal(p, "c1")).mandala[0];
  ok(c1.v === 3 && c1.d === true, "① the middle's ring: 3/3, done", c1);
  ok((await ls(p, "todos"))[0].done === true, "① its ToDo checked off with it");
  await p.click(".m-center [data-role=check]"); await p.waitForTimeout(500);
  ok((await goal(p, "c1")).mandala[0].v === 2 && !(await goal(p, "c1")).mandala[0].d, "① its check pressed: 2/3, to do", (await goal(p, "c1")).mandala[0]);
  await p.click("#sheetCancel"); await p.waitForTimeout(400);
  // the copy keeps the numbers and colours, not the counts
  await p.click("#mCopy"); await p.waitForTimeout(800);
  const copy = (await ls(p, "goals")).find((g) => g.id !== "c1");
  ok(copy && copy.mandala[0].n === 3 && copy.mandala[0].v === undefined && copy.mandala[0].log === undefined && !copy.mandala[0].d, "複製: the number kept, the count not", copy?.mandala[0]);
  await p.click("#sheetDone"); await p.waitForTimeout(400);

  // ⑦ the picture: 単語's block in its blue, 文法's in the goal's mint
  const I = G("i1", "TOEIC", { mandala: [{ t: "単語", co: "#1e6ef4", c: [{ t: "単語帳1周", d: true, at: T("2026-11-08") }, null, null, null, null, null, null, null] }, { t: "文法", c: [{ t: "文法書", d: true, at: T("2026-11-08") }, null, null, null, null, null, null, null] }, null, null, null, null, null, null] });
  await seed(p, { goals: [I] }, "goal"); await p.waitForTimeout(900);
  await p.locator(".goal-open").first().click(); await p.waitForTimeout(800);
  await p.click('button[data-view="whole"]'); await p.waitForTimeout(400);
  const dl = p.waitForEvent("download", { timeout: 5000 }).catch(() => null);
  await p.click("#mImage");
  const f = await dl;
  ok(!!f, "⑦ the picture saved");
  if (f) {
    const b64 = fs.readFileSync(await f.path()).toString("base64");
    const px = await p.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
      const at = (X, Y) => [...x.getImageData(X * 2, Y * 2, 1, 1).data].slice(0, 3);
      // block 0's first cell (単語帳1周, done) and block 1's first cell (文法書, done): PAD 28, HEAD 70, CELL 112, GAP 4, BGAP 12
      const block = 112 * 3 + 8, b1x = 28 + block + 12;
      return { blue: at(28 + 20, 28 + 70 + 20), mint: at(b1x + 20, 28 + 70 + 20) };
    }, b64);
    ok(px.blue[2] > px.blue[1] + 10 && px.blue[2] > px.blue[0] + 20, "⑦ 単語's cell in blue", px.blue);
    ok(px.mint[1] > px.mint[2] && px.mint[1] > px.mint[0] + 10, "⑦ 文法's in the goal's mint", px.mint);
  }
  ok(p.errs.length === 0, "no errors on the page", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
