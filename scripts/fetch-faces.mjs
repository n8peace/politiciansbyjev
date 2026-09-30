// Downloads a 250px thumbnail of each portrait into public/faces/<id>.<ext>.
// Wikimedia only renders standard thumbnail widths, and 250 is one of them.
import { readFile, writeFile, readdir } from "node:fs/promises";

const UA = "politiciansbyjev/0.1 (https://politiciansbyjev.vercel.app; n8peace)";
const people = JSON.parse(await readFile("data/politicians.json", "utf8"));
const have = new Set(await readdir("public/faces"));

function thumb(url) {
  const m = url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/(commons|en)\/([0-9a-f])\/([0-9a-f]{2})\/(.+)$/);
  if (!m) return url;
  const [, repo, a, ab, file] = m;
  const suffix = /\.(svg|tiff?)$/i.test(file) ? ".png" : "";
  return `https://upload.wikimedia.org/wikipedia/${repo}/thumb/${a}/${ab}/${file}/250px-${file}${suffix}`;
}

let failed = 0;
for (const p of people) {
  if ([...have].some((f) => f.startsWith(p.id + "."))) continue;
  const url = thumb(p.image);
  let res;
  for (let tries = 0; tries < 4; tries++) {
    res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status !== 429) break;
    await new Promise((r) => setTimeout(r, 2000 * (tries + 1)));
  }
  if (!res.ok) { console.log("FAIL", p.id, res.status, url); failed++; continue; }
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("jpeg")) console.log("WARN not jpeg", p.id, type);
  const ext = "jpg";
  await writeFile(`public/faces/${p.id}.${ext}`, Buffer.from(await res.arrayBuffer()));
  await new Promise((r) => setTimeout(r, 150));
}
console.log(`done, ${failed} failed`);
