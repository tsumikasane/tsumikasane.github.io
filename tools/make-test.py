#!/usr/bin/env python3
"""テスト版を作る (the user's call: a change is tried in a test version before it goes out to the app itself).

本番 is this site, https://tsumikasane.github.io/ (the green icon). The test version is a site of its own,
https://tsumikasane-test.github.io/ (the orange icon), from the repo tsumikasane-test/tsumikasane-test.github.io
(org tsumikasane-test). This script makes its files from this repo's working tree, whatever branch is checked out:

- its own address, so its records, its worker and its copies for offline use are its own and never meet the app's;
  it starts empty (書き出す in the app, 読み込む in the test version, to try things on one's own records)
- it doesn't sync (no Firebase), so nothing goes from it to the other devices
- its name says so: テスト版 on its title and on the home screen, an orange mark at the top of every page, an orange icon
  (tools/test-icons)

(The earlier test version at /test/ under this site is no longer used: the user's call on 2026-11-08, 本番 = this site,
テスト = tsumikasane-test.github.io. Don't bring it back.)

To put a change on it:
1. have the test repo next to this one as tsumikasane-test-web (git clone
   https://github.com/tsumikasane-test/tsumikasane-test.github.io tsumikasane-test-web), or pass its path
2. python3 tools/make-test.py [test repo dir]
3. commit there, naming this repo's commit, and push its main; GitHub Pages has it out in about a minute
Pushing needs access to that repo (another org); without it, ask the user instead of using /test/ again.

Each change is looked for once and only once, so a version that would sync with the app's records is never made:
the script stops instead.
"""
import json
import pathlib
import re
import shutil
import sys

TOP = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else TOP.parent / "tsumikasane-test-web"
ICONS = TOP / "tools" / "test-icons"


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

# ---- the page: no sync, and テスト版 wherever its name shows
page = read(TOP / "index.html")
page = swap(page, r"const FIREBASE_CONFIG = \{[^}]*\};", "const FIREBASE_CONFIG = null; // テスト版: no sync, so it never touches the real records", "Firebase's settings", regex=True)
if "AIzaSy" in page:
    sys.exit("make-test: a Firebase key is still in the page; the test version wasn't made")
page = swap(page, "<title>つみかさね</title>", "<title>つみかさね テスト版</title>", "the title")
page = swap(page, '<meta name="apple-mobile-web-app-title" content="つみかさね">', '<meta name="apple-mobile-web-app-title" content="テスト版">', "the home-screen name")
page = swap(page, "</head>", '''<style>/* テスト版: an orange mark at the top of every page, so it is never taken for the real one */
body::after { content: "テスト版"; position: fixed; z-index: 2147483647; top: env(safe-area-inset-top, 0px); left: 50%; transform: translateX(-50%); padding: 1px 10px 2px; border-radius: 0 0 8px 8px; background: #ff9f0a; color: #000; font: 700 11px/1.4 -apple-system, system-ui, sans-serif; pointer-events: none; }
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

- 同期はオフです。本物の記録や同期先にはふれません。
- 記録はこのアドレスだけのものです。本物で「記録を書き出す」したファイルを「記録を読み込む」と、記録のコピーで試せます。
- ここのファイルは、本物のリポジトリの tools/make-test.py で作っています。
""", encoding="utf-8", newline="\n")
print(f"make-test: the test version is in {OUT}")
