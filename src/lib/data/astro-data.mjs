import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, 'public');
const NAMES_DIR = path.join(PUBLIC_DIR, 'names');
const MANIFEST_PATH = path.join(ROOT, 'src', 'lib', 'data', 'names-manifest.json');

const VALID_RELIGIONS = ['islamic', 'christian', 'hindu', 'italian'];

let manifestCache = null;

function loadManifest() {
  if (manifestCache) return manifestCache;
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    manifestCache = JSON.parse(raw);
    return manifestCache;
  } catch {
    return { islamic: [], christian: [], hindu: [], italian: [] };
  }
}

export function normalizeReligion(religion) {
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

export function getReligionDirs() {
  return VALID_RELIGIONS.filter((rel) =>
    fs.existsSync(path.join(NAMES_DIR, rel)),
  );
}

export function getSlugs(religion) {
  const normalizedReligion = normalizeReligion(religion);
  if (!normalizedReligion) return [];
  const manifest = loadManifest();
  const items = manifest[normalizedReligion] || [];
  return items.map((item) => item.slug).sort((a, b) => a.localeCompare(b));
}

export async function readNameData(religion, slug) {
  const normalizedReligion = normalizeReligion(religion);
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedReligion || !normalizedSlug) return null;

  const filePath = path.join(NAMES_DIR, normalizedReligion, `${normalizedSlug}.json`);
  const data = readJsonFile(filePath);
  if (!data) return null;

  if (!data.religion) data.religion = normalizedReligion;
  return data;
}

export function getAllSlugs() {
  const manifest = loadManifest();
  const all = [];
  for (const rel of VALID_RELIGIONS) {
    const items = manifest[rel] || [];
    for (const item of items) {
      all.push({ religion: rel, slug: item.slug });
    }
  }
  return all;
}

export function getManifest() {
  return loadManifest();
}

export function getPopularSlugs(limit = 20000) {
  const manifest = loadManifest();
  const all = [];
  for (const rel of VALID_RELIGIONS) {
    for (const item of manifest[rel] || []) {
      all.push({ religion: rel, slug: item.slug, popularity_score: item.popularity_score || 0 });
    }
  }
  return all
    .filter((item) => item.slug)
    .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
    .slice(0, limit)
    .map((item) => ({ religion: item.religion, slug: item.slug }));
}

export default {
  getReligionDirs,
  getSlugs,
  readNameData,
  getAllSlugs,
  getManifest,
  getPopularSlugs,
  normalizeReligion,
};
