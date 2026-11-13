#!/usr/bin/env python3
"""つみかさねの回帰テスト (README.md): the app as the working tree has it, the hook builds made from it, and the suites
run on them; each failure told apart, KNOWN (in its suite's known.txt) or NEW. The comparison tests (cmp/) run on the
page before (BASE: by default where this branch left origin/main) and on the page now, and say what fails now that didn't
before. Exits 1 with any NEW.

  python3 tools/tests/run.py              everything: the comparison tests and every suite (about 25 minutes)
  python3 tools/tests/run.py ToDo         a chat's suites and comparison tests (and those for every page)
  python3 tools/tests/run.py r37 r38      those suites alone
  python3 tools/tests/run.py cmp          the comparison tests alone
  python3 tools/tests/run.py --list       the suites by chat, with their tests

A suite is a folder under suites/ with its suite.txt (port, chat, tests) and, if some of its failures are known, its
known.txt. Its servers: the working tree at 8765, the page before at 8766, each suite's hook build at its port. They stay
up after it (TEST_WORK, /tmp/tsumikasane-tests by default, keeps what it made: logs/, out/, summary.txt)."""
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
    picked = [s for s in all_suites if not args or s["name"] in args or s["chat"] in chats]
    cmps = [(rel, c) for rel, c in cmp_rows if not args or "cmp" in args or (chats and c in chats + [EVERY])]
    base = base_rev()
    prepare(all_suites, base)
    report, new = [], 0

    def say(line):
        print(line, flush=True)
        report.append(line)

    if cmps:
        short = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", base], capture_output=True, text=True).stdout.strip()
        print(f"（比べる前の版：{short or base}）", flush=True)
    for rel, _ in cmps:
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
            new += 1
            say(f"NEW   cmp/{rel}  " + " / ".join(fresh[:4]))
        else:
            say(f"OK    cmp/{rel}" + (f"  (前から {len(was_bad)} 件の失敗)" if was_bad else ""))
    for s in picked:
        for t in s["tests"]:
            key = f"{s['name']}/{t}"
            bad = failures(run_node(WORK / "suites" / s["name"], t, WORK / "logs" / f"{s['name']}-{t}.txt"))
            fresh = [l for l in bad if not any(k == t and piece in l for k, piece in s["known"])]
            if fresh:
                new += 1
                say(f"NEW   {key}  " + " / ".join(fresh[:4]))
            elif bad:
                say(f"KNOWN {key}  " + " / ".join(bad[:4]))
            else:
                say(f"OK    {key}")
    say((f"--- NEW {new} 件（{len(report)} 件中）" if new else f"--- NEW なし（{len(report)} 件）") + f"  logs: {WORK / 'logs'}")
    (WORK / "summary.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
    return 1 if new else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
