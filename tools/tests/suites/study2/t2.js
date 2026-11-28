// 勉強のタイマー (the user's call, 2026-11-25, in place of 集中タイマー, taken out the same day): the time studied measured
// under 時間, and put in 時間 as it is; as a user would (no hook build)
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
const out = process.argv[2] || __dirname;
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "null"), { P, k });
const T0 = Date.parse(`${D.DAY}T21:00:00+09:00`);
const at = async (p, ms) => { await p.context().clock.setFixedTime(new Date(T0 + ms)); await p.waitForTimeout(1300); }; // (its time shown each second)
const press = async (p, words) => { await p.locator("#stTimer button", { hasText: words }).click(); await p.waitForTimeout(350); };
const mode = (p) => p.getAttribute("#stTimer", "data-mode");
const undo = async (p) => { await p.locator("#status button:visible").first().click(); await p.waitForTimeout(400); };
const M = 60e3;
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date(T0), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "study"); await p.waitForTimeout(1000);

  // ① 集中タイマー: taken out at the user's call (2026-11-25, tools/REMOVED.md): no 集中タイマーを始める beside 追加
  ok(!(await p.$("#stFocusGo")) && !(await txt(p, "#studyForm")).includes("集中") && (await p.$$eval("#studyForm .actions button", (l) => l.map((x) => x.textContent.trim()))).join() === "追加",
    "① 集中タイマーを始める: gone, 追加 alone", await txt(p, "#studyForm"));
  ok(!(await p.isVisible("#focusBar")), "① no 集中タイマー's bar");

  // ② under 時間: スタート at first (its words beside it, 「測った時間を「時間」に入れます」: taken out at the user's call,
  // 2026-11-28, tools/REMOVED.md)
  ok((await mode(p)) === "idle" && (await txt(p, "#stTimer")) === flat("スタート") && !(await p.$("#stTimer .st-tm-hint")) && !(await txt(p, "#studyForm")).includes(flat("測った時間を")) && (await txt(p, "#stTimerLabel")) === "タイマー", "② at first: スタート alone (no words)", await txt(p, "#stTimer"));
  await p.screenshot({ path: out + "/st-timer-idle.png" });
  await press(p, "スタート");
  ok((await mode(p)) === "run" && (await txt(p, "#stTmTime")) === "0:00" && JSON.stringify(await ls(p, "stTimer")) === JSON.stringify({ start: T0, acc: 0 }), "② started: 0:00, kept on this device", await ls(p, "stTimer"));
  await at(p, 12 * M + 5e3);
  ok((await txt(p, "#stTmTime")) === "12:05" && (await p.getAttribute("#stTmTime", "role")) === "timer" && (await txt(p, "#stTimer")).includes("一時停止") && (await txt(p, "#stTimer")).includes("時間に入れる"), "② going: 12:05", await txt(p, "#stTimer"));
  await p.screenshot({ path: out + "/st-timer-run.png" });

  // 一時停止: 18 minutes later it still says 12:05
  await press(p, "一時停止");
  await at(p, 30 * M);
  ok((await mode(p)) === "pause" && (await txt(p, "#stTmTime")) === "12:05" && (await txt(p, "#stTimer")).includes("一時停止中") && JSON.stringify(await ls(p, "stTimer")) === JSON.stringify({ start: 0, acc: 12 * M + 5e3 }),
    "② 一時停止: 12:05 still, 18 minutes on", await ls(p, "stTimer"));
  // 再開, 13 minutes more, the app closed and opened again: 25:05
  await press(p, "再開");
  await at(p, 43 * M); await p.reload(); await p.waitForTimeout(1300);
  ok((await mode(p)) === "run" && (await txt(p, "#stTmTime")) === "25:05", "② 再開: 25:05 after 13 minutes more, over a reload", await txt(p, "#stTmTime"));

  // 時間に入れる: 25 in 時間 as it is (the 30 typed there before replaced), the timer back to 0; 元に戻す takes it back
  await p.fill("#stMin", "30");
  await press(p, "時間に入れる");
  ok((await p.inputValue("#stMin")) === "25" && (await mode(p)) === "idle" && (await ls(p, "stTimer")) === null && (await txt(p, "#status")).startsWith(flat("時間に 25 分を入れました。「追加」で記録します")),
    "② 時間に入れる: 25 in 時間, the timer at 0", [await p.inputValue("#stMin"), await txt(p, "#status")]);
  await undo(p);
  ok((await p.inputValue("#stMin")) === "30" && (await mode(p)) === "run" && (await txt(p, "#stTmTime")) === "25:05", "② 元に戻す: 30 again, the timer going on", [await p.inputValue("#stMin"), await txt(p, "#stTimer")]);
  // again, then 英語 and 追加: a record of 25 分 as one put in by hand
  await press(p, "時間に入れる");
  await p.locator("#stSubjects label, #stSubjects button", { hasText: "英語" }).first().click();
  await p.click("#studyForm button[type=submit]"); await p.waitForTimeout(600);
  const day = (await ls(p, "study")).filter((x) => x.date === D.DAY);
  ok(day.length === 1 && day[0].minutes === 25 && day[0].subjectId === "en" && !("focus" in day[0]) && (await p.inputValue("#stMin")) === "", "② 追加: 英語 25 分 recorded", day);

  // an hour and more: 1:05:03; 1440 分 at the most
  await press(p, "スタート");
  await at(p, 43 * M + 65 * M + 3e3);
  ok((await txt(p, "#stTmTime")) === "1:05:03", "② an hour and more: 1:05:03", await txt(p, "#stTmTime"));
  await press(p, "時間に入れる");
  ok((await p.inputValue("#stMin")) === "65" && (await txt(p, "#stMinWords")) === flat("＝ 1時間 5分"), "② 65 in 時間, said in hours beside it", [await p.inputValue("#stMin"), await txt(p, "#stMinWords")]);
  await press(p, "スタート");
  await at(p, 43 * M + 65 * M + 3e3 + 30 * 3600e3);
  await press(p, "時間に入れる");
  ok((await p.inputValue("#stMin")) === "1440", "② 30 hours: 1440 (the field's most)", await p.inputValue("#stMin"));
  // 1 at the least: 10 seconds
  await press(p, "スタート");
  await at(p, 43 * M + 65 * M + 3e3 + 30 * 3600e3 + 10e3);
  await press(p, "時間に入れる");
  ok((await p.inputValue("#stMin")) === "1", "② 10 seconds: 1", await p.inputValue("#stMin"));

  // リセット (when paused): back to 0, and 元に戻す
  await press(p, "スタート");
  await at(p, 43 * M + 65 * M + 3e3 + 30 * 3600e3 + 10e3 + 7 * M);
  await press(p, "一時停止");
  await p.screenshot({ path: out + "/st-timer-pause.png" });
  await press(p, "リセット");
  ok((await mode(p)) === "idle" && (await ls(p, "stTimer")) === null && (await txt(p, "#status")).startsWith("タイマーをリセットしました") && (await p.inputValue("#stMin")) === "1", "② リセット: 0, 時間 as it was", await txt(p, "#status"));
  await undo(p);
  ok((await mode(p)) === "pause" && (await txt(p, "#stTmTime")) === "7:00", "② リセット's 元に戻す: 7:00 again", await txt(p, "#stTimer"));

  // on another day shown too (what it measured goes in that day's 時間, as typed would)
  await p.locator("#sec-study .datenav button", { hasText: "前日" }).click(); await p.waitForTimeout(500);
  ok((await mode(p)) === "pause" && (await txt(p, "#stTmTime")) === "7:00", "② the day before shown: the timer as it is", await txt(p, "#stTimer"));

  // dark, and no width over the phone's
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no sideways scroll");
  const d = await phone(b, new Date(T0), { deviceScaleFactor: 1, colorScheme: "dark" });
  await seed(d, D.all(), "study"); await d.waitForTimeout(900);
  await d.locator("#stTimer button", { hasText: "スタート" }).click(); await d.waitForTimeout(300);
  await d.context().clock.setFixedTime(new Date(T0 + 25 * M)); await d.waitForTimeout(1300);
  const col = await d.evaluate(() => getComputedStyle(document.getElementById("stTmTime")).color);
  ok((col.match(/\d+/g) || []).slice(0, 3).every((v) => Number(v) >= 200), "dark: the time light on dark", col);
  await d.screenshot({ path: out + "/st-timer-dark.png" });

  ok(!p.errs.length && !d.errs.length, "no page errors", [...p.errs, ...d.errs]);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
