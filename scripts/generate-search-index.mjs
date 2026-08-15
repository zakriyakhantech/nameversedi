import fs from 'node:fs';
import path from 'node:path';

// Generates a compact, full-database search index per religion.
// Default: the ENTIRE manifest (all 42K+ names). Pass --limit=N to cap for test builds.
const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

const ROOT = path.resolve(process.cwd());
const MANIFEST_PATH = path.join(ROOT, 'src', 'lib', 'data', 'names-manifest.json');

const VALID_RELIGIONS = ['islamic', 'christian', 'hindu', 'italian'];

function loadManifest() {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { islamic: [], christian: [], hindu: [], italian: [] };
  }
}

// Compact field names keep the index small (names are ~42K rows).
// n=name, s=slug, m=meaning, o=origin, g=gender, c=category, p=popularity_score
function compact(item) {
  return {
    n: item.name || '',
    s: item.slug || '',
    m: String(item.meaning || item.short_meaning || '').slice(0, 90),
    o: item.origin || '',
    g: item.gender || '',
    c: item.category || '',
    p: Number(item.popularity_score) || 0,
  };
}

const manifest = loadManifest();
let total = 0;

for (const rel of VALID_RELIGIONS) {
  const items = (manifest[rel] || [])
    .filter((item) => item.slug && item.name)
    .slice(0, limit)
    .map(compact)
    .sort((a, b) => a.n.localeCompare(b.n));

  const outDir = path.join(ROOT, 'public', 'names', rel);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, '_search-index.json'), JSON.stringify(items), 'utf8');
  total += items.length;
  console.log(`Generated ${rel} search index with ${items.length} entries`);
}

console.log(`Total search index entries: ${total}`);
