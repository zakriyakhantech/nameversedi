# NameVerse Site Audit Script
# Author: Kilo Code Auditor
# Description: Audit script for NameVerse.site GSC issues (Issues 3-7)
# Purpose: Identify 404s, redirects, canonical issues, robots.txt availability, and crawl failures

import json
import os
import csv
import requests
from pathlib import Path
from urllib.parse import urljoin, urlparse

# Configuration
BASE_URL = "https://nameverse.site"
WORKSPACE_ROOT = Path("C:/New folder (2)/nameverse")
DIST_DIR = WORKSPACE_ROOT / "dist"

# Audit results storage
audit_results = {
    "issue_3_404s": {},
    "issue_4_redirects": {},
    "issue_5_canonical": {},
    "issue_6_robots": {},
    "issue_7_unknown": {}
}

# Read the manifest to get all name pages
manifest_path = WORKSPACE_ROOT / "src" / "lib" / "data" / "names-manifest.json"
manifest = {}

if manifest_path.exists():
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)

print("=== NameVerse Site Audit Script ===")
print(f"Base URL: {BASE_URL}")
print(f"Manifest entries: {sum(len(v) for v in manifest.values())}")
print()

# Load sitemap index

def load_sitemap_index():
    sitemap_index_path = DIST_DIR / "sitemap-index.xml"
    if not sitemap_index_path.exists():
        print("ERROR: sitemap-index.xml not found in dist directory")
        return []
    
    with open(sitemap_index_path, 'r') as f:
        content = f.read()
    
    # Simple XML parsing for sitemap URLs
    sitemaps = []
    start = content.find('<loc>')
    while start != -1:
        end = content.find('</loc>', start)
        if end != -1:
            url = content[start+5:end]
            sitemaps.append(url)
            start = content.find('<loc>', end)
    
    return sitemaps

def parse_sitemap(sitemap_url):
    """Parse a sitemap XML and extract all URLs"""
    sitemap_path = DIST_DIR / os.path.basename(sitemap_url)
    if not sitemap_path.exists():
        print(f"WARNING: Sitemap file not found: {sitemap_url}")
        return []
    
    with open(sitemap_path, 'r') as f:
        content = f.read()
    
    urls = []
    start = content.find('<loc>')
    while start != -1:
        end = content.find('</loc>', start)
        if end != -1:
            url = content[start+5:end]
            urls.append(url)
            start = content.find('<loc>', end)
    
    return urls

def check_url_status(url):
    """Check HTTP status of a URL"""
    try:
        response = requests.get(url, timeout=10, allow_redirects=True)
        return {
            'url': url,
            'status_code': response.status_code,
            'final_url': response.url,
            'is_redirect': response.history,
            'content_length': len(response.content),
            'content_type': response.headers.get('Content-Type', ''),
            'server': response.headers.get('Server', ''),
            'error': None
        }
    except Exception as e:
        return {
            'url': url,
            'status_code': None,
            'final_url': url,
            'is_redirect': [],
            'content_length': 0,
            'content_type': '',
            'server': '',
            'error': str(e)
        }

def load_robots_txt():
    """Load and analyze robots.txt"""
    robots_path = DIST_DIR / "robots.txt"
    if not robots_path.exists():
        return {
            'status': 'missing',
            'content': None,
            'size': 0,
            'error': 'robots.txt not found in dist directory'
        }
    
    try:
        with open(robots_path, 'r') as f:
            content = f.read()
        
        return {
            'status': 'found',
            'content': content,
            'size': len(content),
            'error': None,
            'has_sitemap': 'Sitemap:' in content
        }
    except Exception as e:
        return {
            'status': 'error',
            'content': None,
            'size': 0,
            'error': str(e)
        }

def analyze_content_depth():
    """Analyze content depth across the manifest"""
    print("\n=== Content Depth Analysis ===")
    
    total_names = 0
    unique_fields_count = 0
    empty_meanings = 0
    
    for religion, names in manifest.items():
        for name_data in names:
            total_names += 1
            
            # Check what fields are populated
            populated_fields = [k for k, v in name_data.items() 
                              if v and v != '' and k not in ['slug', 'religion']]
            
            # Special check for meaningful content
            if not name_data.get('meaning') or name_data['meaning'].strip() == '':
                empty_meanings += 1
            
            unique_fields_count += len(populated_fields)
    
    avg_fields = unique_fields_count / max(total_names, 1)
    print(f"Total name entries: {total_names}")
    print(f"Average populated fields per entry: {avg_fields:.1f}")
    print(f"Entries with empty meanings: {empty_meanings} ({empty_meanings/max(total_names,1)*100:.1f}%)")
    
    # Sample some entries
    print("\nSample entries:")
    sample_count = 0
    for religion, names in manifest.items():
        for name_data in names[:2]:  # First 2 from each religion
            if sample_count >= 5:  # Only show first 5 samples
                break
            print(f"  {religion}: {name_data.get('name', 'N/A')}")
            print(f"    Meaning: {name_data.get('meaning', 'N/A')[:60]}...")
            print(f"    Origin: {name_data.get('origin', 'N/A')}")
            print(f"    Fields: {', '.join([k for k, v in name_data.items() if v and v != ''])}")
            sample_count += 1
        if sample_count >= 5:
            break

def main():
    print("Starting NameVerse Site Audit...")
    
    # Analyze content depth first (Issue 1)
    analyze_content_depth()
    
    # Issue 3: Check for 404s
    print("\n=== Issue 3: 404 Error Analysis ===")
    
    # Get all URLs from sitemap
    sitemap_urls = load_sitemap_index()
    if not sitemap_urls:
        print("No sitemap URLs found to analyze")
        return
    
    print(f"Found {len(sitemap_urls)} URLs in sitemap")
    
    # Check a sample of URLs for 404s
    sample_size = min(100, len(sitemap_urls))
    sample_urls = sitemap_urls[:sample_size]
    
    print(f"Checking first {sample_size} URLs for 404 errors...")
    
    for url in sample_urls:
        result = check_url_status(url)
        
        # Track 404s
        if result['status_code'] == 404:
            audit_results['issue_3_404s'][url] = result
        
        # Track redirects
        if result['is_redirect']:
            audit_results['issue_4_redirects'][url] = result
    
    print(f"Found {len(audit_results['issue_3_404s'])} 404s in sample")
    print(f"Found {len(audit_results['issue_4_redirects'])} redirect chains in sample")
    
    # Issue 6: Check robots.txt
    print("\n=== Issue 6: Robots.txt Analysis ===")
    robots_status = load_robots_txt()
    print(f"Robots.txt status: {robots_status['status']}")
    print(f"Size: {robots_status['size']} bytes")
    print(f"Contains sitemap reference: {robots_status.get('has_sitemap', 'unknown')}")
    if robots_status['error']:
        print(f"Error: {robots_status['error']}")
    
    audit_results['issue_6_robots'] = robots_status
    
    # Write results to CSV
    output_file = WORKSPACE_ROOT / "audit_results.csv"
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['url', 'status_code', 'final_url', 'is_redirect', 'content_length', 'error', 'issue_type']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Write 404 results
        for url, result in audit_results['issue_3_404s'].items():
            writer.writerow({
                'url': url,
                'status_code': result['status_code'],
                'final_url': result['final_url'],
                'is_redirect': str(result['is_redirect']),
                'content_length': result['content_length'],
                'error': result['error'],
                'issue_type': 'Issue 3 - 404 Error'
            })
        
        # Write redirect results
        for url, result in audit_results['issue_4_redirects'].items():
            writer.writerow({
                'url': url,
                'status_code': result['status_code'],
                'final_url': result['final_url'],
                'is_redirect': str(len(result['is_redirect'])),
                'content_length': result['content_length'],
                'error': result['error'],
                'issue_type': 'Issue 4 - Redirect'
            })
    
    print(f"\nAudit complete. Results written to: {output_file}")
    print(f"Total 404s found: {len(audit_results['issue_3_404s'])}")
    print(f"Total redirects found: {len(audit_results['issue_4_redirects'])}")

if __name__ == "__main__":
    main()
