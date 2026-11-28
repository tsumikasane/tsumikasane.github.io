// 日記 その4 ①〜⑩, as a user would (no hook build; ①'s 天気を選ぶ and ③'s 声で残す taken out, 2026-11-19)
const { chromium } = require("playwright");
const { P, phone, seed } = require("./lib");
const D = require("./data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const flat = (s) => (s ?? "").replace(/[\s　 ]+/g, "");
const txt = (p, sel) => p.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel).then(flat);
const shown = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.closest("[hidden]") && e.getClientRects().length > 0; }, sel);
const ls = (p, k) => p.evaluate(({ P, k }) => JSON.parse(localStorage.getItem(P + k) || "null"), { P, k });
const entry = async (p, d) => ((await ls(p, "journal")) || []).find((j) => j.id === d);
const val = (p) => p.inputValue("#journalText");
const undo = async (p) => { await p.locator("#status button:visible, #sheetStatus button:visible").first().click(); await p.waitForTimeout(500); };
const go = async (p, d) => { await p.fill("#sec-journal .datenav input[type=date]", d); await p.dispatchEvent("#sec-journal .datenav input[type=date]", "change"); await p.waitForTimeout(500); };
const store = (p) => p.evaluate(() => new Promise((res) => { const r = indexedDB.open("tsumikasane-photos", 1); r.onsuccess = () => { const q = r.result.transaction("photos").objectStore("photos").getAll(); q.onsuccess = () => res(q.result.map((x) => ({ jnDay: x.jnDay, jnVoiceDay: x.jnVoiceDay, cap: x.cap, type: x.blob?.type, size: x.blob?.size }))); }; r.onerror = () => res([]); }));
const PNG64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
// photos and voices already on this device (写真を付ける and 声で残す taken out, 2026-11-19), put in as the app kept them:
// a photo { id, jnDay, blob, w, h, createdAt }, a voice { id, jnVoiceDay, blob (a short WAV here), dur, createdAt }; the
// page is opened again after, as it reads them once
const putMedia = (p, list) => p.evaluate(({ list, b64 }) => new Promise((res, rej) => {
  const png = () => new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: "image/png" });
  const wav = () => {
    const n = 800, buf = new ArrayBuffer(44 + n), v = new DataView(buf), s = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    s(0, "RIFF"); v.setUint32(4, 36 + n, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); s(36, "data"); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return new Blob([buf], { type: "audio/wav" });
  };
  const r = indexedDB.open("tsumikasane-photos", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" });
  r.onerror = () => rej(r.error);
  r.onsuccess = () => {
    const tx = r.result.transaction("photos", "readwrite");
    list.forEach((x, i) => tx.objectStore("photos").put({ id: "t" + i + Math.random().toString(36).slice(2, 8), createdAt: Date.now() + i, ...(x.jnVoiceDay ? { blob: wav(), dur: 1 } : { blob: png(), w: 1, h: 1 }), ...x }));
    tx.oncomplete = () => { r.result.close(); res(); };
    tx.onerror = () => rej(tx.error);
  };
}), { list, b64: PNG64 });
(async () => {
  const b = await chromium.launch();
  const p = await phone(b, new Date("2026-11-14T21:00:00+09:00"), { deviceScaleFactor: 1 });
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errs.push("console: " + m.text().slice(0, 200)); });
  await seed(p, D.all(), "journal"); await p.waitForTimeout(1000);

  // ⑦ 季節の言葉: none today; 立冬 on 11/7, 文化の日 on 11/3
  ok(!(await shown(p, "#jn4Season")), "⑦ nothing today");
  // ⑩ 前に書いた日 (「‹ 前に書いた日 11/13」 at the row's left): taken out at the user's call (2026-11-28, tools/REMOVED.md);
  // 次に書いた日 kept, at the right. Today and 11/13 (nothing written after them, today not yet): no row
  ok(!(await shown(p, "#jn4Hop")) && !(await p.$("#jn4Hop button")), "⑩ today: no 前に書いた日 (the row hidden)", await txt(p, "#jn4Hop"));
  await go(p, "2026-11-13");
  ok((await val(p)).startsWith("よかったこと：映画") && !(await shown(p, "#jn4Hop")), "⑩ 11/13: no row", await txt(p, "#jn4Hop"));
  await go(p, "2026-11-07");
  ok((await txt(p, "#jn4Season")) === flat("11/7は 立冬（りっとう）・冬のはじまり"), "⑦ 立冬", await txt(p, "#jn4Season"));
  const hop = await p.evaluate(() => { const r = document.getElementById("jn4Hop").getBoundingClientRect(), bs = [...document.querySelectorAll("#jn4Hop button")]; return { n: bs.length, right: bs[0] ? Math.round(r.right - bs[0].getBoundingClientRect().right) : null }; });
  ok((await txt(p, "#jn4Hop")) === "次に書いた日11/10" && hop.n === 1 && hop.right <= 2, "⑩ 次に書いた日 alone, at the right (no 前に書いた日 11/3)", [await txt(p, "#jn4Hop"), hop]);
  await p.locator("#jn4Hop button", { hasText: "次に書いた日" }).click(); await p.waitForTimeout(500);
  ok(await p.inputValue("#sec-journal .datenav input[type=date]") === "2026-11-10", "⑩ 次に書いた日 pressed: 11/10", await p.inputValue("#sec-journal .datenav input[type=date]"));
  await go(p, "2026-11-03");
  ok((await txt(p, "#jn4Season")) === flat("11/3は 文化の日"), "⑦ 文化の日", await txt(p, "#jn4Season"));

  // ① 天気を選ぶ: taken out (the user's call, 2026-11-19, tools/REMOVED.md), with the weather in 日記
  await go(p, "2026-11-13");
  ok(!(await p.$("#jn4Wx")) && !(await p.$("#jn2Wx")) && !("wx" in (await entry(p, "2026-11-13"))), "① (taken out) no 天気を選ぶ, no weather");

  // ② 見出しごと
  const heads = await p.evaluate(() => [...document.querySelectorAll("#jn4Heads .jn-tag")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(heads.join() === "よかったこと3,あしたやりたいこと2", "② the 見出し on two days or more (not 21:30, 天気, がんばったこと)", heads);
  const rows1 = await p.evaluate(() => [...document.querySelectorAll("#jn4HeadList li")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(rows1.join() === "きのう映画,11/12カフェ,11/10散歩", "② よかったこと, the latest first", rows1);
  await p.locator("#jn4Heads .jn-tag", { hasText: "あしたやりたいこと" }).click(); await p.waitForTimeout(200);
  const rows2 = await p.evaluate(() => [...document.querySelectorAll("#jn4HeadList li")].map((x) => x.innerText.replace(/\s+/g, "")));
  ok(rows2.join() === "きのう掃除ToDoにする,11/10洗濯ToDoにする,11/10買い物ToDoにする", "② あしたやりたいこと, with ToDoにする", rows2);
  await p.locator("#jn4HeadList li", { hasText: "洗濯" }).locator("button", { hasText: "ToDoにする" }).click(); await p.waitForTimeout(500);
  const td = await ls(p, "todos");
  ok(td.length === 1 && td[0].text === "洗濯" && td[0].memo === "11/10の日記の「あしたやりたいこと」から", "② a ToDo", td);
  ok((await txt(p, "#jn4HeadList")).includes("洗濯ToDoにしました"), "② said on its row", await txt(p, "#jn4HeadList"));

  // ⑥ 伏せ字: put on and taken off with the button; ●●● in 月の日記を読む, a press shows it; a tag in it is no tag
  await go(p, D.DAY);
  await p.click("#journalText"); await p.keyboard.type("あいうえお #ひみつ");
  await p.evaluate(() => { const t = document.getElementById("journalText"); t.setSelectionRange(1, 3); t.dispatchEvent(new Event("select")); });
  await p.waitForTimeout(150);
  ok((await txt(p, "#jn4Hide")) === "選んだところを伏せる" && await shown(p, "#jn4Hide"), "⑥ the button");
  await p.click("#jn4Hide"); await p.waitForTimeout(150);
  ok((await val(p)) === "あ｟いう｠えお #ひみつ", "⑥ 伏せた", await val(p));
  await p.evaluate(() => { const t = document.getElementById("journalText"); t.setSelectionRange(1, 5); t.dispatchEvent(new Event("select")); });
  await p.waitForTimeout(150);
  ok((await txt(p, "#jn4Hide")) === "伏せるのをやめる", "⑥ picked as one: to take off", await txt(p, "#jn4Hide"));
  await p.click("#jn4Hide"); await p.waitForTimeout(150);
  ok((await val(p)) === "あいうえお #ひみつ", "⑥ taken off", await val(p));
  await p.evaluate(() => { const t = document.getElementById("journalText"); t.setSelectionRange(5, 10); t.dispatchEvent(new Event("select")); });
  await p.click("#jn4Hide"); await p.waitForTimeout(1800);
  ok((await entry(p, D.DAY)).text === "あいうえお｟ #ひみつ｠", "⑥ saved", (await entry(p, D.DAY)).text);
  ok(!(await shown(p, "#jnTags")), "⑥ a tag in it is no tag");
  await p.locator("#jn2Read button", { hasText: "続けて読む" }).click(); await p.waitForTimeout(300);
  const sec = p.locator("#jn2Read .jn2-day.on .jn4-secret");
  ok((await sec.count()) === 1 && (await sec.innerText()) === "●●●", "⑥ ●●● in 月の日記を読む");
  await sec.click(); await p.waitForTimeout(100);
  ok(flat(await sec.innerText()) === "#ひみつ", "⑥ a press shows it", await sec.innerText());

  // ⑨ あとから書き足す: 11/7 in 読み返す (1週間前)
  const back = p.locator("#jnBack li", { has: p.locator("strong", { hasText: /^1週間前$/ }) });
  await back.locator("button", { hasText: "書き足す" }).click(); await p.waitForTimeout(200);
  await back.locator(".jn4-add-text").fill("あとから一言");
  await back.locator(".jn4-add-go").click(); await p.waitForTimeout(700);
  ok((await entry(p, "2026-11-07")).text === "立冬の日。寒くなった。\n\n（2026/11/14 追記）あとから一言", "⑨ added with today's date", (await entry(p, "2026-11-07")).text);
  ok((await ls(p, "jnHist"))?.["2026-11-07"]?.[0]?.t === "立冬の日。寒くなった。", "⑨ what it was, in 変更の履歴", await ls(p, "jnHist"));
  await undo(p);
  ok((await entry(p, "2026-11-07")).text === "立冬の日。寒くなった。", "⑨ 元に戻す");

  // ⑧ 今週のふりかえり
  ok((await txt(p, "#jn4WeekHead")) === "今週のふりかえり" && (await txt(p, "#jn4WeekSum")).startsWith("4日"), "⑧ this week: 4 days", await txt(p, "#jn4WeekSum"));
  const wd = await p.evaluate(() => [...document.querySelectorAll("#jn4WeekDays .jn4-wd")].map((x) => (x.classList.contains("has") ? "●" : "○")).join(""));
  ok(wd === "○○●○●●●", "⑧ the days (Sun〜Sat)", wd);
  ok((await txt(p, "#jn4WeekPrev")) === "前の週：先週のひとこと", "⑧ last week's", await txt(p, "#jn4WeekPrev"));
  await p.fill("#jn4WeekText", "いい週だった"); await p.dispatchEvent("#jn4WeekText", "input"); await p.waitForTimeout(1600);
  const wk = (await ls(p, "settings")).find((s) => s.id === "jnWeek:2026-11-08");
  ok(wk && wk.text === "いい週だった", "⑧ kept with the account", wk);

  // ③ 声で残す: taken out (the user's call, 2026-11-19): no button. A voice kept before still has its player under the
  // field (put in with the photos for ⑤ ④ below: their 写真を付ける taken out too)
  ok(!(await p.$("#jn4Rec")), "③ (taken out) no 声で残す");
  await putMedia(p, [{ jnVoiceDay: D.DAY }, { jnDay: D.DAY }, { jnDay: "2026-11-13" }]); await p.reload(); await p.waitForTimeout(1200);
  const vs = (await store(p)).filter((x) => x.jnVoiceDay);
  ok(vs.length === 1 && vs[0].jnVoiceDay === D.DAY && /^audio\//.test(vs[0].type), "③ (a voice kept before) on this device", vs);
  ok((await p.locator("#jn4Voices audio").count()) === 1, "③ its player under the field");

  // ⑤ 写真にひとこと, ④ スライドショー, on the photos already on this device
  await go(p, "2026-11-13");
  await p.click("#jn2Photos .td-thumb"); await p.waitForTimeout(300);
  await p.fill("#jn4Cap", "映画のあと"); await p.press("#jn4Cap", "Enter"); await p.waitForTimeout(500);
  ok((await store(p)).some((x) => x.jnDay === "2026-11-13" && x.cap === "映画のあと"), "⑤ kept with the photo", await store(p));
  await p.click("#jn2PhotoClose"); await p.waitForTimeout(300);
  ok((await txt(p, "#jn3Album")).includes("映画のあと"), "⑤ in 写真と絵", await txt(p, "#jn3Album"));
  await p.locator("#jn3Album .jn4-play").first().click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById("jn4ShowView").open), "④ the slideshow");
  ok((await txt(p, "#jn4ShowAt")) === "1/2" && (await txt(p, "#jn4ShowDay")).startsWith("11月13日") && (await txt(p, "#jn4ShowCapText")) === "映画のあと", "④ the first: 11/13, its ひとこと", [await txt(p, "#jn4ShowAt"), await txt(p, "#jn4ShowDay")]);
  await p.click("#jn4ShowNext"); await p.waitForTimeout(200);
  ok((await txt(p, "#jn4ShowAt")) === "2/2" && (await txt(p, "#jn4ShowDay")).startsWith("11月14日"), "④ 次へ", await txt(p, "#jn4ShowDay"));
  await p.click("#jn4ShowPlay"); await p.waitForTimeout(100);
  ok((await txt(p, "#jn4ShowPlay")) === "続ける", "④ 止める");
  await p.click("#jn4ShowClose"); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.getElementById("jn4ShowView").open)), "④ 閉じる");
  ok((await store(p)).filter((x) => x.jnDay).length === 2, "(the voice is not a photo)");
  await p.screenshot({ path: "journal4-page.png", fullPage: true });

  ok(!p.errs.length, "no errors", p.errs);
  await b.close();
  console.log(fails ? `FAIL ${fails} failed` : "ALL OK");
})().catch((e) => { console.log("FAIL " + e.message); process.exit(1); });
