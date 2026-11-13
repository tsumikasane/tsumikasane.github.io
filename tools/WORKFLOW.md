# つみかさねの作業の決まり（どのチャットでも）

つみかさねの修正は、ページごとに分かれたチャットで、同時に進めます。どのチャットも、このファイルと [`tests/README.md`](tests/README.md) のとおりに作業します。

## 8つのチャット

| チャット | 受け持ちのページ |
| --- | --- |
| きょう・天気 | きょう（home）のタイル、天気（天気のページ、きょうの天気） |
| カレンダー | カレンダー（calendar）：月・週・日・年、予定、ラベル、通知アラーム、メモ、時間割 |
| ToDo | ToDo（todo）のページ全体 |
| 目標 | 目標（goal）：目標のブロック、マンダラチャート、目標の進み具合・ふりかえり |
| つみかさね・記録 | つみかさね（tsumi）：階段、つみねこ、記録の一覧・その日の記録・探す、書き出し・読み込み、最近削除した項目 |
| ダイエット（食事・運動・からだ） | ダイエット（diet）：食事、運動（筋トレ・ラン・運動のメニュー）、からだ（体重など） |
| 家計簿・バイト | 家計簿（money）、バイト（シフトと給料） |
| 日記・勉強・ルーティーン | 日記（journal）、勉強（study）、ルーティーン（routine） |

- 自分の受け持ちのページを変えます。ほかのページの中身を変えないと実現できないときは、最小限にして、報告でそのことを言います。
- 同期・保存・通知・起動などのみんなで使う部分（下の「アプリのつくり」）は、どのチャットも使いますが、変えるのは必要なときだけにして、変えたら必ずぜんぶのテストを流します。
- `push/`（通知サーバー）は、main に push すると Cloudflare に自動で出ます。変えるのは、通知サーバーそのものを直す必要があるときだけにします。

## PC のチャットといっしょに

使う人は、PC（Claude Code）でも、同じようにページごとのチャットを動かしています。PC のチャットは `page-〇〇` のブランチ（GitHub には上げない）で作業し、テスト版に出してから main に入れます。

- main には、PC のチャットからも、どんどん変更が入ります。始める前と出す前に、必ず最新を取り込みます（下の「出す手順」）。
- 同じページを、こちらと PC で同時に変えないようにします。そのページの最近の変更は `git log --format='%h %ad %s' --date=format:'%m-%d %H:%M' | grep <ページの名前>` で見られます。依頼が PC のチャットの作業とぶつかりそうなら（同じところを変える、同じ機能を足すなど）、使う人に確かめます。
- 回の番号は、PC とこちらで続けて数えます（例：main に「ToDo その11」まであれば、次は「ToDo その12」）。
- テスト版は1つだけで、PC のチャットも出します。PC からは「main ＋ 作業中の `page-〇〇` のブランチ」を出しています（テスト版のリポジトリのコミット「テスト版を更新（本物の … と page-〇〇@… から）」）。こちらからテスト版を出すと「main ＋ こちらの変更」になり、PC で作業中の変更はテスト版からいったん外れます（PC がまたテスト版を出すと戻ります）。なので：
  - テスト版を出すのは本番に出す直前にして、確かめたらすぐ本番に出します。
  - テスト版を出す前に、テスト版のリポジトリのいちばん新しいコミットを見ます。`page-〇〇@…` が入っていたら、報告で「PC の〇〇の作業中の変更は、テスト版からいったん外れました」と伝えます。

## 使う人との決まり

- 返事は日本語で、短くわかりやすく。
- main に直接 push します（プルリクエストは作らない）。
- **まずテスト版で試してから、本番に出します**（下の「出す手順」）。
- テスト版は https://tsumikasane-test.github.io/ だけです。前に使っていた `/test/` フォルダーは、二度と戻しません。
- 使う人のメールアドレスなどの個人の情報は、外のサービスにも、コミットやファイルにも書きません。
- コミットのメッセージは日本語で、何をしたかがわかるように書き、最後に、そのチャットのシステムが示す帰属の行（`Co-Authored-By:` と `Claude-Session:`）を付けます。それ以外に、モデルの名前は書きません。
- 「〇〇のページに足すべき機能を10個挙げて、①〜⑩を実装して」のように頼まれたら、これまでに足した機能（`git log` のコミットメッセージ。`git log --format='%h %s' | grep <ページの名前>` で一覧、`git show -s <ハッシュ>` で中身）と重ならないものを挙げて、①〜⑩をぜんぶ実装し、テスト版→本番まで出します。

## 作業の場所

- 本番のリポジトリ：`tsumikasane/tsumikasane.github.io`（このリポジトリ）。GitHub Pages が main をそのまま https://tsumikasane.github.io/ に出します（緑のアイコン）。
- テスト版のリポジトリ：`tsumikasane-test/tsumikasane-test.github.io`。https://tsumikasane-test.github.io/ に出ます（オレンジのアイコン）。中身はぜんぶ `tools/make-test.py` が作るので、手で直しません。
- チャットを始めたら、テスト版のリポジトリを、このリポジトリのとなりに `tsumikasane-test-web` という名前で置きます（`make-test.py` がそこに書きます）。`add_repo`（owner `tsumikasane-test`、repo `tsumikasane-test.github.io`、access `push`）で足してから、その結果が示すやり方で clone します。
  ```sh
  git clone https://github.com/tsumikasane-test/tsumikasane-test.github.io ../tsumikasane-test-web
  ```
- このコンテナーからは、github.io のページそのもの（本番とテスト版）は開けません。確かめるのは手元のサーバーと、GitHub の Actions です。

## 出す手順

1. 始める前に：`git pull --rebase origin main`
2. `index.html` を変え、自分のページのテストを足すか直します（`tools/tests/README.md`）。
3. 自分のチャットのテスト：`python3 tools/tests/run.py <チャット>`（例：`run.py ToDo`）。
4. 出す前に、ぜんぶのテスト：`python3 tools/tests/run.py` → `--- NEW なし` になること。
5. main にコミットします（まだ push しない）。
6. 最新を取り込みます：`git pull --rebase origin main`。
   - ぶつかったら、両方の変更を残すように直します。`APP_VERSION` の行（`const APP_VERSION = …`）は、どちらでもかまいません（次の手順で作り直されます）。
   - ほかのチャットの変更が入ったら、もう一度ぜんぶのテストを流します。
7. テスト版を作ります：
   ```sh
   git -C ../tsumikasane-test-web fetch origin && git -C ../tsumikasane-test-web reset --hard origin/main
   git -C ../tsumikasane-test-web log -1 --format=%s    # PC の作業中のブランチが入っているか（上の「PC のチャットといっしょに」）
   TZ=Asia/Tokyo python3 tools/make-test.py
   ```
   `make-test.py` は「アプリの版」（`APP_VERSION` の行）を今の時刻にするので、`index.html` が変わったら、それを手順5のコミットに入れます（`git add index.html && git commit --amend --no-edit`。まだ push していないコミットなので直してかまいません）。
8. テスト版を手元で開いて確かめます：`python3 -m http.server 8767 --directory ../tsumikasane-test-web` を立てて、`http://localhost:8767/` をスマホの大きさ（393×852）で開き、タイトルに「テスト版」があること、変えたところが動くこと、エラーが出ないことを見ます。
9. テスト版を出します：
   ```sh
   git -C ../tsumikasane-test-web add -A
   git -C ../tsumikasane-test-web commit -F <メッセージのファイル>
   git -C ../tsumikasane-test-web push origin main
   ```
   メッセージは「テスト版を更新（本物の <手順7のあとの main のコミットの短いハッシュ> から）：<何を変えたか>」と、帰属の行です。push を断られたら（ほかのチャットが先にテスト版を出した）、手順6にもどります。GitHub の Actions（`tsumikasane-test/tsumikasane-test.github.io` の pages build and deployment）が、そのコミットのもので成功したことを確かめます。
10. 本番に出します：`git push origin main`。
    - 断られたら（ほかのチャットが先に push した）、手順6にもどります（取り込み → テスト → テスト版を作り直して出す → push）。
    - GitHub の Actions（`tsumikasane/tsumikasane.github.io` の pages build and deployment）が、push したコミットのもので成功したことを確かめます。
    - 前に一度、GitHub Pages が一つ前の中身を公開したことがあります。使う人から「本番が変わっていない」と言われたら、その pages build and deployment をもう一度動かして、公開をやり直します。
11. 使う人に、日本語で短く報告します：何を変えたか（①〜⑩のときは、それぞれ1〜2行）、テスト版と本番に出たこと、気をつけてほしいこと。変えた画面の画像があると伝わりやすいです。

テスト版は本番の記録を受け取るだけで、テスト版から本番の記録には何も書きません（`make-test.py` がそう作ります）。

## アプリのつくり

- アプリは `index.html` 1つ（3万行あまり）です。HTML・CSS・JavaScript がすべて入っています。ほかに `sw.js`（オフライン用）、`manifest.webmanifest`、`icons/` があります。
- JavaScript は、`// ---------- 名前 ----------` の見出しでセクションに分かれています。一覧は `grep -n "^  // ---------- " index.html` で、ページごとには `… | grep ToDo` のように探せます。足した回は「ToDo その11 ①〜⑩」「天気 その1 ①〜⑩」のような見出しです。機能を足すときは、新しいセクションを、同じページのセクションのあとか、`// ---------- boot ----------` の前に足し、前のセクションの関数に手を入れるところは最小限にします。
- ページ：上のタブ（`TABS`）が きょう（home）・カレンダー（calendar）・ToDo（todo）・目標（goal）・つみかさね（tsumi）、記録のページ（`RECORDS`）が 日記（journal）・ダイエット（diet：食事・運動・からだ）・勉強（study）・ルーティーン（routine）・家計簿（money）です。
- 記録はこの端末の localStorage（大きいものは IndexedDB）に保存し、ログインしていると Firebase（Firestore）で端末どうしを同期します（「storage」「同期」のセクション）。新しい種類の記録や設定を足すときは、今あるものと同じしくみ（`Store`・`settings` など）を使い、同期・書き出し・最近削除した項目にも乗るようにします。
- 予定などのお知らせ（通知アラーム）は、アプリが時刻を通知サーバー（`push/`、Cloudflare Workers）に送り、サーバーが Web Push で届けます（「通知アラーム」「通知を受け取る」のセクションの `alarmTimes`）。
- 画面は、スマホ（iPhone のホーム画面のアプリ）がいちばん大事です。PC の広い画面でも崩れないようにします。ダークモードもあります。
