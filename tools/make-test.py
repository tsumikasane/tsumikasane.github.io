#!/usr/bin/env python3
"""テスト版を作る (the user's call: a change is tried in a test version before it goes out to the app itself).

本番 is this site, https://tsumikasane.github.io/ (the green icon). The test version is a site of its own,
https://tsumikasane-test.github.io/ (the orange icon), from the repo tsumikasane-test/tsumikasane-test.github.io
(org tsumikasane-test). This script makes its files from this repo's working tree, whatever branch is checked out:

- its own address, so its records, its worker and its copies for offline use are its own
- sync one way only, 本番 → テスト (the user's call, 2026-11-08): signed in with the same account it gets the real
  records, but nothing is ever sent from it (its push does nothing and no write to Firestore is left in it), so whatever
  is tried in it never reaches the real records; 新しく登録する isn't offered there
- its 通知アラーム (when the app has them) go to its own device only: the real devices' ids that come down with the real
  records are left alone, so its plans never ring on them
- its name says so: テスト版 on its title and on the home screen, an orange mark at the top of every page, an orange icon
  (tools/test-icons)

It also keeps アプリの版 the same on both for the same app: when this repo's index.html has changed since its
APP_VERSION line was set (the line holds the hash of the content it was set for), the line is set to now, here in this
repo's index.html too, so commit that with the change.

(The earlier test version at /test/ under this site is no longer used: the user's call on 2026-11-08, 本番 = this site,
テスト = tsumikasane-test.github.io. Don't bring it back.)

To put a change on it:
1. have the test repo next to this one as tsumikasane-test-web (git clone
   https://github.com/tsumikasane-test/tsumikasane-test.github.io tsumikasane-test-web), or pass its path
2. python3 tools/make-test.py [test repo dir]
3. commit here (the version line may have changed) and there, naming this repo's commit, and push the test repo's main;
   GitHub Pages has it out in about a minute
Pushing needs access to that repo (another org); without it, ask the user instead of using /test/ again.

Each change is looked for once and only once, so a version that could write to the real records is never made: the
script stops instead.
"""
import datetime
import hashlib
import json
import pathlib
import re
import shutil
import sys

TOP = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else TOP.parent / "tsumikasane-test-web"
ICONS = TOP / "tools" / "test-icons"
STAMP = re.compile(r'^  const APP_VERSION = "[^"\n]*"; // [0-9a-f]{8} \(tools/make-test\.py: the content it was set for\)$', re.M)


def swap(text, old, new, what, regex=False):
    found = len(re.findall(old, text)) if regex else text.count(old)
    if found != 1:
        sys.exit(f"make-test: {what} was found {found} times, not once; the test version wasn't made")
    return re.sub(old, lambda m: new, text, count=1) if regex else text.replace(old, new, 1)


def read(p):
    return p.read_text(encoding="utf-8").replace("\r\n", "\n")


if not (OUT / ".git").is_dir():
    sys.exit(f"make-test: {OUT} isn't the test repo's checkout (git clone https://github.com/tsumikasane-test/tsumikasane-test.github.io {OUT})")
(OUT / "icons").mkdir(exist_ok=True)

# ---- アプリの版: set to now when the content changed since it was set (kept in this repo's index.html too)
raw = (TOP / "index.html").read_bytes().decode("utf-8")
nl = "\r\n" if "\r\n" in raw else "\n"
page = raw.replace("\r\n", "\n")
if len(STAMP.findall(page)) != 1:
    sys.exit("make-test: the APP_VERSION line was found not once; the test version wasn't made")
held = re.search(r"// ([0-9a-f]{8}) \(", STAMP.search(page).group(0)).group(1)
now = hashlib.sha256(STAMP.sub("  const APP_VERSION", page).encode("utf-8")).hexdigest()[:8]
if now != held:
    d = datetime.datetime.now()
    line = f'  const APP_VERSION = "{d.year}年{d.month}月{d.day}日 {d.hour}:{d.minute:02d}"; // {now} (tools/make-test.py: the content it was set for)'
    page = STAMP.sub(lambda m: line, page)
    (TOP / "index.html").write_bytes(page.replace("\n", nl).encode("utf-8"))
    print(f"make-test: アプリの版 set to {line.split(chr(34))[1]} (the content changed)")
else:
    print("make-test: アプリの版 unchanged (the same content)")

# ---- the page: sync one way, and テスト版 wherever its name shows
page = swap(page, '''      async push(docs) {
        for (let k = 0; k < docs.length; k += 400) {
          const batch = F.writeBatch(db);
          for (const d of docs.slice(k, k + 400)) batch.set(F.doc(records(), `${d.s}~${d.i}`), { ...d, st: F.serverTimestamp() });
          await batch.commit();
        }
      },''', '''      async push(docs) {}, // テスト版: 本番 → テスト only, so nothing written here ever goes up to the real records''', "sync's push")
# 通知アラーム: its alarms go to its own device only; the real devices' ids come down with the real records, and the
# test version's plans (tried changes and all) must never reach them
if "async function pushSend()" in page:
    page = swap(page, '''      const others = syncUser && syncState.uid ? settings.items.filter((x) => typeof x.id === "string" && x.id.startsWith("push:") && x.id !== "push:" + mine).map((x) => x.id.slice(5)) : [];''',
                '''      const others = []; // テスト版: its alarms go to its own device only, never to the real devices whose ids came down with the real records''', "the alarms' other devices")
for write in ("writeBatch", "setDoc", "updateDoc", "deleteDoc", "addDoc", ".commit(", "batch.set", "batch.delete"):
    if write in page:
        sys.exit(f"make-test: the page still writes to Firestore ({write}); the test version wasn't made")
page = swap(page, r'<p class="sync-lead">[^<]*</p>', '<p class="sync-lead">テスト版です。本番と同じメールアドレスとパスワードで「ログイン」すると、本番の記録がここにも届きます。ここで書いたり消したりしたものは、本番には送りません。</p>', "sync's lead", regex=True)
page = swap(page, '''    "auth/operation-not-allowed": ''', '''    "auth/unauthorized-domain": "テスト版のアドレスが、Firebase の「承認済みドメイン」にまだ入っていません。",
    "auth/operation-not-allowed": ''', "sync's error words")
page = swap(page, "<title>つみかさね</title>", "<title>つみかさね テスト版</title>", "the title")
page = swap(page, '<meta name="apple-mobile-web-app-title" content="つみかさね">', '<meta name="apple-mobile-web-app-title" content="テスト版">', "the home-screen name")
page = swap(page, "</head>", '''<style>/* テスト版: an orange mark at the top of every page, so it is never taken for the real one */
body::after { content: "テスト版"; position: fixed; z-index: 2147483647; top: env(safe-area-inset-top, 0px); left: 50%; transform: translateX(-50%); padding: 1px 10px 2px; border-radius: 0 0 8px 8px; background: #ff9f0a; color: #000; font: 700 11px/1.4 -apple-system, system-ui, sans-serif; pointer-events: none; }
/* no new accounts made from it: it only gets the real records */
#syncSignUp { display: none !important; }
</style>
</head>''', "the head's end")
(OUT / "index.html").write_text(page, encoding="utf-8", newline="\n")

# ---- its name in the install sheet and on the home screen
man = json.loads(read(TOP / "manifest.webmanifest"))
man["name"], man["short_name"] = "つみかさね テスト版", "テスト版"
man["description"] = "（テスト版）" + man["description"]
(OUT / "manifest.webmanifest").write_text(json.dumps(man, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

# ---- the rest as it is, and the orange icon
shutil.copyfile(TOP / "sw.js", OUT / "sw.js")
(OUT / ".nojekyll").touch()
for name in ("apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "icon.svg"):
    shutil.copyfile(ICONS / name, OUT / "icons" / name)
(OUT / "README.md").write_text("""# つみかさね テスト版

[つみかさね](https://tsumikasane.github.io/) を直したものを、本物に出す前に試すための版です。

- 同期は本番からの一方通行です。本番と同じアカウントでログインすると本番の記録が届きますが、ここで書いたり消したりしたものは本番に送りません。
- ここのファイルは、本物のリポジトリの tools/make-test.py で作っています。
""", encoding="utf-8", newline="\n")
print(f"make-test: the test version is in {OUT}")
