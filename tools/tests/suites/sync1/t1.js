// 同期 ① (the user's call, 2026-11-20: many people, each with an account of their own), through a fake server in place
// of Firebase (window.__syncRemote: the accounts and their records kept in this page's localStorage, apart from the app's,
// so they outlive a device let go of) and a fake notification server (window.__pushServer)
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
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
const goTab = (p, t) => p.evaluate((t) => document.querySelector(`.menu button[data-tab="${t}"]`).click(), t).then(() => wait(p, 500));
const openSync = (p) => p.evaluate(() => document.getElementById("syncBtn").click()).then(() => wait(p, 500));
async function auth(p, kind, email, pw = "secret1") {
  await p.fill("#syncEmail", email); await p.fill("#syncPassword", pw);
  await p.click(kind === "up" ? "#syncSignUp" : "#syncSignIn"); await wait(p, 1500);
}
const twice = async (p, sel) => { await p.click(sel); await wait(p, 150); await p.click(sel); };
const todoIds = async (p) => ((await ls(p, "todos")) || []).map((x) => x.id);
function FAKE() {
  window.__pushServer = "https://push.example.test";
  window.__syncRemote = async () => {
    const S = () => { try { return JSON.parse(localStorage.getItem("__fake:server")) || { users: {}, seq: 1e12 }; } catch { return { users: {}, seq: 1e12 }; } };
    const W = (s) => localStorage.setItem("__fake:server", JSON.stringify(s));
    const me = () => localStorage.getItem("__fake:auth");
    const user = () => { const id = me(), s = S(); return id && s.users[id] ? { uid: id, email: s.users[id].email } : null; };
    const err = (code) => Object.assign(new Error(code), { code });
    const down = () => { if (localStorage.getItem("__fake:down")) throw err("unavailable"); };
    let cb = null;
    const fire = () => setTimeout(() => cb && cb(user()), 0);
    return {
      onAuth(f) { cb = f; fire(); },
      async signIn(email, pw) { const s = S(), id = Object.keys(s.users).find((k) => s.users[k].email === email); if (!id || s.users[id].pw !== pw) throw err("auth/invalid-credential"); localStorage.setItem("__fake:auth", id); fire(); },
      async signUp(email, pw) { const s = S(); if (Object.values(s.users).some((u) => u.email === email)) throw err("auth/email-already-in-use"); const id = "u" + (Object.keys(s.users).length + 1); s.users[id] = { email, pw, docs: {} }; W(s); localStorage.setItem("__fake:auth", id); fire(); },
      async signOut() { localStorage.removeItem("__fake:auth"); fire(); },
      async reset() {},
      async push(docs) { down(); const s = S(), id = me(); for (const d of docs) { s.seq += 10000; s.users[id].docs[`${d.s}~${d.i}`] = { ...d, st: s.seq }; } W(s); },
      async pull(since) { down(); const s = S(), id = me(); return Object.values(s.users[id].docs).filter((d) => d.st > since).sort((a, b) => a.st - b.st); },
    };
  };
}
(async () => {
  const b = await chromium.launch();
  const pushCalls = [];
  let p = await phone(b, new Date("2026-11-20T10:00:00+09:00"));
  await p.context().addInitScript(FAKE);
  await p.context().route("https://push.example.test/**", (r) => { pushCalls.push(r.request().method() + " " + new URL(r.request().url()).pathname); r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"sub":true,"alarms":0}' }); });
  await seed(p, { todos: [{ id: "t1", text: "牛乳を買う", createdAt: T("09:00") }] }, "todo");

  // ① a device used without an account: 新しく登録する (A) takes its records in, unasked, as before
  await openSync(p);
  await auth(p, "up", "a@example.com");
  let sv = await server(p), st = await ls(p, "sync");
  ok(!!sv.users?.u1?.docs?.["todos~t1"] && !(await vis(p, "#syncSwitch")), "A: the device's records went up, nothing asked", Object.keys(sv.users?.u1?.docs || {}));
  ok((await toast(p)).includes("登録しました。同期をはじめます。"), "A: said", await toast(p));
  ok(st.owner === "u1" && st.uid === "u1" && !st.ask, "A: the records here are A's from now on", st);
  ok(await vis(p, "#syncSignOutWipe"), "A: ログアウトして、この端末の記録を消す, beside ログアウト");

  // ログアウト: the records stay, still A's; one ticked while signed out
  await twice(p, "#syncSignOut"); await wait(p, 1000);
  st = await ls(p, "sync");
  ok(!st.uid && st.owner === "u1" && (await todoIds(p)).includes("t1") && !(await signedIn(p)), "ログアウト: signed out, the records stay, still A's", st);
  await goTab(p, "todo");
  await p.click('#todoList [data-check="t1"]'); await wait(p);
  ok((await ls(p, "sync")).ownerDirty === true, "a change signed out: kept in mind (it went nowhere)");

  // B signs in: the records here are A's, so asked, and nothing goes up or comes down
  await openSync(p);
  await auth(p, "up", "b@example.com");
  sv = await server(p); st = await ls(p, "sync");
  ok(await vis(p, "#syncSwitch") && !(await vis(p, "#syncOut")) && !(await vis(p, "#syncIn")), "B: この端末の記録をどうしますか？");
  ok(Object.keys(sv.users.u2.docs).length === 0 && st.ask?.uid === "u2" && !st.uid, "B: nothing of A's sent to B", { b: Object.keys(sv.users.u2.docs), st });
  const words = await txt(p, "#syncSwitchText");
  ok(words.startsWith("b@example.com でログインしました。この端末には、前にログインしていた別のアカウントの記録があります。") && words.includes("ログアウトしたあとに書いたり直したりしたものは") && words.includes("写真とファイルは同期されないので"), "B: the words", words);
  ok((await txt(p, "#syncNote")) === "確認待ち" && (await txt(p, "#syncState")) === "確認待ち", "B: 確認待ち on the page and its row");
  ok((await toast(p)).includes("登録しました。この端末の記録をどうするか、選んでください。"), "B: said so as it signed in", await toast(p));
  await goTab(p, "home");
  ok(await vis(p, "#syncNudge") && (await txt(p, "#syncNudgeHead")) === "この端末の記録をどうしますか？" && (await txt(p, "#syncNudgeText")).startsWith("b@example.com でログインしましたが"), "B: said on きょう too", await txt(p, "#syncNudgeText"));

  // ログインをやめる: signed out, the records as they were
  await openSync(p);
  await p.click("#syncSwitchCancel"); await wait(p, 900);
  st = await ls(p, "sync");
  ok(!st.ask && !st.uid && st.owner === "u1" && !(await signedIn(p)) && (await vis(p, "#syncOut")) && (await todoIds(p)).includes("t1"), "やめる: signed out, A's records as they were", st);
  await goTab(p, "home");
  ok(!(await vis(p, "#syncNudge")), "やめる: nothing said on きょう");

  // B again, and the app opened again before choosing: asked again
  await openSync(p);
  await auth(p, "in", "b@example.com");
  await p.reload(); await wait(p, 1800); await openSync(p);
  ok(await vis(p, "#syncSwitch") && (await ls(p, "sync")).ask?.uid === "u2" && !Object.keys((await server(p)).users.u2.docs).length, "B, the app opened again: still asked, still nothing sent");

  // このアカウントに入れる: the records here go to B, and are B's
  await twice(p, "#syncSwitchJoin"); await wait(p, 1800);
  sv = await server(p); st = await ls(p, "sync");
  ok(!!sv.users.u2.docs["todos~t1"] && st.owner === "u2" && st.uid === "u2" && !st.ask && !st.ownerDirty && (await vis(p, "#syncIn")), "入れる: B has them, B's now", { b: Object.keys(sv.users.u2.docs), st });

  // C, with records of their own, a photo kept on this device and its notifications on: 消して、切りかえる
  await twice(p, "#syncSignOut"); await wait(p, 1000);
  await p.evaluate(({ t }) => {
    const s = JSON.parse(localStorage.getItem("__fake:server")); s.seq += 10000;
    s.users.u3 = { email: "c@example.com", pw: "secret1", docs: { "todos~c1": { s: "todos", i: "c1", j: JSON.stringify({ id: "c1", text: "Cのやること", createdAt: t }), t, from: "another", st: s.seq } } };
    localStorage.setItem("__fake:server", JSON.stringify(s));
  }, { t: T("08:00") });
  await p.evaluate(() => new Promise((done) => {
    const r = indexedDB.open("tsumikasane-photos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" });
    r.onsuccess = () => { const tx = r.result.transaction("photos", "readwrite"); tx.objectStore("photos").put({ id: "p1", data: "B's photo" }); tx.oncomplete = () => { r.result.close(); done(); }; };
  }));
  await p.evaluate((P) => localStorage.setItem(P + "push", JSON.stringify({ id: "dev123", endpoint: "https://web.push.apple.com/x" })), P);
  await openSync(p);
  await auth(p, "in", "c@example.com");
  ok(await vis(p, "#syncSwitch") && !(await txt(p, "#syncSwitchText")).includes("ログアウトしたあとに"), "C: asked (nothing changed signed out this time)");
  await twice(p, "#syncSwitchFresh");
  await wait(p, 5000); // (the page starts again)
  st = (await ls(p, "sync")) || {};
  ok(!(await todoIds(p)).includes("t1") && (await todoIds(p)).includes("c1"), "消して切りかえる: B's records gone, C's came", await todoIds(p));
  ok(st.owner === "u3" && st.uid === "u3" && !st.ask, "C: the records here are C's", st);
  ok(pushCalls.includes("DELETE /d/dev123") && !(await ls(p, "push"))?.id, "C: this device's notifications let go of, at the server and here", pushCalls);
  const photos = await p.evaluate(() => new Promise((done) => {
    const r = indexedDB.open("tsumikasane-photos");
    r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" });
    r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains("photos")) { db.close(); done(0); return; } const q = db.transaction("photos").objectStore("photos").count(); q.onsuccess = () => { db.close(); done(q.result); }; };
    r.onerror = () => done(-1);
  }));
  ok(photos === 0, "C: the photo kept here, gone", photos);
  ok((await toast(p)).includes("この端末の記録を消しました"), "C: said", await toast(p));
  ok(!!(await server(p)).users.u2.docs["todos~t1"], "B's records stay at the server");

  // ログアウトして、この端末の記録を消す: not while what waits can't go up
  await openSync(p);
  await p.evaluate(() => localStorage.setItem("__fake:down", "1"));
  await twice(p, "#syncSignOutWipe"); await wait(p, 1500);
  ok((await txt(p, "#syncInError")).includes("消していません") && (await ls(p, "sync")).uid === "u3" && (await todoIds(p)).includes("c1") && !!(await signedIn(p)), "server down: nothing let go of", await txt(p, "#syncInError"));
  await p.evaluate(() => localStorage.removeItem("__fake:down"));
  await twice(p, "#syncSignOutWipe"); await wait(p, 5000);
  st = (await ls(p, "sync")) || {};
  ok(!(await todoIds(p)).length && !st.uid && !st.owner && !(await signedIn(p)) && (await toast(p)).includes("この端末の記録を消しました"), "ログアウトして消す: signed out, nothing of C's left here", { st, todos: await todoIds(p) });
  ok(!!(await server(p)).users.u3.docs["todos~c1"], "C's records stay at the server");

  // the same account again: not asked (A signs in on the empty device, out, and in again)
  await openSync(p);
  await auth(p, "in", "a@example.com");
  ok((await todoIds(p)).includes("t1") && (await ls(p, "sync")).owner === "u1", "A on the empty device: A's came down, unasked", await todoIds(p));
  await twice(p, "#syncSignOut"); await wait(p, 1000);
  await auth(p, "in", "a@example.com");
  st = await ls(p, "sync");
  ok(st.uid === "u1" && !st.ask && !(await vis(p, "#syncSwitch")), "A again: not asked", st);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.context().close();

  // a device of a version before this one: signed out by the login running out (its address kept, no owner yet), another
  // address signs in: asked; and again once the app is opened again
  p = await phone(b, new Date("2026-11-20T10:00:00+09:00"));
  await p.context().addInitScript(FAKE);
  await seed(p, { todos: [{ id: "t9", text: "前の版のToDo", createdAt: T("09:00") }], sync: { email: "a@example.com", device: "d1", pending: {}, since: T("08:00") } }, "home");
  await p.evaluate(() => localStorage.setItem("__fake:server", JSON.stringify({ users: { u1: { email: "a@example.com", pw: "secret1", docs: {} }, u2: { email: "b@example.com", pw: "secret1", docs: {} } }, seq: 1e12 })));
  await p.reload(); await wait(p, 1200);
  await openSync(p);
  await auth(p, "in", "b@example.com");
  st = await ls(p, "sync");
  ok(await vis(p, "#syncSwitch") && st.ask?.uid === "u2" && st.owner === "address:a@example.com" && !Object.keys((await server(p)).users.u2.docs).length, "an older device, another address: asked, nothing sent", st);
  await p.reload(); await wait(p, 1800); await openSync(p);
  ok(await vis(p, "#syncSwitch"), "an older device: asked again once opened again");
  await p.click("#syncSwitchCancel"); await wait(p, 900);
  await auth(p, "in", "a@example.com");
  st = await ls(p, "sync");
  ok(st.uid === "u1" && st.owner === "u1" && !!(await server(p)).users.u1.docs["todos~t9"], "an older device, its own address: not asked, its records go up", st);
  await p.screenshot({ path: (process.argv[2] || __dirname + "/shots") + "/sync1.png" }).catch(() => {});
  ok(!p.errs.length, "no page errors (an older device)", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
