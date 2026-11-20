// the fake server and notification server of 同期's tests (in place of Firebase): window.__syncRemote keeps the
// accounts and their records in this page's localStorage, apart from the app's (so they outlive a device let go of);
// "__fake:down" set, it fails as a server out of reach would; window.__pushServer, answered by the test's route
module.exports = function FAKE() {
  window.__pushServer = "https://push.example.test";
  window.__syncRemote = async () => {
    const S = () => { try { return JSON.parse(localStorage.getItem("__fake:server")) || { users: {}, seq: 1e12 }; } catch { return { users: {}, seq: 1e12 }; } };
    const W = (s) => localStorage.setItem("__fake:server", JSON.stringify(s));
    const me = () => localStorage.getItem("__fake:auth");
    const user = () => { const id = me(), s = S(); return id && s.users[id] ? { uid: id, email: s.users[id].email, verified: !!s.users[id].verified } : null; };
    const err = (code) => Object.assign(new Error(code), { code });
    const down = () => { if (localStorage.getItem("__fake:down")) throw err("unavailable"); };
    let cb = null;
    const fire = () => setTimeout(() => cb && cb(user()), 0);
    return {
      onAuth(f) { cb = f; fire(); },
      async signIn(email, pw) { const s = S(), id = Object.keys(s.users).find((k) => s.users[k].email === email); if (!id || s.users[id].pw !== pw) throw err("auth/invalid-credential"); localStorage.setItem("__fake:auth", id); fire(); },
      async signUp(email, pw) { const s = S(); if (Object.values(s.users).some((u) => u.email === email)) throw err("auth/email-already-in-use"); const id = "u" + (Object.keys(s.users).length + 1); s.users[id] = { email, pw, docs: {}, mails: 1, verified: false }; W(s); localStorage.setItem("__fake:auth", id); fire(); },
      async signOut() { localStorage.removeItem("__fake:auth"); fire(); },
      async reset() {},
      // メールアドレスの確認 (a mail counted; "verified" set by the test, as the link in it would) and パスワードを変える
      async verify() { const s = S(), id = me(); s.users[id].mails = (s.users[id].mails || 0) + 1; W(s); },
      async verified() { return !!S().users[me()].verified; },
      async changePassword(was, next) { down(); const s = S(), id = me(); if (s.users[id].pw !== was) throw err("auth/wrong-password"); if (next.length < 6) throw err("auth/weak-password"); s.users[id].pw = next; W(s); },
      async leave(pw) { down(); const s = S(), id = me(); if (!id || s.users[id].pw !== pw) throw err("auth/wrong-password"); delete s.users[id]; W(s); localStorage.removeItem("__fake:auth"); fire(); },
      async push(docs) { down(); const s = S(), id = me(); for (const d of docs) { s.seq += 10000; s.users[id].docs[`${d.s}~${d.i}`] = { ...d, st: s.seq }; } W(s); },
      async pull(since) { down(); const s = S(), id = me(); return Object.values(s.users[id].docs).filter((d) => d.st > since).sort((a, b) => a.st - b.st); },
    };
  };
};
