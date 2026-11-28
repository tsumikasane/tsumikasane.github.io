// 家計簿's 費目ごとの支出 (the user's call, 2026-11-28): 「棒グラフの色をカテゴリーの色とそれぞれ統一してカラフルに」. Each
// bar in its 費目's colour, the one its tile's picture has in 入力 (all in 家計簿's yellow before): the eleven, the user's
// own (by the words in them, else grey), an old name counted as its new one (外食 → 食費) and 未分類, in light and dark
// and with the app's own look switched (data-theme). Pressed, still so; a 費目 with only a budget no bar; the thin bar
// of a 費目's budget in 家計簿's colour as before; no errors
const { chromium } = require("playwright");
const { phone, seed } = require("./lib");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const rgb = (h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
// the tiles' colours (EX2_ICONS), light and dark
const C = {
  食費: ["#d9711c", "#ff9d4d"], 日用品: ["#2f9e57", "#4fcf7f"], 衣服: ["#2c4fa8", "#8aa4f0"], 美容: ["#d94f93", "#ff86bf"],
  交際費: ["#c08a00", "#f2c443"], 医療費: ["#24a874", "#5fdcae"], 教育費: ["#d6403f", "#ff7b7a"], 水道光熱費: ["#2f93d6", "#69bdf5"],
  交通費: ["#8d5b31", "#d39a66"], 通信費: ["#5f6670", "#a7adb6"], 雑費: ["#7a6f62", "#b5aa9c"],
  推し活: ["#7b58cf", "#ad92ff"], ペット: ["#6b6f76", "#a7adb6"], 未分類: ["#6b6f76", "#a7adb6"],
};
const MONEY = ["#a16a00", "#ffd600"]; // (--c-money)
const T0 = Date.parse("2026-11-01T09:00:00+09:00");
const X = (id, date, category, amount) => ({ id, date, kind: "out", ...(category ? { category } : {}), amount, createdAt: T0 });
const names = Object.keys(C).filter((c) => c !== "未分類");
const expenses = names.map((c, i) => X("e" + i, `2026-11-${String(2 + i).padStart(2, "0")}`, c, 1000 * (names.length - i) + 500));
expenses.push(X("old", "2026-11-20", "外食", 300), X("none", "2026-11-21", "", 700), X("in1", "2026-11-25", "給与", 90000));
expenses[expenses.length - 1].kind = "in";
const DATA = {
  expenses,
  settings: [
    { id: "budget", monthly: 200000, cats: { 食費: 50000, 旅行: 10000 }, updatedAt: T0 },
    { id: "exCats", out: ["食費", "日用品", "衣服", "美容", "交際費", "医療費", "教育費", "水道光熱費", "交通費", "通信費", "雑費", "推し活", "ペット"], updatedAt: T0 },
  ],
};
const read = (p) => p.evaluate(() => ({
  rows: [...document.querySelectorAll("#catList .cat-row")].map((r) => {
    const bar = r.querySelector(".cat-bar"), bud = r.querySelector(".cat-bud i");
    return { name: r.querySelector(".cat").textContent, bg: getComputedStyle(bar).backgroundColor, w: bar.getBoundingClientRect().width,
      track: r.querySelector(".cat-track").getBoundingClientRect().width, bud: bud ? getComputedStyle(bud).backgroundColor : null, pressed: r.getAttribute("aria-pressed") };
  }),
  tiles: Object.fromEntries([...document.querySelectorAll("#exTiles .ex2-tile[data-cat]")].map((t) => [t.dataset.cat, getComputedStyle(t.querySelector(".icon")).color])),
}));
(async () => {
  const b = await chromium.launch();
  for (const scheme of ["light", "dark"]) {
    const p = await phone(b, new Date("2026-11-28T20:00:00+09:00"), { deviceScaleFactor: 1, colorScheme: scheme });
    await seed(p, DATA, "money"); await p.waitForTimeout(900);
    const check = async (look, tag) => {
      const k = look === "light" ? 0 : 1, r = await read(p), by = Object.fromEntries(r.rows.map((x) => [x.name, x]));
      const want = Object.keys(C);
      ok(want.every((c) => by[c]) && !by["外食"] && by["旅行"], `${tag}: a row each 費目 (外食 in 食費, 未分類, 旅行 with only its budget)`, r.rows.map((x) => x.name));
      const wrong = want.filter((c) => by[c] && by[c].bg !== rgb(C[c][k])).map((c) => [c, by[c].bg, rgb(C[c][k])]);
      ok(!wrong.length, `${tag}: each bar in its 費目's colour (${look})`, wrong);
      const off = Object.keys(r.tiles).filter((c) => by[c] && by[c].bg !== r.tiles[c]).map((c) => [c, by[c].bg, r.tiles[c]]);
      ok(Object.keys(r.tiles).length >= 13 && !off.length, `${tag}: each bar as its tile's picture in 入力`, [Object.keys(r.tiles).length, off]);
      ok(new Set(r.rows.filter((x) => x.w > 0).map((x) => x.bg)).size >= 11, `${tag}: colourful, not one colour`, [...new Set(r.rows.map((x) => x.bg))]);
      ok(by["旅行"] && by["旅行"].w === 0, `${tag}: 旅行, a budget and nothing spent, no bar`, by["旅行"]);
      ok(r.rows[0].name === "食費" && Math.abs(r.rows[0].w - r.rows[0].track) <= 1 && r.rows.slice(1).every((x) => x.w <= r.rows[0].w), `${tag}: the bars' lengths as before (the most the whole track)`, r.rows.slice(0, 3));
      ok(by["食費"].bud === rgb(MONEY[k]) && by["旅行"].bud === rgb(MONEY[k]), `${tag}: the thin bar of a 費目's budget in 家計簿's colour as before`, [by["食費"].bud, by["旅行"].bud]);
    };
    await check(scheme, scheme);
    // the app's own look switched over the phone's
    const other = scheme === "light" ? "dark" : "light";
    await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, other); await p.waitForTimeout(200);
    await check(other, `${scheme} phone, ${other} look`);
    await p.evaluate(() => { delete document.documentElement.dataset.theme; }); await p.waitForTimeout(200);
    // pressed: 明細 narrowed to it, its bar and the others' as they were
    await p.locator('#catList .cat-row:has-text("交通費")').click(); await p.waitForTimeout(400);
    const r = await read(p), k = scheme === "light" ? 0 : 1, row = r.rows.find((x) => x.name === "交通費");
    ok(row && row.pressed === "true" && row.bg === rgb(C["交通費"][k]) && r.rows.every((x) => !C[x.name] || x.bg === rgb(C[x.name][k])), `${scheme}: 交通費 pressed, the colours kept`, row);
    ok(await p.isVisible("#exFilter") && (await p.textContent("#exFilter")).includes("交通費だけ"), `${scheme}: 明細 narrowed to 交通費 as before`);
    ok(!p.errs.length, `${scheme}: no page errors`, p.errs);
    await p.screenshot({ path: `${process.argv[2] || __dirname + "/shots"}/moneycatcolor-${scheme}.png`, clip: await p.locator("#catCard").boundingBox() }).catch(() => {});
    await p.context().close();
  }
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
