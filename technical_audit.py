// NameVerse Site Technical Audit
// Focus: Migration-related issues, not content quality
// Author: Kilo Code Auditor

import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const WORKSPACE_ROOT = path.resolve('.');
const DIST_DIR = path.join(WORKSPACE_ROOT, 'dist');

console.log('=== NameVerse Site Technical Audit ===');
console.log('Focus: Migration-related technical issues');
console.log();

// 1. Check robots.txt
const robotsPath = path.join(DIST_DIR, 'robots.txt');
if (fs.existsSync(robotsPath)) {
  const robotsContent = fs.readFileSync(robotsPath, 'utf8');
  console.log('=== robots.txt Analysis ===');
  console.log('Status: FOUND');
  console.log('Content:');
  console.log(robotsContent);
  console.log('Size:', robotsContent.length, 'bytes');
  console.log('Contains sitemap reference:', robotsContent.includes('Sitemap:'));
  console.log('Last modified:', new Date(fs.statSync(robotsPath).mtime).toISOString());
  console.log();
} else {
  console.log('ERROR: robots.txt not found in dist/');
  console.log();
}

// 2. Check sitemap-index.xml
sitemap_index_path = path.join(DIST_DIR, 'sitemap-index.xml');
if (fs.existsSync(sitemap_index_path)) {
  const sitemapIndexContent = fs.readFileSync(sitemap_index_path, 'utf8');
  console.log('=== sitemap-index.xml Analysis ===');
  console.log('Status: FOUND');
  console.log('Content:');
  console.log(sitemapIndexContent);
  console.log();
} else {
  console.log('ERROR: sitemap-index.xml not found');
  console.log();
}

// 3. Check sitemap files
sitemap_files = fs.readdirSync(DIST_DIR).filter(f => f.match(/^sitemap-\d+\.xml$/));
console.log('=== Sitemap Files ===');
console.log(`Found ${sitemap_files.length} sitemap files:`);
sitemap_files.forEach((file, i) => {
  const filepath = path.join(DIST_DIR, file);
  const stats = fs.statSync(filepath);
  const content = fs.readFileSync(filepath, 'utf8');
  const urlMatches = content.match(/<loc>(.*?)<\/loc>/g) || [];
  
  console.log(`${i+1}. ${file}`);
  console.log(`   Size: ${stats.size} bytes`);
  console.log(`   Last modified: ${new Date(stats.mtime).toISOString()}`);
  console.log(`   URLs: ${urlMatches.length}`);
  
  // Sample first few URLs
  console.log(`   Sample URLs:`);
  urlMatches.slice(0, 3).forEach((m, j) => {
    const url = m.replace(/<\/\?loc>/g, '');
    console.log(`     ${j+1}. ${url}`);
  });
  console.log();
});

// 4. Check dist directory structure
console.log('=== Dist Directory Structure ===');
function scanDir(dir, indent = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });
  
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    const stat = fs.statSync(fullPath);
    const modified = new Date(stat.mtime).toISOString();
    
    if (entry.isDirectory()) {
      console.log(`${indent}📁 ${entry.name}/ (modified: ${modified})`);
      // Check if it's a name directory
      if (entry.name.match(/^(islamic|christian|hindu|italian)$/)) {
        const nameFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('.json'));
        console.log(`${indent}   Contains ${nameFiles.length} name JSON files`);
        if (nameFiles.length > 0) {
          console.log(`${indent}   Sample: ${nameFiles[0]}`);
        }
      }
      scanDir(fullPath, indent + '  ');
    } else {
      const icon = entry.name.endsWith('.html') ? '🌐' : 
                   entry.name.endsWith('.xml') ? '📄' : 
                   entry.name.endsWith('.json') ? '📋' : '📄';
      console.log(`${indent}${icon} ${entry.name} (size: ${stat.size}, modified: ${modified})`);
    }
  });
}

scanDir(DIST_DIR);
console.log();

// 5. Check for potential migration issues
console.log('=== Migration Issue Analysis ===');

// Check for old URLs in sitemap that might be broken
const allUrls = sitemap_files.flatMap(file => {
  const filepath = path.join(DIST_DIR, file);
  const content = fs.readFileSync(filepath, 'utf8');
  return (content.match(/<loc>(.*?)<\/loc>/g) || []).map(m => m.replace(/<\/\?loc>/g, ''));
});

console.log(`Total URLs in sitemaps: ${allUrls.length}`);

// Check for potential old URL patterns
const oldPatterns = [];
allUrls.forEach(url => {
  if (url.includes('/blog/') && url.match(/\/\d{4}-\d{2}-\d{2}/)) {
    oldPatterns.push('Date-based blog URL');
  }
  if (url.includes('/names/') && !url.includes('/letter/') && !url.includes('/islamic/') && 
      !url.includes('/christian/') && !url.includes('/hindu/') && !url.includes('/italian/')) {
    oldPatterns.push('Unexpected name URL pattern');
  }
});

if (oldPatterns.length > 0) {
  console.log('Potential migration-related URL patterns found:');
  oldPatterns.forEach((pattern, i) => {
    console.log(`  ${i+1}. ${pattern}`);
  });
} else {
  console.log('No obvious migration-related URL patterns detected.');
}

// 6. Check for any static HTML files that might be broken
console.log('\n=== HTML File Analysis ===');
const htmlFiles = fs.readdirSync(DIST_DIR).filter(f => f.endsWith('.html'));
console.log(`Total HTML files: ${htmlFiles.length}`);

// Check for 404.html
if (htmlFiles.includes('404.html')) {
  console.log('✓ 404.html exists');
} else {
  console.log('✗ 404.html missing');
}

// 7. Summary of potential fixes needed
console.log('\n=== Recommended Fixes ===');

console.log('1. Robots.txt: Ensure it\'s properly configured and references sitemap-index.xml');
console.log('2. Sitemap: Validate all URLs in sitemap files are accessible');
console.log('3. Dist Structure: Verify all name directories exist with JSON files');
console.log('4. Migration Cleanup: Remove old URL patterns from sitemaps if they\'re broken');
console.log('5. Canonical URLs: Ensure name pages use proper canonical tags');
console.log('6. Redirects: Check for redirect chains from old to new URLs');

console.log('\n=== Technical Audit Complete ===');
