import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const PUBLIC_DIR = path.join(ROOT, 'public');
const NAMES_DIR = path.join(PUBLIC_DIR, 'names');
const MANIFEST_PATH = path.join(ROOT, 'src', 'lib', 'data', 'names-manifest.json');

const SITE_URL = 'https://nameverse.site';
const SITEMAP_LIMIT = 5000;

const VALID_RELIGIONS = ['islamic', 'christian', 'hindu', 'italian'];

const EXCLUDED_PATHS = new Set([
  '/search',
  '/advanced-search',
  '/my-names',
  '/404',
  '/homepage',
]);

function loadManifest() {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { islamic: [], christian: [], hindu: [], italian: [] };
  }
}

function getFileMtime(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.mtime;
  } catch {
    return null;
  }
}

function formatDate(date) {
  if (!date) return null;
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function htmlFileToRoute(filePath) {
  const basename = path.basename(filePath, '.html');
  if (basename === 'index') return '/';
  return '/' + basename;
}

function scanDistForPages() {
  const pages = [];

  function scanDir(dir, prefix = '') {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, prefix + entry.name + '/');
      } else if (entry.name.endsWith('.html')) {
        const basename = entry.name.replace(/\.html$/, '');
        if (basename === 'index') {
          pages.push('/' + prefix.replace(/\/+$/, ''));
        } else {
          pages.push('/' + prefix + basename);
        }
      }
    }
  }

  scanDir(DIST_DIR);
  return pages;
}

function getNamePageMtime(religion, slug) {
  const nameFile = path.join(NAMES_DIR, religion, `${slug}.json`);
  return getFileMtime(nameFile);
}

function getStaticPageMtime(route) {
  const srcPath = path.join(ROOT, 'src', 'pages');
  const parts = route.split('/').filter(Boolean);

  let currentPath = srcPath;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const fullPath = path.join(currentPath, part);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      currentPath = fullPath;
    } else {
      const astroFile = fullPath + '.astro';
      if (fs.existsSync(astroFile)) {
        return getFileMtime(astroFile);
      }

      const dynamicFile = path.join(currentPath, `[${part}].astro`);
      if (fs.existsSync(dynamicFile)) {
        return getFileMtime(dynamicFile);
      }

      const catchAllFile = path.join(currentPath, `[...${part}].astro`);
      if (fs.existsSync(catchAllFile)) {
        return getFileMtime(catchAllFile);
      }

      for (const entry of fs.readdirSync(currentPath)) {
        if (entry.includes('[') && entry.includes(']')) {
          return getFileMtime(path.join(currentPath, entry));
        }
      }

      return null;
    }
  }

  const indexFile = path.join(currentPath, 'index.astro');
  if (fs.existsSync(indexFile)) {
    return getFileMtime(indexFile);
  }

  return null;
}

function generateSitemapIndex(sitemaps) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const sitemap of sitemaps) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${escapeXml(sitemap.loc)}</loc>\n`;
    if (sitemap.lastmod) {
      xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';
  }

  xml += '</sitemapindex>';
  return xml;
}

function generateSitemap(urls) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
    if (url.lastmod) {
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== SITE_URL) {
      return { valid: false, error: `URL origin mismatch: ${parsed.origin} !== ${SITE_URL}` };
    }
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: `URL must use HTTPS: ${url}` };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Invalid URL: ${url} - ${e.message}` };
  }
}

function validateSitemap(sitemapPath) {
  const errors = [];
  try {
    const content = fs.readFileSync(sitemapPath, 'utf8');

    if (!content.startsWith('<?xml')) {
      errors.push('Missing XML declaration');
    }

    if (content.includes('crxlauncher')) {
      errors.push('Contains crxlauncher attributes');
    }

    if (content.includes('<changefreq>')) {
      errors.push('Contains unnecessary changefreq elements');
    }

    if (content.includes('<priority>')) {
      errors.push('Contains unnecessary priority elements');
    }

    const urlMatches = content.match(/<loc>(.*?)<\/loc>/g) || [];
    const urls = urlMatches.map((m) => m.replace(/<\/?loc>/g, ''));

    const seen = new Set();
    for (const url of urls) {
      if (seen.has(url)) {
        errors.push(`Duplicate URL: ${url}`);
      }
      seen.add(url);

      const validation = validateUrl(url);
      if (!validation.valid) {
        errors.push(validation.error);
      }
    }

    return { valid: errors.length === 0, errors, urlCount: urls.length };
  } catch (e) {
    return { valid: false, errors: [`Failed to read sitemap: ${e.message}`], urlCount: 0 };
  }
}

function pageExistsInDist(route) {
  const filePath = route === '/'
    ? path.join(DIST_DIR, 'index.html')
    : path.join(DIST_DIR, route + '.html');

  if (fs.existsSync(filePath)) return true;

  const nestedPath = path.join(DIST_DIR, route, 'index.html');
  return fs.existsSync(nestedPath);
}

function getHtmlFilePath(route) {
  const filePath = route === '/'
    ? path.join(DIST_DIR, 'index.html')
    : path.join(DIST_DIR, route + '.html');

  if (fs.existsSync(filePath)) return filePath;

  const nestedPath = path.join(DIST_DIR, route, 'index.html');
  return fs.existsSync(nestedPath) ? nestedPath : null;
}

function isNoindexRoute(route) {
  const filePath = getHtmlFilePath(route);
  if (!filePath) return false;

  try {
    const html = fs.readFileSync(filePath, 'utf8');
    return html.includes('name="robots"') && html.includes('noindex');
  } catch {
    return false;
  }
}

function generateRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap-index.xml
`;
}

async function main() {
  console.log('Generating sitemaps...\n');

  if (!fs.existsSync(DIST_DIR)) {
    console.error('ERROR: dist directory does not exist. Run astro build first.');
    process.exit(1);
  }

  console.log('Scanning dist for generated pages...');
  const distPages = scanDistForPages();
  console.log(`  Found ${distPages.length} HTML files in dist`);

  const allUrls = [];
  const seenRoutes = new Set();

  for (const route of distPages) {
    const cleanRoute = route === '/' ? '/' : route.replace(/\/+$/, '');

    if (seenRoutes.has(cleanRoute)) continue;
    seenRoutes.add(cleanRoute);

    if (EXCLUDED_PATHS.has(cleanRoute)) continue;
    if (isNoindexRoute(cleanRoute)) continue;

    if (cleanRoute.includes('/names/') && !cleanRoute.includes('/letter/')) {
      const parts = cleanRoute.split('/').filter(Boolean);
      if (parts.length === 3 && VALID_RELIGIONS.includes(parts[1])) {
        const [, religion, slug] = parts;
        const mtime = getNamePageMtime(religion, slug);
        const url = cleanRoute === '/' ? SITE_URL : `${SITE_URL}${cleanRoute}`;
        allUrls.push({ loc: url, lastmod: formatDate(mtime) });
        continue;
      }
    }

    const mtime = getStaticPageMtime(cleanRoute);
    const url = cleanRoute === '/' ? SITE_URL : `${SITE_URL}${cleanRoute}`;
    allUrls.push({ loc: url, lastmod: formatDate(mtime) });
  }

  allUrls.sort((a, b) => a.loc.localeCompare(b.loc));

  const totalUrls = allUrls.length;
  console.log(`\nTotal URLs for sitemap: ${totalUrls}`);

  const sitemapCount = Math.ceil(totalUrls / SITEMAP_LIMIT);
  console.log(`Sitemaps needed: ${sitemapCount}`);

  const existingSitemaps = fs.readdirSync(DIST_DIR).filter((f) => f.match(/^sitemap.*\.xml$/));
  for (const file of existingSitemaps) {
    fs.unlinkSync(path.join(DIST_DIR, file));
  }

  const sitemaps = [];
  for (let i = 0; i < sitemapCount; i++) {
    const start = i * SITEMAP_LIMIT;
    const end = Math.min(start + SITEMAP_LIMIT, totalUrls);
    const chunk = allUrls.slice(start, end);

    const filename = `sitemap-${i}.xml`;
    const filepath = path.join(DIST_DIR, filename);
    const sitemapXml = generateSitemap(chunk);

    fs.writeFileSync(filepath, sitemapXml, 'utf8');
    console.log(`  Generated ${filename} (${chunk.length} URLs)`);

    sitemaps.push({
      loc: `${SITE_URL}/${filename}`,
      lastmod: formatDate(new Date()),
    });
  }

  const sitemapIndexXml = generateSitemapIndex(sitemaps);
  const sitemapIndexPath = path.join(DIST_DIR, 'sitemap-index.xml');
  fs.writeFileSync(sitemapIndexPath, sitemapIndexXml, 'utf8');
  console.log(`\nGenerated sitemap-index.xml (${sitemaps.length} sitemaps)`);

  const robotsTxt = generateRobotsTxt();
  const robotsTxtPath = path.join(DIST_DIR, 'robots.txt');
  fs.writeFileSync(robotsTxtPath, robotsTxt, 'utf8');
  console.log('Generated robots.txt');

  console.log('\n--- Validation ---\n');

  let hasErrors = false;

  if (!fs.existsSync(robotsTxtPath)) {
    console.log('FAIL: robots.txt is missing');
    hasErrors = true;
  } else {
    const robotsContent = fs.readFileSync(robotsTxtPath, 'utf8');
    if (!robotsContent.includes('Sitemap:')) {
      console.log('FAIL: robots.txt missing sitemap reference');
      hasErrors = true;
    } else {
      console.log('PASS: robots.txt exists and contains sitemap reference');
    }
  }

  if (!fs.existsSync(sitemapIndexPath)) {
    console.log('FAIL: sitemap-index.xml is missing');
    hasErrors = true;
  } else {
    console.log('PASS: sitemap-index.xml exists');
  }

  const indexContent = fs.readFileSync(sitemapIndexPath, 'utf8');
  const sitemapRefs = (indexContent.match(/<loc>(.*?)<\/loc>/g) || [])
    .map((m) => m.replace(/<\/?loc>/g, ''))
    .filter((url) => url.includes('sitemap-') && url.endsWith('.xml'));

  for (const ref of sitemapRefs) {
    const filename = path.basename(ref);
    const filepath = path.join(DIST_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.log(`FAIL: Sitemap referenced in index but missing: ${filename}`);
      hasErrors = true;
    } else {
      const validation = validateSitemap(filepath);
      if (!validation.valid) {
        console.log(`FAIL: ${filename} has errors:`);
        for (const err of validation.errors.slice(0, 10)) {
          console.log(`  - ${err}`);
        }
        if (validation.errors.length > 10) {
          console.log(`  ... and ${validation.errors.length - 10} more errors`);
        }
        hasErrors = true;
      } else {
        console.log(`PASS: ${filename} is valid (${validation.urlCount} URLs)`);
      }
    }
  }

  const allSitemapUrls = new Map();
  let duplicateCount = 0;
  for (const ref of sitemapRefs) {
    const filename = path.basename(ref);
    const filepath = path.join(DIST_DIR, filename);
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8');
      const urls = (content.match(/<loc>(.*?)<\/loc>/g) || [])
        .map((m) => m.replace(/<\/?loc>/g, ''));
      for (const url of urls) {
        if (allSitemapUrls.has(url)) {
          duplicateCount++;
          if (duplicateCount <= 5) {
            console.log(`WARN: Duplicate URL found: ${url} (in ${allSitemapUrls.get(url)} and ${filename})`);
          }
        } else {
          allSitemapUrls.set(url, filename);
        }
      }
    }
  }

  if (duplicateCount > 0) {
    console.log(`FAIL: Found ${duplicateCount} duplicate URLs across sitemaps`);
    hasErrors = true;
  } else {
    console.log('PASS: No duplicate URLs found');
  }

  const invalidUrls = [];
  for (const [url] of allSitemapUrls) {
    const validation = validateUrl(url);
    if (!validation.valid) {
      invalidUrls.push(validation.error);
    }
  }

  if (invalidUrls.length > 0) {
    console.log(`FAIL: Found ${invalidUrls.length} invalid URLs:`);
    for (const err of invalidUrls.slice(0, 5)) {
      console.log(`  - ${err}`);
    }
    hasErrors = true;
  } else {
    console.log('PASS: All URLs are valid');
  }

  console.log('\n--- Summary ---\n');
  console.log(`Total URLs: ${totalUrls}`);
  console.log(`Sitemap files: ${sitemapCount}`);
  console.log(`Validation: ${hasErrors ? 'FAILED' : 'PASSED'}`);

  if (hasErrors) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});

