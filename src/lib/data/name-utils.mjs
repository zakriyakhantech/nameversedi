// Shared helpers for normalizing name data from the manifest + JSON profiles.

export const RELIGIONS = ['islamic', 'christian', 'hindu', 'italian'];

export const RELIGION_LABELS = {
  islamic: 'Islamic',
  christian: 'Christian',
  hindu: 'Hindu',
  italian: 'Italian',
};

export function religionLabel(religion) {
  if (!religion) return '';
  if (RELIGION_LABELS[religion]) return RELIGION_LABELS[religion];
  return String(religion).charAt(0).toUpperCase() + String(religion).slice(1);
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Gender values in the data are messy: "Male", "(Male)", "Female", "(Female)",
// "Unisex", "Unknown", "(Male or Female or Unisex)", "Masculine", "Genderless"…
export function normalizeGender(gender) {
  const g = String(gender || '').toLowerCase();
  if (!g) return null;
  const isFemale = /female|girl|feminine/.test(g);
  const isMale = /(^|[^e])male|\bboy|masculin/.test(g);
  if (isMale && isFemale) return 'unisex';
  if (isFemale) return 'girl';
  if (isMale) return 'boy';
  if (/unisex|neutral|genderless|unknown|unspecified/.test(g)) return 'unisex';
  return null;
}

export function isBoy(gender) {
  const g = String(gender || '').toLowerCase();
  const isFemale = /female|girl|feminine/.test(g);
  const isMale = /(^|[^e])male|\bboy|masculin/.test(g);
  return isMale && !isFemale;
}

export function isGirl(gender) {
  const g = String(gender || '').toLowerCase();
  const isFemale = /female|girl|feminine/.test(g);
  const isMale = /(^|[^e])male|\bboy|masculin/.test(g);
  return isFemale && !isMale;
}

export function genderLabel(gender) {
  const g = normalizeGender(gender);
  if (g === 'boy') return 'Boy';
  if (g === 'girl') return 'Girl';
  if (g === 'unisex') return 'Unisex';
  return '';
}

export function genderWord(gender) {
  const g = normalizeGender(gender);
  if (g === 'boy') return 'boy';
  if (g === 'girl') return 'girl';
  return 'baby';
}

export const ORIGIN_SLUGS = [
  'arabic',
  'biblical',
  'sanskrit',
  'hindu',
  'italian',
  'persian',
  'english',
  'tamil',
  'hindi',
  'bengali',
  'urdu',
];

export const ORIGIN_LABELS = {
  arabic: 'Arabic',
  biblical: 'Biblical',
  sanskrit: 'Sanskrit',
  hindu: 'Hindu',
  italian: 'Italian',
  persian: 'Persian',
  english: 'English',
  tamil: 'Tamil',
  hindi: 'Hindi',
  bengali: 'Bengali',
  urdu: 'Urdu',
};

// Match an origin string (which may be messy) to a curated origin slug.
export function originSlugFor(origin) {
  const o = String(origin || '').toLowerCase();
  if (!o) return null;
  for (const slug of ORIGIN_SLUGS) {
    if (o.includes(slug)) return slug;
  }
  if (o.includes('mytholog')) return 'hindu';
  if (o.includes('sikh')) return 'hindu';
  if (o.includes('marathi') || o.includes('punjabi')) return 'hindi';
  return null;
}

export const CATEGORY_SLUGS = ['islamic', 'hindu', 'biblical', 'saint', 'virtue', 'italian'];

export const CATEGORY_LABELS = {
  islamic: 'Islamic',
  hindu: 'Hindu',
  biblical: 'Biblical',
  saint: 'Saint',
  virtue: 'Virtue',
  italian: 'Italian',
};

export function categorySlugFor(category) {
  const c = String(category || '').toLowerCase();
  if (!c) return null;
  for (const slug of CATEGORY_SLUGS) {
    if (c.includes(slug)) return slug;
  }
  return null;
}

export function pluralize(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function truncate(text, max) {
  const s = String(text || '');
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const idx = cut.lastIndexOf(' ');
  return (idx > max * 0.6 ? cut.slice(0, idx) : cut) + '…';
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
