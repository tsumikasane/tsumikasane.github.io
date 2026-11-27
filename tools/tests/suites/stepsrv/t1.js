// 通知サーバーの歩数の受け口 (the user's call, 2026-11-27: ヘルスケアの歩数を自動で): push/worker.js run in Node, Cloudflare's
// part stood in for (DurableObject, its storage, the bindings)
const fs = require("fs"), os = require("os"), path = require("path"), { pathToFileURL } = require("url");
let fails = 0;
const ok = (c, m, x) => { console.log((c ? "OK   " : "FAIL ") + m + (x !== undefined && !c ? "  " + JSON.stringify(x) : "")); if (!c) fails++; };
const jst = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10), DAY = 864e5;
(async () => {
  // the worker as served with the app (run.py runs the suites from a copy), else from the checkout this is in
  const URL0 = process.env.URL0 || "http://localhost:8765/";
  let src = "";
  try { const r = await fetch(URL0 + "push/worker.js"); if (r.ok) src = await r.text(); } catch {}
  if (!src) src = fs.readFileSync(path.join(__dirname, "../../../../push/worker.js"), "utf8");
  const shim = src.replace('import { DurableObject } from "cloudflare:workers";', "class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }");
  if (shim === src) { console.log("FAIL the import to stand in for not found"); process.exit(1); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stepsrv-")), file = path.join(dir, "worker.mjs");
  fs.writeFileSync(file, shim);
  const mod = await import(pathToFileURL(file).href), W = mod.default;
  const boxes = new Map();
  const storage = () => { const m = new Map(); return { get: async (k) => (m.has(k) ? structuredClone(m.get(k)) : undefined), put: async (k, v) => { m.set(k, structuredClone(v)); }, deleteAll: async () => m.clear(), delete: async (k) => m.delete(k) }; };
  const env = { STEPS: { idFromName: (n) => n, get: (id) => boxes.get(id) || (boxes.set(id, new mod.Steps({ storage: storage() }, {})), boxes.get(id)) } };
  const KEY = "k".repeat(10) + "_-AbC0123456789xyzQ", SRV = "https://push.example.test";
  const call = async (method, p, body, headers = {}) => { const r = await W.fetch(new Request(SRV + p, { method, headers, body }), env); let j = null; try { j = await r.clone().json(); } catch {} return { status: r.status, j, h: r.headers }; };
  const json = (o) => ({ body: JSON.stringify(o), headers: { "Content-Type": "application/json" } });
  const post = (o, p = "/s/" + KEY) => { const x = json(o); return call("POST", p, x.body, x.headers); };

  let r = await post({ steps: 8421 });
  ok(r.status === 200 && r.j.ok && r.j.steps === 8421 && r.j.date === jst(), "JSON, a number: today by Japan's clock", r);
  r = await post({ steps: "8,421 歩", date: jst(Date.now() - DAY) });
  ok(r.status === 200 && r.j.steps === 8421 && r.j.date === jst(Date.now() - DAY), "words with the number (8,421 歩), yesterday", r);
  r = await post({ steps: ["3000", 4000, "x"] });
  ok(r.status === 200 && r.j.steps === 7000, "a list: added up (what isn't a number left out)", r);
  r = await post({ steps: "8421.0" });
  ok(r.status === 200 && r.j.steps === 8421, "8421.0: 8421", r);
  const ymd = jst(Date.now() - 2 * DAY), slashed = ymd.replace(/-0?/g, "/").replace(/^(\d{4})\//, "$1/");
  r = await call("POST", "/s/" + KEY, new URLSearchParams({ steps: "1234", date: slashed }).toString(), { "Content-Type": "application/x-www-form-urlencoded" });
  ok(r.status === 200 && r.j.steps === 1234 && r.j.date === ymd, "a form, the day as " + slashed, r);
  r = await call("POST", "/s/" + KEY + "?steps=500&date=" + jst(Date.now() - 3 * DAY));
  ok(r.status === 200 && r.j.steps === 500 && r.j.date === jst(Date.now() - 3 * DAY), "the address alone (?steps=500&date=…)", r);
  r = await call("POST", "/s/" + KEY, "9000", { "Content-Type": "text/plain" });
  ok(r.status === 200 && r.j.steps === 9000 && r.j.date === jst(), "the number alone as the body", r);
  // not taken
  for (const [o, what] of [[{ steps: 300000 }, "past 200,000"], [{ steps: "なし" }, "no number"], [{}, "nothing"], [{ steps: 100, date: jst(Date.now() - 40 * DAY) }, "a day 40 days ago"], [{ steps: 100, date: jst(Date.now() + 3 * DAY) }, "a day 3 days on"], [{ steps: 100, date: "きのう" }, "a day not as a date"]]) {
    r = await post(o);
    ok(r.status === 400 && /bad/.test(r.j?.error || ""), "not taken: " + what, r);
  }
  r = await post({ steps: 1 }, "/s/short");
  ok(r.status === 404, "a key too short: not found", r.status);
  // read and forgotten
  r = await call("GET", "/s/" + KEY);
  const days = r.j?.days || {};
  ok(r.status === 200 && days[jst()].steps === 9000 && days[jst(Date.now() - DAY)].steps === 8421 && days[ymd].steps === 1234 && Object.keys(days).length === 4 && days[jst()].at > Date.now() - 60e3, "GET: each day's last, with when", days);
  r = await call("GET", "/s/" + "z".repeat(30));
  ok(r.status === 200 && JSON.stringify(r.j.days) === "{}", "another key: none of them", r.j);
  r = await call("DELETE", "/s/" + KEY);
  ok(r.status === 200 && r.j.ok, "DELETE: ok");
  r = await call("GET", "/s/" + KEY);
  ok(JSON.stringify(r.j.days) === "{}", "after DELETE: none", r.j);
  r = await call("PUT", "/s/" + KEY, "{}");
  ok(r.status === 405, "PUT: not a way in", r.status);
  // the app's origin may read it; the others' ways as before
  r = await call("OPTIONS", "/s/" + KEY, undefined, { Origin: "https://tsumikasane.github.io" });
  ok(r.status === 204 && r.h.get("Access-Control-Allow-Origin") === "https://tsumikasane.github.io", "CORS for the app", [r.status, r.h.get("Access-Control-Allow-Origin")]);
  r = await call("GET", "/s/" + KEY, undefined, { Origin: "https://evil.example" });
  ok(!r.h.get("Access-Control-Allow-Origin"), "no CORS for another site");
  r = await W.fetch(new Request(SRV + "/"), env);
  ok(r.status === 200 && (await r.text()).includes("通知サーバー"), "/ as before");
  r = await call("GET", "/nothing");
  ok(r.status === 404, "another path: not found");
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("FAIL Error " + e.message); process.exit(1); });
