// Tell Bing, Yandex and the other IndexNow engines that the site changed.
// Run after a production deploy: `node scripts/indexnow.mjs`. It reads the
// live sitemap, so it only ever submits pages that are really there.
// The key is public by design: engines fetch it from <SITE>/<key>.txt to check
// that we own the site. The key file sits under the game's path on
// natepeace.com, which lets it vouch for every page under that path.

const SITE = "https://www.natepeace.com/games/politicians-by-jev";
const KEY = "abb56ba4a971d2ffa8632efb9d9c1fa8";

const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replaceAll("&amp;", "&"));
if (!urlList.length) throw new Error("sitemap has no URLs");

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
});
console.log(`IndexNow: ${res.status} for ${urlList.length} URLs`);
if (res.status >= 300) process.exit(1);
