// Validates data/politicians.json: parses, 100 unique ids, all image URLs return HTTP 200.
import fs from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const UA = 'politiciansbyjev/0.1 (n8peace project)';
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'politicians.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];
const PARTIES = new Set(['R', 'D', 'I', 'Other', 'None']);
const ERAS = new Set(['current', 'historic']);
const KEYS = ['id', 'name', 'party', 'role', 'years', 'era', 'wikipedia', 'image', 'imageLicense', 'imageCredit'];

if (!Array.isArray(data) || data.length !== 100) errors.push(`expected 100 entries, got ${data.length}`);
const ids = new Set();
for (const p of data) {
  for (const k of KEYS) if (typeof p[k] !== 'string' || !p[k]) errors.push(`${p.id}: missing ${k}`);
  if (ids.has(p.id)) errors.push(`duplicate id ${p.id}`);
  ids.add(p.id);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) errors.push(`${p.id}: id not kebab-case`);
  if (!PARTIES.has(p.party)) errors.push(`${p.id}: bad party ${p.party}`);
  if (!ERAS.has(p.era)) errors.push(`${p.id}: bad era ${p.era}`);
  if (!/^https:\/\/upload\.wikimedia\.org\//.test(p.image)) errors.push(`${p.id}: image not upload.wikimedia.org`);
  if (!/^https:\/\/en\.wikipedia\.org\/wiki\//.test(p.wikipedia)) errors.push(`${p.id}: bad wikipedia url`);
}
console.log(`unique ids: ${ids.size}`);

// Uses curl -sI (IPv4) so results match the manual check. Wikimedia rate-limits per client IP
// (HTTP 429 + Retry-After), so go one at a time and back off when told to.
function curlHead(url) {
  const out = execFileSync('curl', ['-4', '-sI', '-m', '20', '-A', UA, url], { encoding: 'utf8' });
  const status = Number((out.match(/^HTTP\/\S+ (\d+)/m) || [])[1]) || 0;
  const retry = Number((out.match(/^retry-after: *(\d+)/im) || [])[1]) || 0;
  return { status, retry };
}
async function head(url) {
  for (let i = 0; i < 8; i++) {
    let r;
    try { r = curlHead(url); } catch (e) { if (i === 7) return `error ${e.message}`; continue; }
    if (r.status !== 429) return r.status;
    const wait = Math.min(Math.max(r.retry, 20), 700);
    console.log(`  429 on ${url.split('/').pop()}, waiting ${wait}s`);
    await new Promise((res) => setTimeout(res, wait * 1000));
  }
  return 429;
}
let ok = 0;
for (const p of data) {
  const status = await head(p.image);
  if (status === 200) ok++; else console.log(`  ${p.id}: HTTP ${status}`);
  if (status !== 200) errors.push(`${p.id}: image HTTP ${status} ${p.image}`);
  await new Promise((res) => setTimeout(res, 500));
}
console.log(`image URLs returning 200: ${ok}/${data.length}`);

const count = (key) => data.reduce((m, p) => ((m[p[key]] = (m[p[key]] || 0) + 1), m), {});
console.log('by era:', count('era'));
console.log('by party (all):', count('party'));
console.log('by party (current):', data.filter((p) => p.era === 'current').reduce((m, p) => ((m[p.party] = (m[p.party] || 0) + 1), m), {}));
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK');
