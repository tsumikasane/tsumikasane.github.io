// 家計簿's まとめ: 支出 in red, its bars and its words (the user's call, 2026-11-25; amber before), in light and dark, at
// the page itself (8765); 収入 blue as before, and the input page's 費目ごと bars not red (each its 費目's colour since 2026-11-28)
const { chromium } = require("playwright");
const { phone, seed } = require("./lib");
const M = require("../money3/data");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const RED = { light: { bar: "rgb(215, 0, 21)", text: "rgb(215, 0, 21)", hex: "#d70015" }, dark: { bar: "rgb(255, 69, 58)", text: "rgb(255, 97, 101)", hex: "#ff6165" } };
const BLUE = { light: "rgb(22, 98, 222)", dark: "rgb(76, 141, 255)" };
(async () => {
  const b = await chromium.launch();
  for (const scheme of ["light", "dark"]) {
    const p = await phone(b, new Date(`${M.today}T20:00:00+09:00`), { deviceScaleFactor: 1, colorScheme: scheme });
    p.errs = []; p.on("pageerror", (e) => p.errs.push(e.message));
    const data = JSON.parse(JSON.stringify(M.DATA));
    data.settings.push({ id: "payMethods", items: [{ id: "pm1", name: "現金" }], updatedAt: 1 });
    await seed(p, data, "money"); await p.waitForTimeout(900);
    // the input page first: its 費目ごと bars not red (家計簿's own colour before; each its 費目's colour since 2026-11-28, moneycatcolor)
    const book = await p.evaluate(() => { const x = document.querySelector("#catList .cat-bar"); return x ? getComputedStyle(x).backgroundColor : null; });
    ok(!!book && book !== RED[scheme].bar, `${scheme}: the input page's 費目ごと bars not red`, book);
    await p.click('#moneyParts [data-part="stats"]'); await p.waitForTimeout(700);
    const c = await p.evaluate(() => {
      const bg = (x) => (x ? getComputedStyle(x).backgroundColor : null), fill = (x) => (x ? getComputedStyle(x).fill : null), fg = (x) => (x ? getComputedStyle(x).color : null);
      const all = (sel, f) => [...new Set([...document.querySelectorAll(sel)].map(f))];
      return {
        outBars: all("#trendChart .ch-bar.out", fill), inBars: all("#trendChart .ch-bar.in", fill), legend: bg(document.querySelector("#trendLegend .ch-sw.out")),
        notes: all("#trendNotes .ch-out-t", fg), noteDot: fg([...document.querySelectorAll("#trendNotes .phrase")].find((x) => x.querySelector(".ch-out-t"))),
        table: all("#trendTable td.ch-out-t", fg), tableN: document.querySelectorAll("#trendTable tbody tr").length,
        bars: all("#moneyStats .cat-bar", bg), barsN: document.querySelectorAll("#mo3Tags .cat-bar, #payList .cat-bar, #mo2Year .cat-bar, #mo3Bud .cat-bar").length, // (曜日ごとの支出: taken out, 2026-11-26)
        over: [...document.querySelectorAll("#mo3Bud .cat-bar")].map((x) => [x.classList.contains("over"), getComputedStyle(x).backgroundImage.includes("repeating-linear-gradient")]),
        calOut: all("#exCal .da.out", fg), calIn: all("#exCal .da.in", fg), calKey: fg(document.querySelector("#exCalKey .out")),
        year: fg(document.querySelector("#mo2Year .ch-out-t")), yearText: document.querySelector("#mo2Year .ch-out-t")?.textContent,
      };
    });
    const R = RED[scheme];
    ok(c.outBars.length === 1 && c.outBars[0] === R.bar && c.legend === R.bar, `${scheme}: 月ごとの推移, 支出's bars and its key red`, [c.outBars, c.legend]);
    ok(c.inBars.length === 1 && c.inBars[0] === BLUE[scheme], `${scheme}: 収入's bars blue as before`, c.inBars);
    ok(c.notes.length === 1 && c.notes[0] === R.text && c.noteDot !== R.text, `${scheme}: the words under it, 支出's red (the ・ after it not)`, [c.notes, c.noteDot]);
    ok(c.table.length === 1 && c.table[0] === R.text && c.tableN > 0, `${scheme}: 数字で見る, 支出's column red`, c.table);
    ok(c.bars.length === 1 && c.bars[0] === R.bar && c.barsN >= 10, `${scheme}: every bar of 支出 on まとめ red (タグ・支払い方法・1年・予算)`, [c.bars, c.barsN]);
    ok(c.over.length >= 5 && c.over.every(([o, striped]) => o === striped) && c.over.some(([o]) => o), `${scheme}: 予算を守れた月, a month over striped, the others not`, c.over);
    ok(c.calOut.length === 1 && c.calOut[0] === R.text && c.calKey === R.text && c.calIn.length === 1 && c.calIn[0] !== R.text, `${scheme}: 収入と支出のカレンダー, 支出 red (the days and the sum), 収入 not`, [c.calOut, c.calKey, c.calIn]);
    ok(c.year === R.text && /^\d[\d,]*\s*円$/.test(c.yearText || ""), `${scheme}: 1年のまとめ, its 支出 red`, [c.year, c.yearText]);
    // the tip over a month, and a day pressed in the calendar
    const box = await p.locator("#trendChart").boundingBox();
    await p.mouse.move(box.x + box.width - 40, box.y + box.height / 2); await p.waitForTimeout(300);
    const tip = await p.evaluate(() => { const x = document.querySelector("#trendTip .ch-out-t"); return x && !x.closest("[hidden]") ? [getComputedStyle(x).color, x.textContent] : null; });
    ok(!!tip && tip[0] === R.text && tip[1].startsWith("支出 "), `${scheme}: the tip, 支出 red`, tip);
    await p.mouse.move(0, 0);
    await p.locator("#exCal .excal-d", { has: p.locator(".da.out") }).first().click(); await p.waitForTimeout(400);
    const day = await p.evaluate(() => ({ head: getComputedStyle(document.querySelector("#exCalDay .excal-day-head .out")).color,
      amounts: [...new Set([...document.querySelectorAll("#exCalDay .amount.out")].map((x) => getComputedStyle(x).color))],
      chip: getComputedStyle(document.querySelector("#exCalDay .chip")).getPropertyValue("--chip-c").trim() }));
    ok(day.head === R.text && day.amounts.length === 1 && day.amounts[0] === R.text && day.chip === R.hex, `${scheme}: the day pressed, its 支出 red (its sum, its amounts, its chips)`, day);
    ok(!p.errs.length, `${scheme}: no page errors`, p.errs);
    await p.context().close();
  }
  await b.close();
  console.log(fails ? `FAIL ${fails}` : "ALL OK");
  process.exit(fails ? 1 : 0);
})();
