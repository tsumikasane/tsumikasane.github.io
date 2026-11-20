// 同期 ④ (the user's call, 2026-11-20): メールアドレスの確認 (a mail as the account is made, again at a press; 確認しました)
// and パスワードを変える, through the fake server (fake.js)
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
const FAKE = require("./fake");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
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
const twice = async (p, sel) => { await p.click(sel); await wait(p, 150); await p.click(sel); };
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-20T10:00:00+09:00"));
  await p.context().addInitScript(FAKE);
  await seed(p, {}, "todo");
  await openSync(p);
  await auth(p, "up", "z@example.com");
  let sv = await server(p);
  ok(sv.users.u1?.mails === 1, "登録: a mail to confirm the address went", sv.users.u1);
  ok(await vis(p, "#syncVerify") && (await txt(p, "#syncVerifyText")).startsWith("メールアドレス（z@example.com）の確認がまだです。"), "登録: 確認がまだ, said", await txt(p, "#syncVerifyText"));
  // 確認しました before the link: still not
  await p.click("#syncVerified"); await wait(p);
  ok(await vis(p, "#syncVerify") && (await toast(p)).includes("まだ確認できていません"), "確認しました, not yet: said so", await toast(p));
  // the mail again
  await p.click("#syncVerifySend"); await wait(p);
  ok((await server(p)).users.u1.mails === 2 && (await toast(p)).includes("z@example.com に、確認のメールを送りました"), "もう一度送る: sent", await toast(p));
  // the link pressed (at the server), then 確認しました
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("__fake:server")); s.users.u1.verified = true; localStorage.setItem("__fake:server", JSON.stringify(s)); });
  await p.click("#syncVerified"); await wait(p);
  ok(!(await vis(p, "#syncVerify")) && (await toast(p)).includes("メールアドレスを確認しました"), "確認しました: put away", await toast(p));
  await p.reload(); await wait(p, 1800); await openSync(p);
  ok(await vis(p, "#syncIn") && !(await vis(p, "#syncVerify")), "opened again: confirmed, nothing said");

  // パスワードを変える
  ok(await vis(p, "#syncPwOpen") && !(await vis(p, "#syncPw")), "パスワードを変える: its link, the card not yet");
  await p.click("#syncPwOpen"); await wait(p);
  ok(await vis(p, "#syncPw"), "パスワードを変える: the card");
  await p.click("#syncPwGo"); await wait(p);
  ok((await txt(p, "#syncPwError")) === "いまのパスワードと、新しいパスワードを入れてください。", "nothing in: said");
  await p.fill("#syncPwOld", "secret1"); await p.fill("#syncPwNew", "abc"); await p.click("#syncPwGo"); await wait(p);
  ok((await txt(p, "#syncPwError")) === "新しいパスワードは 6 文字以上にしてください。" && (await server(p)).users.u1.pw === "secret1", "too short: said, not changed");
  await p.fill("#syncPwOld", "wrong12"); await p.fill("#syncPwNew", "newpass1"); await p.click("#syncPwGo"); await wait(p, 800);
  ok((await txt(p, "#syncPwError")) === "いまのパスワードがちがいます。" && (await server(p)).users.u1.pw === "secret1", "a wrong password now: said, not changed");
  await p.fill("#syncPwOld", "secret1"); await p.fill("#syncPwNew", "newpass1"); await p.click("#syncPwGo"); await wait(p, 800);
  ok((await server(p)).users.u1.pw === "newpass1" && !(await vis(p, "#syncPw")) && (await toast(p)).includes("パスワードを変えました"), "changed", await toast(p));
  // signed in again with it, not with the one before
  await twice(p, "#syncSignOut"); await wait(p, 1000);
  await auth(p, "in", "z@example.com", "secret1");
  ok(!(await signedIn(p)) && (await txt(p, "#syncError")).includes("ちがいます"), "the old password: no", await txt(p, "#syncError"));
  await auth(p, "in", "z@example.com", "newpass1");
  ok((await signedIn(p)) === "u1" && (await vis(p, "#syncIn")), "the new password: signed in");
  ok(!p.errs.length, "no page errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
