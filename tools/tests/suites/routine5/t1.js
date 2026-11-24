// ルーティーン その5 ①〜⑩, through the hook build at 8875 (⑥'s words heard) and as a user would
process.env.URL0 = process.env.URL0 || "http://localhost:8875/";
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const shown = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; }, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const day = async (p, d = D.DAY) => (await ls(p, "routineDays")).find((x) => x.id === d);
const item = async (p, id) => (await ls(p, "routines")).find((x) => x.id === id);
const row = (p, id) => p.locator(`#rtList li[data-rt="${id}"]`);
const rowText = async (p, id) => flat(await row(p, id).innerText());
const toast = (p) => txt(p, "#status");
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(400); };
const names = (p) => p.evaluate(() => [...document.querySelectorAll("#rtList .rt-name")].map((i) => i.value).join(","));
async function open(b, data, hm = "09:00") {
  const p = await phone(b, new Date(`${D.DAY}T${hm}:00+09:00`), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, data, "routine"); await p.waitForTimeout(900);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, D.all());
  await p.screenshot({ path: "routine5-top.png" });

  // ③ おまもり: 散歩 (11/10〜11/13) not done 11/14: made パス by itself, said with 元に戻す
  let d14 = await day(p, "2026-11-14");
  ok(d14.skip?.join() === "r5" && d14.charm?.join() === "r5" && (await toast(p)).includes("「散歩」（11/14）の連続を、おまもりで守りました"), "③ おまもり on 11/14", { d14, t: await toast(p) });
  ok((await rowText(p, "r5")).includes("4日連続"), "③ 散歩's run kept", await rowText(p, "r5"));
  ok((await p.locator('#rtWeek tbody tr', { hasText: "散歩" }).locator("td").nth(5).innerText()).includes("パス"), "③ パス in the week's table");
  // ④ はじめの日・おわりの日: テスト勉強 (from 11/20) and 水やり (till 11/10) not in the day's list, listed apart
  ok((await names(p)) === "ストレッチ,英単語,薬を飲む,読書,散歩,水を飲む" && (await txt(p, "#rt5SpanList")).includes("水やり11月10日（火）でおわり") && (await txt(p, "#rt5SpanList")).includes("テスト勉強11月20日（金）から"), "④ the items outside their days", { n: await names(p), l: await txt(p, "#rt5SpanList") });
  // ⑨ きょうのタイムライン
  const tl = await p.evaluate(() => [...document.querySelectorAll("#rt5Line li")].map((li) => li.className + ":" + li.innerText.replace(/\s+/g, "")));
  ok(tl.join("|") === "rt5-line-done:7:20ストレッチやった|rt5-line-late:8:00薬を飲む目安を過ぎています|rt5-now:9:00いま|rt5-line-plan:21:00読書目安", "⑨ by the time, いま among them", tl);
  // ② 見なおし: ストレッチ settled, 英単語 seldom
  const rv = await p.evaluate(() => [...document.querySelectorAll("#rt5ReviewCard li")].map((li) => li.innerText.replace(/\s+/g, "")));
  ok(rv.length === 2 && rv[0].startsWith("ストレッチ32日続いています") && rv[0].includes("卒業する（休止）") && rv[1].startsWith("英単語最近30日で3/29日です") && rv[1].includes("休止する"), "② 見なおし", rv);
  await p.locator("#rt5ReviewCard li", { hasText: "ストレッチ" }).locator("button", { hasText: "そのまま" }).click(); await p.waitForTimeout(300);
  const rvNames = () => p.evaluate(() => [...document.querySelectorAll("#rt5ReviewCard .rt5-review-name")].map((x) => x.textContent).join(","));
  ok((await ls(p, "settings")).find((x) => x.id === "rtReview")?.later?.r1 === "2026-12-15" && (await rvNames()) === "英単語,薬を飲む", "② そのまま: put by for 30 days (the next one in its place)", await rvNames());
  await p.locator("#rt5ReviewCard li", { hasText: "英単語" }).locator("button", { hasText: "休止する" }).click(); await p.waitForTimeout(300);
  ok((await item(p, "r2")).pauses?.length === 1 && !(await rvNames()).includes("英単語"), "② 休止する", await rvNames());
  await undo(p);
  // ⑤ 参考リンク and ⑩ ミニマム on 読書's row
  ok((await row(p, "r4").locator("a.rt5-link").getAttribute("href")) === "https://example.com/reading", "⑤ 参考 on the row");
  await row(p, "r4").locator(".rt5-mini-btn").click(); await p.waitForTimeout(300);
  let dd = await day(p);
  ok(dd.done.includes("r4") && dd.mini?.join() === "r4" && (await rowText(p, "r4")).includes("ミニでやった") && (await rowText(p, "r4")).includes("4日連続") && (await toast(p)).includes("「読書」をミニでやりました（1ページだけ）"), "⑩ ミニでやった: done, the run goes on", { dd, t: await rowText(p, "r4") });
  ok(flat(await p.locator("#rtStats li.rt-stat", { hasText: "読書" }).innerText()).includes("最近30日のミニ1日"), "⑩ counted in the record");
  await row(p, "r4").locator(".check").click(); await p.waitForTimeout(300);
  ok(!(await day(p)).mini && !(await day(p)).done.includes("r4"), "⑩ taken off: ミニ goes with the check", await day(p));
  // ⑧ 水's 30 days
  const ch = await p.evaluate(() => { const li = [...document.querySelectorAll("#rtStats li.rt-stat")].find((x) => x.innerText.includes("水を飲む")); return { bars: li?.querySelectorAll(".rt5-count-bar").length, full: li?.querySelectorAll(".rt5-count-bar.full").length, label: li?.querySelector(".rt5-count-bars")?.getAttribute("aria-label") }; });
  ok(ch.bars === 30 && ch.full === 15 && ch.label === "最近30日の平均 5.6杯（8杯まで）", "⑧ a bar a day, the average", ch);
  // ③ おまもり left this month in the record
  ok(flat(await p.locator("#rtStats li.rt-stat", { hasText: "散歩" }).innerText()).includes("今月のおまもりのこり0回"), "③ none left this month for 散歩");
  // ⑥ 声でチェック: the names heard
  ok(JSON.stringify(await p.evaluate(() => window.__rt5.hear("ストレッチとくすりを飲む"))) === "[]" && JSON.stringify(await p.evaluate(() => window.__rt5.hear("薬を飲むと水を飲む"))) === JSON.stringify(["薬を飲む", "水を飲む"]), "⑥ matched by name (ストレッチ already done)");
  await p.evaluate(() => window.__rt5.heard("英単語と薬を飲む")); await p.waitForTimeout(300);
  dd = await day(p);
  ok(dd.done.includes("r2") && dd.done.includes("r3") && (await toast(p)).includes("「英単語」「薬を飲む」にチェックしました"), "⑥ checked from the words", await toast(p));
  await undo(p);
  ok(!(await day(p)).done.includes("r2"), "⑥ 元に戻す");
  await p.evaluate(() => window.__rt5.heard("カレーを食べる")); await p.waitForTimeout(200);
  ok((await toast(p)).includes("に合う、まだの項目がありませんでした"), "⑥ nothing matched, said");
  // ⑦ the items read out in 1つずつ進める: taken out at the user's call (2026-11-24, tools/REMOVED.md); and ⑩ ⑤ there
  await p.locator("#rtFoot button", { hasText: "1つずつ進める" }).click(); await p.waitForTimeout(300);
  ok(await shown(p, "#rt2Step") && !(await p.$("#rt5StepSpeak")) && !(await p.evaluate(() => document.getElementById("rt2Step").innerText.includes("読み上げ"))) && await shown(p, "#rt2StepName"), "⑦ no 読み上げ in 1つずつ進める (taken out)");
  while ((await txt(p, "#rt2StepName")) !== "読書" && await shown(p, "#rt2Step")) { await p.click("#rt2StepLater"); await p.waitForTimeout(150); }
  ok(await shown(p, "#rt5StepMini") && (await txt(p, "#rt5StepMini")) === "ミニでやった（1ページだけ）" && await shown(p, "#rt5StepLink a"), "⑩⑤ 読書 in 1つずつ進める");
  await p.click("#rt5StepMini"); await p.waitForTimeout(300);
  ok((await day(p)).mini?.includes("r4"), "⑩ ミニでやった in 1つずつ進める");
  await p.click("#rt2Step .ask-keep"); await p.waitForTimeout(300);
  // ④ おわりの日 in ⋯, said on its row
  await row(p, "r2").locator(".rt-opts").click(); await p.waitForTimeout(400);
  await p.fill("#rtiUrl", "example"); await p.click("#recSave"); await p.waitForTimeout(300);
  ok(await shown(p, "#rtiUrl") && (await p.evaluate(() => document.activeElement?.id)) === "rtiUrl", "⑤ a link not http(s) not saved");
  await p.fill("#rtiUrl", ""); await p.fill("#rtiUntil", "2026-11-25"); await p.fill("#rtiMini", "5語だけ"); await p.click("#recSave"); await p.waitForTimeout(500);
  const r2 = await item(p, "r2");
  ok(r2.until === "2026-11-25" && r2.mini === "5語だけ" && !r2.url && (await rowText(p, "r2")).includes("11/25まで"), "④⑩ saved from ⋯", { r2, t: await rowText(p, "r2") });
  // ③ おまもり in the gear
  await p.click("#rtSettings"); await p.waitForTimeout(400);
  ok((await p.inputValue("#rt5CharmN")) === "1" && await shown(p, "#rt5RewardForm"), "①③ in the gear");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  ok(!p.errs.length, "no errors (1)", p.errs);
  await p.close();

  // ① ごほうび: two items done 11/13 and 11/14; today all done makes 3 → ごほうびの日
  p = await open(b, D.reward());
  ok((await txt(p, "#rt5RewardCard")).includes("ぜんぶできた日2/3日") && (await txt(p, "#rt5RewardCard")).includes("ケーキ"), "① 2 / 3", await txt(p, "#rt5RewardCard"));
  await row(p, "a1").locator(".check").click(); await p.waitForTimeout(200);
  await row(p, "a2").locator(".check").click(); await p.waitForTimeout(300);
  ok((await toast(p)).includes("ごほうびの「ケーキ」まで、ぜんぶできた日が3日たまりました") && (await txt(p, "#rt5RewardCard")).includes("ごほうびの日です：ケーキ"), "① reached, cheered", await toast(p));
  await p.locator("#rt5RewardCard button", { hasText: "受け取った" }).click(); await p.waitForTimeout(300);
  const w = (await ls(p, "settings")).find((x) => x.id === "rtReward");
  ok(w.from === "2026-11-16" && w.got?.[0]?.on === D.DAY && (await txt(p, "#rt5RewardCard")).includes("ぜんぶできた日0/3日"), "① 受け取った: counted again from tomorrow", w);
  // ① set from the gear
  await p.click("#rtSettings"); await p.waitForTimeout(400);
  await p.fill("#rt5RewardName", "映画"); await p.selectOption("#rt5RewardN", "5"); await p.click("#rt5RewardGo"); await p.waitForTimeout(300);
  const w2 = (await ls(p, "settings")).find((x) => x.id === "rtReward");
  ok(w2.name === "映画" && w2.n === 5 && w2.from === "2026-11-16" && w2.got.length === 1, "① changed in the gear", w2);
  ok(!p.errs.length, "no errors (2)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
})();
