#!/usr/bin/env python3
"""つみかさねの回帰テスト (README.md): the app as the working tree has it, the hook builds made from it, and the suites
run on them; each failure told apart, KNOWN (in its suite's known.txt) or NEW. The comparison tests (cmp/) run on the
page before (BASE: by default where this branch left origin/main) and on the page now, and say what fails now that didn't
before. Exits 1 with any NEW.

  python3 tools/tests/run.py              everything: the comparison tests and every suite (about 25 minutes)
  python3 tools/tests/run.py ToDo         a chat's suites and comparison tests (and those for every page)
  python3 tools/tests/run.py --changed   before a release (the user's call, 2026-11-22: the tests of the parts changed
                                          and of the features they touch, no more): the suites of the parts it changes
                                          (a section 「ToDo その15」 → the suite about 「ToDo その15」), those of the
                                          features it touches (a part that uses a name it touches, a suite that mentions
                                          one: SMALL, FEW, MANY below), any suite that mentions what it takes away (an
                                          id, a name, words on the page), the suites and comparison tests it changes
                                          itself, and the comparison tests of the chats of those parts and of every
                                          page; a chat named with it adds its comparison tests (as run.py ToDo --changed)
  python3 tools/tests/run.py r37 r38      those suites alone
  python3 tools/tests/run.py cmp          the comparison tests alone
  python3 tools/tests/run.py ToDo --changed --dry   what that would run, and no more
  python3 tools/tests/run.py --list       the suites by chat, with their tests
  python3 tools/tests/run.py -j 3 ...     three at a time (a suite's tests still one after another); the results in
                                          the same order. A failure seen only so: run that suite alone to be sure

A suite is a folder under suites/ with its suite.txt (port, chat, tests) and, if some of its failures are known, its
known.txt. Its servers: the working tree at 8765, the page before at 8766, each suite's hook build at its port. They stay
up after it (TEST_WORK, /tmp/tsumikasane-tests by default, keeps what it made: logs/, out/, summary.txt)."""
import bisect
import concurrent.futures
import os
import pathlib
import re
import shutil
import subprocess
import sys
import time
import urllib.request

sys.dont_write_bytecode = True  # (no __pycache__ left in the repo by the import of hook.py)

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
WORK = pathlib.Path(os.environ.get("TEST_WORK", "/tmp/tsumikasane-tests"))
TIMEOUT = 420  # seconds a test may take
CHATS = ["きょう・天気", "カレンダー", "ToDo", "目標", "つみかさね・記録", "ダイエット", "家計簿・バイト", "日記・勉強・ルーティーン"]
EVERY = "ぜんぶ"  # a comparison test for every page: run with any chat's
# --changed: a part of the page (a section of index.html) with no suite of its own, as 「ToDo」 itself, is its chat's by
# these words in its name; with none of them, it is the chat's run for
CHAT_WORDS = {"きょう・天気": ("きょう", "天気", "タイル"), "カレンダー": ("カレンダー", "月・週・日", "予定", "時間割", "祝日"),
              "ToDo": ("ToDo",), "目標": ("目標", "マンダラ"), "つみかさね・記録": ("つみかさね", "記録", "つみねこ"),
              "ダイエット": ("ダイエット", "食事", "運動", "からだ", "体重"), "家計簿・バイト": ("家計簿", "バイト", "お金"),
              "日記・勉強・ルーティーン": ("日記", "勉強", "ルーティーン")}


def part_key(text):
    """the part of the page a section's name or a suite's comment is about: up to its 「その N」 or 「①〜⑩」, spaces left
    out (「カレンダー その9 ①〜⑩ (the user's calls…」 and 「カレンダー その9 ①〜⑩（繰り返しの…」 are both 「カレンダーその9」);
    none for the rest"""
    m = re.match(r"\s*(.+?(?:その\s*\d+|①〜⑩))", text)
    return re.sub(r"\s+", "", m.group(1)) if m else None
RESERVED = {8765, 8766, 8767}  # the page now, the page before, the test version looked at by hand (WORKFLOW.md)
# --changed: the parts every page shares (WORKFLOW.md, アプリのつくり): files of their own, and index.html's sections by
# their headings (`  // ---------- … ----------`), and the helpers at the start of its script, before the first heading.
# A change to them is one to run everything for
SHARED_FILES = ("sw.js", "manifest.webmanifest", "tools/make-test.py", "push/")
SHARED_SECTIONS = ("(shared", "storage", "この端末の記録を消す", "消した記録", "保存できないとき", "同期", "tabs (a sidebar", "date navigation",
                   "通知アラーム", "通知を受け取る", "記録の書き出し・読み込み", "記録を守る仕組み", "端末の中のコピー",
                   "保存できる量", "読めなくなった記録の控え", "最近削除した項目", "書きかけ", "the page's place under a dialog", "boot")  # (この画面の版: make-test.py sets it each time)
# (comments, words left in them not on the page: <!-- -->, /* */ from a line's start (not accept="image/*"'s), // after a
# space or a bracket (not https://'s))
COMMENT = re.compile(r"<!--.*?-->|^[ \t]*/\*.*?\*/|(?<![:\w\"'\\/])//[^\n]*", re.S | re.M)
IDENT = re.compile(r"[A-Za-z_$][\w$-]{3,}")  # (an id, a class, a function's or a setting's name: with a capital, a digit or a -)
WORDS = re.compile(r"[ぁ-ゖァ-ヺー一-龯々〆]{3,}")  # (words on the page)
# --changed, the features a change touches (README.md). A statement of the script (a line at two spaces and those under
# it) no longer than SMALL lines that changed is one feature's, as a function or a table: every part of the page that
# uses what it declares is related. A name the change touches (an id, a class, a function's: made up, with a capital, a
# _ or a - after its first letter) that the page uses in FEW parts or fewer is one feature's too (in more: a helper, a
# word of CSS or the DOM). A suite that mentions one of them is related, unless more than MANY suites mention it (or it
# is what a changed statement declares)
SMALL, FEW, MANY = 40, 3, 12
TOKEN = re.compile(r"[A-Za-z_$][\w$-]*")
HELPERS = "はじめの共通の部品（el・flash など）"


def table(path):
    """a file's rows (split at the first run of spaces or tabs), its comments and blank lines left out"""
    return [line.split(None, 1) for line in path.read_text(encoding="utf-8").splitlines() if line.strip() and not line.startswith("#")]


def natural(name):
    return [int(p) if p.isdigit() else p for p in re.split(r"(\d+)", name)]


def suites():
    """every suite: name, port (None: the page itself, at 8765), chat, tests, about (its suite.txt's comment), known"""
    found, ports = [], {}
    for d in sorted((p for p in (HERE / "suites").iterdir() if p.is_dir()), key=lambda p: natural(p.name)):
        if not (d / "suite.txt").exists():
            sys.exit(f"run.py: suites/{d.name} has no suite.txt (README.md)")
        lines = (d / "suite.txt").read_text(encoding="utf-8").splitlines()
        info = dict(r if len(r) == 2 else (r[0], "") for r in table(d / "suite.txt"))
        s = {"name": d.name, "chat": info.get("chat", ""), "tests": info.get("tests", "").split(),
             "about": " ".join(l.lstrip("# ").strip() for l in lines if l.startswith("#")),
             "known": table(d / "known.txt") if (d / "known.txt").exists() else []}
        if s["chat"] not in CHATS:
            sys.exit(f"run.py: suites/{d.name}/suite.txt: chat {s['chat']!r} isn't one of {' / '.join(CHATS)}")
        if not s["tests"] or any(not (d / t).exists() for t in s["tests"]):
            sys.exit(f"run.py: suites/{d.name}/suite.txt: its tests {' '.join(s['tests'])!r} aren't all there")
        port = info.get("port", "-")
        if port == "-":
            s["port"] = None
        elif not port.isdigit() or int(port) in RESERVED or int(port) in ports:
            sys.exit(f"run.py: suites/{d.name}/suite.txt: port {port} is taken ({ports.get(int(port)) if port.isdigit() else 'not a number'})")
        else:
            s["port"] = int(port)
            ports[s["port"]] = d.name
            if not (d / "hook.js").exists():
                sys.exit(f"run.py: suites/{d.name} has a port but no hook.js")
        found.append(s)
    return found


def up(port):
    try:
        with urllib.request.urlopen(f"http://localhost:{port}/index.html", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def serve(port, folder):
    """our server for the folder at the port: one of ours there before is stopped; anything else there stops this"""
    pid_file = WORK / "srv" / f"{port}.pid"
    if pid_file.exists():
        try:
            os.kill(int(pid_file.read_text()), 15)
            time.sleep(0.3)
        except (ProcessLookupError, ValueError):
            pass
    if up(port):
        sys.exit(f"run.py: port {port} is in use by something else; stop it and run again")
    p = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--directory", str(folder)],
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    pid_file.write_text(str(p.pid))
    return port


def assets(folder):
    """what the page loads besides itself"""
    for f in ["sw.js", "manifest.webmanifest"]:
        if (ROOT / f).exists():
            shutil.copy2(ROOT / f, folder / f)
    if (ROOT / "icons").is_dir():
        shutil.copytree(ROOT / "icons", folder / "icons", dirs_exist_ok=True)


def base_rev():
    """the page before: BASE if given, else where this branch left origin/main (the page as it was out before the
    change, committed or not), else HEAD"""
    if os.environ.get("BASE"):
        return os.environ["BASE"]
    r = subprocess.run(["git", "-C", str(ROOT), "merge-base", "HEAD", "origin/main"], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 and r.stdout.strip() else "HEAD"


def prepare(all_suites, base):
    for d in ["srv", "logs", "out", "hooks", "base"]:
        (WORK / d).mkdir(parents=True, exist_ok=True)
    before = subprocess.run(["git", "-C", str(ROOT), "show", f"{base}:index.html"], capture_output=True)
    if before.returncode:
        sys.exit(f"run.py: no index.html at {base}: {before.stderr.decode().strip()}")
    (WORK / "base" / "index.html").write_bytes(before.stdout)
    assets(WORK / "base")
    for d in ["suites", "cmp"]:  # (tests write next to themselves: a copy, made afresh)
        shutil.rmtree(WORK / d, ignore_errors=True)
        shutil.copytree(HERE / d, WORK / d)
    sys.path.insert(0, str(HERE))
    import hook
    ports = [serve(8765, ROOT), serve(8766, WORK / "base")]
    for s in all_suites:  # (every hook build, whichever suites run: one suite's tests may use another's)
        if s["port"]:
            out = WORK / "hooks" / s["name"]
            hook.main(ROOT / "index.html", WORK / "suites" / s["name"] / "hook.js", out)
            assets(out)
            ports.append(serve(s["port"], out))
    for _ in range(50):
        if all(up(p) for p in ports):
            return
        time.sleep(0.2)
    sys.exit("run.py: the servers didn't come up: " + ", ".join(str(p) for p in ports if not up(p)))


def git(*args):
    return subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True, encoding="utf-8", errors="replace").stdout


def made_up(x):
    """a name made up for the app (an id, a class, a function's), not a word: a capital, a _ or a - after its first letter
    (not an aria-…, nor a data-… of a letter or two, as data-s: no feature's)"""
    return len(x) >= 4 and bool(re.search(r"[A-Z_-]", x[1:])) and not x.endswith("-") and not re.match(r"aria-|data-.{1,2}$", x)


def css_names(line):
    """the names a line of the page's HTML or CSS gives: its selectors' ids and classes, its id, class and for"""
    out = set(re.findall(r"[.#]([A-Za-z_][\w-]*)", line.split("{")[0])) if "{" in line else set()
    for v in re.findall(r"\b(?:id|class|for)=\"([^\"]+)\"", line):
        out |= set(v.split())
    return out


def declares(line):
    """what a statement's first line declares: a function's name, a const's, a let's or a var's (and those in its { … })"""
    m = re.match(r"\s*(?:async\s+)?function\*?\s+([\w$]+)|\s*(?:const|let|var)\s+([\w$]+)", line)
    out = {x for x in (m.groups() if m else ()) if x}
    m = re.match(r"\s*(?:const|let|var)\s+\{([^}]*)\}", line)
    if m:
        out |= {x.split(":")[-1].strip() for x in m.group(1).split(",") if x.strip()}
    return out


def short_name(heading):
    """a section's name, without its notes: 「カレンダー その9 ①〜⑩ (the user's calls…) ----------」 → 「カレンダー その9 ①〜⑩」"""
    return re.sub(r"\s*(\(.*|-+)$", "", heading.replace("// ----------", "", 1)).strip()


def changes(base, all_suites, cmp_rows):
    """--changed: what this change (the page before, base, against the working tree) touches and takes away.
    why: the suites and comparison tests that mention what it takes away (ids, class and function names, words on the
    page that were there and are nowhere now; comments left out), with what they mention. parts: the sections of
    index.html it changes. related: the suites of the features it touches (SMALL, FEW, MANY), with the names that tie
    them. shared: what of the parts every page shares it touches. tests, cmps: the suites and comparison tests it changes"""
    old, new = git("show", f"{base}:index.html"), (ROOT / "index.html").read_text(encoding="utf-8")
    o, n = COMMENT.sub(" ", old), COMMENT.sub(" ", new)
    gone_names = {x for x in set(IDENT.findall(o)) - set(IDENT.findall(n)) if re.search(r"[A-Z0-9-]", x)}  # (not a word as "opened")
    gone_words = set(WORDS.findall(o)) - set(WORDS.findall(n))

    def mentions(text):
        found = sorted(set(IDENT.findall(text)) & gone_names)
        found += sorted(w for w in set(WORDS.findall(text)) if any(w in g for g in gone_words) and w not in n)
        return found
    texts = {s["name"]: "\n".join(f.read_text(encoding="utf-8") for f in sorted((HERE / "suites" / s["name"]).glob("*.js"))) for s in all_suites}
    why = {}
    for s in all_suites:
        hit = mentions(texts[s["name"]])
        if hit:
            why[s["name"]] = hit
    for rel, _ in cmp_rows:
        hit = mentions((HERE / "cmp" / rel).read_text(encoding="utf-8"))
        if hit:
            why[rel] = hit
    # the files it changes: the parts every page shares; the tests themselves
    files = set(git("diff", "--name-only", base).split()) | {l[3:] for l in git("status", "--porcelain").splitlines() if l.startswith("??")}
    shared = sorted(f for f in files if f.startswith(SHARED_FILES))
    tests = {f.split("/")[3] for f in files if f.startswith("tools/tests/suites/") and f.count("/") >= 4}
    cmps = {f[len("tools/tests/cmp/"):] for f in files if f.startswith("tools/tests/cmp/") and f.endswith(".js")}
    # index.html's lines changed, by the sections they are in; the names they touch, the statements they change
    lines = new.split("\n")
    code = COMMENT.sub(lambda m: " " + "\n" * m.group(0).count("\n"), new).split("\n")  # (comments out, the lines where they were)
    script = next((i + 1 for i, l in enumerate(lines) if l.startswith("<script>")), 0)
    heads = [(i + 1, l.strip()) for i, l in enumerate(lines) if l.startswith("  // ---------- ")]
    at = [h for h, _ in heads]

    def section(i):
        if i < script:
            return "HTML・CSS"
        k = bisect.bisect_right(at, i) - 1
        return short_name(heads[k][1]) if k >= 0 else HELPERS
    tops = [i + 1 for i, l in enumerate(lines) if i + 1 > script and re.match(r"  [^ }\])/]", l)]  # (each statement's first line)
    users = {}  # (a name → the sections whose code has it)
    for i, l in enumerate(code):
        for x in (TOKEN.findall(l) if i + 1 > script else css_names(l)):
            users.setdefault(x, set()).add(section(i + 1))
    touched, parts, names, small = set(), set(), set(), set()
    diff = git("diff", "-U0", base, "--", "index.html")
    for m in re.finditer(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@[^\n]*\n((?:[-+][^\n]*\n?)*)", diff, re.M):
        start, count = int(m.group(1)), int(m.group(2) or 1)
        end = start + max(count, 1) - 1
        gone = [COMMENT.sub(" ", l[1:]).strip() for l in m.group(3).splitlines() if l.startswith("-")]
        came = [COMMENT.sub(" ", l[1:]).strip() for l in m.group(3).splitlines() if l.startswith("+")]
        # (no more than a comment changed, or lines taken out that called what went, as 「out.push(...cal7StarAlarms(now))」:
        # the lines the same but for their comments set aside, none put in, and each taken out naming something gone)
        left = [x for x in came if x]
        for x in [x for x in gone if x]:
            if x in left:
                left.remove(x)
            elif not set(IDENT.findall(x)) & gone_names:
                left.append(x)
                break
        light = not left
        if any("この画面の版" in section(i) for i in range(start, end + 1)):  # (APP_VERSION: make-test.py sets it each time)
            continue
        if script and at and end >= script and start < at[0] and not light:
            touched.add(HELPERS)
        if start < script and any(came):  # (the page's HTML and CSS, more than taken out: not a part with a suite)
            parts.add("HTML・CSS")
        for h, name in heads[max(0, bisect.bisect_right(at, start) - 1):bisect.bisect_right(at, end)]:
            if any(k in name for k in SHARED_SECTIONS):
                if not light:
                    touched.add(short_name(name))
            elif start >= script:
                parts.add(short_name(name))
        if light:
            continue
        for x in gone + came:
            names |= {y for y in (TOKEN.findall(x) if start > script else css_names(x)) if made_up(y)}
        if start > script and m.group(2) != "0":  # (the statements the lines put in or changed are in; none for lines only taken out)
            for k in range(max(0, bisect.bisect_right(tops, start) - 1), bisect.bisect_right(tops, end)):
                first, last = tops[k], (tops[k + 1] - 1 if k + 1 < len(tops) else len(lines))
                if last - first + 1 <= SMALL:
                    small |= declares(lines[first - 1])
    feature = small | {x for x in names if 0 < len(users.get(x, ())) <= FEW}
    keys = {part_key(s["about"]): s["name"] for s in all_suites if part_key(s["about"])}
    related = {}
    for x in feature:  # (the parts that use them: their suites)
        for sec in users.get(x, ()):
            k = keys.get(part_key(sec))
            if k:
                related.setdefault(k, set()).add(x)
    seen = {}
    for s in all_suites:
        seen[s["name"]] = set(TOKEN.findall(texts[s["name"]])) & feature
    many = {x for x in feature if sum(x in v for v in seen.values()) > MANY and x not in small}
    for k, xs in seen.items():  # (the suites that mention them)
        if xs - many:
            related.setdefault(k, set()).update(xs - many)
    return {"why": why, "shared": shared + sorted(touched), "parts": sorted(parts), "related": {k: sorted(v) for k, v in related.items()},
            "tests": tests, "cmps": cmps}


def run_node(cwd, file, log):
    env = dict(os.environ)
    if "NODE_PATH" not in env:
        env["NODE_PATH"] = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
    with open(log, "w", encoding="utf-8") as f:
        try:
            subprocess.run(["node", file, str(WORK / "out")], cwd=cwd, stdout=f, stderr=subprocess.STDOUT, env=env, timeout=TIMEOUT)
        except subprocess.TimeoutExpired:
            f.write(f"\nError: run.py stopped it after {TIMEOUT} seconds\n")
    return pathlib.Path(log).read_text(encoding="utf-8", errors="replace")


def failures(text):
    """its failing lines (a check's FAIL, an error); none and no ALL OK either, it said nothing of how it went"""
    lines = text.splitlines()
    bad = [l.strip() for l in lines if l.startswith("FAIL") or "Error" in l]
    if not bad and not any(l.strip() in ("ALL OK", "all OK") for l in lines):
        bad = ["(結果の行がありません：途中で止まった可能性があります)"]
    return bad


def main(args):
    jobs, rest, it = 1, [], iter(args)
    for a in it:  # (-j N, or -jN: that many at a time)
        if a == "-j" or (a.startswith("-j") and a[2:].isdigit()):
            n = next(it, "") if a == "-j" else a[2:]
            if not n.isdigit() or int(n) < 1:
                sys.exit("run.py: -j wants a number, as -j 3")
            jobs = int(n)
        else:
            rest.append(a)
    args = [a for a in rest if a not in ("--changed", "--dry")]
    changed, dry = "--changed" in rest, "--dry" in rest
    all_suites = suites()
    cmp_rows = table(HERE / "cmp" / "list.txt")
    for rel, chat in cmp_rows:
        if chat not in CHATS + [EVERY]:
            sys.exit(f"run.py: cmp/list.txt: {rel}: chat {chat!r} isn't one of {' / '.join(CHATS + [EVERY])}")
    if "--list" in args:
        for chat in CHATS:
            print(f"■ {chat}")
            for s in all_suites:
                if s["chat"] == chat:
                    print(f"  {s['name']:6} {str(s['port'] or '-'):5} {' '.join(s['tests']):32} {s['about']}")
            mine = [rel for rel, c in cmp_rows if c == chat]
            if mine:
                print(f"  {'cmp':6} {'':5} {' '.join(mine)}")
        print(f"■ {EVERY}（どのチャットのときも）\n  {'cmp':6} {'':5} {' '.join(rel for rel, c in cmp_rows if c == EVERY)}")
        return 0
    names = {s["name"] for s in all_suites}
    unknown = [a for a in args if a not in names and a not in CHATS and a != "cmp"]
    if unknown:
        sys.exit(f"run.py: no such suite or chat: {' '.join(unknown)} (see --list)")
    chats = [a for a in args if a in CHATS]
    base = base_rev()
    ch = changes(base, all_suites, cmp_rows) if changed else {"why": {}, "shared": [], "parts": [], "related": {}, "tests": set(), "cmps": set()}
    why = ch["why"]
    everything = not args and not changed
    whole = set() if changed else set(chats)  # (a chat named without --changed: all its suites)
    own, related, near = set(), {}, set(chats)  # (the suites of the parts changed, of the features they touch; the chats whose comparison tests run)
    if changed:
        # --changed (the user's call, 2026-11-22: the tests of the parts changed and of the features they touch): the
        # suites of the parts it changes, those of the features it touches, and those that mention what it takes away,
        # whichever chat's; a part with no suite of its own (as 「ToDo」 itself, or 「月・週・日」) is seen by those
        # and by its chat's comparison tests (the chat its name says), not by all its chat's suites any more
        keys = {part_key(s["about"]): s for s in all_suites if part_key(s["about"])}
        alone = []
        for name in ch["parts"]:
            k = part_key(name)
            at = {c: min((name.find(w) for w in words if w in name), default=-1) for c, words in CHAT_WORDS.items()}
            of = [c for _, c in sorted((i, c) for c, i in at.items() if i >= 0)[:1]]  # (the chat whose word comes first in the name)
            if k in keys:
                own.add(keys[k]["name"])
                near.add(keys[k]["chat"])
            else:
                alone.append(name)
                near |= set(of)
        related = {k: v for k, v in ch["related"].items() if k not in own}
        print("（変えたところ：" + ("、".join(ch["parts"]) if ch["parts"] else "なし") + "）", flush=True)
        if own:
            print("（その部分のスイート：" + "・".join(sorted(own, key=natural)) + "）", flush=True)
        if alone:
            print("（スイートのない部分：" + "、".join(alone) + "。関連する機能のスイートと、比べるテストで見ます）", flush=True)
        print(("（関連する機能のスイート：" + "、".join(f"{k}（{'・'.join(v[:3])}{'…' if len(v) > 3 else ''}）" for k, v in sorted(related.items(), key=lambda kv: natural(kv[0]))) + "）")
              if related else "（関連する機能のスイートはありません）", flush=True)
        if ch["tests"] or ch["cmps"]:
            print("（変えたテスト：" + "・".join(sorted(ch["tests"], key=natural) + [f"cmp/{c}" for c in sorted(ch["cmps"])]) + "）", flush=True)
    picked = [s for s in all_suites if everything or s["name"] in args or s["chat"] in whole or s["name"] in why
              or s["name"] in own or s["name"] in related or s["name"] in ch["tests"]]
    cmps = [(rel, c) for rel, c in cmp_rows if everything or "cmp" in args or (chats and not changed and c in chats + [EVERY])
            or (changed and c in near | {EVERY}) or rel in why or rel in ch["cmps"]]
    if changed:
        more = [f"{k}（{'・'.join(v[:3])}{'…' if len(v) > 3 else ''}）" for k, v in why.items()
                if k not in own and k not in related and k not in ch["tests"] and not any(r == k and c in near | {EVERY} for r, c in cmp_rows)]
        print("（この変更で消えたものが出てくる、ほかのスイートも流します：" + "、".join(more) + "）" if more else "（この変更で消えたものが出てくる、ほかのスイートはありません）", flush=True)
        if ch["shared"]:
            print("（共通の部分も変わっています：" + "、".join(ch["shared"]) + "。それを使う機能のスイートは「関連する機能」に入っています）", flush=True)
    if dry:  # (--dry: what would run, and no more)
        print("（流すもの：" + "、".join([f"cmp/{rel}" for rel, _ in cmps] + [s["name"] for s in picked]) + f"。{len(cmps) + sum(len(s['tests']) for s in picked)} 件）")
        return 0
    prepare(all_suites, base)
    report, new = [], 0

    def say(line):
        print(line, flush=True)
        report.append(line)

    if cmps:
        short = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", base], capture_output=True, text=True).stdout.strip()
        print(f"（比べる前の版：{short or base}）", flush=True)
    def one_cmp(rel):
        """a comparison test on the page before and on the page now: its line, and 1 if it's NEW"""
        folder, stem = (WORK / "cmp" / rel).parent, pathlib.Path(rel).stem
        src = (folder / f"{stem}.js").read_text(encoding="utf-8")
        (folder / f"{stem}.base.js").write_text(src.replace("localhost:8765", "localhost:8766"), encoding="utf-8")
        before = run_node(folder, f"{stem}.base.js", WORK / "logs" / f"cmp-{stem}.base.txt")
        now = run_node(folder, f"{stem}.js", WORK / "logs" / f"cmp-{stem}.new.txt")
        name = lambda l: l.split(":")[0].strip()
        was_bad = {name(l) for l in before.splitlines() if l.startswith("FAIL")}
        was_err = {l.strip() for l in before.splitlines() if "Error" in l}
        fresh = [l.strip() for l in now.splitlines() if (l.startswith("FAIL") and name(l) not in was_bad) or ("Error" in l and l.strip() not in was_err)]
        if fresh:
            return [f"NEW   cmp/{rel}  " + " / ".join(fresh[:4])], 1
        return [f"OK    cmp/{rel}" + (f"  (前から {len(was_bad)} 件の失敗)" if was_bad else "")], 0

    def one_suite(s):
        """a suite's tests, one after another: their lines, and how many are NEW"""
        lines, n = [], 0
        for t in s["tests"]:
            key = f"{s['name']}/{t}"
            bad = failures(run_node(WORK / "suites" / s["name"], t, WORK / "logs" / f"{s['name']}-{t}.txt"))
            fresh = [l for l in bad if not any(k == t and piece in l for k, piece in s["known"])]
            if fresh:
                n += 1
                lines.append(f"NEW   {key}  " + " / ".join(fresh[:4]))
            elif bad:
                lines.append(f"KNOWN {key}  " + " / ".join(bad[:4]))
            else:
                lines.append(f"OK    {key}")
        return lines, n

    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:  # (each test is a node process of its own)
        done = [pool.submit(one_cmp, rel) for rel, _ in cmps] + [pool.submit(one_suite, s) for s in picked]
        for f in done:  # (in their order, each as soon as it and the ones before it are through)
            lines, n = f.result()
            new += n
            for line in lines:
                say(line)
    say((f"--- NEW {new} 件（{len(report)} 件中）" if new else f"--- NEW なし（{len(report)} 件）") + f"  logs: {WORK / 'logs'}")
    (WORK / "summary.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
    return 1 if new else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
