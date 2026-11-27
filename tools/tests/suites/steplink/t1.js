// ヘルスケアの歩数の連携 (the user's call, 2026-11-27): 運動's settings 「ヘルスケアから自動で入れる」, the notification server
// stood in for (push.example.test). 連携をはじめる: a key in the settings, the URL to paste and the steps of the ショートカット;
// いま受け取る: the month's days to today into their 歩数 (a day typed by hand kept; 31 days ago and tomorrow left out), the
// last one said, 運動's card, a block a day on つみかさね (歩数 ○ 歩); a new value taken again, a day typed by hand then
// left as it is; taken in as the app opens; 連携をやめる: forgotten at the server, the key gone, the 歩数 in kept
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const today = "2026-11-27", NOW = new Date(`${today}T19:40:00+09:00`);
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const T = (d, h = 12) => Date.parse(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "[]"), { P, k });
const day = async (p, d) => (await ls(p, "bodyDays")).find((x) => (x.date || x.id) === d) || null;
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText.replace(/\s+/g, " ").trim() ?? null, sel);
const toast = (p) => p.evaluate(() => [...document.querySelectorAll(".toast")].map((t) => t.textContent).join(" | "));
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, NOW, { deviceScaleFactor: 1 });
  // the server, stood in for: its days, and what came to it
  const srv = { days: {}, got: [], del: [] };
  await p.context().addInitScript(() => { window.__pushServer = "https://push.example.test"; });
  await p.context().route("https://push.example.test/**", (route) => {
    const req = route.request(), u = new URL(req.url()), m = u.pathname.match(/^\/s\/([\w-]+)$/);
    if (m && req.method() === "GET") { srv.got.push(m[1]); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ days: srv.days }) }); }
    if (m && req.method() === "DELETE") { srv.del.push(m[1]); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }); }
    return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
  const hand = addDays(today, -2);
  await seed(p, { bodyDays: [{ id: hand, date: hand, steps: 5000, createdAt: T(hand), updatedAt: T(hand) }], settings: [] }, "diet");
  await p.evaluate((P) => localStorage.setItem(P + "dietPart", "workout"), P); await p.reload(); await p.waitForTimeout(1200);
  ok(srv.got.length === 0, "no link: nothing asked of the server");

  // the settings: 連携をはじめる
  await p.click("#wtSettings"); await p.waitForTimeout(700);
  ok(await p.isVisible("#stepLinkOn") && (await txt(p, "#stepLink")).includes("ヘルスケアの歩数を、その日の歩数に自動で入れます"), "運動's settings: 連携をはじめる", await txt(p, "#stepLink"));
  await p.click("#stepLinkOn"); await p.waitForTimeout(500);
  const set = (await ls(p, "settings")).find((x) => x.id === "stepLink");
  const key = set?.key || "";
  ok(set?.on === true && /^[\w-]{32}$/.test(key), "a key in the synced settings", set);
  ok((await p.inputValue("#stepLinkUrl")) === "https://push.example.test/s/" + key, "the URL to paste", await p.inputValue("#stepLinkUrl"));
  const how = await p.$$eval(".step-link-how li", (l) => l.map((x) => x.textContent));
  ok(how.length === 4 && how[0].includes("オートメーション") && how[1].includes("ヘルスケアサンプルを検索") && how[2].includes("URLの内容を取得") && how[2].includes("steps") && how[3].includes("許可"), "the steps of the ショートカット", how);
  ok((await txt(p, "#stepLinkLast")).startsWith("まだ届いていません") && (await txt(p, "#stepLinkFoot")).includes("手で入れた日の歩数は上書きしません"), "nothing yet; what is said under it");

  // いま受け取る: today, yesterday and the day typed by hand (kept), 40 days ago and tomorrow (left out)
  srv.days = { [today]: { steps: 8421, at: T(today, 19) }, [addDays(today, -1)]: { steps: 6000, at: T(today, 8) }, [hand]: { steps: 7000, at: T(hand, 22) }, [addDays(today, -40)]: { steps: 100, at: 1 }, [addDays(today, 1)]: { steps: 50, at: 2 } };
  await p.click("#stepLinkPull"); await p.waitForTimeout(700);
  ok(srv.got.includes(key) && (await toast(p)).includes("2 日分の歩数を入れました"), "いま受け取る: 2 days put in", await toast(p));
  let t = await day(p, today), y = await day(p, addDays(today, -1)), h = await day(p, hand);
  ok(t?.steps === 8421 && t.stepsBy === "health" && t.stepsAt > 0 && y?.steps === 6000 && y.stepsBy === "health", "today 8,421 and yesterday 6,000, from ヘルスケア", [t, y]);
  ok(h?.steps === 5000 && !h.stepsBy, "the day typed by hand: kept (5,000, not 7,000)", h);
  ok(!(await day(p, addDays(today, -40))) && !(await day(p, addDays(today, 1))), "40 days ago and tomorrow: left out");
  ok((await txt(p, "#stepLinkLast")) === "最後に届いたのは きょうの 8,421 歩（19:00）", "the last one said", await txt(p, "#stepLinkLast"));
  await p.click("#sheetDone").catch(() => {}); await p.waitForTimeout(600);
  ok((await txt(p, "#dt4Steps .dt4-step-v")).startsWith("8,421"), "運動's card: 8,421", await txt(p, "#dt4Steps .dt4-step-v"));

  // つみかさね: a block a day (today's, yesterday's, the hand one's)
  await p.goto(p.url().split("#")[0] + "#tsumi"); await p.reload(); await p.waitForTimeout(1500);
  await p.click("#tsumiSettings"); await p.waitForTimeout(800);
  await p.fill("#tsumiFind", "歩数"); await p.waitForTimeout(600);
  const found = await txt(p, "#tsumiFound");
  ok((await txt(p, "#tsumiFindSaid")) === "3 こ見つかりました" && found.includes("歩数 8,421 歩") && found.includes("歩数 6,000 歩") && found.includes("歩数 5,000 歩"), "つみかさね: 歩数 a block a day", [await txt(p, "#tsumiFindSaid"), found]);
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);

  // a new value: taken again; typed by hand: then left as it is
  await p.goto(p.url().split("#")[0] + "#diet"); await p.reload(); await p.waitForTimeout(1500);
  srv.days[today] = { steps: 9000, at: T(today, 19) + 1 };
  await p.click("#wtSettings"); await p.waitForTimeout(600);
  await p.click("#stepLinkPull"); await p.waitForTimeout(700);
  ok((await day(p, today))?.steps === 9000 && (await toast(p)).includes("1 日分の歩数を入れました"), "a new value: 9,000 taken again");
  await p.click("#sheetDone").catch(() => {}); await p.waitForTimeout(600);
  await p.fill("#dt4StepIn", "100"); await p.dispatchEvent("#dt4StepIn", "change"); await p.waitForTimeout(500);
  t = await day(p, today);
  ok(t?.steps === 100 && !t.stepsBy, "typed by hand: 100, no longer from ヘルスケア", t);
  srv.days[today] = { steps: 9500, at: T(today, 19) + 2 };
  await p.click("#wtSettings"); await p.waitForTimeout(600);
  await p.click("#stepLinkPull"); await p.waitForTimeout(700);
  ok((await day(p, today))?.steps === 100 && (await toast(p)).includes("新しい歩数はありませんでした"), "then ヘルスケア's 9,500 not written over it", await day(p, today));
  await p.click("#sheetDone").catch(() => {}); await p.waitForTimeout(500);

  // as the app opens: taken in
  const n0 = srv.got.length;
  srv.days[addDays(today, -1)] = { steps: 6500, at: T(today, 19) + 3 };
  await p.reload(); await p.waitForTimeout(3800);
  ok(srv.got.length > n0 && (await day(p, addDays(today, -1)))?.steps === 6500, "as the app opens: taken in (yesterday 6,500)", [srv.got.length, n0]);

  // 連携をやめる
  await p.click("#wtSettings"); await p.waitForTimeout(600);
  await p.click("#stepLinkOff"); await p.waitForTimeout(600);
  ok(srv.del.includes(key) && !(await ls(p, "settings")).find((x) => x.id === "stepLink") && await p.isVisible("#stepLinkOn"), "連携をやめる: forgotten at the server, the key gone, 連携をはじめる again", srv.del);
  ok((await day(p, today))?.steps === 100 && (await day(p, addDays(today, -1)))?.steps === 6500, "the 歩数 put in: kept");
  ok((await toast(p)).includes("連携をやめました"), "said so", await toast(p));
  ok(!p.errs.length && (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)), "no errors, no sideways scroll", p.errs);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
