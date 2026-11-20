// 同期 ③ 退会 (the user's call, 2026-11-20): アカウントを消す, through the fake server (fake.js): the password once more,
// the account's records and the account deleted at the server, the account's devices forgotten by the notification
// server, this device's records too or kept (nobody's then)
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
const FAKE = require("./fake");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const T = (hm) => Date.parse(`2026-11-20T${hm}:00+09:00`);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "null"), { P, k });
const server = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("__fake:server") || "{}"));
const signedIn = (p) => p.evaluate(() => localStorage.getItem("__fake:auth"));
const vis = (p, sel) => p.evaluate((sel) => { const x = document.querySelector(sel); return !!x && !x.hidden && x.offsetParent !== null; }, sel);
const txt = (p, sel) => p.evaluate((sel) => (document.querySelector(sel)?.textContent || "").replace(/\s+/g, " ").trim(), sel);
const toast = (p) => p.evaluate(() => ["status", "sheetStatus"].map((id) => document.getElementById(id)?.textContent || "").join(" / "));
const wait = (p, ms = 400) => p.waitForTimeout(ms);
const openSync = (p) => p.evaluate(() => document.getElementById("syncBtn").click()).then(() => wait(p, 500));
async function auth(p, kind, email, pw = "secret1") {
  await p.fill("#syncEmail", email); await p.fill("#syncPassword", pw);
  await p.click(kind === "up" ? "#syncSignUp" : "#syncSignIn"); await wait(p, 1500);
}
const todoIds = async (p) => ((await ls(p, "todos")) || []).map((x) => x.id);
(async () => {
  const b = await chromium.launch();
  const pushCalls = [];
  const p = await phone(b, new Date("2026-11-20T10:00:00+09:00"));
  await p.context().addInitScript(FAKE);
  await p.context().route("https://push.example.test/**", (r) => { pushCalls.push(r.request().method() + " " + new URL(r.request().url()).pathname); r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"sub":true,"alarms":0}' }); });
  // X: a device's records, its notifications on, and another device of X's (its id in the synced settings)
  await seed(p, { todos: [{ id: "t1", text: "牛乳を買う", createdAt: T("09:00") }], settings: [{ id: "push:dev2", name: "iPad", at: T("08:00") }] }, "todo");
  await openSync(p);
  await auth(p, "up", "x@example.com");
  ok(!!(await server(p)).users.u1?.docs["todos~t1"], "X: the records went up");

  // アカウントを消す: the card, the words
  ok(await vis(p, "#syncLeaveOpen") && !(await vis(p, "#syncLeave")), "退会: its link, the card not yet");
  await p.click("#syncLeaveOpen"); await wait(p);
  ok(await vis(p, "#syncLeave") && (await txt(p, "#syncLeaveText")).startsWith("x@example.com のアカウントと、サーバーにあるこのアカウントの記録をすべて消します。") && await p.isChecked("#syncLeaveWipe"), "退会: asked, with the password and この端末の記録も消す (on)", await txt(p, "#syncLeaveText"));
  // no password, then a wrong one: nothing goes
  await p.click("#syncLeaveGo"); await wait(p);
  ok((await txt(p, "#syncLeaveError")) === "パスワードを入れてください。", "no password: said");
  await p.fill("#syncLeavePassword", "wrong1"); await p.click("#syncLeaveGo"); await wait(p, 900);
  ok((await txt(p, "#syncLeaveError")) === "パスワードがちがいます。" && !!(await server(p)).users.u1 && (await signedIn(p)) === "u1" && (await ls(p, "sync")).uid === "u1" && (await ls(p, "sync")).email === "x@example.com", "a wrong password: nothing gone, still signed in", await txt(p, "#syncLeaveError"));
  // やめる
  await p.click("#syncLeaveCancel"); await wait(p);
  ok(!(await vis(p, "#syncLeave")) && (await vis(p, "#syncIn")), "やめる: put away");

  // the records kept here: X and their records gone at the server, this device's records stay, nobody's. (This device's
  // notifications on: put in now, as the app lets go of one with no subscription of the browser's as it opens)
  await p.evaluate((P) => localStorage.setItem(P + "push", JSON.stringify({ id: "dev1", endpoint: "https://web.push.apple.com/x" })), P);
  await p.click("#syncLeaveOpen"); await wait(p);
  await p.fill("#syncLeavePassword", "secret1"); await p.uncheck("#syncLeaveWipe");
  await p.click("#syncLeaveGo"); await wait(p, 1500);
  let sv = await server(p), st = await ls(p, "sync");
  ok(!sv.users.u1 && !(await signedIn(p)), "退会: the account and its records gone at the server, signed out", Object.keys(sv.users));
  ok((await todoIds(p)).includes("t1") && !st.uid && !st.owner && !st.email, "退会 (kept here): the records stay, nobody's, nothing said on きょう", st);
  ok(pushCalls.includes("DELETE /d/dev1") && pushCalls.includes("DELETE /d/dev2") && !(await ls(p, "push"))?.id, "退会: the account's devices forgotten by the notification server", pushCalls);
  ok((await toast(p)).includes("アカウントを消しました。この端末の記録はそのままです。") && (await vis(p, "#syncOut")), "退会: said", await toast(p));
  await p.evaluate(() => document.querySelector('.menu button[data-tab="home"]').click()); await wait(p);
  ok(!(await vis(p, "#syncNudge")), "退会: nothing said on きょう");

  // Y signs up on the same device: not asked (the records here were nobody's), they go to Y; then Y leaves with them
  await openSync(p);
  await auth(p, "up", "y@example.com");
  sv = await server(p);
  const yid = Object.keys(sv.users).find((k) => sv.users[k].email === "y@example.com");
  ok(!(await vis(p, "#syncSwitch")) && !!sv.users[yid]?.docs["todos~t1"], "Y: not asked, the records here go to Y", Object.keys(sv.users[yid]?.docs || {}));
  await p.click("#syncLeaveOpen"); await wait(p);
  await p.fill("#syncLeavePassword", "secret1");
  await p.click("#syncLeaveGo"); await wait(p, 5000); // (the page starts again)
  sv = await server(p); st = (await ls(p, "sync")) || {};
  ok(!sv.users[yid] && !(await signedIn(p)) && !(await todoIds(p)).length && !st.owner && !st.uid, "退会 with この端末の記録も消す: gone at the server and here", { users: Object.keys(sv.users), todos: await todoIds(p), st });
  ok((await toast(p)).includes("この端末の記録を消しました"), "said", await toast(p));
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
