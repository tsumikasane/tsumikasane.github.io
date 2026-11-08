// つみかさねの通知サーバー: a plan's 通知アラーム (the user's call: as the iPhone's カレンダー has them, up to three).
// A web app on the iPhone's home screen can't wake itself at a time, so this sends them. Each device that turned
// notifications on keeps here its push subscription and the times of its next alarms (the app sends them whenever its
// plans change, and the other signed-in devices do too), and a Durable Object for that device wakes at the next one and
// sends it through Web Push (RFC 8030, encrypted as RFC 8291 says, signed as RFC 8292 says, with WebCrypto only).
//
//   GET    /key           the server's public key, for the app's pushManager.subscribe
//   PUT    /d/{id}        { sub?: PushSubscription JSON | null, alarms?: [{ at, title, body, tag, url }] }: a device's
//                         subscription and/or all its alarms, in place of the ones before; → { ok, sub, alarms, gone? }
//   POST   /d/{id}/test   { in?: seconds }: a notification to try it, now or that many seconds on (up to 60)
//   DELETE /d/{id}        the device forgotten (notifications turned off there)
//
// {id} is a random one the device made for itself (22 to 64 of A–Z a–z 0–9 _ -): who knows it may change what is sent to
// that device, so it is kept like a password, only in the device and in its owner's own synced records.
import { DurableObject } from "cloudflare:workers";

const SUBJECT = "https://tsumikasane.github.io/"; // who sends them, as the push services ask (VAPID's sub)
// the app, its test version (its own address, tsumikasane-test.github.io: its own devices only) and a local copy
const ORIGINS = /^(?:https:\/\/tsumikasane(?:-test)?\.github\.io|http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?)$/;
// only the browsers' own push services: the server never posts anywhere else
const PUSH_HOSTS = /^(?:[a-z0-9-]+\.)*(?:push\.apple\.com|fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
const MAX_ALARMS = 400, MAX_BODY = 200_000;
const LATE = 30 * 60e3; // an alarm this late isn't sent at all (the server was away): a 5分前 an hour on helps no one
const TTL = 2 * 3600; // how long a push service keeps one for a phone that is off or out of reach
const DAY = 864e5;

const enc = new TextEncoder();
const b64u = (bytes) => {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64u = (s) => {
  const t = String(s).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(t + "=".repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
};
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let k = 0;
  for (const p of parts) { out.set(p, k); k += p.length; }
  return out;
};
const text = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

// ---------- Web Push ----------
async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}
// the message, readable only by the device that subscribed (aes128gcm, one record)
async function encrypt(sub, message) {
  const ua = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const mine = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", mine.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, mine.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode("WebPush: info\0"), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(enc.encode(message), new Uint8Array([2]))));
  const head = new Uint8Array(21);
  head.set(salt, 0);
  new DataView(head.buffer).setUint32(16, 4096);
  head[20] = asPub.length;
  return concat(head, asPub, sealed);
}
// who sends it, signed with the server's key (a JWT for the push service's origin, good for 12 hours)
async function vapidAuth(endpoint, vapid) {
  const part = (o) => b64u(enc.encode(JSON.stringify(o)));
  const unsigned = part({ typ: "JWT", alg: "ES256" }) + "." + part({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT });
  const key = await crypto.subtle.importKey("jwk", vapid.privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned));
  return `vapid t=${unsigned}.${b64u(sig)}, k=${vapid.publicKey}`;
}
// "sent", "gone" (the subscription is no more: notifications turned off, or the app deleted), "retry" or "failed"
async function webPush(sub, message, vapid) {
  try {
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        TTL: String(TTL), Urgency: "high", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream",
        Authorization: await vapidAuth(sub.endpoint, vapid),
      },
      body: await encrypt(sub, message),
      signal: AbortSignal.timeout(15000),
    });
    const status = res.status;
    if (status >= 200 && status < 300) return { result: "sent", status };
    let why = "";
    try { why = (await res.text()).slice(0, 300); } catch {}
    console.log("push", status, why);
    return { result: status === 404 || status === 410 ? "gone" : status === 429 || status >= 500 ? "retry" : "failed", status, why };
  } catch (e) {
    console.log("push failed", String(e));
    return { result: "retry", status: 0, why: String(e?.message || e) };
  }
}

// ---------- what a device sends ----------
function cleanSub(v, env) {
  if (v === null) return null;
  const endpoint = text(v?.endpoint, 2000), p256dh = text(v?.keys?.p256dh, 200), auth = text(v?.keys?.auth, 100);
  let url;
  try { url = new URL(endpoint); } catch { throw new Error("bad subscription"); }
  const host = url.host;
  const allowed = url.protocol === "https:" ? PUSH_HOSTS.test(url.hostname) : !!env.TEST_PUSH_HOST && host === env.TEST_PUSH_HOST;
  if (!allowed || !/^[\w-]{80,100}$/.test(p256dh) || !/^[\w-]{16,40}$/.test(auth)) throw new Error("bad subscription");
  return { endpoint, keys: { p256dh, auth } };
}
function cleanAlarms(v) {
  if (!Array.isArray(v)) throw new Error("bad alarms");
  const now = Date.now(), seen = new Set(), out = [];
  for (const a of v.slice(0, MAX_ALARMS * 2)) {
    const at = Number(a?.at);
    if (!Number.isFinite(at) || at < now - LATE || at > now + 400 * DAY) continue;
    const x = { at: Math.round(at), title: text(a.title, 120) || "予定", body: text(a.body, 300), tag: text(a.tag, 120), url: text(a.url, 300) };
    if (x.url && !/^(?:\.\/|\?|#)/.test(x.url)) x.url = "";
    const key = x.tag + "@" + x.at;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_ALARMS);
}
const message = (a) => JSON.stringify({ title: a.title, body: a.body, tag: a.tag || undefined, url: a.url || undefined });

// ---------- a device ----------
// keeps "sub" (its push subscription), "alarms" (the next ones, soonest first), "sent" (the ones sent in the last hours,
// so one sent isn't sent again when a device's list comes with it still in, its clock a little behind) and "gone" (the
// push service said the subscription is no more: what comes for it is let go, and said so, till it subscribes again)
const KEPT_SENT = 3 * 3600e3;
const keyOf = (a) => a.tag + "@" + a.at;
export class Device extends DurableObject {
  vapid() {
    return (this.keys ||= this.env.KEYS.get(this.env.KEYS.idFromName("vapid")).vapid().catch((e) => { this.keys = null; throw e; }));
  }
  async wake(alarms, sub) {
    if (sub && alarms.length) await this.ctx.storage.setAlarm(Math.max(alarms[0].at, Date.now()));
    else await this.ctx.storage.deleteAlarm();
  }
  async sentRecently() {
    const sent = (await this.ctx.storage.get("sent")) || {}, now = Date.now();
    for (const k of Object.keys(sent)) if (now - sent[k] > KEPT_SENT) delete sent[k];
    return sent;
  }
  async update(body) {
    const st = this.ctx.storage;
    if (body.sub !== undefined) {
      const sub = cleanSub(body.sub, this.env);
      if (!sub) return this.forget();
      await st.put("sub", sub);
      await st.delete("gone");
    }
    const sub = await st.get("sub");
    if (!sub) return { ok: true, sub: false, alarms: 0, gone: !!(await st.get("gone")) };
    if (body.alarms !== undefined) {
      const sent = await this.sentRecently();
      await st.put("alarms", cleanAlarms(body.alarms).filter((a) => !sent[keyOf(a)]));
    }
    const alarms = (await st.get("alarms")) || [];
    await this.wake(alarms, sub);
    return { ok: true, sub: true, alarms: alarms.length, next: alarms[0]?.at ?? null };
  }
  async forget() {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    return { ok: true, sub: false, alarms: 0 };
  }
  async goneNow() {
    await this.forget();
    await this.ctx.storage.put("gone", true);
  }
  // to try it: now (with what the push service answered, for the app to say), or some seconds on (to see it come with
  // the app closed)
  async test(body) {
    const st = this.ctx.storage, sub = await st.get("sub");
    if (!sub) return { ok: false, sub: false, gone: !!(await st.get("gone")) };
    const t = { title: "つみかさね", body: "通知のテストです。予定の通知アラームは、このように届きます。", tag: "test", url: "./" };
    const wait = Math.min(60, Math.max(0, Number(body?.in) || 0));
    if (wait) {
      const alarms = cleanAlarms([...((await st.get("alarms")) || []), { ...t, at: Date.now() + wait * 1000 }]);
      await st.put("alarms", alarms);
      await this.wake(alarms, sub);
      return { ok: true, sub: true, in: wait };
    }
    const r = await webPush(sub, message(t), await this.vapid());
    if (r.result === "gone") { await this.goneNow(); return { ok: false, sub: false, gone: true, status: r.status }; }
    return { ok: r.result === "sent", sub: true, status: r.status, why: r.why };
  }
  // the time of the next one: the ones due sent (each its own notification), the ones the push service couldn't take
  // just then tried again a little later, and the next wake set. The list may change while they go (the app sends its
  // own): what was sent is taken from the list as it is then
  async alarm() {
    const st = this.ctx.storage, sub = await st.get("sub"), now = Date.now();
    if (!sub) return;
    const due = ((await st.get("alarms")) || []).filter((a) => a.at <= now + 1000), done = new Set(), again = [];
    for (const a of due) {
      done.add(keyOf(a));
      if (now - (a.due ?? a.at) > LATE) continue;
      const r = await webPush(sub, message(a), await this.vapid());
      if (r.result === "gone") return this.goneNow();
      const tries = (a.tries || 0) + 1;
      if (r.result === "retry" && tries < 5) again.push({ ...a, due: a.due ?? a.at, at: Date.now() + 30e3 * 2 ** tries, tries });
    }
    if (!(await st.get("sub"))) return; // turned off meanwhile
    const sent = await this.sentRecently();
    for (const a of due) if (!again.some((b) => b.tag === a.tag && b.due === (a.due ?? a.at))) sent[a.tag + "@" + (a.due ?? a.at)] = now;
    const next = [...((await st.get("alarms")) || []).filter((a) => !done.has(keyOf(a))), ...again].sort((a, b) => a.at - b.at);
    await st.put("sent", sent);
    await st.put("alarms", next);
    await this.wake(next, sub);
  }
}

// ---------- the server's key ----------
export class Keys extends DurableObject {
  async vapid() {
    const kept = await this.ctx.storage.get("vapid");
    if (kept) return kept;
    return this.ctx.blockConcurrencyWhile(async () => {
      const again = await this.ctx.storage.get("vapid");
      if (again) return again;
      const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
      const made = { publicKey: b64u(await crypto.subtle.exportKey("raw", pair.publicKey)), privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey) };
      await this.ctx.storage.put("vapid", made);
      return made;
    });
  }
}

// ---------- requests ----------
function cors(req) {
  const origin = req.headers.get("Origin") || "";
  return ORIGINS.test(origin)
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" }
    : { Vary: "Origin" };
}
const json = (data, headers, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
async function readJson(req) {
  const body = await req.text();
  if (body.length > MAX_BODY) throw new Error("too large");
  return body ? JSON.parse(body) : {};
}

export default {
  async fetch(req, env) {
    const head = cors(req), url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: head });
    try {
      if (url.pathname === "/key" && req.method === "GET") return json({ key: (await env.KEYS.get(env.KEYS.idFromName("vapid")).vapid()).publicKey }, head);
      const m = url.pathname.match(/^\/d\/([\w-]{22,64})(\/test)?$/);
      if (m) {
        const device = env.DEVICES.get(env.DEVICES.idFromName(m[1]));
        if (m[2] && req.method === "POST") return json(await device.test(await readJson(req)), head);
        if (!m[2] && req.method === "PUT") return json(await device.update(await readJson(req)), head);
        if (!m[2] && req.method === "DELETE") return json(await device.forget(), head);
        return json({ error: "method" }, head, 405);
      }
      if (url.pathname === "/") return new Response("つみかさねの通知サーバーです。\n", { headers: { "Content-Type": "text/plain; charset=utf-8", ...head } });
      return json({ error: "not found" }, head, 404);
    } catch (e) {
      return json({ error: String(e?.message || e) }, head, 400);
    }
  },
};
