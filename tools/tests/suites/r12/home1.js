// きょう ①〜④: 予定のこれから, バイト, きょうの運動, すぐに記録
const { chromium } = require("playwright");
const { URL0, P, at, phone, seed, T0 } = require("./lib");
const out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-09";
const DATA = {
  events: [
    { id: "e1", date: today, time: "09:00", endTime: "10:00", title: "朝ゼミ", createdAt: T0 },
    { id: "e2", date: today, time: "14:00", endTime: "15:00", title: "研究室", createdAt: T0 },
    { id: "e3", date: today, time: "15:00", title: "面談", createdAt: T0 },
    { id: "e4", date: today, title: "レポート締め切り", createdAt: T0 },
    { id: "e5", date: today, time: "18:30", endTime: "20:00", title: "サークル", createdAt: T0 },
  ],
  settings: [
    { id: "jobs", items: [{ id: "j1", name: "カフェ", wage: 1200, fare: 0, night: true, cutoff: 0, payday: 25 }], wall: 1030000, updatedAt: T0 },
    { id: "home", order: ["todo", "calendar", "journal", "study", "diet", "routine", "money", "tsumi", "goal"], hidden: [], updatedAt: T0 },
  ],
  shifts: [
    { id: "s1", date: "2026-11-02", start: "10:00", end: "15:00", rest: 60, jobId: "j1", createdAt: T0 },
    { id: "s2", date: today, start: "17:00", end: "22:00", rest: 0, jobId: "j1", createdAt: T0 },
  ],
};
const tileText = (p, key) => p.evaluate((key) => { const t = document.querySelector(`.tile[data-tile="${key}"]`); return t ? t.innerText.replace(/\s+/g, "") : null; }, key);
(async () => {
  const b = await chromium.launch();
  let p = await phone(b, at("14:15"));
  await seed(p, DATA);
  // the order: the new ones beside the ones they go with
  const order = await p.evaluate(() => [...document.querySelectorAll("#homeTiles > .tile")].map((t) => t.dataset.tile).filter((k) => !/^h\d/.test(k)).join(",")); // (きょう その3's and その4's tiles: home3, home4)
  ok(order === "quick,weather,todo,calendar,countdown,journal,study,routine,diet,move,money,tsumi,job,goal", "order with a saved one: " + order);
  // ① 予定
  const ev = await p.evaluate(() => [...document.querySelectorAll('.tile[data-tile="calendar"] li')].map((li) => (li.classList.contains("past") ? "(past) " : "") + li.innerText.replace(/\s+/g, " ").trim()));
  ok(JSON.stringify(ev) === JSON.stringify(["レポート締め切り", "研究室 いま", "面談 あと45分"]), "① the ones to come first, いま and あと45分: " + ev.join(" / "));
  // ② バイト
  const job = await tileText(p, "job");
  ok(job && job.includes("10,800円") && job.includes("11月分の見込み") && job.includes("きょう17:00〜22:00") && /1年の目安まであと1,019,200/.test(job), "② バイト: " + job);
  // ③ きょうの運動
  let mv = await tileText(p, "move");
  ok(mv && mv.includes("0/4") && mv.includes("ラン4km") && mv.includes("レッグプレス") && mv.includes("プランク1分×3セット"), "③ きょうの運動: " + mv);
  await p.locator('.mv-row[data-mv="m0"]').click(); await p.waitForTimeout(500);
  let sh = await p.evaluate(() => ({ title: sheetTitle.textContent, save: recSave.textContent, del: recDelete.closest(".card").hidden, type: reType.value, ex: reExercise.value, reps: reReps.value, sets: reSets.value, focus: document.activeElement?.id }));
  ok(sh.title === "運動を記録" && sh.save === "追加" && sh.del && sh.type === "筋トレ" && sh.ex === "レッグプレス" && sh.reps === "20" && sh.sets === "3" && sh.focus === "reWeight", "③ レッグプレス pressed: the form filled, 重さ to type", sh);
  await p.keyboard.type("40"); await p.locator("#recSave").click(); await p.waitForTimeout(700);
  const w = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "workouts") || "[]"), P);
  ok(w.length === 1 && w[0].exercise === "レッグプレス" && w[0].kg === 40 && w[0].reps === 20 && w[0].sets === 3 && w[0].date === "2026-11-09" && !("minutes" in w[0]), "③ recorded: " + JSON.stringify(w[0]));
  mv = await tileText(p, "move");
  const msg = await p.evaluate(() => document.querySelector("#status.show, #sheetStatus.show")?.textContent || "");
  ok(mv.includes("1/4") && await p.locator('.mv-tile li.done .mv-row[data-mv="m0"]').count() === 1 && msg.startsWith("運動を記録しました"), "③ checked: " + mv.slice(0, 20) + " | " + msg);
  // プランク: 60 秒 × 3, nothing to type
  await p.locator('.mv-row[data-mv="m2"]').click(); await p.waitForTimeout(500);
  sh = await p.evaluate(() => ({ ex: reExercise.value, reps: reReps.value, per: rePer.value, sets: reSets.value }));
  ok(sh.ex === "プランク" && sh.reps === "60" && sh.per === "sec" && sh.sets === "3", "③ プランク: 60 秒 × 3", sh);
  await p.locator("#sheetCancel").click(); await p.waitForTimeout(500);
  // ラン: km in, 時間 to type
  await p.locator('.mv-row[data-mv="run"]').click(); await p.waitForTimeout(500);
  sh = await p.evaluate(() => ({ type: reType.value, km: reDist.value, focus: document.activeElement?.id }));
  ok(sh.type === "ランニング" && sh.km === "4" && sh.focus === "reMin", "③ ラン: 4 km, 時間 to type", sh);
  await p.keyboard.type("28"); await p.locator("#recSave").click(); await p.waitForTimeout(700);
  mv = await tileText(p, "move");
  ok(mv.includes("2/4"), "③ ラン recorded: " + mv.slice(0, 24));
  // ④ すぐに記録
  const tryQuick = async (kind, fill, check, label) => {
    await p.locator(`.qk[data-kind="${kind}"]`).click(); await p.waitForTimeout(500);
    const title = await p.evaluate(() => sheetTitle.textContent);
    await fill(); await p.locator(kind === "todo" ? "#todoSave" : "#recSave").click(); await p.waitForTimeout(700);
    const got = await check();
    ok(got.ok, `④ ${label}: ${title} → ${got.say}`);
    if (await p.evaluate(() => document.getElementById("daySheet").open)) { await p.locator("#sheetCancel").click(); await p.waitForTimeout(400); }
  };
  const ls = (k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
  await tryQuick("weight", () => p.locator("#reKg").fill("65.2"), async () => { const x = (await ls("weights")).find((r) => r.id === today); return { ok: !!x && x.kg === 65.2 && x.date === today, say: JSON.stringify(x) }; }, "体重");
  await p.locator('.qk[data-kind="weight"]').click(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => sheetTitle.textContent) === "からだの記録を編集" && await p.inputValue("#reKg") === "65.2", "④ 体重 again: today's opened to change");
  await p.locator("#sheetCancel").click(); await p.waitForTimeout(400);
  await tryQuick("meal", () => p.locator("#reText").fill("おにぎり"), async () => { const x = (await ls("meals")).find((r) => r.text === "おにぎり"); return { ok: !!x && x.date === today && x.slot === "昼食", say: JSON.stringify(x) }; }, "食事");
  await tryQuick("workout", async () => { await p.locator("#reExercise").fill("スクワット"); await p.locator("#reReps").fill("10"); }, async () => { const x = (await ls("workouts")).find((r) => r.exercise === "スクワット"); return { ok: !!x && x.sets === 3 && x.reps === 10, say: JSON.stringify(x) }; }, "運動");
  await tryQuick("study", () => p.locator("#reMin").fill("30"), async () => { const x = (await ls("study"))[0]; return { ok: !!x && x.minutes === 30 && x.date === today, say: JSON.stringify(x) }; }, "勉強");
  await tryQuick("money", () => p.locator("#reAmount").fill("500"), async () => { const x = (await ls("expenses"))[0]; return { ok: !!x && x.amount === 500 && x.kind === "out" && x.date === today, say: JSON.stringify(x) }; }, "支出");
  await tryQuick("todo", () => p.locator("#todoText").fill("牛乳を買う"), async () => { const x = (await ls("todos")).find((t) => t.text === "牛乳を買う"); return { ok: !!x, say: JSON.stringify(x) }; }, "ToDo");
  // 元に戻す takes a new one out
  await p.locator('.qk[data-kind="meal"]').click(); await p.waitForTimeout(400);
  await p.locator("#reText").fill("ケーキ"); await p.locator("#recSave").click(); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector("#status.show .undo, #status.show button")?.click()); await p.waitForTimeout(600);
  ok(!(await ls("meals")).some((m) => m.text === "ケーキ"), "④ 元に戻す: the new one taken out");
  // the head of すぐに記録 opens nothing
  const tab0 = await p.evaluate(() => document.documentElement.dataset.tab);
  await p.locator('.tile[data-tile="quick"] .tile-head').click({ position: { x: 10, y: 10 } }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.documentElement.dataset.tab) === tab0 && !(await p.evaluate(() => document.getElementById("daySheet").open)), "④ its head opens nothing");
  // the バイト tile's head opens 家計簿 at バイト
  await p.locator('.tile[data-tile="job"] .tile-head').click(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.documentElement.dataset.tab === "money" && !document.getElementById("moneyJob").hidden), "② its head opens 家計簿's バイト");
  await p.goto(URL0 + "#home"); await p.reload(); await p.waitForTimeout(600);
  await p.screenshot({ path: out + "/home-393.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // no jobs, no menu kept: バイト says how to begin; 16:40 the past ones fade
  p = await phone(b, at("16:40"));
  await seed(p, { events: DATA.events });
  const ev2 = await p.evaluate(() => [...document.querySelectorAll('.tile[data-tile="calendar"] li')].map((li) => (li.classList.contains("past") ? "(past) " : "") + li.innerText.replace(/\s+/g, " ").trim()));
  ok(JSON.stringify(ev2) === JSON.stringify(["レポート締め切り", "サークル あと1時間50分", "(past) 09:00 朝ゼミ"]), "① 16:40: " + ev2.join(" / "));
  ok((await tileText(p, "job")).includes("バイト先を決めると"), "② no jobs: how to begin");
  const order2 = await p.evaluate(() => [...document.querySelectorAll("#homeTiles > .tile")].map((t) => t.dataset.tile).filter((k) => !/^h\d/.test(k)).join(",")); // (きょう その3's and その4's tiles: home3, home4)
  ok(order2 === "quick,weather,todo,calendar,countdown,journal,study,routine,diet,move,money,tsumi,job,goal", "order with none saved: " + order2);
  await p.screenshot({ path: out + "/home-393-b.png", fullPage: true });
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // the minute turning: あと44分
  p = await phone(b, at("14:15"));
  await seed(p, { events: DATA.events });
  await p.clock.setFixedTime(at("14:16"));
  await p.waitForTimeout(61000);
  const ev3 = await p.evaluate(() => document.querySelector('.tile[data-tile="calendar"] li:nth-child(3)').innerText.replace(/\s+/g, " ").trim());
  ok(ev3 === "面談 あと44分", "① a minute on, drawn again: " + ev3);
  await p.close();
  // 320 and dark, for a look
  for (const [name, o] of [["home-320", { viewport: { width: 320, height: 640 } }], ["home-393d", { colorScheme: "dark" }]]) {
    p = await phone(b, at("14:15"), o);
    await seed(p, DATA);
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok(!over && !p.errs.length, `${name}: nothing wider than the screen, no errors`, p.errs);
    await p.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : "all OK");
})();
