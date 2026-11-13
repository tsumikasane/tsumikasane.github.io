const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  for (const [w, h, font] of [[393, 793, null], [375, 647, null], [430, 873, null], [320, 548, null], [393, 793, '21px']]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(150);
    await p.evaluate(() => {
      const put = (k, v) => localStorage.setItem('tsumikasane:' + k, JSON.stringify(v));
      const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
      let i = 0; const id = () => 'x' + (i++);
      put('todos', [{ id: id(), text: '請求書を送る', done: false, due: day(-2), createdAt: 1 }, { id: id(), text: '歯医者の予約', done: false, due: day(0), createdAt: 2 }, { id: id(), text: '部屋の掃除', done: false, due: '', createdAt: 3 }]);
      put('events', [{ id: id(), date: day(0), title: '打ち合わせ', time: '10:00', createdAt: 1 }, { id: id(), date: day(0), title: 'ジム', time: '19:00', createdAt: 2 }]);
      put('journal', [{ id: day(0), date: day(0), text: 'きょうは朝から雨。駅まで歩いて、帰りに本屋に寄った。新しい本を2冊買った。' }]);
      put('meals', [{ id: id(), date: day(0), slot: '朝食', text: 'トースト', kcal: 350, createdAt: 1 }, { id: id(), date: day(0), slot: '昼食', text: 'カレー', kcal: 800, createdAt: 2 }]);
      put('workouts', [{ id: id(), date: day(0), type: 'ランニング', minutes: 30, km: 5, createdAt: 1 }]);
      put('study', [{ id: id(), date: day(0), minutes: 45, createdAt: 1 }]);
      put('routines', [{ id: 'r1', name: '散歩', createdAt: 1 }, { id: 'r2', name: 'ストレッチ', createdAt: 2 }, { id: 'r3', name: '日記を書く', createdAt: 3 }]);
      put('routineDays', [{ id: day(0), date: day(0), done: ['r1'] }]);
      put('weights', [{ id: day(-4), date: day(-4), kg: 66.2 }, { id: day(-1), date: day(-1), kg: 66.0 }]);
      put('settings', [{ id: 'budget', monthly: 80000 }, { id: 'backup', lastExport: Date.now() - 86400000 }]);
      put('expenses', [{ id: id(), date: day(0), kind: 'out', category: '食費', amount: 1200, createdAt: 1 }, { id: id(), date: day(-3), kind: 'out', category: '交通費', amount: 15000, createdAt: 2 }]);
      put('goals', [{ id: 'g1', title: '1年で本を24冊読む', criterion: '24冊', deadline: day(60), depth: 2, done: false, createdAt: 1 }]);
    });
    await p.reload(); await p.waitForTimeout(300);
    if (font) { await p.evaluate((f) => { document.documentElement.style.fontSize = f; }, font); await p.waitForTimeout(300); }
    const r = await p.evaluate(() => {
      const tiles = [...document.querySelectorAll('#homeTiles .tile')];
      const rows = []; let top = null;
      for (const t of tiles) { const b = t.getBoundingClientRect(); const name = t.querySelector('.lbl').textContent; if (top !== null && Math.abs(b.top - top) < 2) rows[rows.length - 1].push(name); else { rows.push([name]); top = b.top; } }
      const over = tiles.filter(t => t.scrollWidth > t.clientWidth + 1).map(t => t.querySelector('.lbl').textContent);
      return { height: document.documentElement.scrollHeight, rows: rows.map(r => r.join('|')).join('  /  '), over, onFirstScreen: tiles.filter(t => t.getBoundingClientRect().bottom <= innerHeight - 90).length };
    });
    console.log(`${w}x${h}${font ? ' font ' + font : ''}: height ${r.height}px (was ~1750 at 393), ${r.onFirstScreen} tiles on the first screen${r.over.length ? ', overflow: ' + r.over : ''}\n  ${r.rows}`, errs.length ? errs : '');
    await p.screenshot({ path: `${out}/ht_${w}${font ? 'big' : ''}.png`, fullPage: true });
    await p.close();
  }
  await b.close();
})();
