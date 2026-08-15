import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, 'public');
const MANIFEST_PATH = path.join(ROOT, 'src', 'lib', 'data', 'names-manifest.json');

const VALID_RELIGIONS = ['islamic', 'christian', 'hindu', 'italian'];
const MAX_URLS_PER_SITEMAP = 3000;
const SITE_URL = 'https://nameverse.site';
const LAST_MOD = '2026-08-15';

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return { islamic: [], christian: [], hindu: [], italian: [] };
  }
}

function getSlugs(religion) {
  const manifest = loadManifest();
  return (manifest[religion] || [])
    .map((item) => String(item.slug || '').trim().toLowerCase().replace(/\.json$/i, ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

// Always forward slashes in URLs regardless of OS path separator.
function toUrlPath(relPath) {
  return relPath.split(path.sep).join('/');
}

function writeUrlsFile(filePath, urlPaths, priority) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const p of urlPaths) {
    xml += `  <url>\n    <loc>${SITE_URL}/${p}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  }
  xml += '</urlset>';
  fs.writeFileSync(filePath, xml, 'utf8');
  console.log(`Generated ${filePath} with ${urlPaths.length} URLs`);
}

function main() {
  console.log('Generating sitemaps for NameVerse...\n');
  const manifest = loadManifest();
  const sitemapDir = path.join(PUBLIC_DIR, 'sitemaps');
  fs.mkdirSync(sitemapDir, { recursive: true });
  const allChild = [];

  // ─── Static / hub / letter / gender / origin / category pages ───
  const staticPaths = [
    '',
    'names',
    'search',
    'advanced-search',
    'names-by-meaning',
    'names-by-origin',
    'name-meanings',
    'popularity',
    'trending-names',
    'unique-names',
    'blog',
    'about',
    'contact',
    'privacy',
    'terms',
    'guides/expert-naming-guide',
    'origins',
    'categories',
    ...['arabic', 'biblical', 'sanskrit', 'hindu', 'italian', 'persian', 'english', 'tamil', 'hindi', 'bengali', 'urdu'].map((o) => `origins/${o}`),
    ...['islamic', 'hindu', 'biblical', 'saint', 'virtue', 'italian'].map((c) => `categories/${c}`),
  ];

  for (const religion of VALID_RELIGIONS) {
    staticPaths.push(`names/${religion}`);
    for (const gender of ['boy', 'girl']) {
      staticPaths.push(`${religion}-${gender}-names`);
    }
    const available = new Set();
    for (const item of manifest[religion] || []) {
      if (!item.name) continue;
      const fc = item.name.trim().charAt(0).toLowerCase();
      available.add(/^[a-z]$/.test(fc) ? fc : '#');
    }
    for (const letter of [...'abcdefghijklmnopqrstuvwxyz', '#']) {
      if (available.has(letter)) {
        staticPaths.push(`names/${religion}/letter/${letter === '#' ? '%23' : letter}`);
      }
    }
  }

  const staticSitemapPath = path.join(sitemapDir, 'pages.xml');
  writeUrlsFile(staticSitemapPath, staticPaths, '0.8');
  allChild.push(staticSitemapPath);

  // ─── Per-religion name sitemaps (split at MAX_URLS_PER_SITEMAP) ───
  for (const religion of VALID_RELIGIONS) {
    const slugs = getSlugs(religion);
    console.log(`Processing ${religion}: ${slugs.length} names`);
    const chunks = [];
    for (let i = 0; i < slugs.length; i += MAX_URLS_PER_SITEMAP) {
      chunks.push(slugs.slice(i, i + MAX_URLS_PER_SITEMAP));
    }
    if (chunks.length === 1) {
      const childPath = path.join(sitemapDir, `${religion}.xml`);
      writeUrlsFile(childPath, chunks[0].map((s) => `names/${religion}/${s}`), '0.8');
      allChild.push(childPath);
    } else {
      chunks.forEach((chunk, i) => {
        const childPath = path.join(sitemapDir, `${religion}-${i + 1}.xml`);
        writeUrlsFile(childPath, chunk.map((s) => `names/${religion}/${s}`), '0.8');
        allChild.push(childPath);
      });
    }
  }

  // ─── Master index at /sitemap.xml and /sitemaps/sitemap.xml ───
  const indexXml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    allChild
      .map((childPath) => {
        const loc = `${SITE_URL}/${toUrlPath(path.relative(PUBLIC_DIR, childPath))}`;
        return `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n  </sitemap>`;
      })
      .join('\n') +
    '\n</sitemapindex>';

  fs.writeFileSync(path.join(sitemapDir, 'sitemap.xml'), indexXml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), indexXml, 'utf8');
  console.log(`Master sitemap index written with ${allChild.length} child sitemaps`);
}

main();
