// Saves each portrait to public/faces/<id>.jpg at 360px wide, sharp enough
// for the 136px hero face on a 2x screen and the 300px face on share cards.
// The pile loads a 140px copy from public/faces/sm.
// Usage: node scripts/fetch-faces.mjs [--force]
import { execFileSync } from "node:child_process";
import { readFile, writeFile, readdir } from "node:fs/promises";

const UA = "politiciansbyjev/0.2 (https://politiciansbyjev.vercel.app; n8peace)";
const WIDTH = 360;
const force = process.argv.includes("--force");
const people = JSON.parse(await readFile("data/politicians.json", "utf8"));
const have = new Set(await readdir("public/faces"));

// Wikimedia only renders standard thumbnail widths; 500 is one of them.
function thumb(url) {
  if (url.includes("/thumb/")) return url.replace(/\/\d+px-([^/]+)$/, "/500px-$1");
  const m = url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/(commons|en)\/([0-9a-f])\/([0-9a-f]{2})\/(.+)$/);
  if (!m) return url;
  const [, repo, a, ab, file] = m;
  const suffix = /\.(svg|tiff?)$/i.test(file) ? ".png" : "";
  return `https://upload.wikimedia.org/wikipedia/${repo}/thumb/${a}/${ab}/${file}/500px-${file}${suffix}`;
}

let failed = 0;
for (const p of people) {
  const out = `public/faces/${p.id}.jpg`;
  if (!force && have.has(`${p.id}.jpg`)) continue;
  let res;
  for (const url of [thumb(p.image), p.image]) {
    for (let tries = 0; tries < 4; tries++) {
      res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status !== 429) break;
      await new Promise((r) => setTimeout(r, 2000 * (tries + 1)));
    }
    if (res.ok) break;
  }
  if (!res.ok) {
    console.log("FAIL", p.id, res.status);
    failed++;
    continue;
  }
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "80", "-Z", String(WIDTH), out, "--out", out], { stdio: "ignore" });
  // A small copy for the pile, where faces are 30 to 64px, and a gray one
  // for the pile strip on share cards (the card renderer can't filter).
  const sm = `public/faces/sm/${p.id}.jpg`;
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "78", "-Z", "140", out, "--out", sm], { stdio: "ignore" });
  execFileSync("magick", [sm, "-colorspace", "Gray", "-level", "0%,100%,1.08", "-quality", "78", `public/faces/gray/${p.id}.jpg`]);
  await new Promise((r) => setTimeout(r, 200));
}
console.log(`done, ${failed} failed`);
