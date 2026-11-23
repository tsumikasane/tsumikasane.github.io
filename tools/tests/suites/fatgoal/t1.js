// からだ's 目標体脂肪率, set from the page (the user's call, 2026-11-23: 目標体脂肪率を設定できるように): the card by 体脂肪率's
// says 未設定 and 目標を決める, or how far the latest is from it and 変える; a press opens the settings at 目標体脂肪率
process.env.URL0 = process.env.URL0 || "http://localhost:8765/";
const { chromium } = require("playwright");
const { URL0, P, phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const NOON = Date.parse("2026-11-23T12:00:00+09:00");
const weights = (fat = true) => Array.from({ length: 31 }, (_, k) => {
  const i = 30 - k, at = NOON - i * 864e5, id = new Date(at).toISOString().slice(0, 10);
  return { id, date: id, kg: Math.round((68 - (30 - i) * 0.08) * 10) / 10, ...(fat ? { fat: Math.round((24 - (30 - i) * 0.05) * 10) / 10 } : {}), createdAt: at };
});
const stats = (p) => p.evaluate(() => [...document.querySelectorAll("#wtStats .stat")].map((x) => ({ k: x.querySelector(".k")?.textContent, v: x.querySelector(".v")?.textContent, d: x.querySelector(".d")?.textContent, btn: x.tagName === "BUTTON" })));
const card = async (p) => (await stats(p)).find((x) => /^体脂肪率の目標/.test(x.k || ""));
const fatGoal = (p) => p.evaluate((P) => JSON.parse(localStorage.getItem(P + "settings") || "[]").find((x) => x.id === "fat") || null, P);
async function open(b, data) {
  const p = await phone(b, new Date("2026-11-23T10:00:00+09:00"));
  await seed(p, data, "diet");
  await p.evaluate(() => document.querySelector('#dietParts button[data-part="body"]')?.click()); await p.waitForTimeout(500);
  return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await open(b, { weights: weights(), settings: [{ id: "weight", target: 63, updatedAt: 1 }] });
  // none set, 体脂肪率 recorded: 未設定 and 目標を決める, by 体脂肪率's card
  let s = await stats(p), c = await card(p);
  ok(c && c.k === "体脂肪率の目標" && c.v === "未設定" && c.d === "目標を決める" && c.btn, "none set: 体脂肪率の目標 未設定・目標を決める, a button", c);
  ok(s.findIndex((x) => x.k === "体脂肪率") + 1 === s.findIndex((x) => /^体脂肪率の目標/.test(x.k || "")), "right after 体脂肪率's card", s.map((x) => x.k));
  // a press: the settings at 目標体脂肪率; typed and 完了: kept, and the card says how far
  await p.locator("#wtStats button.stat").click(); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.getElementById("daySheet").open && document.activeElement?.id === "fatTarget" && !document.getElementById("bodyGroup").hidden), "pressed: the settings, at 目標体脂肪率");
  await p.keyboard.type("18"); await p.click("#sheetDone"); await p.waitForTimeout(700);
  c = await card(p);
  ok((await fatGoal(p))?.target === 18, "kept: 18%", await fatGoal(p));
  ok(c && c.k === "体脂肪率の目標まで" && c.v === "あと 4.5%" && c.d === "目標 18.0%・変える", "set: 体脂肪率の目標まで あと 4.5%, 目標 18.0%・変える", c);
  // 変える: its 保存 (the return key) keeps the new one
  await p.locator("#wtStats button.stat").click(); await p.waitForTimeout(700);
  await p.fill("#fatTarget", "20"); await p.press("#fatTarget", "Enter"); await p.waitForTimeout(400);
  ok((await fatGoal(p))?.target === 20, "変える: 20% kept by 保存", await fatGoal(p));
  await p.click("#sheetDone"); await p.waitForTimeout(700);
  ok((await card(p))?.v === "あと 2.5%", "and the card follows", await card(p));
  // emptied: the goal goes, 未設定 again
  await p.locator("#wtStats button.stat").click(); await p.waitForTimeout(700);
  await p.fill("#fatTarget", ""); await p.click("#sheetDone"); await p.waitForTimeout(700);
  ok(!(await fatGoal(p)) && (await card(p))?.v === "未設定", "emptied: no goal, 未設定 again", [await fatGoal(p), await card(p)]);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  // no 体脂肪率 recorded: no card till a goal is set; with one, its goal and —
  p = await open(b, { weights: weights(false), settings: [] });
  ok(!(await card(p)), "no 体脂肪率 and no goal: no card", await stats(p));
  await p.close();
  p = await open(b, { weights: weights(false), settings: [{ id: "fat", target: 18, updatedAt: 1 }] });
  c = await card(p);
  ok(c && c.v === "—" && c.d === "目標 18.0%・変える", "a goal, no 体脂肪率 yet: its goal, —", c);
  ok(!p.errs.length, "no page errors", p.errs);
  await p.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
