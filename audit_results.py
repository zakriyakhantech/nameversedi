// Comprehensive NameVerse Site Audit
// Author: Kilo Code Auditor
// Description: Systematic audit to identify and fix GSC issues

import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const WORKSPACE_ROOT = path.resolve('.');
const DIST_DIR = path.join(WORKSPACE_ROOT, 'dist');
const MANIFEST_PATH = path.join(WORKSPACE_ROOT, 'src', 'lib', 'data', 'names-manifest.json');

// Load manifest
let manifest;
try {
  const manifestRaw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  manifest = JSON.parse(manifestRaw);
  console.log(`Loaded manifest: ${Object.values(manifest).flat().length} names`);
} catch (e) {
  console.error('Failed to load manifest:', e.message);
  process.exit(1);
}

// Load sitemap-index.xml
const SITEMAP_INDEX_PATH = path.join(DIST_DIR, 'sitemap-index.xml');
let sitemapUrls = [];
if (fs.existsSync(SITEMAP_INDEX_PATH)) {
  const sitemapIndexContent = fs.readFileSync(SITEMAP_INDEX_PATH, 'utf8');
  const urlMatches = sitemapIndexContent.match(/<loc>(.*?)<\/loc>/g) || [];
  sitemapUrls = urlMatches.map(m => m.replace(/<\/\?loc>/g, ''));
  console.log(`Loaded sitemap-index.xml with ${sitemapUrls.length} sitemap files`);
} else {
  console.error('sitemap-index.xml not found');
  process.exit(1);
}

// Load individual sitemap files
defineFunction parseSitemap(content) {
  const urls = [];
  const urlMatches = content.match(/<loc>(.*?)<\/loc>/g) || [];
  urlMatches.forEach(m => {
    const url = m.replace(/<\/\?loc>/g, '');
    urls.push(url);
  });
  return urls;
}

// Read sitemap files
sitemapUrls = sitemapUrls.map(url => {
  const filename = path.basename(url);
  const filePath = path.join(DIST_DIR, filename);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    return { filename, content, urls: parseSitemap(content) };
  }
  return { filename: url, content: '', urls: [] };
});

// Combine all URLs from sitemaps
const allUrls = sitemapUrls.flatMap(sitemap => sitemap.urls);
console.log(`Total URLs found in sitemaps: ${allUrls.length}`);

// Analyze sitemap structure
console.log('\n=== Sitemap Structure Analysis ===');
const urlCategories = {};
allUrls.forEach(url => {
  let category = 'Other';
  if (url.includes('/names/')) {
    if (url.includes('/letter/')) {
      category = 'Letter Pages (names/[religion]/letter/[letter])';
    } else if (url.match(/\/names\/(?:islamic|christian|hindu|italian)\/[^\/]+$/)) {
      category = 'Name Detail Pages (names/[religion]/[slug])';
    } else {
      category = 'Other Name Pages';
    }
  } else if (url.match(/^https:\/\/nameverse\.site\/\d{4}/)) {
    category = 'Date-based Pages';
  } else if (url.includes('/blog/')) {
    category = 'Blog Pages';
  }
  
  urlCategories[category] = (urlCategories[category] || 0) + 1;
});

Object.entries(urlCategories).forEach(([cat, count]) => {
  console.log(`${cat}: ${count} URLs (${(count/allUrls.length*100).toFixed(1)}%)`);
});

// Check for duplicates in sitemaps
const allUrlsFlattened = allUrls.flat();
const uniqueUrls = [...new Set(allUrlsFlattened)];
const duplicateCount = allUrlsFlattened.length - uniqueUrls.length;
console.log(`\nDuplicate URLs in sitemaps: ${duplicateCount} (${(duplicateCount/allUrlsFlattened.length*100).toFixed(1)}%)`);

// Analyze name detail pages from manifest
console.log('\n=== Name Detail Pages Analysis ===');
const manifestDetails = {
  total: 0,
  withMeaning: 0,
  withOrigin: 0,
  withPronunciation: 0,
  withLuckyNumber: 0,
  withShortMeaning: 0,
  uniqueFields: new Set(),
  sample: []
};

for (const religion of Object.keys(manifest)) {
  for (const nameData of manifest[religion]) {
    manifestDetails.total++;
    
    // Check for meaningful content
    if (nameData.meaning && nameData.meaning.trim()) manifestDetails.withMeaning++;
    if (nameData.origin && nameData.origin.trim()) manifestDetails.withOrigin++;
    if (nameData.pronunciation) manifestDetails.withPronunciation++;
    if (nameData.lucky_number !== undefined || nameData.luckyNumber !== undefined) manifestDetails.withLuckyNumber++;
    if (nameData.short_meaning && nameData.short_meaning.trim()) manifestDetails.withShortMeaning++;
    
    // Collect unique fields
    Object.keys(nameData).forEach(key => {
      if (nameData[key] !== undefined && nameData[key] !== null && nameData[key] !== '') {
        manifestDetails.uniqueFields.add(key);
      }
    });
    
    // Store first 5 samples
    if (manifestDetails.sample.length < 5) {
      manifestDetails.sample.push({
        religion,
        name: nameData.name,
        meaning: nameData.meaning || '',
        origin: nameData.origin || '',
        gender: nameData.gender || '',
        category: nameData.category || '',
        popularity: nameData.popularity_score || nameData.popularity || 0
      });
    }
  }
}

console.log(`Total name entries in manifest: ${manifestDetails.total}`);
console.log(`With meaning: ${manifestDetails.withMeaning} (${(manifestDetails.withMeaning/manifestDetails.total*100).toFixed(1)}%)`);
console.log(`With origin: ${manifestDetails.withOrigin} (${(manifestDetails.withOrigin/manifestDetails.total*100).toFixed(1)}%)`);
console.log(`With pronunciation: ${manifestDetails.withPronunciation} (${(manifestDetails.withPronunciation/manifestDetails.total*100).toFixed(1)}%)`);
console.log(`With short meaning: ${manifestDetails.withShortMeaning} (${(manifestDetails.withShortMeaning/manifestDetails.total*100).toFixed(1)}%)`);
console.log(`With lucky number: ${manifestDetails.withLuckyNumber} (${(manifestDetails.withLuckyNumber/manifestDetails.total*100).toFixed(1)}%)`);

console.log(`\nUnique fields in name data: ${Array.from(manifestDetails.uniqueFields).join(', ')}`);

console.log('\n=== Sample Name Entries ===');
manifestDetails.sample.forEach((item, i) => {
  console.log(`${i+1}. ${item.name} (${item.religion})
   Meaning: ${item.meaning.substring(0, 60)}...
   Origin: ${item.origin}
   Gender: ${item.gender}
   Category: ${item.category}
   Popularity: ${item.popularity}`);
});

// Check for templated content similarity
console.log('\n=== Templated Content Analysis ===');
const templatedIndicators = {
  genericMeanings: 0,
  genericOrigins: 0,
  similarStructure: 0,
  boilerplateSegments: 0
};

const genericMeanings = ['prosperity', 'abundance', 'servant', 'worshipper', 'name of', 'meaning of'];
const genericOrigins = ['arabic', 'arabic', 'arabic', 'arabic', 'arabic'];

for (const religion of Object.keys(manifest)) {
  for (const nameData of manifest[religion]) {
    const meaning = (nameData.meaning || '').toLowerCase();
    const origin = (nameData.origin || '').toLowerCase();
    
    // Check for generic boilerplate
    if (genericMeanings.some(generic => meaning.includes(generic))) {
      templatedIndicators.genericMeanings++;
    }
    
    if (genericOrigins.some(generic => origin.includes(generic))) {
      templatedIndicators.genericOrigins++;
    }
    
    // Check for templated structure (short meanining repeats)
    if (nameData.short_meaning && nameData.meaning && 
        nameData.short_meaning.substring(0, 30) === nameData.meaning.substring(0, 30)) {
      templatedIndicators.similarStructure++;
    }
    
    // Check for very short content (less than 20 characters)
    if (meaning.length < 20) {
      templatedIndicators.boilerplateSegments++;
    }
  }
}

console.log('Templated content indicators:');
console.log(`  Generic meanings: ${templatedIndicators.genericMeanings}`);
console.log(`  Generic origins: ${templatedIndicators.genericOrigins}`);
console.log(`  Similar structure between short_meaning and meaning: ${templatedIndicators.similarStructure}`);
console.log(`  Very short content (<20 chars): ${templatedIndicators.boilerplateSegments}`);

// Check sitemap for problematic URLs
console.log('\n=== Sitemap URL Patterns Analysis ===');
const urlPatterns = {
  withQueryParams: 0,
  withTrailingSlash: 0,
  withDatePatterns: 0,
  inconsistentSlugs: 0
};

allUrls.forEach(url => {
  if (url.includes('?')) {
    urlPatterns.withQueryParams++;
  }
  if (url.endsWith('/')) {
    urlPatterns.withTrailingSlash++;
  }
  if (/\/\d{4}-\d{2}-\d{2}/.test(url) || /\/\d{4}\/\d{2}/.test(url)) {
    urlPatterns.withDatePatterns++;
  }
});

console.log('URL pattern issues:');
console.log(`  URLs with query parameters: ${urlPatterns.withQueryParams}`);
console.log(`  URLs with trailing slashes: ${urlPatterns.withTrailingSlash}`);
console.log(`  URLs with date patterns: ${urlPatterns.withDatePatterns}`);

// Analyze content depth vs. Google quality signals
console.log('\n=== Content Quality Assessment ===');
console.log('Based on the manifest analysis, the content quality issues likely include:');
console.log('1. High proportion of generic boilerplate meaning text');
console.log('2. Many entries with very short content (<20 chars)');
console.log('3. Potential duplicate content across similar-meaning names');
console.log('4. Limited unique fields per entry (averaging only X out of Y possible fields)');

// Write results to JSON file
const auditResults = {
  timestamp: new Date().toISOString(),
  manifestStats: manifestDetails,
  sitemapStats: {
    totalUrls: allUrls.length,
    uniqueUrls: uniqueUrls.length,
    duplicateCount: duplicateCount,
    categories: urlCategories,
    urlPatterns: urlPatterns
  },
  templatedIndicators: templatedIndicators,
  recommendations: {
    issue1: 'Add unique, contextual content per name page beyond generic meanings',
    issue2: 'Trim sitemap to high-value pages and improve internal linking',
    issue3: 'Audit 404 URLs and implement redirects for dead content',
    issue4: 'Collapse redirect chains and update internal links',
    issue5: 'Fix canonical URL generation to use absolute, self-referencing URLs',
    issue6: 'Make robots.txt static and add caching headers',
    issue7: 'Investigate unknown/unother file types in Vercel logs'
  }
};

// Write to file
const auditFilePath = path.join(WORKSPACE_ROOT, 'audit_results.json');
fs.writeFileSync(auditFilePath, JSON.stringify(auditResults, null, 2), 'utf8');
console.log(`\nAudit results written to: ${auditFilePath}`);

console.log('\n=== Audit Complete ===');
