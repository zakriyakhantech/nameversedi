import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, 'public');
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

for (const rel of VALID_RELIGIONS) {
  const manifest = loadManifest();
  const items = manifest[rel] || [];
  const index = items
    .filter((item) => item.slug && item.name)
    .map((item) => ({
      name: item.name,
      slug: item.slug,
      religion: rel,
      meaning: item.meaning || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const outDir = path.join(PUBLIC_DIR, 'names', rel);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, '_search-index.json'), JSON.stringify(index, null, 2), 'utf8');
  console.log(`Generated ${rel} search index with ${index.length} entries`);
}
