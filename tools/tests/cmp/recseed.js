// two months of everyday records, put straight into the app's storage
module.exports = (page, opts = {}) => page.evaluate((opts) => {
  const put = (k, v) => localStorage.setItem('tsumikasane:' + k, JSON.stringify(v));
  localStorage.clear();
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  let id = 0; const nid = () => 'r' + (id++);
  const N = opts.days ?? 62;
  const J = [], M = [], W = [], S = [], RD = [], WT = [], E = [];
  const words = ['朝から雨。駅まで歩いて、帰りに本屋に寄った。', 'ジムに行った。', '仕事が忙しくて疲れた。早めに寝る。', '友だちとランチ。久しぶりに話せて楽しかった。\n夜は映画を見た。', '特になし'];
  const subs = [{ id: 's1', name: '英語', color: 'red', createdAt: 1 }, { id: 's2', name: '数学', color: 'blue', createdAt: 2 }, { id: 's3', name: 'プログラミング', color: 'green', createdAt: 3 }];
  const rts = [{ id: 't1', name: '朝の散歩', createdAt: 1 }, { id: 't2', name: 'ストレッチ', createdAt: 2 }, { id: 't3', name: '水を2リットル飲む', createdAt: 3 }, { id: 't4', name: '日記を書く', createdAt: 4 }];
  for (let i = -N + 1; i <= 0; i++) {
    const d = day(i), k = -i;
    if (k % 7 === 3) continue; // a day off from everything, so the streak breaks now and then
    if (k % 2 === 0) J.push({ id: d, date: d, text: words[k % words.length], updatedAt: 1 });
    M.push({ id: nid(), date: d, slot: '朝食', text: 'トーストとコーヒー', kcal: 350, createdAt: k * 10 + 1 });
    M.push({ id: nid(), date: d, slot: '昼食', text: k % 3 ? 'カレーライス' : '定食（焼き魚・みそ汁・ごはん）', kcal: k % 3 ? 800 : undefined, createdAt: k * 10 + 2 });
    if (k % 2) M.push({ id: nid(), date: d, slot: '夕食', text: 'パスタとサラダ', kcal: 700, createdAt: k * 10 + 3 });
    if (k % 3 === 0) W.push({ id: nid(), date: d, type: 'ランニング', minutes: 30, km: 5.2, kcal: 320, createdAt: k * 10 + 4 });
    if (k % 4 === 1) W.push({ id: nid(), date: d, type: '筋トレ', exercise: 'ベンチプレス', kg: 60, reps: 10, sets: 3, createdAt: k * 10 + 5 });
    if (k % 5 === 2) W.push({ id: nid(), date: d, type: 'ウォーキング', minutes: 45, createdAt: k * 10 + 6 });
    if (k % 2 === 1) S.push({ id: nid(), date: d, minutes: 60, subjectId: 's1', note: k % 4 === 1 ? '単語帳 p.40〜60' : undefined, createdAt: k * 10 + 7 });
    if (k % 3 === 1) S.push({ id: nid(), date: d, minutes: 45, subjectId: 's2', createdAt: k * 10 + 8 });
    if (k % 5 === 0) S.push({ id: nid(), date: d, minutes: 90, subjectId: 's3', createdAt: k * 10 + 9 });
    RD.push({ id: d, date: d, done: ['t1', 't2', 't3', 't4'].filter((t, j) => (k + j) % 3 !== 0) });
    if (k % 2 === 0) WT.push({ id: d, date: d, kg: Math.round((66 + k * 0.04 + (k % 4 ? 0.3 : -0.2)) * 10) / 10 });
    E.push({ id: nid(), date: d, kind: 'out', category: '食費', amount: 800 + (k % 5) * 150, memo: k % 3 ? 'スーパー' : undefined, createdAt: k * 10 + 1 });
    if (k % 6 === 0) E.push({ id: nid(), date: d, kind: 'out', category: '交通', amount: 1200, createdAt: k * 10 + 2 });
    if (k % 9 === 0) E.push({ id: nid(), date: d, kind: 'out', category: '日用品', amount: 2480, memo: 'ドラッグストア', createdAt: k * 10 + 3 });
    if (k === 25 || k === 55) E.push({ id: nid(), date: d, kind: 'in', category: '給与', amount: 250000, createdAt: k * 10 + 4 });
  }
  put('journal', J); put('meals', M); put('workouts', W); put('study', S); put('subjects', subs); put('routines', rts); put('routineDays', RD);
  put('weights', WT); put('expenses', E);
  put('settings', [{ id: 'budget', monthly: 60000, updatedAt: 1 }, { id: 'backup', lastExport: Date.now() - 12 * 864e5 }]);
}, opts);
