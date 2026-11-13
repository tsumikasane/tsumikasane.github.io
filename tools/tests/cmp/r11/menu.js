// 運動のメニュー: the 筋トレ made anew (2026-11-09)
const { chromium } = require("playwright");
const URL0 = process.env.URL0 || "http://localhost:8765/", P = process.env.PFX || "tsumikasane:", out = process.argv[2] || __dirname + "/shots";
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? " " + JSON.stringify(x) : "")); if (!c) fails++; };
// expected, by getDay()
const WANT = {
  0: ["脚 カーフレイズ 20回 × 3セット", "背中 バックエクステンション 20回 × 3セット", "肩 サイドレイズ 20回 × 3セット"],
  1: ["脚 レッグプレス 20回 × 3セット", "胸 チェストプレス 20回 × 3セット", "体幹 プランク 1分 × 3セット"],
  2: ["脚 レッグカール 20回 × 3セット", "背中 ラットプルダウン 20回 × 3セット", "腕 アームカール 20回 × 3セット"],
  3: ["脚 ヒップアブダクション 20回 × 3セット", "肩 ショルダープレス 20回 × 3セット", "体幹 バックプランク 1分 × 3セット"],
  4: ["脚 シーテッドレッグプレス 20回 × 3セット", "背中 シーテッドロー 20回 × 3セット", "体幹 ロータリートルソー 20回 × 3セット"],
  5: ["脚 ヒップアダクション 20回 × 3セット", "胸 チェストプレス 20回 × 3セット", "体幹 アブドミナルクランチ 20回 × 3セット"],
  6: ["背中 懸垂 できる回数 × 3セット", "腕 アームカール 20回 × 3セット", "体幹 サイドプランク 左右1分 × 3セット"],
};
const OLD = [
  { theme: "軽め", km: 4, run: "ゆっくり", moves: [["補助", "プランク", 2, "30秒"], ["補助", "サイドプランク", 2, "左右30秒"]] },
  { theme: "脚", km: 6, run: "ゆっくり", moves: [["メイン", "レッグプレス", 3, "10回"], ["メイン", "レッグカール", 3, "10回"]] },
  { theme: "押す", km: 4, run: "ゆっくり", moves: [["メイン", "チェストプレス", 3, "10回"]] },
  { theme: "引く", km: 5, run: "ゆっくり", moves: [["メイン", "ラットプルダウン", 3, "10回"]] },
  { theme: "脚", km: 4, run: "ゆっくり", moves: [["メイン", "シーテッドレッグプレス", 3, "10回"]] },
  { theme: "押す", km: 4, run: "ゆっくり", moves: [["メイン", "チェストプレス", 3, "10回"]] },
  { theme: "引く", km: 5, run: "変化走", moves: [["メイン", "懸垂", 3, "できる回数"]] },
];
const OLD_NOTES = [["ペース", ["変化走以外は、話しながら走れるペース"]], ["重さ", ["メインは10回でややきつい重さ。3セットとも12回できたら1段階上げる"]], ["日曜", ["大きな筋肉を休ませる軽い日なので、メイン種目はなし"]], ["疲れた日", ["月〜土は、忙しい日や疲れが残る日はメインの2種目だけで十分"]], ["自分", ["自分で書いたメモ"]]];
(async () => {
  const b = await chromium.launch(), errs = [];
  const page = async (o = {}) => { const c = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...o }); const p = await c.newPage(); p.on("pageerror", (e) => errs.push(e.message)); return p; };
  const seed = async (p, menu) => { await p.goto(URL0); await p.evaluate(({ P, menu }) => { localStorage.clear(); if (menu) localStorage.setItem(P + "settings", JSON.stringify([menu])); }, { P, menu }); await p.goto(URL0 + "#workout"); await p.reload(); await p.waitForTimeout(600); };
  const menu = (p) => p.evaluate(() => {
    const m = document.getElementById("woMenu");
    return { head: m.querySelector(".card-head").innerText.replace(/\s+/g, " ").trim(), rows: [...m.querySelectorAll("ul.list > li")].map((li) => li.innerText.replace(/\s+/g, " ").replace(/ /g, " ").trim().replace(/ ?＋1$/, "").replace(/・1段階上げどき/, "")), sum: m.querySelector(".wo-menu-sum")?.textContent || "", notes: [...m.querySelectorAll(".wo-notes dt")].map((dt) => dt.textContent + "：" + dt.nextElementSibling.textContent), week: m.querySelector(".wo-notes .week")?.textContent || "" };
  });
  const back = (p) => p.evaluate(() => [...document.querySelectorAll("button.navbtn")].find((x) => x.textContent.includes("前日") && x.offsetParent).click()).then(() => p.waitForTimeout(250));

  // 1. the sheet's menu (none made in the app): every day as planned
  let p = await page();
  await seed(p, null);
  const seen = {};
  for (let i = 0; i < 7; i++) {
    const day = await p.evaluate(() => { const t = document.querySelector("#woMenu .card-head span").textContent; return "日月火水木金土".indexOf(t[0]); });
    const m = await menu(p);
    seen[day] = m.rows.filter((r) => !r.startsWith("ラン"));
    ok(JSON.stringify(seen[day]) === JSON.stringify(WANT[day]), `${"日月火水木金土"[day]}曜: ${seen[day].join(" / ")}`, WANT[day]);
    ok(m.sum === "1日の合計 9 セット" && !/軽め|脚|押す|引く/.test(m.head.replace("のメニュー", "")), `  its head and sum: ${m.head} | ${m.sum}`);
    if (i === 0) {
      ok(m.week === "週の合計：ラン 30 km・筋トレ 63 セット", "the week: " + m.week);
      ok(m.notes.some((n) => n === "土曜：変化走の日なので、脚の筋トレはなし") && m.notes.some((n) => n.startsWith("重さ：20回でややきつい重さ")) && m.notes.some((n) => n === "疲れた日：忙しい日や疲れが残る日は、2種目だけでも十分") && !m.notes.some((n) => /メイン|日曜/.test(n)), "the メモ as the 筋トレ is now", m.notes);
      await p.locator("#woMenu").screenshot({ path: out + "/mon-393.png" });
      // プランク pressed: 60 秒 in the form
      await p.locator('#woMenu button[aria-label^="プランク"]').click(); await p.waitForTimeout(300);
      const f = await p.evaluate(() => ({ ex: woExercise.value, sets: woSets.value, reps: woReps.value, per: woPer.value }));
      ok(f.ex === "プランク" && f.sets === "3" && f.reps === "60" && f.per === "sec", "プランク (1分) goes in as 60 秒 × 3", f);
      await p.locator('#woMenu button[aria-label^="レッグプレス"]').click(); await p.waitForTimeout(300);
      const g = await p.evaluate(() => ({ ex: woExercise.value, reps: woReps.value, per: woPer.value }));
      ok(g.ex === "レッグプレス" && g.reps === "20" && g.per === "", "レッグプレス goes in as 20 回", g);
    }
    if (day === 6) {
      await p.locator('#woMenu button[aria-label^="サイドプランク"]').click(); await p.waitForTimeout(300);
      const f = await p.evaluate(() => ({ reps: woReps.value, per: woPer.value }));
      ok(f.reps === "60" && f.per === "sec", "サイドプランク (左右1分) as 60 秒", f);
      await p.locator('#woMenu button[aria-label^="懸垂"]').click(); await p.waitForTimeout(300);
      const g = await p.evaluate(() => ({ reps: woReps.value, focus: document.activeElement?.id }));
      ok(g.reps === "" && g.focus === "woReps", "懸垂 (できる回数): 回数 left to type", g);
    }
    await back(p);
  }
  // no 部位 twice in a day, every move as many days as asked
  const all = Object.values(seen).flat(), count = (n) => all.filter((r) => r.split(" ")[1] === n).length;
  ok(Object.values(seen).every((rows) => new Set(rows.map((r) => r.split(" ")[0])).size === rows.length), "no 部位 twice in a day");
  ok(count("チェストプレス") === 2 && count("アームカール") === 2 && all.length === 21 && new Set(all.map((r) => r.split(" ")[1])).size === 19, "21 in the week: 19 moves, チェストプレス and アームカール twice");
  await p.close();

  // 2. a menu edited in the app before: the new moves, its runs and its own メモ kept, the old ones' words made new
  p = await page();
  await seed(p, { id: "woMenu", days: OLD, notes: OLD_NOTES, updatedAt: Date.parse("2026-11-05T09:00:00+09:00") });
  let m = await menu(p);
  ok(JSON.stringify(m.rows.filter((r) => !r.startsWith("ラン"))) === JSON.stringify(WANT[1]) && m.rows[0].startsWith("ラン 6 km"), "edited before: Monday's new moves, its own 6 km kept: " + m.rows.join(" / "));
  ok(m.head === "月曜日のメニュー 編集", "  its old theme gone: " + m.head);
  ok(JSON.stringify(m.notes) === JSON.stringify(["ペース：変化走以外は、話しながら走れるペース", "重さ：20回でややきつい重さ。3セットとも楽に20回できたら1段階上げる", "土曜：変化走の日なので、脚の筋トレはなし", "疲れた日：忙しい日や疲れが残る日は、2種目だけでも十分", "自分：自分で書いたメモ"]), "  its メモ: the three of the old 筋トレ made new, its own kept", m.notes);
  // the editor: 部位 to pick; a move added takes one the day hasn't; closing keeps it
  await p.locator("#woMenu .wo-edit").click(); await p.waitForTimeout(500);
  const ed = await p.evaluate(() => [...document.querySelectorAll("#woEditDay .wo-edit-move")].map((li) => ({ pick: li.querySelector("select").value, opts: [...li.querySelector("select").options].map((o) => o.value).join(","), name: li.querySelector(".wo-name").value, sets: li.querySelector(".wo-sets").value, reps: li.querySelector(".wo-reps").value })));
  ok(ed.length === 3 && ed.map((x) => x.pick).join() === "脚,胸,体幹" && ed.every((x) => x.opts === "脚,胸,背中,肩,腕,体幹"), "the editor: Monday's three, by 部位", ed);
  await p.locator("#woEditDay .label-tools .link-btn").click(); await p.waitForTimeout(300);
  const added = await p.evaluate(() => { const li = [...document.querySelectorAll("#woEditDay .wo-edit-move")].pop(); return { pick: li.querySelector("select").value, sets: li.querySelector(".wo-sets").value }; });
  ok(added.pick === "背中" && added.sets === "3", "a move added: 背中 (the first the day hasn't), 3 sets", added);
  await p.locator("#woEditDay .wo-edit-move:last-child .wo-name").fill("テスト種目");
  await p.locator("#woEditDay .wo-edit-move:last-child .wo-reps").fill("15回");
  await p.locator("#sheetDone").click(); await p.waitForTimeout(700);
  const saved = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings")).find((x) => x.id === "woMenu"), P);
  ok(saved && saved.updatedAt > Date.parse("2026-11-09T12:00:00+09:00") && JSON.stringify(saved.days[1].moves) === JSON.stringify([["脚", "レッグプレス", 3, "20回"], ["胸", "チェストプレス", 3, "20回"], ["体幹", "プランク", 3, "1分"], ["背中", "テスト種目", 3, "15回"]]) && saved.days[1].km === 6 && saved.days[6].moves[0][1] === "懸垂", "saved: the new menu with the move added, 6 km kept", saved?.days?.[1]);
  m = await menu(p);
  ok(m.rows.some((r) => r === "背中 テスト種目 15回 × 3セット") && m.sum === "1日の合計 12 セット", "  and shown: " + m.rows.join(" / "));
  // after the app opens again: as saved (no longer taken for one from before)
  await p.reload(); await p.waitForTimeout(600);
  m = await menu(p);
  ok(m.rows.some((r) => r === "背中 テスト種目 15回 × 3セット"), "  again after reopening");
  await p.close();

  // 3. a menu edited since: as it is, an old 区分 (メイン) kept and pickable
  p = await page();
  const mine = { id: "woMenu", days: OLD.map((d) => ({ ...d, moves: d.moves.map((x) => [...x]) })), notes: OLD_NOTES, updatedAt: Date.now() };
  await seed(p, mine);
  m = await menu(p);
  ok(m.rows.some((r) => r === "メイン レッグプレス 10回 × 3セット") && m.head.includes("脚"), "edited since: as it is: " + m.rows.join(" / "));
  await p.locator("#woMenu .wo-edit").click(); await p.waitForTimeout(500);
  const ed2 = await p.evaluate(() => [...document.querySelectorAll("#woEditDay .wo-edit-move select")].map((s) => s.value + ":" + [...s.options].map((o) => o.value).join(",")));
  ok(ed2[0] === "メイン:脚,胸,背中,肩,腕,体幹,メイン", "  its メイン kept in the editor", ed2);
  await p.locator("#sheetDone").click(); await p.waitForTimeout(600);
  const saved2 = await p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings")).find((x) => x.id === "woMenu"), P);
  ok(saved2.days[1].moves[0][0] === "メイン", "  and saved so", saved2.days[1].moves[0]);
  await p.close();

  // 4. how it looks: 320 and dark
  for (const [name, o] of [["sat-320", { viewport: { width: 320, height: 640 } }], ["thu-393d", { colorScheme: "dark" }]]) {
    p = await page(o);
    await seed(p, null);
    for (let i = 0; i < (name.startsWith("sat") ? 2 : 4); i++) await back(p);
    await p.locator("#woMenu").screenshot({ path: `${out}/${name}.png` });
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok(!over, `${name}: nothing wider than the screen`);
    await p.close();
  }
  ok(!errs.length, "no page errors", errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "all OK");
})();
