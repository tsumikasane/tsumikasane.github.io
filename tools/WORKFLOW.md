# つみかさねの作業の決まり（どのチャットでも）

つみかさねの修正は、ページごとに分かれた8つのチャットで、同時に進めます。どのチャットも、このファイルと [`tests/README.md`](tests/README.md) のとおりに作業します。

## 8つのチャット

| チャット | 受け持ち（index.html の主なセクション） |
| --- | --- |
| きょう・天気 | ホーム、天気（きょう） |
| カレンダー | カレンダー、月・週・日、ラベル、通知アラーム、通知を受け取る、メモ、カレンダー①〜⑩・その2 |
| ToDo | ToDo、ToDo's lists、ToDo①〜⑩と集中タイマー、ToDo その2〜その8、きょうやる |
| 目標 | 目標、マンダラチャート、目標①〜⑩・その2〜その4、×で埋める |
| つみかさね・記録 | つみかさね、記録、つみかさね①〜⑩ と続き、記録①〜⑩、書き出し・読み込み |
| ダイエット（食事・運動・からだ） | 食事、運動、筋トレ、ランレベル、運動のメニュー、体重、からだ①〜⑩・その2 |
| 家計簿・バイト | 家計簿、バイト（家計簿） |
| 日記・勉強・ルーティーン | 日記、勉強、ルーティーン |

- 自分の受け持ちのページを変えます。ほかのページの中身を変えないと実現できないときは、最小限にして、報告でそのことを言います。
- 同期・保存・通知・起動などのみんなで使う部分（下の「アプリのつくり」）は、どのチャットも使いますが、変えるのは必要なときだけにして、変えたら必ずぜんぶのテストを流します。
- `push/`（通知サーバー）は、main に push すると Cloudflare に自動で出ます。変えるのは、通知サーバーそのものを直す必要があるときだけにします。

## 使う人との決まり

- 返事は日本語で、短くわかりやすく。
- main に直接 push します（プルリクエストは作らない）。
- **まずテスト版で試してから、本番に出します**（下の「出す手順」）。
- テスト版は https://tsumikasane-test.github.io/ だけです。前に使っていた `/test/` フォルダーは、二度と戻しません。
- 使う人のメールアドレスなどの個人の情報は、外のサービスにも、コミットやファイルにも書きません。
- コミットのメッセージは日本語で、何をしたかがわかるように書き、最後に、そのチャットのシステムが示す帰属の行（`Co-Authored-By:` と `Claude-Session:`）を付けます。それ以外に、モデルの名前は書きません。
- 「〇〇のページに足すべき機能を10個挙げて、①〜⑩を実装して」のように頼まれたら、これまでに足した機能（`git log` のコミットメッセージ。例：`git log --format='%h %s' | grep ToDo` で一覧、`git show -s <ハッシュ>` で中身）と重ならないものを挙げて、①〜⑩をぜんぶ実装し、テスト版→本番まで出します。

## 作業の場所

- 本番のリポジトリ：`tsumikasane/tsumikasane.github.io`（このリポジトリ）。GitHub Pages が main をそのまま https://tsumikasane.github.io/ に出します（緑のアイコン）。
- テスト版のリポジトリ：`tsumikasane-test/tsumikasane-test.github.io`。https://tsumikasane-test.github.io/ に出ます（オレンジのアイコン）。中身はぜんぶ `tools/make-test.py` が作るので、手で直しません。
- チャットを始めたら、テスト版のリポジトリを、このリポジトリのとなりに `tsumikasane-test-web` という名前で置きます（`make-test.py` がそこに書きます）。`add_repo`（owner `tsumikasane-test`、repo `tsumikasane-test.github.io`、access `push`）で足してから、その結果が示すやり方で clone します。
  ```sh
  git clone https://github.com/tsumikasane-test/tsumikasane-test.github.io ../tsumikasane-test-web
  ```

## 出す手順

ほかのチャットも同じ main に push するので、始める前と出す前に、必ず最新を取り込みます。

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
   TZ=Asia/Tokyo python3 tools/make-test.py
   ```
   `make-test.py` は「アプリの版」（`APP_VERSION` の行）を今の時刻にするので、`index.html` が変わったら、それを手順5のコミットに入れます（`git add index.html && git commit --amend --no-edit`。まだ push していないコミットなので直してかまいません）。
8. テスト版を手元で開いて確かめます：`python3 -m http.server 8767 --directory ../tsumikasane-test-web` を立てて、`http://localhost:8767/` をスマホの大きさ（393×852）で開き、タイトルに「テスト版」があること、変えたところが動くこと、エラーが出ないことを見ます。
9. テスト版を出します：テスト版のリポジトリでコミットして push します。
   ```sh
   git -C ../tsumikasane-test-web add -A
   git -C ../tsumikasane-test-web commit -F <メッセージのファイル>
   git -C ../tsumikasane-test-web push origin main
   ```
   メッセージは「テスト版を更新（本物の <手順7のあとの main のコミットの短いハッシュ> から）：<何を変えたか>」と、帰属の行です。push を断られたら（ほかのチャットが先にテスト版を出した）、手順6にもどります。GitHub の Actions（`tsumikasane-test/tsumikasane-test.github.io` の pages build and deployment）が成功したことを確かめます。
10. 本番に出します：`git push origin main`。
    - 断られたら（ほかのチャットが先に push した）、手順6にもどります（取り込み → テスト → テスト版を作り直して出す → push）。
    - GitHub の Actions（`tsumikasane/tsumikasane.github.io` の pages build and deployment）が、push したコミットのもので、成功したことを確かめます（このコンテナーからは github.io のページそのものは開けません）。
    - 前に一度、GitHub Pages が一つ前の中身を公開したことがあります。使う人から「本番が変わっていない」と言われたら、その pages build and deployment をもう一度動かして、公開をやり直します。
11. 使う人に、日本語で短く報告します：何を変えたか（①〜⑩のときは、それぞれ1〜2行）、テスト版と本番に出たこと、気をつけてほしいこと。変えた画面の画像があると伝わりやすいです。

テスト版は本番の記録を受け取るだけで、テスト版から本番の記録には何も書きません（`make-test.py` がそう作ります）。

## アプリのつくり

- アプリは `index.html` 1つ（約2万8千行）です。HTML・CSS・JavaScript がすべて入っています。ほかに `sw.js`（オフライン用）、`manifest.webmanifest`、`icons/` があります。
- JavaScript は、`// ---------- 名前 ----------` の見出しでセクションに分かれています。一覧は `grep -n "^  // ---------- " index.html` で見られます。機能を足すときは、ふつう新しいセクションを `// ---------- boot ----------` の前に足し、前のセクションの関数に手を入れるところは最小限にします。
- ページ：上のタブ（`TABS`）が きょう（home）・カレンダー（calendar）・ToDo（todo）・目標（goal）・つみかさね（tsumi）、記録のページ（`RECORDS`）が 日記（journal）・ダイエット（diet：食事・運動・からだ）・勉強（study）・ルーティーン（routine）・家計簿（money）です。
- 記録はこの端末の localStorage（大きいものは IndexedDB）に保存し、ログインしていると Firebase（Firestore）で端末どうしを同期します（「storage」「同期」のセクション）。新しい種類の記録や設定を足すときは、今あるものと同じしくみ（`Store`・`settings` など）を使い、同期・書き出し・最近削除した項目にも乗るようにします。
- 予定などのお知らせ（通知アラーム）は、アプリが時刻を通知サーバー（`push/`、Cloudflare Workers）に送り、サーバーが Web Push で届けます（「通知アラーム」「通知を受け取る」のセクションの `alarmTimes`）。
- 画面は、スマホ（iPhone のホーム画面のアプリ）がいちばん大事です。PC の広い画面でも崩れないようにします。ダークモードもあります。
