// きょう まだ・完了 (the user's call, 2026-11-25): the bar at the foot, and a tile found in either part. The tests written
// before it look at tiles that may be in 完了 now (one with its own record put in today, or opened today): they go
// through these to the part the tile is in
const part = async (p, w) => {
  const b = await p.$(`#homeParts button[data-part="${w}"]`);
  if (b && (await b.getAttribute("aria-pressed")) !== "true") { await b.click(); await p.waitForTimeout(250); }
};
const partNow = (p) => p.evaluate(() => document.querySelector('#homeParts [aria-pressed="true"]')?.dataset.part || "todo");
// the part with the tile k showing (the one showing first, then まだ, then 完了), or null
async function toTile(p, k) {
  const has = () => p.$(`#homeTiles > .tile[data-tile="${k}"]`);
  if (await has()) return partNow(p);
  for (const w of ["todo", "done"]) { await part(p, w); if (await has()) return w; }
  return null;
}
// the tiles of both parts, まだ's then 完了's (the part showing left as it was)
async function allTiles(p) {
  const was = await partNow(p), keys = () => p.$$eval("#homeTiles > .tile", (l) => l.map((t) => t.dataset.tile));
  await part(p, "todo"); const a = await keys();
  await part(p, "done"); const d = await keys();
  await part(p, was);
  return [...a, ...d];
}
module.exports = { part, partNow, toTile, allTiles };
