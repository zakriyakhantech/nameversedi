import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, 'public');
const NAMES_DIR = path.join(PUBLIC_DIR, 'names');
const MANIFEST_PATH = path.join(ROOT, 'src', 'lib', 'data', 'names-manifest.json');

const VALID_RELIGIONS = ['islamic', 'christian', 'hindu', 'italian'];
const MAX_URLS_PER_SITEMAP = 3000;

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

function loadManifest() {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { islamic: [], christian: [], hindu: [], italian: [] };
  }
}

function getSlugs(religion) {
  const normalizedReligion = normalizeReligion(religion);
  if (!normalizedReligion) return [];
  const manifest = loadManifest();
  const items = manifest[normalizedReligion] || [];
  return items.map((item) => item.slug).sort((a, b) => a.localeCompare(b));
}

function generateSitemapFile(religion, slugs, outputPath) {
  const sitemapPath = outputPath || path.join(PUBLIC_DIR, 'sitemaps', `${religion}.xml`);
  const dir = path.dirname(sitemapPath);
  
  fs.mkdirSync(dir, { recursive: true });
  
  const urls = [];
  const totalNames = slugs.length;
  
  // Split into chunks of MAX_URLS_PER_SITEMAP
  const chunks = [];
  for (let i = 0; i < totalNames; i += MAX_URLS_PER_SITEMAP) {
    chunks.push(slugs.slice(i, i + MAX_URLS_PER_SITEMAP));
  }
  
  if (chunks.length === 1) {
    // Single sitemap - write directly
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    for (const slug of slugs) {
      const url = `https://nameverse.site/names/${religion}/${slug}`;
      xml += `  <url>\n    <loc>${url}</loc>\n    <lastmod>2026-08-06</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }
    
    xml += '</urlset>';
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log(`Generated ${sitemapPath} with ${slugs.length} URLs`);
    return [sitemapPath];
  } else {
    // Multiple sitemaps - create child sitemaps and index
    const childSitemaps = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const childName = `${religion}-${i + 1}`;
      const childPath = path.join(dir, `${childName}.xml`);
      
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      for (const slug of chunk) {
        const url = `https://nameverse.site/names/${religion}/${slug}`;
        xml += `  <url>\n    <loc>${url}</loc>\n    <lastmod>2026-08-06</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
      
      xml += '</urlset>';
      fs.writeFileSync(childPath, xml, 'utf8');
      childSitemaps.push(childPath);
      console.log(`Generated ${childPath} with ${chunk.length} URLs`);
    }
    
    // Generate sitemap index
    const indexPath = path.join(dir, 'sitemap.xml');
    let indexXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    indexXml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    for (const childPath of childSitemaps) {
      const childRelPath = path.relative(PUBLIC_DIR, childPath);
      const lastmod = '2026-08-06';
      indexXml += `  <sitemap>\n    <loc>${`https://nameverse.site/${childRelPath}`}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>\n`;
    }
    
    indexXml += '</sitemapindex>';
    fs.writeFileSync(indexPath, indexXml, 'utf8');
    console.log(`Generated ${indexPath} referencing ${childSitemaps.length} child sitemaps`);
    
    return childSitemaps;
  }
}

// Main execution
function main() {
  console.log('Generating sitemaps for NameVerse...\n');
  
  for (const religion of VALID_RELIGIONS) {
    const slugs = getSlugs(religion);
    console.log(`Processing ${religion}: ${slugs.length} names`);
    generateSitemapFile(religion, slugs);
  }
  
  console.log('\nSitemap generation complete!');
}

main();