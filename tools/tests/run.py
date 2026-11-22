#!/usr/bin/env python3
"""つみかさねの回帰テスト (README.md): the app as the working tree has it, the hook builds made from it, and the suites
run on them; each failure told apart, KNOWN (in its suite's known.txt) or NEW. The comparison tests (cmp/) run on the
page before (BASE: by default where this branch left origin/main) and on the page now, and say what fails now that didn't
before. Exits 1 with any NEW.

  python3 tools/tests/run.py              everything: the comparison tests and every suite (about 25 minutes)
  python3 tools/tests/run.py ToDo         a chat's suites and comparison tests (and those for every page)
  python3 tools/tests/run.py ToDo --changed   and, before a release, the other chats' suites that mention what this
                                          change takes away (an id, a name, words on the page); it says too when the
                                          change touches the parts every page shares, the time for everything
  python3 tools/tests/run.py r37 r38      those suites alone
  python3 tools/tests/run.py cmp          the comparison tests alone
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


def changes(base, all_suites, cmp_rows):
    """--changed: what this change (the page before, base, against the working tree) takes away: ids, class and function
    names, and words on the page that were there and are nowhere now (comments left out); the suites and comparison tests
    that mention them, with what they mention. And what of the parts every page shares it touches"""
    old, new = git("show", f"{base}:index.html"), (ROOT / "index.html").read_text(encoding="utf-8")
    o, n = COMMENT.sub(" ", old), COMMENT.sub(" ", new)
    gone_names = {x for x in set(IDENT.findall(o)) - set(IDENT.findall(n)) if re.search(r"[A-Z0-9-]", x)}  # (not a word as "opened")
    gone_words = set(WORDS.findall(o)) - set(WORDS.findall(n))

    def mentions(text):
        found = sorted(set(IDENT.findall(text)) & gone_names)
        found += sorted(w for w in set(WORDS.findall(text)) if any(w in g for g in gone_words) and w not in n)
        return found
    why = {}
    for s in all_suites:
        hit = sorted({m for f in sorted((HERE / "suites" / s["name"]).glob("*.js")) for m in mentions(f.read_text(encoding="utf-8"))})
        if hit:
            why[s["name"]] = hit
    for rel, _ in cmp_rows:
        hit = mentions((HERE / "cmp" / rel).read_text(encoding="utf-8"))
        if hit:
            why[rel] = hit
    # the parts every page shares: their files; index.html's lines changed, by the sections they are in
    files = set(git("diff", "--name-only", base).split()) | {l[3:] for l in git("status", "--porcelain").splitlines() if l.startswith("??")}
    shared = sorted(f for f in files if f.startswith(SHARED_FILES))
    lines = new.split("\n")
    script = next((i + 1 for i, l in enumerate(lines) if l.startswith("<script>")), 0)
    heads = [(i + 1, l.strip()) for i, l in enumerate(lines) if l.startswith("  // ---------- ")]
    at = [h for h, _ in heads]
    touched = set()
    for m in re.finditer(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", git("diff", "-U0", base, "--", "index.html"), re.M):
        start = int(m.group(1)); end = start + max(int(m.group(2) or 1), 1) - 1
        if script and at and end >= script and start < at[0]:
            touched.add("はじめの共通の部品（el・flash など）")
        for h, name in heads[max(0, bisect.bisect_right(at, start) - 1):bisect.bisect_right(at, end)]:
            if any(k in name for k in SHARED_SECTIONS):
                touched.add(re.sub(r"\s*(\(.*|-+)$", "", name.replace("// ----------", "", 1)).strip())  # (its name, without the notes)
    return why, shared + sorted(touched)


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
    args = [a for a in rest if a != "--changed"]
    changed = "--changed" in rest
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
    why, shared = changes(base, all_suites, cmp_rows) if changed else ({}, [])
    everything = not args and not changed
    picked = [s for s in all_suites if everything or s["name"] in args or s["chat"] in chats or s["name"] in why]
    cmps = [(rel, c) for rel, c in cmp_rows if everything or "cmp" in args or ((chats or changed) and c in chats + [EVERY]) or rel in why]
    if changed:
        more = [f"{k}（{'・'.join(v[:3])}{'…' if len(v) > 3 else ''}）" for k, v in why.items()
                if not any(s["name"] == k and s["chat"] in chats for s in all_suites) and not any(r == k and c in chats + [EVERY] for r, c in cmp_rows)]
        print("（この変更で消えたものが出てくる、ほかのスイートも流します：" + "、".join(more) + "）" if more else "（この変更で消えたものが出てくる、ほかのスイートはありません）", flush=True)
        if shared:
            print("（共通の部分が変わっています：" + "、".join(shared) + "。出す前に、ぜんぶのテスト `run.py -j 3` を流してください）", flush=True)
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
