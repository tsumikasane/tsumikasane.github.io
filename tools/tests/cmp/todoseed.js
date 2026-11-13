// a realistic ToDo list: late ones, today's, later ones, some without a 期限, important ones, repeats, memos, many done
module.exports = (page) => page.evaluate(() => {
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const now = Date.now(), H = 3600e3;
  const T = [
    { id: 't1', text: '請求書を送る', done: false, due: day(-4), createdAt: 1 },
    { id: 't2', text: '部屋の掃除をして粗大ごみの申し込みもする', done: false, due: day(-1), flag: true, createdAt: 2 },
    { id: 't3', text: '歯医者の予約をする', done: false, due: day(0), createdAt: 3, memo: '午前中なら空いているらしい。\n電話番号は名刺の裏' },
    { id: 't4', text: 'ゴミ出し（燃えるゴミ）', done: false, due: day(0), repeat: 'weekly', createdAt: 4 },
    { id: 't5', text: '家賃の振り込み', done: false, due: day(2), repeat: 'monthly', flag: true, createdAt: 5 },
    { id: 't6', text: '確定申告の書類をそろえる', done: false, due: day(9), createdAt: 6, memo: '医療費の領収書、ふるさと納税の受領証明書、源泉徴収票、生命保険料控除証明書をまとめてファイルに入れておく。去年のぶんも確認する。' },
    { id: 't7', text: '母の誕生日プレゼントを選ぶ', done: false, due: day(20), repeat: 'yearly', createdAt: 7 },
    { id: 't8', text: '本を返す', done: false, due: '', createdAt: 8 },
    { id: 't9', text: 'ランニングシューズを買い替える', done: false, due: '', flag: true, createdAt: 9 },
    { id: 't10', text: '写真の整理', done: false, due: '', createdAt: 10 },
  ];
  for (let i = 0; i < 14; i++) T.push({ id: 'd' + i, text: ['洗濯', '牛乳を買う', 'メールの返信', '電球の交換', 'クリーニングを取りに行く', '会議の資料を作る', '銀行に行く'][i % 7], done: true, due: i % 3 ? day(-i) : '', createdAt: 100 + i, doneAt: now - i * 20 * H });
  localStorage.setItem('tsumikasane:todos', JSON.stringify(T));
});
