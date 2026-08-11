import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, 'public');
const NAMES_DIR = path.join(PUBLIC_DIR, 'names');
const MANIFEST_PATH = path.join(ROOT, 'src', 'lib', 'data', 'names-manifest.json');

const VALID_RELIGIONS = ['islamic', 'christian', 'hindu', 'italian'];

function normalizeReligion(religion) {
  if (!religion || typeof religion !== 'string') return null;
  const normalized = religion.toLowerCase().trim();
  if (normalized === 'islam' || normalized === 'muslim') return 'islamic';
  if (normalized === 'christianity') return 'christian';
  if (normalized === 'hinduism') return 'hindu';
  return VALID_RELIGIONS.includes(normalized) ? normalized : null;
}

function normalizeSlug(slug) {
  return String(slug || '').trim().toLowerCase().replace(/\.json$/i, '');
}

function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'data' in parsed) return parsed.data;
    return parsed;
  } catch {
    return null;
  }
}

const manifest = { islamic: [], christian: [], hindu: [], italian: [] };

for (const rel of VALID_RELIGIONS) {
  const dir = path.join(NAMES_DIR, rel);
  if (!fs.existsSync(dir)) continue;

  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith('.json') || entry.startsWith('_')) continue;
    const slug = entry.replace(/\.json$/i, '');
    if (!slug) continue;

    const filePath = path.join(dir, entry);
    const data = readJsonFile(filePath);
    if (!data) continue;

    manifest[rel].push({
      name: data.name || data.na || data.title || '',
      slug,
      religion: rel,
      meaning: data.meaning || data.short_meaning || '',
      origin: data.origin || data.origins || '',
      gender: data.gender || '',
      category: data.category || '',
      popularity_score: Number(data.popularity_score) || Number(data.popularity) || 0,
    });
  }
}

fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

const total = Object.values(manifest).reduce((sum, arr) => sum + arr.length, 0);
console.log(`Generated names-manifest.json with ${total} names:`);
for (const [rel, items] of Object.entries(manifest)) {
  console.log(`  ${rel}: ${items.length}`);
}
