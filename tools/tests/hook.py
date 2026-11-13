#!/usr/bin/env python3
"""A suite's hook build: index.html with the suite's hook.js put in, so its tests can reach some of the app's insides
(window.__td8 and the like). hook.js's first line says where it goes (// insert before: <a line of index.html, found
once>); without it, before the boot line. Usage: hook.py <index.html> <hook.js> <out dir>"""
import pathlib
import sys

BOOT = "  // ---------- boot ----------"


def main(src, hook, out):
    page = pathlib.Path(src).read_text(encoding="utf-8")
    text = pathlib.Path(hook).read_text(encoding="utf-8")
    first, _, rest = text.partition("\n")
    if first.startswith("// insert before: "):
        before, snippet = first[len("// insert before: "):], rest
    else:
        before, snippet = BOOT, text
    mark = before + "\n"
    if page.count(mark) != 1:
        sys.exit(f"hook.py: the line to put {hook} before was found {page.count(mark)} times in {src}: {before!r}")
    if snippet and not snippet.endswith("\n"):
        snippet += "\n"
    pathlib.Path(out).mkdir(parents=True, exist_ok=True)
    (pathlib.Path(out) / "index.html").write_text(page.replace(mark, snippet + mark), encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
