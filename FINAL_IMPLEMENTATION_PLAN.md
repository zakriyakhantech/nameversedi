# NameVerse — Final Forensic Audit & Implementation Plan

**Repository:** `C:\New folder (2)\nameverse` · **Live site:** https://nameverse.site
**Framework:** Astro 5.1 (`output: 'static'`) + Tailwind 3.4, deployed to GitHub Pages (`gh-pages`, remote `zk2636216-ui/nameverses`)
**Audit date:** 2026-08-30 · **Audited commit:** `524733e8` (Merge remote changes and resolve Layout.astro conflict)
**Scale:** 42,310 name records → 42,310 name detail pages, plus ~108 non-name routes ≈ **42,418 URLs**

> **Status: AUDIT ONLY. No source file has been modified.** The only side effect of this audit was a
> `npm run build:test` run, which regenerated `src/lib/data/names-manifest.json` and the four
> `public/names/*/_search-index.json` files at a 100-record limit. All five were restored with
> `git checkout` and verified: `git status` is clean and the manifest re-parses to
> islamic 18,655 / christian 12,893 / hindu 10,410 / italian 352. `dist/` (git-ignored) now holds a
> partial test build instead of the previous stale build; `dist.rar` still holds the earlier archive
> and the live GitHub Pages deployment was not touched.

---

## How to read this document

Every finding below is backed by one of four evidence classes, labelled inline:

| Label | Meaning |
|---|---|
| `[CODE]` | Read directly from a source file, cited as `path:line` |
| `[BUILD]` | Observed in an actual `npm run build:test` run or in `dist/` output |
| `[LIVE]` | Measured against https://nameverse.site with HTTP requests on 2026-08-30 |
| `[DATA]` | Computed by scanning all 42,310 JSON records or the manifest |

Nothing here is inferred from general SEO practice alone. Where something could not be verified it is
marked **UNVERIFIED** and left as an open question.

---

# 1. EXECUTIVE SUMMARY

## 1.1 Current state

NameVerse is a genuinely large, genuinely useful static name database with a competent design system,
a sensible route hierarchy, and real per-name data (pronunciation, numerology, regional popularity,
multi-script transliterations) that most competitors do not have. That foundation is sound.

However, **the repository in its current state cannot be built at all**, and the last successfully
deployed build has three independent, verified defects that each individually prevent Google from
indexing the site's 42,310 programmatic pages at scale: there is no sitemap, every programmatic
canonical URL points at a 301 redirect, and the homepage now carries a `noindex` directive. On top of
that, roughly 97% of name pages publish a fabricated human testimonial as `Person` structured data.
Layered underneath are ordinary but high-impact bugs: a one-character logic error makes 17,744 girl
names invisible and renders `/christian-girl-names` as a completely empty page; the alphabet browse
pages ship 1.6 MB of HTML each; and the navbar accounts for 52% of the bytes of every single page.

The encouraging part is that the highest-severity items are **small, surgical, low-risk fixes** — a
config-level trailing-slash change, a sitemap filter that compares the right string, one deleted
`noindex`, one missing variable, and one `includes()` predicate. Together they are roughly 40 lines of
change and they unblock everything else.

## 1.2 Biggest strengths (preserve these)

1. **Genuinely differentiated per-name data.** `[DATA]` 79.8% of records carry pronunciation (English + IPA), lucky number/day/stone/colours, life-path number, numerology prose, emotional traits, and 3-region popularity tables. 53% carry Hindi script, 26.5% carry Arabic and Urdu script. This is real, non-trivial data and it is the site's moat.
2. **A coherent, token-driven design system.** `[CODE]` `src/styles/global.css:6-58` defines a complete light/dark token set as RGB triplets, wired into Tailwind with alpha support (`tailwind.config.cjs:11-53`). Component classes (`.card`, `.btn-*`, `.badge`, `.input`, `.eyebrow`) are defined once and reused. This is better architecture than most sites of this size.
3. **Clean, human-readable URL structure** — `/names/{religion}/{slug}`, `/names/{religion}/letter/{a}`, `/{religion}-{gender}-names`, `/origins/{slug}`, `/categories/{slug}`. Semantic, stable, keyword-appropriate. **Do not change these.**
4. **Correct static-generation strategy.** `[CODE]` All dynamic routes declare `export const prerender = true` and derive `getStaticPaths()` from a build-time manifest, so there is no runtime data dependency and no server to operate.
5. **Ads are already deferred off the critical path.** `[CODE]` `src/layouts/Layout.astro:224-292` injects all three ad scripts on `load` + `requestIdleCallback`, and `src/components/Ad.astro:33` reserves `min-height` to prevent CLS. That is a deliberate, correct decision.
6. **Theme flash is already handled.** `[CODE]` `Layout.astro:174-188` applies the stored theme in an inline pre-paint script.
7. **`prefers-reduced-motion` is respected.** `[CODE]` `global.css:79-90`.

## 1.3 Biggest weaknesses

| # | Weakness | Verified scale |
|---|---|---|
| 1 | The build does not complete | `[BUILD]` Hard failure at `src/pages/homepage/index.astro` |
| 2 | No sitemap is produced, while `robots.txt` advertises one | `[BUILD]` 0 files matching `sitemap*` in `dist/` · `[LIVE]` `/sitemap-index.xml` → 404 |
| 3 | Programmatic canonicals point at 301 redirects | `[LIVE]` 42,310 name pages + all hub pages |
| 4 | Homepage emits `noindex, follow` | `[CODE]` `homepage/index.astro:94` reaching `/` via double-layout nesting |
| 5 | Fabricated people published as `Person` schema | `[DATA]` 41,113 of 42,310 pages (97.2%) |
| 6 | Girl names structurally unreachable | `[DATA]` 17,744 female names → `/christian-girl-names` renders 0 |
| 7 | Metadata duplicated at industrial scale | `[DATA]` 18,308 identical title patterns; 18,239 identical meta descriptions |
| 8 | Alphabet pages unusable on mobile | `[LIVE]` 1,610,194 bytes / 2,626 cards on one page |
| 9 | Six pages render with undefined CSS classes | `[CODE]` No container, no padding, invisible text in dark mode (1.10:1) |
| 10 | Primary muted text colour fails WCAG at every size | `[DATA]` 2.56:1, used 101 times across 29 files |

## 1.4 Biggest SEO risks, ranked

1. **Zero sitemap coverage for 42,310 pages.** The most likely cause of "Discovered – currently not indexed" at scale here. There is no other bulk discovery mechanism, because the letter pages that would otherwise serve that role are explicitly excluded from the sitemap filter and are 1.6 MB each.
2. **Every declared canonical on a programmatic page is a redirect.** Google will classify these as *Page with redirect*, *Alternate page with proper canonical*, or *Duplicate, Google chose different canonical than user*. This is the precise mechanism behind those three GSC states, and it affects ~42,380 of ~42,418 URLs.
3. **Scaled content abuse signals.** 18,244 pages share one FAQ answer template, 18,239 share one meta description, and 41,113 publish an invented human being as structured data. Under Google's *scaled content abuse* policy this is the highest-risk content pattern on the site — higher than thin content, because it is *deceptive* rather than merely *sparse*.
4. **Homepage `noindex`.** With conflicting `robots` meta tags Google honours the most restrictive. The homepage currently emits both `index, follow` and `noindex, follow`.
5. **Soft-404 hubs promoted from primary navigation.** `/christian-girl-names` (0 results), `/islamic-girl-names` (5), `/hindu-girl-names` (3), `/italian-boy-names` (0), `/italian-girl-names` (0), `/origins/urdu` (0), and four `letter/%23` pages (0) are all indexable and linked from the navbar, footer, homepage or blog.

## 1.5 Biggest UX problems

1. **The first thing every visitor sees is an ad and a share bar, not the page.** `[CODE]` `Layout.astro:202-211` places `<Ad placement="inline" />` and `<SocialShare />` *above* `<main>` on every route. With the 56 px sticky navbar plus `Ad.astro`'s reserved 90 px and 3 rem of margin, the `<h1>` starts roughly 240 px down a 390 × 844 viewport — about 28% of the screen consumed before any content, and a share bar asking the user to share a page they have not read.
2. **The alphabet browse pages are unusable.** `[LIVE]` `/names/islamic/letter/a/` is 1.61 MB with 2,626 cards. Single-column on mobile at ~130 px per card, that is roughly 340,000 px of scroll.
3. **Girl-name navigation is broken end to end.** A parent clicking "Christian Girl Names" in the navbar lands on a page whose `<h1>` reads *Girl Christian Names & Meanings* above a badge reading *0 girl names* and nothing else.
4. **Four prominently promoted destinations do not exist yet.** The navbar, footer and homepage all advertise an "Expert Naming Guide"; the homepage promotes three blog articles. All four are "coming soon" stubs, and all four render without a container because their CSS classes are undefined.
5. **Muted text is effectively unreadable.** 2.56:1 contrast on the colour used for 101 elements including FAQ answer bodies on name pages, all card meta text, breadcrumbs, and the entire footer.

## 1.6 Highest priority improvements

| Priority | Change | Effort | Risk |
|---|---|---|---|
| P0 | Define `faqs` (or remove the block) in `homepage/index.astro` — unblocks the build | ~10 lines | None |
| P0 | Fix the sitemap `filter` to compare pathnames of absolute URLs | 6 lines | None |
| P0 | Set `build: { format: 'file' }` so canonical URLs stop redirecting | 1 line | Low |
| P0 | Remove `noindex` from `homepage/index.astro`; stop nesting `Layout` | ~6 lines | None |
| P0 | Fix `normalizeGender()` and its 3 duplicates — recovers 17,744 names | ~12 lines | Low |
| P1 | Stop emitting `Person` schema and the fake testimonial paragraph | ~15 lines | None |
| P1 | Paginate letter pages (or cap and link deeper) | ~40 lines | Medium |
| P1 | Diversify islamic titles/meta/FAQ at the data layer, not the template | data job | Medium |
| P1 | Raise `--nv-muted` to a WCAG-passing value | 2 lines | Low |
| P2 | Extract the navbar's 52 KB of repeated markup | ~60 lines | Low |

---

# 2. COMPLETE ARCHITECTURE MAP

## 2.1 Framework and build

```
astro@^5.1.0            output: 'static'       site: 'https://nameverse.site'
@astrojs/tailwind@^6    trailingSlash: 'never' build.format: (unset -> 'directory')  <- ROOT CAUSE, section 3.3
@astrojs/sitemap@^3.2   filter: pathname-based                                       <- BROKEN, section 3.2
tailwindcss@^3.4        darkMode: 'class'
clsx + tailwind-merge   installed but NEVER imported anywhere in src/   <- dead dependencies
gh-pages@^6.3           installed, but no npm script and no .github/workflows -> deploy is manual
rimraf@^6.1             installed, never referenced in any script
```

`[CODE]` `package.json:8` — the build pipeline is:

```
node scripts/generate-manifest.mjs      ->  src/lib/data/names-manifest.json        (10.1 MB, git-tracked)
node scripts/generate-search-index.mjs  ->  public/names/{rel}/_search-index.json   (4.06 MB total)
npx astro build                         ->  dist/
```

`scripts/build-sitemap.js` (4,872 bytes) is **orphaned** — not referenced by any npm script, yet its
output (`/sitemap.xml` + `/sitemaps/*.xml`) is what is currently live and serving. See section 3.2.

## 2.2 Routing table (complete)

| Route pattern | File | Rendering | Instances | In sitemap filter? |
|---|---|---|---|---|
| `/` | `pages/index.astro` -> `pages/homepage/index.astro` | static | 1 | intended yes, actually no |
| `/homepage` | `pages/homepage/index.astro` | static | 1 | no |
| `/names` | `pages/names/index.astro` | static | 1 | intended yes, actually no |
| `/names/{religion}` | `pages/names/[religion]/index.astro` | static, prerender | 4 | intended yes, actually no |
| `/names/{religion}/{slug}` | `pages/names/[religion]/[slug].astro` | static, prerender | **42,310** | intended yes, actually no |
| `/names/{religion}/letter/{letter}` | `.../letter/[letter].astro` | static, prerender | 104 | explicitly excluded |
| `/{religion}-{gender}-names` | `pages/[religion]-[gender]-names.astro` | static | 8 | no |
| `/origins`, `/origins/{origin}` | `pages/origins/` | static, prerender | 1 + 11 | no |
| `/categories`, `/categories/{category}` | `pages/categories/` | static, prerender | 1 + 6 | no |
| `/blog`, `/blog/{slug}` | `pages/blog/` | static, prerender | 1 + 6 | intended yes, actually no |
| `/blog/top-islamic-baby-names-2026` + 2 siblings | hand-written stubs | static | 3 | intended yes, actually no |
| `/search`, `/advanced-search` | client-rendered results | static shell | 2 | 1 of 2 intended |
| `/name-meanings`, `/names-by-meaning`, `/names-by-origin` | — | static | 3 | intended yes, actually no |
| `/trending-names`, `/unique-names`, `/popularity` | — | static | 3 | 1 of 3 intended |
| `/about`, `/contact` | — | static | 2 | intended yes, actually no |
| `/privacy`, `/terms` | — | static, `noindex` | 2 | no (correct) |
| `/my-names`, `/popular-by-state`, `/guides/expert-naming-guide` | **stubs** | static | 3 | 1 of 3 intended |
| `404` | **does not exist** | — | 0 | — |

`[CODE]` There is **no `src/pages/404.astro`**, no middleware, and no API routes. `[LIVE]`
`/does-not-exist-xyz` returns HTTP 404 with GitHub's default 3,449-byte page. The status code is
correct (so this is not a soft-404 problem), but there is no branded recovery path.

## 2.3 Data architecture

```
public/names/{religion}/{slug}.json    42,310 files, 8-26 KB each   <- source of truth, git-tracked
        |                              (in public/ so the browser can fetch them too)
        |-- scripts/generate-manifest.mjs
        |       -> src/lib/data/names-manifest.json  (10.1 MB; 8 fields per record)
        |               |-- read by src/lib/data/astro-data.mjs  (in-process memo cache)
        |               \-- consumed by 14 templates for listings/counts/getStaticPaths
        \-- scripts/generate-search-index.mjs
                -> public/names/{religion}/_search-index.json  (4.06 MB total; 7 compact fields)
                        \-- fetched by the BROWSER on /, /search, /advanced-search, /popularity
```

`[CODE]` `src/lib/data/astro-data.mjs:13-22` memoises the 10 MB manifest per build process — a good
decision. `readNameData()` (`:62-73`) reads the individual JSON at render time and unwraps the
`{success, data}` envelope, so name pages get the full record while listings get the light manifest.
This separation is sound and should be preserved.

**Data-layer risks:**

- The manifest is a 10.1 MB git-tracked generated artifact. `[BUILD]` Regenerating it under `core.autocrlf=true` rewrites every line ending (10,142,309 -> 10,565,418 bytes) while remaining "clean" to git. Harmless to parse, but every rebuild looks like a 10 MB diff. Add `*.json -text` to `.gitattributes`, or move the manifest out of version control.
- `public/names/**` is both the source of truth and a published asset. `[CODE]` `terms.astro:19` prohibits bulk-downloading the database while `_search-index.json` publishes it as four unauthenticated files that the site itself downloads.

## 2.4 Rendering architecture

Fully static, one HTML file per route, no islands, no framework runtime. `[BUILD]` Total JS shipped:
**3 files, 14 KB** (search, advanced-search, popularity). CSS: **1 file, 40.5 KB**. Fonts: **10 woff2,
293 KB declared** (unicode-range gated, so only latin ≈ 83 KB actually transfers).

`[CODE]` Client interactivity is hand-written vanilla IIFEs in `<script>` tags — no hydration cost,
which is the right call. `[LIVE]` But two pages eagerly `fetch()` 4.06 MB of index JSON on load
(section 8.3).

## 2.5 SEO architecture

There is exactly one metadata component and it is well-designed. `[CODE]` `src/layouts/Layout.astro`
owns `<title>`, description, canonical, robots, Open Graph, Twitter, icons, verification tags, and one
`@graph` JSON-LD block with `Organization` + `WebSite` + `SearchAction` (`:27-62`). Pages pass
`title`, `description`, optional `canonical`, optional `noindex`, optional `type`.

**The single architectural flaw is the canonical fallback:**

```js
// Layout.astro:24
const pageCanonical = canonical || (Astro.url.pathname === '/' ? siteUrl : new URL(Astro.url.pathname, siteUrl).href);
```

Because `build.format` is `'directory'`, `Astro.url.pathname` *includes* a trailing slash at build
time. So pages that omit the `canonical` prop get `…/about/` (correct, self-referencing), while pages
that pass an explicit hardcoded `canonical` get `…/about` (wrong, a redirect). **The site therefore
runs two mutually incompatible canonical conventions simultaneously**, split by whether a template
author happened to hardcode the value. `[LIVE]` Verified across 11 pages in section 3.3.

Per-page structured data is added ad hoc in each template's default slot rather than via the
`<slot name="head" />` the layout exposes (`Layout.astro:196`). Body-level JSON-LD is valid, so this is
a consistency issue rather than a defect.

## 2.6 Component architecture

| Component | Size | Used by | Notes |
|---|---|---|---|
| `Navbar/Navbar.astro` | 24.7 KB | every page | `[LIVE]` renders to **52,556 bytes** — 52% of a name page |
| `Footer.astro` | 3.2 KB | every page | 18 links, 3 `<nav>` landmarks, fine |
| `Ad.astro` | 1.4 KB | every page x2 | deferred correctly; placement is the problem |
| `SocialShare.astro` | 4.3 KB | every page | above the fold on every route; 32 px targets |
| `NameCard.astro` | 1.8 KB | 8 listing pages | emits `<h3>`, which breaks heading order everywhere |
| `AlphabetNav.astro` | 1.2 KB | 2 pages | 36 px targets; disabled letters at 1.54:1 |
| `SectionHeading.astro` | 0.5 KB | **nothing** | dead code |
| `AdSlot.astro` | 0.4 KB | **nothing** | dead code, duplicates `Ad.astro` |

`[CODE]` Shared logic lives in `src/lib/data/name-utils.mjs` (labels, slugify, gender, origin/category
mapping) and `letter-browser.mjs`. The problem is that **six templates reimplement that logic inline
instead of importing it**, and every copy carries the same gender bug (section 3.6).

---

# 3. SEO FORENSIC FINDINGS

Severity key: **CRITICAL** = blocks indexing or deployment outright · **HIGH** = suppresses indexing or
rankings at scale · **MEDIUM** = measurable loss · **LOW** = hygiene.

---

## 3.1 CRITICAL — The build fails; nothing at `HEAD` can be deployed

**Evidence** `[BUILD]` `npm run build:test` output:

```
10:34:04 ▶ src/pages/homepage/index.astro
faqs is not defined
  Stack trace:
    at Object.default (file:///.../dist/chunks/index_DxFyWutU.mjs:114:40)
```

**Root cause** `[CODE]` `src/pages/homepage/index.astro:319` iterates `{faqs.map((faq) => (…))}` inside
the FAQ section, but `faqs` is never declared in the component frontmatter (lines 1–92 define
`manifest`, `religions`, `counts`, `totalNames`, `popularSlugs`, `bySlug`, `popularNames`, `hubs`,
`genderLinks`, `meaningChips`, `intentChips`, `latestArticles` — and nothing named `faqs`). A grep for
`faqs` in that file returns exactly one hit: line 319.

**Affected files** `src/pages/homepage/index.astro`

**Consequence** The build aborts at the homepage route. `[BUILD]` Every route alphabetically after it
was never generated — `dist/index.html`, `dist/names/index.html`, `dist/trending-names/index.html`,
`dist/popularity/index.html` and the entire 42,310-page name tree are all absent from the test build
output. This is not a warning; it is a hard stop.

**Recommended fix** Declare the `faqs` array in the frontmatter (6 genuine homepage questions), or
delete the FAQ `<section>` at lines 310–330. Prefer declaring it — a homepage FAQ is useful — but write
real answers, not the templated kind described in section 5.2.

---

## 3.2 CRITICAL — No sitemap is generated, while `robots.txt` advertises one

This is the most consequential finding in the audit and it is fully proven.

**Evidence, four independent confirmations:**

1. `[CODE]` `node_modules/@astrojs/sitemap/dist/index.js:62-96` builds `pageUrls` as **absolute URLs** (`new URL(fullPath, finalSiteUrl).href`) and then calls `pageUrls.filter((value) => filter(value))` at line 95. The value passed to `filter` is `https://nameverse.site/about`, not `/about`.
2. `[CODE]` `astro.config.mjs:15-21` — the project's filter tests pathnames:
   ```js
   filter: (page) => {
     if (page === '/') return true;
     if (page.startsWith('/names/') && !page.includes('/letter/') && !page.includes('//')) return true;
     if (page.startsWith('/blog/')) return true;
     if (['/about','/advanced-search','/contact','/name-meanings','/names-by-meaning','/names-by-origin','/popularity','/my-names'].includes(page)) return true;
     return false;
   }
   ```
   Executed against the real inputs, every branch is false. `page === '/'` never matches. `page.startsWith('/names/')` never matches. The allow-list `.includes(page)` never matches. And `!page.includes('//')` would independently veto every URL anyway, because `https://` contains `//`.
3. `[CODE]` `@astrojs/sitemap/dist/index.js:97-101` — when the filter leaves nothing, the integration logs `No pages found! sitemap-index.xml not created.` and returns. **It fails as a warning, not an error**, which is why this has gone unnoticed.
4. `[BUILD]` Listing `dist` for `sitemap*` after the build returns **zero results**. `[LIVE]` `https://nameverse.site/sitemap-index.xml` → **HTTP 404**.

**The advertised sitemap does not exist.** `[CODE]` `public/robots.txt:4` declares
`Sitemap: https://nameverse.site/sitemap-index.xml`.

**Why the live site still has a sitemap — and why that is also a problem.** `[LIVE]`
`https://nameverse.site/sitemap.xml` → HTTP 200, 2,277 bytes, a `sitemapindex` pointing at
`/sitemaps/pages.xml`, `/sitemaps/islamic-1..7.xml`, `/sitemaps/christian-1..5.xml`,
`/sitemaps/hindu-1..4.xml`, `/sitemaps/italian.xml`. These are stale artefacts of the **orphaned**
`scripts/build-sitemap.js`, which is not referenced by any npm script. The currently deployed
`robots.txt` is the old 68-byte version pointing at `/sitemap.xml`; the committed 78-byte version points
at `/sitemap-index.xml`. **The moment the current code is deployed, the site loses its sitemap
entirely**: `robots.txt` will point at a 404 and no replacement will have been written.

There is also stale duplication inside the legacy set: `dist/sitemaps/` contains both `islamic.xml`
(17,598 bytes) *and* `islamic-1.xml` … `islamic-7.xml`, i.e. an obsolete single-file version alongside
the chunked version.

**And every URL in the legacy sitemap is a redirect.** `[LIVE]` `/sitemaps/pages.xml` (26,438 bytes)
lists `https://nameverse.site/names`, `https://nameverse.site/about` and 42,310
`https://nameverse.site/names/{rel}/{slug}` entries — all without a trailing slash, all of which 301
(see 3.3). So even the working legacy sitemap submits 42,000+ redirects.

**Affected files** `astro.config.mjs:14-25`, `public/robots.txt`, `scripts/build-sitemap.js`

**Recommended fix** Compare pathnames properly and pick one sitemap system:

```js
sitemap({
  filter: (page) => {
    const p = new URL(page).pathname.replace(/\/$/, '') || '/';
    if (p === '/homepage') return false;                     // duplicate of /
    if (['/my-names', '/popular-by-state', '/guides/expert-naming-guide'].includes(p)) return false; // stubs
    if (['/privacy', '/terms'].includes(p)) return false;    // noindex
    return true;                                             // include everything else, incl. /letter/
  },
  entryLimit: 5000,
})
```

Then delete `scripts/build-sitemap.js` and the stale `public/sitemaps/` output, and keep `robots.txt`
pointing at `/sitemap-index.xml`. Verify after the first full build that `dist/sitemap-index.xml` exists
and that the child files total 42,000+ `<loc>` entries.

**Do not** submit the new sitemap until 3.3 is fixed, or you will submit 42,000 redirects again.

---

## 3.3 CRITICAL — Every programmatic canonical URL 301-redirects

**Evidence** `[LIVE]` Requests with redirects disabled:

| Requested URL | Status | `Location` |
|---|---|---|
| `/names/islamic/aaban` | **301** | `/names/islamic/aaban/` |
| `/names` | **301** | `/names/` |
| `/names/islamic/letter/a` | **301** | `/names/islamic/letter/a/` |
| `/about` | **301** | `/about/` |
| `/search` | **301** | `/search/` |
| `/islamic-boy-names` | **301** | `/islamic-boy-names/` |
| `/homepage` | **301** | `/homepage/` |
| `/names/islamic/aaban/` | 200 | — |

**Root cause** `[CODE]` `astro.config.mjs:10` sets `trailingSlash: 'never'`, but `build.format` is left
at its default `'directory'`. `[BUILD]` Astro therefore emits `dist/about/index.html`,
`dist/names/islamic/aaban/index.html`, and so on. GitHub Pages serves a directory index only at the
slash-terminated URL and 301s the bare path to it. The config's stated trailing-slash policy and the
config's output format are in direct contradiction, and the hosting layer resolves that contradiction in
favour of the slash.

**Compounding factor — two competing canonical conventions.** `[LIVE]` What each page actually declares:

| URL served | `<link rel="canonical">` | Self-referencing? |
|---|---|---|
| `/about/` | `https://nameverse.site/about/` | yes — correct |
| `/search/` | `https://nameverse.site/search/` | yes — correct |
| `/blog/` | `https://nameverse.site/blog/` | yes — correct |
| `/origins/` | `https://nameverse.site/origins/` | yes — correct |
| `/categories/` | `https://nameverse.site/categories/` | yes — correct |
| `/contact/` | `https://nameverse.site/contact/` | yes — correct |
| `/` | `https://nameverse.site/` | yes — correct |
| `/names/` | `https://nameverse.site/names` | **no — 301** |
| `/names/islamic/` | `https://nameverse.site/names/islamic` | **no — 301** |
| `/popularity/` | `https://nameverse.site/popularity` | **no — 301** |
| `/trending-names/` | `https://nameverse.site/trending-names` | **no — 301** |
| `/names/islamic/aaban/` | `https://nameverse.site/names/islamic/aaban` | **no — 301** |

The split falls exactly along whether the template passes an explicit `canonical` prop. Pages that omit
it inherit `Layout.astro:24`'s fallback, which reads `Astro.url.pathname` and therefore *keeps* the
build-time trailing slash — accidentally correct. Pages that hardcode a canonical omit the slash —
wrong. `[CODE]` The hardcoded, slash-less canonicals are at:

- `names/[religion]/[slug].astro:33` — 42,310 pages
- `names/[religion]/index.astro:25` — 4 pages
- `names/[religion]/letter/[letter].astro:40` — 104 pages
- `[religion]-[gender]-names.astro:38` — 8 pages
- `origins/[origin].astro:16` — 11 pages
- `categories/[category].astro:16` — 6 pages
- `blog/[slug].astro:151` — 6 pages
- `names/index.astro:35`, `name-meanings.astro`, `names-by-meaning.astro`, `names-by-origin.astro`, `popularity.astro`, `trending-names.astro`, `unique-names.astro` — 7 pages

**≈42,456 canonical declarations point at a URL that redirects.**

**Consequence** This produces, deterministically, the exact GSC states the site is suffering:
*Page with redirect* for the canonical URL, and *Alternate page with proper canonical* or
*Duplicate, Google chose different canonical than user* for the slash version. Google is being told the
preferred URL is one that immediately bounces it elsewhere.

**Recommended fix — the safe one that changes zero URLs.** Add to `astro.config.mjs`:

```js
build: { format: 'file' },
```

Astro then emits `dist/about.html`, `dist/names/islamic/aaban.html`, and GitHub Pages serves those at
`/about` and `/names/islamic/aaban` with **no redirect**. Every existing hardcoded canonical, every
sitemap URL and every internal `href` in the codebase becomes correct as-is, and `Astro.url.pathname`
starts producing slash-less values so the `Layout.astro:24` fallback aligns too. This is a one-line
change that resolves ~42,456 canonical defects without altering a single public URL.

**Alternative (do not prefer):** switch to `trailingSlash: 'always'` and rewrite all 42,456 canonicals
plus the sitemap. Same end state, vastly more churn, and it changes the URL that every existing backlink
and GSC record points at.

**Verification after the fix:** confirm `/names/islamic/aaban` returns 200 directly, and that
`/names/islamic/aaban/` either 404s or 301s *to* the canonical — never the reverse.

---

## 3.4 CRITICAL — The homepage is `noindex` and renders two nested HTML documents

**Evidence** `[CODE]` Three lines tell the whole story:

```astro
// src/pages/index.astro:3
import Homepage from "./homepage/index.astro";
// src/pages/index.astro:6-11
<Layout title="…" description="…">
  <Homepage />
</Layout>

// src/pages/homepage/index.astro:94
<Layout title="Baby Names with Meanings, Origins & Lucky Numbers | NameVerse" description="…" noindex>
```

`homepage/index.astro` is written as though it were a content fragment — its own comment on line 2 says
"content fragment rendered inside Layout by /index.astro" — but it opens its **own** `<Layout>`. So `/`
renders `Layout` inside `Layout`.

**Consequences, all of them bad:**

1. **`/` emits `noindex, follow`.** `Layout.astro:81-88` renders the robots meta from its `noindex` prop. The outer instance emits `index, follow, max-snippet:-1, …`; the inner instance emits `noindex, follow`. Google honours the most restrictive directive when they conflict. **The homepage is telling Google not to index it.**
2. **Two `<html>`, two `<head>`, two `<body>`, two `<main>`** in one document — invalid, and it forces the browser's error-recovery parser to guess at the structure.
3. **Two `<link rel="canonical">` tags.** Google's documented behaviour with multiple conflicting canonicals is to ignore all of them and pick its own.
4. **Two `<title>` elements, two Organization/WebSite `@graph` blocks, two Navbars, two Footers, four ad slots, two share bars.** The above-the-fold region becomes: navbar, ad, share bar, navbar, ad, share bar, hero.
5. **Duplicate route.** `[LIVE]` `/homepage/` exists as its own indexable URL serving the same content.

**Recommended fix** Choose one of two shapes — do not keep both:

- *Preferred:* move the homepage body into `src/pages/index.astro` and delete `src/pages/homepage/` entirely. One file, one Layout, one route, `/homepage` gone.
- *Or:* strip the `<Layout …>` wrapper and the `noindex` from `homepage/index.astro`, and move it out of `src/pages/` into `src/components/Homepage.astro` so it stops being a route.

Either way, add a redirect or a 410 for `/homepage` if it has accrued external links.

---

## 3.5 HIGH — Robots, indexability and crawl controls

`[CODE]` `public/robots.txt` is clean and permissive:

```
User-agent: *
Allow: /

Sitemap: https://nameverse.site/sitemap-index.xml
```

Nothing is blocked — no CSS, no JS, no JSON. `[LIVE]` `/names/islamic/_search-index.json` returns
HTTP 200 (1,843,262 bytes), which confirms underscore-prefixed paths are being served, so GitHub Pages
Jekyll processing is not stripping `_`-prefixed files and `dist/_astro/**` is reachable. No
`X-Robots-Tag` is set anywhere — GitHub Pages provides no header control, and none is needed.

**Rendering dependency check.** `[LIVE]` A name page's HTML contains the `<h1>`, the meaning, all 17
`<h2>` sections, the FAQ text and all internal links **in the served HTML** — nothing critical is
client-rendered. That is the correct architecture and a real strength.

**Two exceptions where the content *is* JavaScript-only:**

- `/search` `[CODE]` `search.astro:112` — `<div id="search-results">` is empty in the HTML; results come from a client `fetch` of 4.06 MB of index JSON. Crawlable content is the `<h1>`, the filter labels and 2 paragraphs.
- `/advanced-search` `[CODE]` `advanced-search.astro:106` — same pattern.

Both are legitimate as tool pages, but they should not be treated as content pages, and every hub that
links into them via `/search?q=…` is spending internal link equity on a crawl dead-end (section 6.3).

**Correct `noindex` usage:** `[CODE]` `privacy.astro:39` and `terms.astro:39` both pass `noindex`. Good.

**Missing `noindex` where it is warranted:** the three "coming soon" stubs (`/my-names`,
`/popular-by-state`, `/guides/expert-naming-guide`) and the three stub blog articles are all fully
indexable, and `/my-names` is explicitly on the sitemap allow-list (`astro.config.mjs:19`).

---

## 3.6 HIGH — `normalizeGender()` misclassifies 17,744 female names; two hub pages render empty

This is a one-line logic error with the largest content-visibility impact in the codebase.

**Evidence** `[CODE]` `src/lib/data/name-utils.mjs:28-46`:

```js
export function normalizeGender(gender) {
  const g = String(gender || '').toLowerCase();
  if (!g) return null;
  const isFemale = g.includes('female') || g.includes('girl') || g.includes('feminine');
  const isMale   = g.includes('male')   || g.includes('boy')  || g.includes('masculin');
  if (isMale && isFemale) return 'unisex';
  …
}
```

`'female'.includes('male')` is `true`. Every value containing "female" therefore sets **both** flags and
falls into the `unisex` branch on line 33.

**Actual data** `[DATA]` The raw `gender` values in the manifest, top 15 by frequency:

```
"Female"                      9178      "(Male or Female or Unisex)"  1787
"(Male)"                      8275      "Unisex"                      1119
"male"                        5583      "Unknown"                      845
"female"                      4950      ""  (empty)                    354
"Male"                        3897      "(Male/Female/Unisex)"         341
"(Female)"                    3616      "(Male/Female)"                122
"unisex"                      1973      "masculine"                     84
                                        "Male or Female"                68
```

`9178 + 4950 + 3616 = 17,744` unambiguously female records are classified `unisex`.

**Page-level impact** `[DATA]` What `/{religion}-{gender}-names` renders today versus what it should:

| Route | Renders today | Should render |
|---|---|---|
| `/islamic-boy-names` | 6,885 | 6,876 |
| `/islamic-girl-names` | **5** | 8,780 |
| `/christian-boy-names` | 4,900 | 4,900 |
| `/christian-girl-names` | **0** | 6,407 |
| `/hindu-boy-names` | 6,065 | 6,065 |
| `/hindu-girl-names` | **3** | 2,709 |
| `/italian-boy-names` | 0 | 0 (no gender data at all) |
| `/italian-girl-names` | 0 | 0 (no gender data at all) |

`[LIVE]` Confirmed on the deployed site: `/christian-girl-names/` is 78,638 bytes with **0** name cards
and **0** `/names/…` links; `/islamic-girl-names/` is 81,409 bytes with **5** cards.

**Four independent copies of the same bug.** Fixing `name-utils.mjs` alone will not fix the site:

1. `src/lib/data/name-utils.mjs:31-32` — the shared helper. Drives `NameCard.astro:9` (so every card on every listing page shows a wrong "Unisex" badge) and `[religion]-[gender]-names.astro:31`.
2. `src/pages/names/[religion]/index.astro:39-50` — inline `m && !f` / `f && !m`. Same defect, different shape: the hub badge reads *"18,655 names · 6,876 boys · 5 girls"*.
3. `src/pages/names/[religion]/letter/[letter].astro:45-56` — same inline copy, same wrong per-letter counts.
4. `src/pages/search.astro:168-177`, `src/pages/advanced-search.astro:185-194` and `src/pages/popularity.astro:166-175` — three browser-side reimplementations. Consequence: ticking **Girl** in `/advanced-search` matches 8 names out of 42,310.

**Secondary contradiction** Because `names/[religion]/index.astro:113-114` labels its gender links with
its own (also broken) counts, the link label and the destination page are both wrong, in different ways.

**Recommended fix** One correct predicate, imported everywhere; delete all five duplicates:

```js
export function normalizeGender(gender) {
  const g = String(gender || '').toLowerCase();
  if (!g) return null;
  const isFemale = /female|girl|feminine/.test(g);
  const isMale   = /(^|[^e])male|\bboy|masculin/.test(g);
  if (isMale && isFemale) return 'unisex';        // "(Male or Female or Unisex)" -> unisex, correct
  if (isFemale) return 'girl';
  if (isMale) return 'boy';
  if (/unisex|neutral|genderless|unknown|unspecified/.test(g)) return 'unisex';
  return null;
}
```

Then export the counting helpers from the same module and have the four templates import them.
**Risk note:** this changes what 8 indexed pages display, from near-empty to 2,700–8,800 names each.
That is the intended outcome, but expect Google to re-crawl and re-evaluate them.

---

## 3.7 HIGH — The `#` letter pages render the literal string `%23` and contain zero names

**Evidence** `[LIVE]` `https://nameverse.site/names/islamic/letter/%23` → HTTP 200, 87,992 bytes,
`<h1>` = `Islamic Names Starting with &ldquo;%23&rdquo;`, canonical =
`https://nameverse.site/names/islamic/letter/%23`.

**Root cause** `[CODE]` `letter/[letter].astro:8-18` generates the path with `letter: '#'`, but at render
time `Astro.params.letter` comes back URL-encoded as `'%23'`. Every downstream comparison then fails:
`:33` `letter === '#'` is false, so the filter falls through to `firstChar === '%23'`, which matches
nothing; `:38` `letter.toUpperCase()` yields `'%23'` and is printed in the `<h1>`, the `<title>`, the
breadcrumb and the body copy.

**Consequence** 4 indexable pages (one per religion) with a corrupted heading, a corrupted title and an
empty results grid. `[CODE]` They are linked from `AlphabetNav.astro:13`,
`names/[religion]/index.astro:149` and `letter/[letter].astro:133`, so they receive internal links from
108 pages. `[CODE]` `scripts/build-sitemap.js:89` also submits them.

**Recommended fix** Use a URL-safe token in the route (e.g. `other`) and map it back to "non a–z" in the
template, or decode the param defensively (`const letter = decodeURIComponent(Astro.params.letter)`).
The token approach is cleaner and produces a nicer URL. If the URL changes, 301 `%23` → `other`.

---

## 3.8 HIGH — Alphabet pages are excluded from the sitemap yet carry the entire crawl graph

`[CODE]` `astro.config.mjs:17` deliberately excludes `/letter/` from the sitemap. That would be
defensible if the sitemap listed the 42,310 name pages — but it does not (3.2), so the letter pages are
the *only* bulk path from the site's navigation to its content. `[LIVE]` `/names/islamic/letter/a/`
carries 2,667 internal `/names/…` links.

This is a bad combination: the pages holding all the internal links are (a) absent from the sitemap,
(b) 1.6 MB each, and (c) reachable only via the alphabet strip on the 4 religion hubs. If Googlebot
truncates or deprioritises a 1.6 MB document, the links inside it are not followed, and there is no
sitemap fallback.

**Recommended fix** Paginate (section 8.1), then **include** the letter pages in the sitemap. They are
legitimate, useful, distinct browse pages.

---

## 3.9 MEDIUM — Duplicate and near-duplicate hub pages

| Pair | Evidence | Assessment |
|---|---|---|
| `/names-by-origin` vs `/origins` | `[CODE]` Identical `<h1>` ("Baby Names by Origin"), identical derivation loop (`names-by-origin.astro:7-15` vs `origins/index.astro:7-15`), identical 11 cards to identical `/origins/{slug}` targets. Titles differ only by the inserted word "Persian". | **True duplicate.** Neither canonicalises to the other. `/names-by-origin` is on the sitemap allow-list; `/origins` is the one in the navbar. Consolidate: keep `/origins`, 301 `/names-by-origin` → `/origins`. |
| `/trending-names` vs `/popularity` | `[DATA]` Both sort the same manifest by `popularity_score` desc; trending takes 60, popularity takes 50 — **popularity's 50 are a strict subset of trending's 60**. Both then render a per-religion breakdown with near-identical markup. | **Near-duplicate.** One dataset framed twice. Differentiate genuinely or merge. |
| `/name-meanings` vs `/names-by-meaning` | `[CODE]` Adjacent slugs, near-identical `<h1>`s, same topic; different rendered sets (100 cards vs 66 search links). | Intent-duplication. Rename or merge. |
| `/categories/{r}` vs `/names/{r}` for `islamic`, `hindu`, `italian` | `[DATA]` `/categories/islamic` covers 18,310 of the 18,655 `/names/islamic` records; `/categories/italian` covers all 352. Both titled "… Baby Names with Meanings". | **Near-duplicate by construction.** `categorySlugFor()` reads the `category` field, which for these three is just the religion name. Either drop the three redundant category pages or make them genuinely narrower. |
| `/categories/islamic` vs `/origins/arabic` | `[DATA]` 18,310 vs 18,335 records, and both render the top 300 by the same sort — so the visible card sets are essentially identical. | Near-duplicate. |
| `/categories/biblical` vs `/origins/biblical` | `[DATA]` 9,785 vs 12,693 records, same sort, heavy overlap in the rendered 300. | Near-duplicate. |
| `/privacy` vs `/terms` | `[CODE]` `terms.astro:41-62` is byte-identical to `privacy.astro:41-62` apart from the `<h1>` and the mail address. | Acceptable for legal pages; extract a shared component for maintainability only. |
| `/` vs `/homepage` | `[CODE]` Same component. | See 3.4. |

---

## 3.10 MEDIUM — Thin and empty collection pages that are indexable

`[DATA]` Record counts behind each origin hub:

```
/origins/arabic    18,335     /origins/persian      25
/origins/biblical  12,693     /origins/english      32
/origins/sanskrit   5,865     /origins/tamil        43
/origins/hindu      3,915     /origins/hindi        63
/origins/italian      352     /origins/bengali       9
                              /origins/urdu          0   <- empty page
```

`/origins/urdu` renders an `<h1>` reading *"Urdu Baby Names with Meanings"*, a badge reading *"0 Urdu
names"*, an empty grid, and 2 paragraphs of generated prose asserting that *"Urdu names have traveled
across centuries and continents"*. It is linked from `/origins` and `/names-by-origin`. Five more
(`bengali` 9, `persian` 25, `english` 32, `tamil` 43, `hindi` 63) are thin enough to be borderline.

`[DATA]` The origins index also under-reports: summing the 11 buckets gives **41,332** of 42,310
records, so **978 names match no origin slug** and are unreachable from the origin taxonomy entirely.
`[CODE]` `origins/index.astro:39` prints that under-count with a `+` suffix.

`[DATA]` `categorySlugFor()` similarly leaves **845 names** with no category match.

**Recommended fix** Generate origin/category routes from the data rather than the hardcoded
`ORIGIN_SLUGS` list (`name-utils.mjs:63-75`): emit a page only when the bucket exceeds a threshold (say
50), and add buckets for the origins that exist in volume but have no slug — Hebrew and Greek are named
in `about.astro:42` but absent from `ORIGIN_SLUGS`.

---

## 3.11 MEDIUM — Internal links to pages that do not exist

`[DATA]` I resolved every link the name-detail template generates from `similar_sounding_names` and
`related_names` (`[slug].astro:513` and `:523`, which build
`/names/{religion}/{name.toLowerCase().replace(/\s+/g,'-')}`) against the actual slug set:
**12,493 links sampled, 130 broken (1.0%)**. Extrapolated to the full corpus that is roughly 1,300 dead
internal links. Examples:

```
/names/islamic/marudeen.   <- trailing period survives the naive slugify; linked from 11+ pages
/names/islamic/afsa        <- no such record
```

Two distinct causes, both worth fixing:

1. `[CODE]` The inline slugify at `:513`/`:523` only collapses whitespace. It does not strip periods, apostrophes or parentheses — unlike the proper `slugify()` that already exists at `name-utils.mjs:18-24` and is not imported here.
2. The related-name values are not validated against the manifest before being linked.

`[CODE]` A third, separate dead link: `blog/top-islamic-baby-names-2026.astro:13` links to
`/names/islamic/1`. `[DATA]` No record has `slug === "1"`, and there is no pagination route, so the
stub's only escape hatch is a 404.

**Recommended fix** Import `slugify()` and filter related names through a `Set` of known slugs at build
time; render non-matching values as plain text chips instead of links. This is cheap and it removes
~1,300 crawl-budget sinks.

---

## 3.12 LOW — Structured-data and markup hygiene

- `[LIVE]` **91 invalid `key=""` attributes** leak into every name page's HTML. `[CODE]` Astro does not consume a `key` prop — that is a React idiom — so `[slug].astro:237,247,319,428,454,485,497,513,523,538,550` and `Navbar.astro:116,231,250` emit it verbatim as an unknown HTML attribute.
- `[CODE]` `search.astro:116-137` — mis-nested tags: `<section>` opens at 116, a `<div>` opens at 117, then `</section>` closes at 135 *before* `</div>` at 136. Browsers recover, but it is invalid.
- `[CODE]` Six files render a nested `<main>` inside `Layout`'s `<main>`: `my-names.astro:6`, `popular-by-state.astro:6`, `guides/expert-naming-guide.astro:6`, and the three stub blog pages at `:6`. Two `main` landmarks is an accessibility violation and invalid HTML.
- `[CODE]` `blog/[slug].astro` never passes `type="article"` to `Layout`, so all 6 blog posts declare `og:type="website"`.
- `[CODE]` `Layout.astro:132` sets `twitter:card="summary"` while `:121-122` declares a 1600×1600 OG image. `summary_large_image` with a proper 1200×630 asset would present far better.
- `[CODE]` `Layout.astro:14` uses `nameverse_logo_emblem.png` (921,872 bytes) as the OG image, the 512px icon *and* the `apple-touch-icon` at a declared `sizes="1600x1600"`. One 900 KB PNG doing three jobs badly.
- `[CODE]` `Layout.astro:154-158` preconnects to `revolthem.com` — a costly hint for an ad network whose scripts are deliberately deferred to idle. It partly defeats the deferral and should be `dns-prefetch` only.

---

# 4. INDEXING RISK REPORT

Mapping each Google Search Console state to its verified cause in this repository. This section names
root causes rather than symptoms.

| GSC state | Verified root cause | Scale | Fix |
|---|---|---|---|
| **Discovered – currently not indexed** | No sitemap exists (3.2). Bulk discovery depends entirely on 4 religion hubs → 104 letter pages of 1.6 MB each (3.8). | up to 42,310 | 3.2 + 3.8 |
| **Crawled – currently not indexed** | Quality suppression, not a technical block. 18,244 pages share one FAQ answer; 18,239 share one meta description; 1,197 pages have fewer than 60 words (5.1, 5.2). | ~18,000+ | Phase 3 |
| **Page with redirect** | Canonical URLs omit the trailing slash that `build.format: 'directory'` requires on GitHub Pages (3.3). The legacy sitemap submits 42,310 of these. | ~42,456 | one line: `build: { format: 'file' }` |
| **Alternate page with proper canonical** | Same cause, viewed from the slash side: `/x/` is served and self-consistent, `/x` is the declared canonical and redirects. | ~42,456 | 3.3 |
| **Duplicate without user-selected canonical** | The homepage emits two conflicting `<link rel="canonical">` tags (3.4), so Google discards both. | 1 — the most important page | 3.4 |
| **Duplicate, Google chose different canonical than user** | (a) 3.3. (b) `/` and `/homepage` serve identical content (3.4). (c) `/names-by-origin` vs `/origins`, `/categories/{r}` vs `/names/{r}` (3.9). | ~42,460 | 3.3, 3.4, 3.9 |
| **Soft 404** | Collection pages that render zero items but return 200 with confident prose: `/christian-girl-names`, `/italian-boy-names`, `/italian-girl-names` (0 each), `/origins/urdu` (0), 4 × `letter/%23` (0), `/islamic-girl-names` (5), `/hindu-girl-names` (3). Plus 352 Italian name pages whose only content is a lowercase `<h1>`. Plus 6 "coming soon" stubs. | ~370 | 3.6, 3.7, 3.10, 5.1 |
| **Excluded by 'noindex' tag** | Intended for `/privacy` and `/terms`. **Unintended for `/`** (3.4). | 1 unintended | 3.4 |
| **Blocked by robots.txt** | **No risk found.** `robots.txt` allows everything; CSS, JS and JSON are all reachable (3.5). | 0 | — |
| **Not found (404)** | ~1,300 dead internal links from unvalidated related-name slugs (3.11); `/names/islamic/1` from a stub. No custom 404 page exists. | ~1,300 | 3.11 |
| **Server error / 5xx** | **No risk.** Fully static on GitHub Pages. | 0 | — |
| **JS-rendering failure** | **Low risk.** All name-page content is in the served HTML (3.5). Only `/search` and `/advanced-search` are JS-dependent, and both are tools. | 2 | acceptable |

**The single highest-leverage insight in this audit:** rows 1, 3, 4, 5 and 6 above — which between them
cover essentially every URL on the site — are all fixed by **three small changes**: the sitemap filter,
`build.format`, and un-nesting the homepage layout. No content work is required to resolve them. Do those
first and measure for 3–4 weeks before touching content.

---

# 5. CONTENT QUALITY REPORT

All figures in this section come from a full scan of all 42,310 JSON records, not a sample.

## 5.1 Thin content

`[DATA]` Per-religion census. `thin` = fewer than 60 words across every prose field the template renders.

| Religion | Total | No meaning | No `long_meaning` | No FAQ | Thin (<60w) | Lowercase name | Mojibake |
|---|---|---|---|---|---|---|---|
| islamic | 18,655 | 11 | 355 | 345 | 345 | 111 | 743 |
| christian | 12,893 | 2 | 202 | 201 | 200 | 2 | 266 |
| hindu | 10,410 | 2 | 302 | 306 | 300 | 91 | 349 |
| italian | 352 | **352** | **352** | **352** | **352** | **352** | 0 |
| **TOTAL** | **42,310** | **367** | **1,211** | **1,204** | **1,197** | **556** | **1,358** |

**The 352 Italian pages have no content whatsoever.** `[DATA]` A complete Italian record:

```json
{ "name": "marco", "slug": "marco", "meaning": "", "origin": "Italian",
  "gender": "", "religion": "italian", "category": "Italian", "popularity_score": 0 }
```

`[LIVE]` `https://nameverse.site/names/italian/marco/` is 75,716 bytes, of which roughly 74 KB is navbar,
footer and `<head>`. The `<h1>` renders `marco` — lowercase. There is no meaning, no origin detail, no
pronunciation, no FAQ, no related names. These are 352 textbook soft-404s, and they are 100% of the
Italian tradition that the homepage, navbar and footer all promote as one of four equal hubs.

**556 pages render a lowercase `<h1>`** — all 352 Italian plus 204 others. That is a visible quality
signal on the single most prominent element of the page.

**1,358 pages contain character corruption.** `[DATA]` From `public/names/islamic/aaban.json`, the
`in_urdu.long_meaning` field contains Vietnamese (`phổ`) and Chinese (`意义`) characters spliced into
Urdu text. `[CODE]` The template's `cleanText()` guard (`[slug].astro:77-80`) only strips `??`-runs and
`U+FFFD`, so this passes straight through to the rendered page.

**Recommended handling — and what *not* to do.** Do **not** bulk-delete these pages; many are real names
with real search demand. Instead:

1. **Italian (352):** either enrich with genuine data — meanings, origins, gender, which is a small and tractable content job for 352 records — or `noindex` them until enriched and remove Italian from the primary navigation. Do not leave them indexable as they are.
2. **Thin non-Italian (845):** `noindex` pending enrichment, prioritised by search demand.
3. **Lowercase names (556):** title-case at the data layer, not in the template, so the manifest, the search index and the detail page all agree.
4. **Mojibake (1,358):** strip the affected `in_*` blocks rather than displaying them. A missing transliteration is better than a corrupted one.

## 5.2 Duplicate content and template similarity

This is the site's most serious content risk, and it is concentrated almost entirely in the Islamic set.

`[DATA]` Method: for every record I replaced the name with `{N}` and the meaning with `{M}`, then counted
identical remaining strings. This isolates genuine template reuse from legitimate name-specific variation.

**Titles** — 13,898 distinct patterns across 41,113 records, but:

```
18,308 x   {N} Name Meaning | Islam Baby Names 2026
   520 x   {N} - {M} in Hinduism
   405 x   {N}: Meaning, Origin, and Significance in Hinduism
   271 x   {N}: Meaning, Origin, and Significance in Christianity
   210 x   {N} - {M} in Christianity
```

The top 20 patterns cover **52.5%** of all titles. The single Islamic pattern covers **98.1% of the
18,655 Islamic pages** — and it is also grammatically wrong ("Islam Baby Names" should be "Islamic"),
carries a hardcoded year, and omits the brand.

**Meta descriptions** — 20,406 distinct patterns, but:

```
18,239 x   Discover the complete meaning of {N}, a beautiful Islam name meaning "{M}". Learn about its Arabic origin and spiritual significance.
    85 x   Discover the meaning and religious significance of the Hindu name {N}. Learn about its origin and cultural usage.
```

Top 20 cover **46.1%**.

**FAQ answers** — `[DATA]` The first FAQ answer is identical on **18,244** pages:

```
{N} is a beautiful Islam name meaning "{M}". This name has deep spiritual significance in Islam tradition.
```

`[DATA]` And the full six-question set is templated end to end. From `aaban.json`:

| Question | Answer template |
|---|---|
| What is the meaning of {N} in Islam tradition? | {N} is a beautiful Islam name meaning "{M}". This name has deep spiritual significance… |
| Is {N} a good Islam name for a baby? | **Yes, {N} is an excellent Islam name choice. It carries positive meanings and cultural significance.** |
| What is the origin of the name {N}? | The name {N} has Arabic origins and is deeply rooted in Islam tradition. |
| How do you pronounce {N} correctly? | {N} is pronounced {pronunciation} in English. |
| What are the spiritual benefits of naming a child {N}? | Naming a child {N} brings blessings. The meaning "{M}" inspires positive qualities. |
| How popular is the name {N}? | **{N} is well-regarded in Islam communities worldwide.** |

Two of the six answers contain **no name-specific information at all** — they are pure filler that would
be equally true of any name. `[CODE]` All six are emitted as `FAQPage` JSON-LD
(`[slug].astro:125-135`), so 18,244 pages submit an identical templated FAQ to Google's structured-data
pipeline.

**`description_paragraph`** is `"{N} is a meaningful {Religion} name of {Origin} origin that means
\"{M}\". "` followed by `long_meaning`. The prefix is mechanical; the suffix is genuinely name-specific.
So the paragraph is roughly 40% boilerplate and 60% real.

**Assessment — this is the important nuance.** `[DATA]` Median rendered prose is **491 words** (p25 408,
p75 550, p90 600), and the genuinely name-specific fields — `long_meaning`, `spiritual_meaning`,
`cultural_impact`, `spiritual_significance`, `numerology_meaning`, `historical_references`, the
transliterations, the regional table — *do* vary meaningfully per name. So these pages are **not** thin,
and they are **not** wholesale duplicates. The problem is narrower and more fixable than it first looks:
**the highest-visibility surfaces (title, meta description, FAQ) are the most templated, while the
genuinely unique content is buried lower down.** Google sees the boilerplate first.

**Recommended approach — and the explicit prohibitions.**

**Do NOT:**

- delete or `noindex` the 18,000 Islamic pages,
- spin, paraphrase or randomise the existing sentences,
- pad with synonyms or keyword variants,
- inject the name more times to raise a "uniqueness" score,
- generate more AI prose on top of AI prose.

**DO** rewrite the templated surfaces from data the record already contains:

1. **Titles:** compose from real fields — `{Name} Name Meaning: {short_meaning} | {Origin} {Gender} Name` — which yields a distinct title per record from existing data, fixes the "Islam" → "Islamic" grammar, and drops the hardcoded year. This is a data migration over `public/names/**`, not a template hack.
2. **Meta descriptions:** compose from `short_meaning` + `origin` + `lucky_number` + `pronunciation` — four fields that vary per record.
3. **FAQs:** delete the two content-free questions ("Is {N} a good name?", "How popular is {N}?") and replace them with questions answerable from real fields — *"What is {N}'s lucky number?"* from `lucky_number`/`lucky_day`/`lucky_stone`; *"How is {N} written in Arabic and Urdu?"* from `in_arabic.name`/`in_urdu.name`; *"How popular is {N} regionally?"* from the `popularity_by_region` table. Fewer, more specific, data-grounded FAQs beat six generic ones, and they will match the visible page.
4. **Reorder the template** so unique content surfaces before boilerplate (section 7.4).

## 5.3 Fabricated content — the highest-risk finding in this audit

`[DATA]` Three fabricated fields are present at enormous scale, and two of them are published as
structured data.

**1. Invented human testimonials — 41,113 pages (97.2%).** `[DATA]` From `aaban.json`:

```json
"name_in_real_life": {
  "person_name": "Hassan Aaban",
  "location": "Istanbul, Turkey",
  "story": "Hassan Aaban, a teacher in Istanbul, Turkey, shares that their name Aaban meaning
            \"Angel of clouds, Name of an Islamic month\" has been a source of inspiration
            throughout their life, motivating them to be a positive influence in their community."
}
```

`[CODE]` This renders as a visible *"{Name} in real life"* section (`[slug].astro:468-477`) **and** is
emitted as `Person` JSON-LD (`[slug].astro:87-96` and `:137`). `[LIVE]` Confirmed present in the served
HTML of `/names/islamic/aaban/`. The site is therefore publishing **41,113 machine-generated fake
people, with fake occupations and fake cities, as Schema.org `Person` entities.**

**2. Invented historical figures — 36,846 pages (87.1%).** `[DATA]` From `aaban.json`:

> `"Born in the Arabian Peninsula in the 6th century, Aaban was a companion of the Prophet Muhammad (pbuh). He was known for his bravery and loyalty."` — `time_period: "6th century"`, `context: "Islamic History"`

That is a fabricated religious-historical claim about a named companion of the Prophet, generated for an
arbitrary name, repeated across roughly 36,846 pages, in a domain where accuracy carries genuine cultural
and religious weight. This is the most reputationally dangerous content on the site.

**3. Invented celebrities — 18,351 pages (43.4%).** `[DATA]` `"Aaban Ali, Pakistani actor"`,
`"Aaban Khan, Indian model"`.

**4. Self-contradictory etymology on the same page.** `[DATA]` `aaban.json` asserts three mutually
exclusive origins simultaneously, and the template renders all three:

| Field | Claim |
|---|---|
| `short_meaning` / `long_meaning` | "Angel of clouds"; the 8th Islamic month; angel of rain |
| `in_english` / `in_arabic` / `in_hindi` / `in_urdu` | "light or radiance", from the root ا ب ن |
| `spiritual_symbolism` | derived from 'Aba' (father) + 'Ban' (son); the bond between father and child |

A visitor reading top to bottom is told the name means three unrelated things. `[CODE]` These appear in
`<h2>` sections at `:263`, `:287` and `:425`.

**5. Fabricated self-assessment metadata.** `[DATA]` Every record carries an `advanced_seo` block
asserting `"core_web_vitals": "excellent"`, `"readability_score": "A+"`,
`"bounce_rate_prediction": "low"`, `"page_load_speed": "optimized"`. `[CODE]` These are never rendered —
harmless to visitors, but they inflate 42,310 files and are a clear marker of the generation process.

**Recommended fix — the only defensible one.**

1. **Immediately stop emitting `Person` JSON-LD** (`[slug].astro:87-96` and `:137`). This is a one-block deletion and it removes 41,113 pieces of deceptive structured data. Highest-priority content change on the site.
2. **Remove the visible "in real life" section** (`:468-477`). Do not try to salvage it. If real user stories are wanted later, collect real ones.
3. **Remove `historical_references`** from the template (`:353-369`) unless and until each entry can be sourced. For Islamic and Biblical names in particular, an unsourced historical claim is worse than no section.
4. **Remove `celebrity_usage`** (`:480-489`), or restrict it to a curated, verified allow-list.
5. **Resolve the etymology contradiction** by choosing one canonical meaning per record and dropping `spiritual_symbolism` where it disagrees with `long_meaning`. This needs a data pass, not a template change.
6. **Strip the unused bloat fields** — `advanced_seo`, `user_engagement`, `social_optimization`, `accessibility`, `monetization`, `structured_data` — from all 42,310 files. No template reads any of them.

Note that removing these four sections will reduce median prose below ~491 words. **That is correct.**
Removing fabricated content is not "thinning" a page: a shorter honest page outranks a longer fabricated
one, and the fabrication is the larger risk by a wide margin.

## 5.4 Fabricated claims in hand-written pages

`[DATA]` Several pages assert things the codebase and the data contradict. These matter because they are
trust signals on pages a human editor wrote.

| Location | Claim | Reality |
|---|---|---|
| `popularity.astro:138-139` | *"every score reflects real search interest and cultural relevance, so the ranking above is a genuine snapshot of what parents are choosing right now — not a guess."* | `popularity_score` is a static integer in a committed JSON file. `[DATA]` 1,197 records are 0; 72 are tied at exactly 100. There is no analytics or telemetry ingestion anywhere in the repository. **The most misleading sentence on the site.** |
| `trending-names.astro:30,31,40-41` | *"Trending Baby Names of 2026 — Most Searched Right Now"*, *"ranked by live popularity score"*, *"the 60 baby names parents are searching for most right now"* | A build-time `.slice(0, 60)` of that same static field. `[DATA]` Because 72 names tie at 100, the "top 60" is an arbitrary cut through a tie group: **22 christian, 38 hindu, 0 islamic, 0 italian** — on a page that advertises all four traditions. The first eight are `Davidde, Davide, Davidson, Johna, Johnathon, Johny, Mark, Mary`, i.e. alphabetical clusters of spelling variants. |
| `unique-names.astro:29-30,20,47` | *"100 of the rarest names in the NameVerse database"*, *"from Islamic, Hindu, Christian and Italian traditions"* | `[DATA]` An **ascending** sort on a field where 1,197 records are 0. All 100 rendered names have `popularity_score: 0`; all 100 are islamic. The list begins `Aamir, Aasiyah, Abeer, Adeel, Adnan, Afaf, Afra, Ahlam, Ahmad, Ahsan` — **`Ahmad`, one of the most common given names on earth, is presented as among the 100 rarest.** The page is sorting on missing data and labelling absence as rarity. |
| `name-meanings.astro:20,29-30` | *"hand-picked from 42,000+ names"*, *"100 beautiful names from Islamic, Christian, Hindu and Italian traditions"* | `[DATA]` `sort(localeCompare).slice(0,100)` — an alphabetical head, not a selection. 57 islamic, 42 hindu, 1 christian, 0 italian. The first entry is the lowercase artefact `zakiya`, which sorts ahead of `Aaba`. |
| `about.astro:38` | *"Verified meanings with linguistic and cultural context, not one-line glosses."* | `[DATA]` The meanings are one-line glosses: `"meaning": "Prosperity, Abundance"`. |
| `about.astro:42` | Coverage of *"Hebrew, Greek, Latin"* | `[CODE]` `ORIGIN_SLUGS` (`name-utils.mjs:63-75`) has no Hebrew, Greek or Latin bucket; such names fall through to `null`. |
| `about.astro:57-62` | *"Entries are reviewed … before they appear"*, *"corrections are prioritized"* | No review pipeline, changelog, provenance field or `reviewed_by` data exists in the repository. |
| `contact.astro:66` | *"We typically respond within 2–3 business days."* | Unverifiable SLA. |
| `blog/index.astro:7-23` | *"Each article shows its publish and last-updated dates"* | True for the 6 JSON-driven posts; **false for the 3 stub articles**, which show no dates. |
| `privacy.astro` §2 | *"Ad partners such as Google AdSense"* | `[CODE]` `Layout.astro:235,240` also loads **two scripts from `revolthem.com`**, a second ad network the policy never names. §4 mentions analytics partners; no analytics script exists in `Layout.astro`. |
| `terms.astro:19` | *"You may not scrape, bulk-download or republish our name database"* | `[LIVE]` `_search-index.json` publishes the entire searchable database as four unauthenticated static files (4.06 MB) that the site itself bulk-downloads on `/popularity` and `/advanced-search`. |

**Recommended fix** These are the cheapest high-value fixes in the whole audit, because they are copy
edits. Replace *"most searched right now"* with what the data actually is (*"our editorial popularity
score"*); replace *"rarest"* with a real rarity computation — or simply exclude zero-score records from
the ascending sort, a two-line change that would immediately make `/unique-names` honest; and align
`/privacy` with the ad networks actually loaded.

## 5.5 Content hierarchy problems

`[CODE]` **`NameCard.astro:29` emits `<h3>`.** Because every listing page places the card grid directly
under the `<h1>` with no intervening `<h2>`, the heading order is `h1 → h3 → h2` on `/name-meanings`,
`/trending-names`, `/unique-names`, `/{religion}-{gender}-names`, `/origins/{origin}`,
`/categories/{category}` and `/names/{religion}/letter/{letter}`.

`[LIVE]` **The name detail page has 17 `<h2>`s and 1 `<h3>`** — a flat wall of equally weighted sections
with no grouping. There is no visual or semantic distinction between *"What does X mean?"* (essential)
and *"Related topics"* (a non-clickable tag cloud).

`[CODE]` **The most important information is not first.** Reading order on a name page is: breadcrumb,
hero (name + meaning — good), 8-cell stat grid, lucky colours, keyword chips, then the templated
`description_paragraph`, and only then the genuinely unique `long_meaning` at `:261`. The boilerplate
paragraph sits between the reader and the real content.

`[CODE]` **Two sections both labelled "Related topics"** on the same page — keyword chips at `:243-250`
and `social_tags` at `:533-542`. Neither links anywhere; both are non-clickable `<span>`s. They add page
length and no value.

---

# 6. INTERNAL LINKING & INFORMATION ARCHITECTURE REPORT

## 6.1 The link graph as it exists

```
                      Navbar (every page)           Footer (every page)
                      ├─ /names                     ├─ /names/{4 religions}, /names
                      ├─ /names/{islamic,christian,hindu}   ├─ /blog, /search
                      ├─ /{3 religions}-{boy,girl}-names    ├─ /names-by-meaning, /names-by-origin
                      ├─ /search, /origins, /categories     ├─ /categories, /trending-names
                      ├─ /names-by-meaning, /trending-names ├─ /unique-names, /popularity
                      ├─ /unique-names, /popularity         ├─ /guides/expert-naming-guide  (STUB)
                      ├─ /guides/expert-naming-guide (STUB) └─ /about, /contact, /privacy, /terms
                      └─ /blog, /about
                              │
        /  ──────────────────►┼──► /names ──► /names/{religion} ──┬──► /names/{religion}/letter/{a-z}
        (hero, hubs, chips)   │                  (4 hubs)         │         (104 pages, 1.6 MB each)
                              │                                   │                  │
                              └──► /{religion}-{gender}-names      └──► top 12 popular │
                                        (8 pages, 300 cards)                          ▼
                                                                        /names/{religion}/{slug}
        /origins ──► /origins/{11}  ──┐                                     (42,310 leaves)
        /categories ──► /categories/{6} ─┼──► top 300 cards ─────────────────────┘
        /trending-names, /unique-names, /name-meanings ──┘
```

`[LIVE]` Measured link counts:

| Page | Internal name links |
|---|---|
| `/names/islamic/letter/a/` | 2,667 |
| `/names/hindu/letter/s/` | 1,729 |
| `/names/italian/letter/g/` | 70 |
| `/names/islamic/aaban/` | 35 total `<a href="/">`, of which ~18 are navbar/footer boilerplate |
| `/islamic-girl-names/` | 5 |
| `/christian-girl-names/` | **0** |

**Structural assessment.** The hierarchy itself is sound — home → directory → tradition hub → letter →
name is exactly the right shape for 42,000 pages. Three things break it in practice:

1. **The 42,310 leaves depend on 104 bottleneck pages.** Every path from the navigation to a name page routes through a letter page (or through the 12-card "popular" rail on a hub, or a 300-card cap on a listing page). With no sitemap (3.2), those 104 pages carry the entire discovery burden while being 1.6 MB each.
2. **Leaf-to-leaf linking is weak and unreliable.** `[CODE]` A name page's only contextual outbound links are up to 12 `similar_sounding_names` and up to 12 `related_names` chips (`[slug].astro:512-524`), of which `[DATA]` 1.0% are 404s (3.11). And `[DATA]` the "similar sounding" values are frequently not similar — `aaban.json` lists `alika, ashika, ada, akil, amalia, ayan, azzahra, alabbas, alaia, aidan`, which is simply an alphabetical sample of names beginning with "a". `amalia` is an Italian record, so `/names/islamic/amalia` does not exist.
3. **No sibling navigation.** `[CODE]` A name page cannot reach the next/previous name, the letter page it belongs to, its origin hub, its category hub, or its gender hub. The only cross-links are three generic buttons at `:563-567` — `/names/{religion}`, `/names-by-meaning`, `/popularity` — identical on all 42,310 pages.

## 6.2 Orphans and near-orphans

`[CODE]` Verified by grepping all of `src/` for each route path, excluding self-references:

| Page | Inbound links from `src/` | Notes |
|---|---|---|
| `/advanced-search` | **0** | True orphan. Yet it is on the sitemap allow-list (`astro.config.mjs:19`) — submitted to Google while unreachable by any crawler following links. |
| `/name-meanings` | **0** | True orphan, and the more damaging of the two: it is the page that actually renders 100 name cards. Navbar (`Navbar.astro:23`) and footer (`Footer.astro:15`) both point at `/names-by-meaning` instead. Also on the sitemap allow-list. |
| `/popular-by-state` | **0** | True orphan, and a "coming soon" stub. |
| `/homepage` | 0 | Unlinked but crawlable and indexable (3.4). |
| `/blog/top-islamic-baby-names-2026` | 1 — `homepage/index.astro:76` | Stub. **Not** in `blog-posts.json`, so `/blog` neither lists it nor includes it in its `Blog` JSON-LD. Its own only outbound link is a 404. |
| `/blog/hindu-baby-names-meanings` | 1 — `homepage/index.astro:82` | Same. |
| `/blog/christian-baby-names-bible` | 1 — `homepage/index.astro:88` | Same. |
| `/my-names` | 1 — sitemap allow-list only | Stub; no `src/` link found. |
| `/italian-boy-names`, `/italian-girl-names` | 1 each — `names/italian/index.astro:113-114` | Both render 0 names. Absent from the navbar, which lists gender pages for the other three religions only. |
| `/names/italian` | Navbar: **absent** · Footer: `Footer.astro:8` · Homepage: hub card | Italian is promoted as an equal hub on the homepage and footer but is missing from the navbar's Names dropdown entirely. |

## 6.3 Link equity spent on crawl dead-ends

`[CODE]` Query-string links to `/search` are used as though they were pages. Because `/search` renders
its results client-side from a 4 MB JSON fetch, **every one of these is a dead end for a crawler**:

| Source | Count | Pattern |
|---|---|---|
| `names-by-meaning.astro:60,73` | **66** | `/search?q={meaning}` — **the entire purpose of the page** |
| `homepage/index.astro:64-69,152-154,255` | 17 | `/search?q=…` intent chips and meaning chips |
| `blog/[slug].astro:249` | ~30 | `/search?q={featuredName}` — for names that often are not in the database |
| `origins/[origin].astro:74,78,88` | 3 per page × 11 | `/search?origin=…&religion=…&sort=popularity` |
| `categories/[category].astro:78,82,92` | 3 per page × 6 | `/search?category=…` |
| `[religion]-[gender]-names.astro:76,88` | 2 per page × 8 | `/search?religion=…&gender=…` |
| `names/[religion]/index.astro:131` | 1 per page × 4 | `/search?religion=…&sort=popularity` |
| `trending-names.astro:45`, `unique-names.astro:32` | 2 | `/search?sort=popularity` |

**And the parameters do not even work.** `[CODE]` `search.astro:4`:

```js
const { q, religion, gender, origin, category } = Astro.url.searchParams;
```

`URLSearchParams` is not a plain object — it exposes `get()`, not named properties. So all five
destructured values are `undefined` on every build, `query` is always `''`, and `activeFilters` is
always `[]`. `[CODE]` The entire server-side title/description/`<h1>` personalisation at
`search.astro:17-31,41` is dead code that never executes. The client script reads the real params
separately (`:312`), so the tool works for humans — but the page never produces a query-specific title
or heading, and every one of those ~150 internal links resolves to the same generic shell.

**`/advanced-search` compounds it.** `[CODE]` `advanced-search.astro:301-305` — the "Clear all filters"
button unchecks *every* checkbox including the four religion boxes, then calls `run()`, where `:243`
`if (!rels.has(item.religion)) return false;` rejects everything because `rels` is empty. The user asks
to widen the search and is told *"No names match those filters — try widening your search."* The religion
boxes ship pre-checked (`:46`), so this is a one-way door.

## 6.4 Recommended internal-linking architecture

Scalable, and buildable from data the site already has:

1. **Fix discovery first.** A working sitemap (3.2) plus non-redirecting canonicals (3.3) removes the dependency on the 104 letter pages as the sole crawl path.
2. **Paginate the letter pages** into ~100 names per page with real `<a>` pagination and `rel="prev"`/`rel="next"`. `[DATA]` This turns 104 bottlenecks into roughly 430 healthy, crawlable, sitemap-listed pages.
3. **Replace every `/search?q=X` link with a real page** wherever one exists. `/names-by-meaning`'s 66 chips are the priority: either build `/meanings/{word}` routes from the same token frequency data the page already computes (`names-by-meaning.astro:14-26`), or point the chips at the existing hubs. Sixty-six links from a hub page currently produce zero crawlable destinations.
4. **Add sibling and parent links to the name page.** From data already in the record: → its letter page, → its origin hub, → its category hub, → its gender hub, → previous/next name alphabetically. That is five contextual links per page, generated at build time, that convert 42,310 leaves into a connected mesh.
5. **Validate related-name links** against the slug set and allow cross-religion targets. `[DATA]` Many "similar sounding" names exist under a different religion; linking `/names/islamic/amalia` fails while `/names/italian/amalia` would work.
6. **Fix the two orphans.** Link `/name-meanings` and `/advanced-search` from the navbar or footer, or merge them into their near-duplicates (3.9) and drop them from the sitemap.
7. **Add Italian to the navbar** or stop promoting it on the homepage and footer until 5.1 is resolved. The current state — promoted as one of four equal hubs, absent from the navbar, 352 empty pages — is the worst of the three options.
8. **Reduce footer repetition.** 18 identical footer links × 42,418 pages is the site's largest source of low-value internal links. Keep the footer, but move discovery weight into contextual in-content links instead.

---

# 7. UI/UX REPORT

## 7.1 Typography

`[CODE]` `tailwind.config.cjs:7-10` — two variable fonts, sensibly chosen:

```js
display: ['"Fraunces Variable"', 'Georgia', 'serif'],
sans:    ['"Inter Variable"', 'system-ui', 'sans-serif'],
```

Fraunces for headings and Inter for body is a genuinely good pairing for a cultural-reference site:
warm and editorial in the headings, neutral and legible in the body. **Keep this.**

**Loading is the problem.** `[CODE]` `Layout.astro:4-5` imports the bare packages:

```js
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
```

`[BUILD]` That pulls **every subset**: 10 woff2 files, 293 KB declared — `inter-latin-ext` (83.1 KB),
`inter-latin` (47.1 KB), `fraunces-latin` (35.8 KB), `fraunces-latin-ext` (32.8 KB),
`inter-cyrillic-ext` (25.4 KB), `inter-greek` (18.6 KB), `inter-cyrillic` (18.3 KB),
`fraunces-vietnamese` (11.3 KB), `inter-greek-ext` (11 KB), `inter-vietnamese` (10 KB).

To be precise about the cost: `unicode-range` means a browser only *downloads* the subsets it needs, so
an English visitor transfers roughly 83 KB, not 293 KB. The real costs are (a) 10 extra `@font-face`
blocks inflating the single 40.5 KB stylesheet, and (b) **no `<link rel="preload">` for the latin
woff2**, so fonts are only discovered after the CSS has been fetched and parsed — a serialised
round-trip directly in front of LCP, since the LCP element on a name page is the Fraunces `<h1>`.

**Sizing.** `[CODE]` Body copy is consistently `text-sm sm:text-base` — 14 px on mobile, 16 px on
desktop. 14 px is the floor of acceptable, and it is applied to long-form prose including the name
page's `long_meaning`, `cultural_impact` and all FAQ answers. 16 px on mobile would be better for a
page users read rather than scan.

**Text below the floor:**

- `[CODE]` `.badge` is `text-[11px]` (`global.css:123`) and appears on every one of the ~300 cards on a listing page.
- `[CODE]` The name page's stat-grid labels are `text-[10px]` with `tracking-[0.2em]` (`[slug].astro:184,190,196,202,208,214,220,226`). Ten pixels with 0.2em letter-spacing, in `text-nv-text-muted` at **2.56:1 contrast** (9.2), is the least readable text on the site — and it labels the page's key facts.
- `[CODE]` `text-xs` (12 px) is used for breadcrumbs, card meta, footer body and FAQ chevron labels.

**Heading scale.** `[CODE]` The name page `<h1>` is `text-4xl sm:text-5xl lg:text-6xl` — 36 px / 48 px /
60 px. Generous and appropriate for a single-word subject. `<h2>`s are `text-xl sm:text-2xl`
(`[slug].astro:83`), so at desktop the jump is 60 px → 24 px with nothing between; 17 sibling `<h2>`s at
one weight produce no visual hierarchy (7.4).

**Line height.** `leading-relaxed` (1.625) on body prose is correct. `leading-[1.05]` on the homepage
`<h1>` (`homepage/index.astro:106`) is tight but acceptable at display size.

## 7.2 Colour

`[CODE]` `global.css:6-58` is a well-built token system. Light: near-white page (`250 251 252`), white
surfaces, navy primary (`30 58 95`), blue accent (`37 99 235`), plus four per-tradition accent pairs
(islamic teal, christian amber, hindu red, italian green). Dark mode inverts all of it. **The palette is
appropriate, professional and culturally neutral. Do not redesign it.**

Three specific defects, not a redesign:

**1. `--nv-muted` fails WCAG at every size.** `[DATA]` Computed contrast ratios:

| Foreground on background | Ratio | AA normal (4.5) | AA large (3.0) |
|---|---|---|---|
| `text-nv-text-muted` on `nv-surface` (light) | **2.56** | FAIL | FAIL |
| `text-nv-text-muted` on `nv-page` (light) | **2.47** | FAIL | FAIL |
| `text-nv-text-muted/50` — AlphabetNav disabled letters | **1.54** | FAIL | FAIL |
| `text-nv-text-muted` on `nv-surface` (dark) | **3.58** | FAIL | pass |
| `text-nv-text-secondary` on `nv-surface` (light) | 7.58 | pass | pass |
| `text-nv-accent` on `nv-surface` (light) | 5.17 | pass | pass |
| `text-nv-accent` on `bg-nv-accent-subtle` — badges (light) | 4.75 | pass | pass |
| `text-nv-primary` on white — homepage chips (light) | 11.50 | pass | pass |
| `white/75` on `bg-nv-primary` (light) | 7.25 | pass | pass |
| `text-nv-accent` on `bg-nv-accent-subtle` (dark) | 4.52 | pass | pass |

`[DATA]` `text-nv-text-muted` is used **101 times across 29 files**, concentrated in
`[slug].astro` (23), `popularity.astro` (14) and `blog/[slug].astro` (11). It is the colour of the FAQ
answer bodies on name pages (`[slug].astro:555`), all card meta text, all breadcrumbs, the stat-grid
labels, and the entire footer body.

**Fix:** change `--nv-muted` from `148 163 184` (slate-400) to `100 116 139` (slate-500) → 4.76:1, or
`71 85 105` (slate-600) → 7.58:1. In dark mode raise `100 116 139` to `148 163 184` → 6.64:1. Two lines
in `global.css`, and it repairs 101 usages at once. `[CODE]` Everything else in the palette already
passes; this one token is the whole problem.

**2. Hardcoded `bg-white` breaks dark mode completely.** `[CODE]` Six files hardcode `bg-white` on a
content panel: `my-names.astro:11`, `popular-by-state.astro:11`,
`guides/expert-naming-guide.astro:11`, and the three stub blog pages at `:12`. `[DATA]` In dark mode
`text-nv-text` (`241 245 249`) on white gives **1.10:1** — the text is effectively invisible. Use
`bg-nv-surface`.

**3. Gender colour semantics are questionable.** `[CODE]` `NameCard.astro:35` badges boys with the blue
accent and girls with `bg-hindu-soft text-hindu` — the *Hindu tradition's red*. So a Christian girl name
carries a Hindu-coded colour chip, and the tradition colour system and the gender colour system collide.
Give gender its own neutral pair.

## 7.3 Spacing, layout and cards

**Container widths do not agree.** `[CODE]` Three different maxima are in play:

| Element | Max width | Source |
|---|---|---|
| Navbar inner | `max-w-7xl` = **1280 px** | `Navbar.astro:68` |
| Page content | `max-w-page` = **1152 px** | `global.css:95` + `tailwind.config.cjs:62` |
| Name detail inner | `max-w-5xl` = **1024 px** | `[slug].astro:140` |
| Listing pages inner | `max-w-6xl` = **1152 px** | e.g. `names/index.astro:38` — identical to the container, so it does nothing |

At viewports ≥ 1280 px the navbar logo sits roughly 40 px to the left of the page content's left edge,
and the navbar CTA sits 40 px right of it. **Visible misalignment on every page at laptop and desktop
widths.** Fix: make the navbar use `container-page`.

`[CODE]` `max-w-6xl` inside `container-page` is a no-op on 8 listing pages — both resolve to 1152 px.
Harmless, but it signals that the constraint was intended to do something and does not.

**Card system.** `[CODE]` `.card` (`global.css:98-100`) = `rounded-card` (1 rem) + border + surface +
`shadow-card`; `.card-hover` adds a `-translate-y-0.5` lift. Consistent and well-executed. Padding is
`p-5` on `NameCard`, `p-6 sm:p-8` on name-page sections, `p-6 sm:p-8 lg:p-10` on the hero. Coherent.

**But the name page is 20 sibling cards.** `[CODE]` `[slug].astro` renders the intro, full meaning,
spiritual meaning, spiritual significance, symbolism, cultural impact, numerology, traits,
pronunciation, history, modern usage, scripture reference, other languages, regional table, real life,
celebrities, variations, similar names, social tags and FAQ — **each as its own `.card` at the same
visual weight**, stacked in a `space-y-6` column. There is no grouping, no two-column layout at desktop,
and no visual priority. At 1024 px wide with 20 equal cards, the page reads as a list of undifferentiated
boxes rather than an article.

**Ad spacing.** `[CODE]` `Ad.astro:26-36` — `min-height: 90px` plus `margin: 1.5rem 0` = **138 px**
reserved. Reserving space is correct (no CLS); the placement is not (7.7).

## 7.4 The name detail page — the site's most important template

`[LIVE]` 101,056 bytes, 76 inline SVGs, 5 JSON-LD blocks, 1 `<h1>`, 17 `<h2>`, 1 `<h3>`.

**What is right:** the `<h1>` is the name; the meaning appears immediately beneath it; the breadcrumb is
present and correct; every section is conditional so empty fields do not render empty boxes; the regional
table is wrapped in `overflow-x-auto` (`:442`); RTL scripts get `dir="rtl"` (`:430`).

**What is wrong, in reading order:**

1. `[CODE]` `:254-258` — the templated `description_paragraph` (5.2) sits between the hero and the genuinely unique `long_meaning` at `:261`. The most boilerplate paragraph on the page occupies the most valuable position.
2. `[CODE]` `:243-250` — "Related topics" keyword chips are non-clickable `<span>`s containing SEO keywords (`"Aaban"`, `"Islam name"`, `"baby names"`, `"Arabic origin"`). This is visible keyword stuffing that helps no reader. `[CODE]` `:533-542` renders a *second* "Related topics" block from `social_tags` (`#AabanMeaning`, `#IslamicBabyNames`), also non-clickable.
3. `[CODE]` Three contradictory etymology sections (5.3) at `:263`, `:287`, `:425`.
4. `[CODE]` Fabricated sections at `:353-369` (history), `:468-477` (real life), `:480-489` (celebrities).
5. `[CODE]` `:555` — FAQ answers are `text-nv-text-muted` at 2.56:1 contrast. The answers are the point of the FAQ.
6. `[CODE]` `:181-230` — the 8-cell stat grid is the best UX on the page (meaning, origin, lucky number, lucky day, lucky stone, life path, popularity, language at a glance) but its labels are 10 px, letter-spaced, and low-contrast.
7. `[CODE]` `:18-24` — three `Astro.redirect('/')` calls in a prerendered route. `getStaticPaths()` only ever yields valid pairs so these never fire, but in a static build `Astro.redirect` produces a meta-refresh page rather than a real redirect. Dead code that would misbehave if it ever ran.

**Recommended reorder** (no content deleted, only sequenced):

```
h1 name  +  meaning  +  pronunciation  +  gender/origin/religion chips     [keep as-is]
8-cell fact grid                                                          [keep; fix label size + contrast]
h2 What does {Name} mean?          <- long_meaning, promoted above the boilerplate
h2 Origin & language               <- origin, language[], in_arabic/in_urdu/in_hindi merged here
h2 How to pronounce {Name}
h2 Spiritual meaning               <- ONE section: spiritual_meaning + significance, deduplicated
h2 Numerology & lucky attributes   <- numerology_meaning + life_path + lucky_* consolidated
h2 Popularity                      <- popularity_by_region table + score
h2 Variations & similar names      <- variations + validated similar/related links
h2 Frequently asked questions      <- 3-4 data-grounded questions (5.2)
[cross-links: letter page, origin hub, category hub, gender hub, prev/next name]   (6.4)
```

That is 9 grouped `<h2>`s instead of 17 flat ones, with the unique content first and the fabricated
sections gone.

## 7.5 Navigation

`[CODE]` `Navbar.astro` — sticky, `z-[100]`, `h-14` (56 px), backdrop-blurred, with two click-triggered
dropdowns (Names: 10 links; Explore: 10 links), a theme toggle, a Search link, a "Start searching" CTA,
and a separate mobile drawer.

**What works:** all main categories are reachable in one or two clicks; `aria-expanded` is maintained on
desktop triggers (`:397,416`); outside-click closes the dropdown (`:423-427`); the mobile drawer locks
body scroll (`:360`) and closes on link click (`:367-370`); active-link highlighting handles trailing
slashes (`:298-300, 430-435`).

**Defects:**

| # | Issue | Evidence |
|---|---|---|
| 1 | **Duplicate mobile entries.** "Blog" and "About" appear twice in the drawer — once from `navItems` (`:31-37`) and again from `directLinks` (`:39-42`). | `[CODE]` `:204-259` renders both arrays |
| 2 | **Italian is missing** from the Names dropdown, while Islamic/Christian/Hindu each get 3 entries. | `[CODE]` `:5-16` |
| 3 | **Girl-name links lead to near-empty pages** — `/christian-girl-names` renders 0. | 3.6 |
| 4 | **"Expert Naming Guide"** is advertised with the description "Decision framework for parents" and is a stub. | `[CODE]` `:28` |
| 5 | **Two dropdowns overlap in purpose.** "Names" and "Explore" both have `href: '/names'` and both contain "All Baby Names"; "Explore" also duplicates "Search Names" and "Names by Meaning" from elsewhere. 20 links across two menus for what is really ~12 destinations. | `[CODE]` `:6,21,33,34` |
| 6 | **Desktop nav only appears at `lg` (1024 px).** Tablet-portrait users (768–1023 px) get the hamburger despite ample horizontal room. | `[CODE]` `:81` |
| 7 | **No keyboard escape.** No `Escape` handler on either the dropdowns or the mobile drawer; no arrow-key navigation; no focus trap in the drawer; focus is not returned to the trigger on close. | `[CODE]` `:292-445` — no `keydown` listener anywhere |
| 8 | **Mobile triggers lack ARIA.** `[data-mobile-trigger]` buttons (`:209-212`) have no `aria-expanded` and no `aria-controls`; the drawer has no `role="dialog"`/`aria-modal`. | `[CODE]` `:188, 209` |
| 9 | **Container mismatch** with page content at ≥1280 px. | 7.3 |
| 10 | **52 KB of HTML per page.** | 8.2 |

`[CODE]` **Footer** (`Footer.astro`) is well-formed: three labelled `<nav>` landmarks, 18 links, brand
block, copyright. Two issues only — body text at 2.56:1 contrast (`:43`), and it links the
`/guides/expert-naming-guide` stub (`:21`).

## 7.6 Above-the-fold: the single worst UX decision on the site

`[CODE]` `Layout.astro:199-221` — the body order is:

```astro
<Navbar />                                  <!-- 56 px sticky -->
<div class="container-page py-4">
  <Ad placement="inline" />                 <!-- 138 px reserved (90 min-height + 3rem margin) -->
  <div class="mt-4"><SocialShare … /></div> <!-- ~48 px incl. mt-4 -->
</div>
<main class="min-h-[60vh]"><slot /></main>  <!-- the page finally starts -->
<Footer />
<div class="container-page py-4"><Ad placement="bottom" /></div>
```

On a 390 × 844 viewport that is roughly **240 px — about 28% of the screen — consumed by an ad and a
share bar before any content**, on every one of 42,418 routes. Two specific consequences:

1. **The `<h1>` is pushed below the fold on mobile** for every page. On a name page the user must scroll before seeing the name they searched for.
2. **The share bar precedes the content on every page**, including the homepage and the "coming soon" stubs — asking users to share a page they have not read, and on the homepage it appears *twice* because of the double-layout nesting (3.4).

**Recommended fix** Move `<Ad placement="inline" />` to *after* the first content section (a slot the
page can position), and move `<SocialShare />` to the end of the article on content pages only. This is a
layout change with no SEO risk and a large above-the-fold gain. `[CODE]` The ad deferral logic
(`Layout.astro:224-292`) is already correct and should be left alone.

## 7.7 Desktop vs mobile experience summary

**Desktop (1280–1920 px):** genuinely good. Card grids at `xl:grid-cols-4` use the width well, the
alphabet strip is a single comfortable row, the blog TOC sidebar appears, dropdowns work. The flaws are
the 1280 px navbar/content misalignment (7.3), the 20-flat-cards name page that leaves the right half of
a 1440 px screen empty (7.3), and 1.6 MB letter pages.

**Mobile (390 px):** substantially worse, and not because of the design system — because of four
specific things: the 240 px ad-and-share band before every page (7.6), the 1.6 MB letter pages (8.1),
2.56:1 muted text at 10–12 px (7.2, 9.2), and sub-44 px touch targets (9.3). Everything else — the
single-column collapse, the card stack, the hero — adapts correctly.

## 7.8 Quality benchmark against a modern reference site

Assessed on the dimensions the brief specifies, without reference to any competitor's design or content:

| Dimension | Verdict | Reasoning |
|---|---|---|
| **Clarity** | Mixed | Name pages state the meaning immediately and well. Listing pages bury it under an ad and a share bar, and four of them make false claims about what they contain (5.4). |
| **Authority** | **Weak — the primary gap** | 41,113 fabricated people, 36,846 fabricated historical claims, three contradictory etymologies on a single page, and an About page asserting an editorial review process that does not exist. No sources, no citations, no provenance, no author attribution beyond "NameVerse Editorial Team". For a cultural and religious reference site this is the deciding weakness. |
| **Readability** | Mixed | Good font pairing and good line height, undermined by 14 px body copy, 10–11 px labels, and a 2.56:1 muted colour. |
| **Trust** | **Weak** | Compounds Authority. A privacy policy that omits one of two ad networks; terms prohibiting bulk download of a database the site publishes openly; four pages presenting a static integer as live search data. |
| **Navigation** | Good structure, defective execution | Correct hierarchy; broken destinations (0-result gender pages, stub guide), 20 links across two overlapping dropdowns, Italian missing. |
| **Mobile experience** | **Weak** | 7.7. |
| **Content usefulness** | **Genuinely strong where the data is real** | Pronunciation, IPA, numerology, lucky attributes, multi-script transliteration and regional popularity is more than most name sites offer, and it is real. This is the asset worth protecting. |
| **Technical quality** | **Weak at present** | The build does not complete; no sitemap; every programmatic canonical redirects; a one-character logic error hides 17,744 records. All individually small, all currently unfixed. |

**The honest summary:** NameVerse has better *data* than its technical execution and its content
integrity currently deserve. Fixing the technical layer (Phases 1–2) and removing the fabrication
(Phase 3) would put it in a materially different quality tier without adding a single new name.

---

# 8. PERFORMANCE REPORT

`[BUILD]` The baseline is already good in the ways that usually matter: **3 JS files totalling 14 KB**,
one 40.5 KB stylesheet, zero framework runtime, zero hydration, static HTML everywhere. The problems are
not framework overhead — they are four specific payload decisions.

## 8.1 Rank 1 — Unpaginated letter pages (largest single win)

`[LIVE]` Measured:

| URL | HTML bytes | Name cards |
|---|---|---|
| `/names/islamic/letter/a/` | **1,610,194** | 2,626 |
| `/names/hindu/letter/s/` | **1,069,738** | 1,688 |
| `/names/italian/letter/g/` | 104,711 | 33 |

`[DATA]` `[CODE]` `letter/[letter].astro:29-35` filters and renders with no cap. Distribution: islamic
a=2,626 m=2,389 s=2,242 n=1,165 h=1,082; christian a=1,569 b=893 g=835; hindu s=1,688 a=1,494.

Cost on mobile: 1.6 MB of HTML to download, parse and lay out; 2,626 DOM subtrees; and roughly 340,000 px
of scroll in a single column. This is simultaneously the worst performance problem, the worst mobile UX
problem (7.7) and the crawl bottleneck (3.8) — one fix addresses all three.

**Fix:** paginate at ~100 per page (`/names/islamic/letter/a`, `…/a/2`, …) with real anchor pagination
and `rel="prev"`/`rel="next"`. Expected: 1.61 MB → ~120 KB, a **93% reduction** on the 104 highest-link
pages, and 104 bottlenecks become ~430 healthy pages. **Risk: medium** — it adds URLs. Keep page 1 at the
existing URL so no current URL changes, and add the new pages to the sitemap.

## 8.2 Rank 2 — The navbar is 52% of every page

`[LIVE]` On `/names/islamic/aaban/`: total 101,056 bytes, of which the `<nav>` element is **52,556
bytes**, the footer 3,664 and the `<head>` 4,600. **76 inline SVGs** per page.

`[CODE]` Cause: `Navbar.astro` renders each of the 20 dropdown links **twice** — once in the desktop
panel (`:114-136`) and again in the mobile drawer (`:229-239`) — and every link, every trigger and every
action button carries a full inline `<svg>` via `set:html={getIcon(...)}` (`:95,104,122,153,160,174,182,216,236,255`).

`[DATA]` Across 42,418 pages that is roughly **2.2 GB of identical, uncacheable HTML** — uncacheable
because it is inline in each document rather than in a shared, cached asset.

**Fix, in order of value:** (a) replace the inline SVGs with a single `<svg><symbol>` sprite plus
`<use href="#icon-x">` — same icons, a fraction of the bytes; (b) render the mobile drawer's links from
the same markup rather than duplicating them, or build the drawer client-side from the desktop DOM;
(c) trim the two overlapping dropdowns from 20 links to ~12 (7.5, defect 5). Expected: 52 KB → ~15 KB,
i.e. **a ~37% reduction in total page weight on all 42,418 pages**. **Risk: low** — presentational only,
but it touches every page, so verify the mobile drawer and dropdowns after the change.

## 8.3 Rank 3 — 4.06 MB of search index fetched eagerly

`[LIVE]` Actual sizes: islamic 1,843,262 + christian 1,339,096 + hindu 1,046,095 + italian 27,247 =
**4,255,700 bytes (4.06 MB)**.

`[CODE]` Four consumers, two of them eager:

| Page | Loads | When |
|---|---|---|
| `/popularity` | all 4 (4.06 MB) | **on page load**, `popularity.astro:343-350` — and `:346-348` then auto-clicks a chip, so the fetch is on the critical path to first meaningful content |
| `/advanced-search` | all 4 (4.06 MB) | **on page load**, `advanced-search.astro:307-309` |
| `/search` | all 4 (4.06 MB) | on first keystroke, `search.astro:193-211` — acceptable |
| `/` homepage | 3 of 4 (4.23 MB minus italian) | on first keystroke, `homepage/index.astro:365-383` — acceptable |

Both eager pages already render their above-the-fold content server-side (`/popularity`'s top-50 aside,
`/advanced-search`'s filter panel) and need none of the index to do so. On a 3G connection this is a
multi-second stall in front of content that is already present.

`[CODE]` Two related script bugs make it worse: both pages guard their handlers with
`if (!indexes) return;` (`popularity.astro:327`, `advanced-search.astro:234`), so any interaction during
the multi-second load is **silently discarded with no feedback**.

**Fix:** load on first interaction, not on load; fetch only the religion(s) actually filtered; and split
the index by first letter so a query fetches ~1/26th of it. Also gzip is already applied by GitHub Pages,
so measure the real transfer before over-engineering. **Risk: low.**

## 8.4 Rank 4 — Font subsets and no preload

`[BUILD]` 10 woff2 files / 293 KB declared for an `lang="en"` site (7.1). Only latin and latin-ext are
plausibly needed.

**Fix:** import specific subsets — `@fontsource-variable/inter/latin.css` and
`@fontsource-variable/fraunces/latin.css` — dropping 8 `@font-face` blocks and shrinking the single
stylesheet from 40.5 KB. Then add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the
two latin files, and confirm `font-display: swap`. Because the LCP element on a name page is the Fraunces
`<h1>`, the preload is the higher-value half of this change. **Risk: low** — verify that no rendered
content needs Cyrillic or Greek glyphs first. `[DATA]` Note the transliteration fields use Arabic,
Urdu, Devanagari and Hebrew scripts, which **neither** font covers in any subset — those already fall
back to system fonts, so removing Cyrillic/Greek/Vietnamese changes nothing for them.

## 8.5 Rank 5 — Images

`[DATA]` `public/` contains exactly two images: `logo.svg` (660 bytes) and
`nameverse_logo_emblem.png` (**921,872 bytes**).

`[CODE]` That single 900 KB PNG serves as the OG image (`Layout.astro:14,120`), the 512×512 favicon
(`:141-145`) and the `apple-touch-icon` declared at `sizes="1600x1600"` (`:146-150`). Browsers fetch it
as an icon on first visit.

`[DATA]` **Two referenced images do not exist:**

- `/og-trending-names.png` — referenced by **all 6** blog posts in `public/data/blog-posts.json`. `[CODE]` `blog/[slug].astro:214-219` renders it with `loading="eager"`, so every blog article shows a broken image at the top of the page, and `:101` puts the same dead URL in the `Article.image` property that Google requires for article rich results.
- `/og-home.png` — the `Article.image` fallback at `blog/[slug].astro:101`.

**Fix:** produce a real 1200×630 OG image, a 180×180 apple-touch-icon and a 512×512 icon; create or
remove `/og-trending-names.png`; switch `twitter:card` to `summary_large_image` (3.12). **Risk: none.**

## 8.6 Ranked summary

| Rank | Change | Measured before | Expected after | Pages affected | Risk |
|---|---|---|---|---|---|
| 1 | Paginate letter pages | 1,610,194 B | ~120,000 B | 104 → ~430 | Medium |
| 2 | Navbar sprite + de-duplicate | 52,556 B/page | ~15,000 B/page | **42,418** | Low |
| 3 | Lazy + scope the search index | 4.06 MB eager | ~0 on load | 2 | Low |
| 4 | Latin-only font subsets + preload | 10 files, 40.5 KB CSS | 2 files, ~28 KB CSS | all | Low |
| 5 | Right-sized icons and OG image | 921,872 B PNG | ~40,000 B | all | None |
| 6 | Fix the eager broken blog image | 404 on `loading="eager"` | valid or removed | 6 | None |
| 7 | Strip 6 unused JSON field groups | 42,310 files, 8–26 KB | ~30% smaller | build time, repo | Low |
| 8 | `preconnect` → `dns-prefetch` for `revolthem.com` | early connection | deferred | all | None |

**What NOT to do for performance.** `[CODE]` Do not remove the `min-height` reservation in
`Ad.astro:33` (it prevents CLS). Do not make the ad scripts synchronous or move them earlier
(`Layout.astro:224-292` is already correct). Do not move name content to client-side rendering to reduce
HTML — the server-rendered content is precisely why the name pages are crawlable (3.5). Do not remove the
inline theme script (`Layout.astro:174-188`); it prevents a flash.

---

# 9. ACCESSIBILITY REPORT

## 9.1 What is already right

Worth stating first, because the foundations are better than the defect list suggests:

- `[CODE]` `Layout.astro:66` — `<html lang="en" dir="ltr">`.
- `[CODE]` `global.css:74-77` — a global `:focus-visible` outline (2 px accent at 60% alpha, 2 px offset). A real focus indicator exists by default.
- `[CODE]` `global.css:79-90` — `prefers-reduced-motion` disables animations and smooth scrolling.
- `[CODE]` `Layout.astro:91` — `<meta name="color-scheme" content="light dark">`.
- `[CODE]` Landmarks are used properly: one `<main>` in the layout, `<nav aria-label="Main navigation">`, three labelled `<nav>`s in the footer, `<nav aria-label="Breadcrumb">` on every detail and hub page, `aria-label="Browse by letter"` on `AlphabetNav.astro:8`.
- `[CODE]` `aria-labelledby` correctly wires most section headings (`names/index.astro:70,85`, `homepage/index.astro:178,215,240,286,310`).
- `[CODE]` `aria-current="page"` on the active letter (`AlphabetNav.astro:17`).
- `[CODE]` `aria-live="polite"` on the search status regions (`search.astro:111`, `advanced-search.astro:105`).
- `[CODE]` Icon-only controls mostly do have labels: `aria-label="Search"` (`homepage/index.astro:142`), `aria-label="Toggle theme"` (`Navbar.astro:151`), `aria-label="Search names"` (`:158,173`), `aria-label="Open menu"` (`:180`), `aria-label="NameVerse home"` (`:70`, `Footer.astro:36`), `aria-label="Share on Twitter"` etc. (`SocialShare.astro:14,17,20,23`), `aria-label="Remove {name}"` (`popularity.astro:248`).
- `[CODE]` `<details>`/`<summary>` is used for all FAQ disclosures — native, keyboard-accessible, and screen-reader-friendly by default.
- `[CODE]` `advanced-search.astro` groups its filters in `<fieldset>`/`<legend>` and wraps its keyword input and sort select in real `<label>`s.

## 9.2 Colour contrast — the largest accessibility defect

`[DATA]` Computed WCAG 2.1 ratios (full table in 7.2). The failures:

| Foreground / background | Ratio | AA normal | AA large | Where it appears |
|---|---|---|---|---|
| `text-nv-text-muted` on `nv-surface` (light) | **2.56** | FAIL | FAIL | FAQ answer bodies on all 42,310 name pages (`[slug].astro:555`); every card's meta text; all breadcrumbs; the entire footer body; the name page's 8 stat labels at 10 px |
| `text-nv-text-muted` on `nv-page` (light) | **2.47** | FAIL | FAIL | page-level muted text |
| `text-nv-text-muted/50` (light) | **1.54** | FAIL | FAIL | `AlphabetNav.astro:28` — the disabled letters, effectively invisible |
| `text-nv-text-muted` on `nv-surface` (dark) | **3.58** | FAIL | pass | same 101 usages, dark mode |
| `text-nv-text` on hardcoded `bg-white` (dark) | **1.10** | FAIL | FAIL | 6 stub pages (7.2, defect 2) — text is invisible |
| `text-nv-primary` on hardcoded `bg-white` (dark) | **3.68** | FAIL | pass | homepage meaning chips in dark mode |

`[DATA]` `text-nv-text-muted` appears **101 times across 29 files**. This is a single-token fix
(`global.css:13` and `:40`) that repairs all 101 at once — the highest ratio of accessibility benefit to
effort anywhere in the codebase.

**Note the nuance:** every other colour pair in the system passes, several comfortably
(`text-nv-text-secondary` at 7.58:1, `text-nv-primary` on white at 11.50:1). The palette is not the
problem; one token is.

## 9.3 Touch targets

WCAG 2.5.5 (AAA) asks for 44×44 px; WCAG 2.5.8 (AA, 2.2) asks for 24×24 px. `[CODE]` Measured from the
Tailwind classes:

| Size | Element | Location | Instances per page |
|---|---|---|---|
| **32 px** | Share buttons (`h-8 w-8`) | `SocialShare.astro:14,17,20,23` | 4, on **every page** |
| **~16 px** | `.compare-chip` seed buttons inside a `text-xs` paragraph with no padding | `popularity.astro:60` | 6 |
| **~30 px** | Homepage intent chips (`px-3.5 py-1.5 text-xs`) | `homepage/index.astro:118` | 6 |
| **36 px** | Theme toggle, mobile search, mobile menu button (`h-9 w-9`) | `Navbar.astro:150,173,179` | 3 |
| **36 px** | Alphabet letters (`h-9 w-9`) | `AlphabetNav.astro:19,28` | 27, on 108 pages |
| **36 px** | Homepage search submit (`h-9 w-9`) | `homepage/index.astro:141` | 1 |
| **~37 px** | Pill links (`px-4 py-2 text-sm`) | many hub pages | up to 60 |
| **40 px** | "Explore other letters" (`h-10 w-10`) | `letter/[letter].astro:133` | 10 |
| **40 px** | `.btn` and all variants (`px-4 py-2.5 text-sm`) | `global.css:107` | many |
| **44 px** | Letter grid (`h-11 w-11`) — **the only compliant one** | `names/[religion]/index.astro:149` | 27 |

The 4 share buttons at 32 px sit above the fold on all 42,418 pages, and the 27 alphabet letters at
36 px are the primary browse control. **Fix:** raise `.btn` to `py-3`, `h-9 w-9` icon buttons to
`h-11 w-11`, share buttons to `h-11 w-11`, and `AlphabetNav` to `h-11 w-11` to match the grid on the same
page that already gets it right. Give `popularity.astro`'s chips real padding.

## 9.4 Keyboard navigation and focus management

`[CODE]` `Navbar.astro:292-445` contains **no `keydown` listener of any kind.** Consequences:

| Missing | Impact |
|---|---|
| `Escape` to close the desktop dropdown | A keyboard user who opens "Names" must tab through all 10 links to escape |
| `Escape` to close the mobile drawer | No keyboard exit at all; the drawer sets `body.overflow = 'hidden'` (`:360`) |
| Focus trap in the mobile drawer | Tab moves focus behind the overlay into the page underneath |
| Focus return to the trigger on close | Focus is lost to the top of the document |
| Arrow-key navigation within the dropdown | Standard menu behaviour absent |
| `role="dialog"` / `aria-modal="true"` on the drawer | `:188` — screen readers are not told it is modal |
| `aria-expanded` / `aria-controls` on mobile triggers | `:209-212` — collapse state is unannounced (desktop triggers *do* have `aria-expanded`, `:92,397,416`) |

`[CODE]` **`advanced-search.astro:132-136,150` — focus is completely invisible in the filter panel.** The
checkbox inputs are hidden with `position: absolute; opacity: 0; pointer-events: none`, and there is a
`:checked + span` style but **no `:focus`/`:focus-visible` rule**. The inputs remain tabbable, so a
keyboard user can move through 20+ filters with no visual indication of where they are. This makes the
page's primary control unusable without a mouse. **Fix:** add
`.filter-chip input:focus-visible + span { outline: 2px solid rgb(var(--nv-accent)); outline-offset: 2px; }`.

`[CODE]` `popularity.astro:56,313` — the suggestion list has a `click` handler only: no arrow keys, no
`Enter` selection, no `role="listbox"`/`role="option"`, no `aria-expanded` on the input.

## 9.5 Forms and labels

| Control | Status | Evidence |
|---|---|---|
| `/popularity` main search input | **No label, no `aria-label`, no `aria-labelledby`** — only a placeholder | `[CODE]` `popularity.astro:54` — this is the page's primary control |
| `/search` main input | **No label** — only a placeholder | `[CODE]` `search.astro:51-59` |
| `/search` filter selects (4) | Correctly wrapped in `<label>` with visible text | `[CODE]` `search.astro:64-98` |
| `/advanced-search` keyword input, sort select | Correctly labelled | `[CODE]` `advanced-search.astro:38,91` |
| `/advanced-search` filter groups | Correct `<fieldset>`/`<legend>` | `[CODE]` `:46` |
| Homepage search input | Correctly labelled (`<label for="homepage-search">`, though styled as an eyebrow) | `[CODE]` `homepage/index.astro:129` |
| `/contact` | **No form exists** despite the `<h1>` "Get in touch" — four `mailto:` links only | `[CODE]` `contact.astro:29,39,49,59` |

A placeholder is not an accessible name. Two of the site's three search inputs rely on one.

## 9.6 ARIA correctness

- `[CODE]` **Broken reference:** `popularity.astro:50` declares `<section aria-labelledby="compare-heading">` but **no element with `id="compare-heading"` exists in the file**. The accessible name resolves to nothing.
- `[CODE]` **Decorative SVGs not hidden.** The vast majority of inline `<svg>`s across the codebase lack `aria-hidden="true"` — `[LIVE]` 76 per name page. Because most sit inside labelled links or next to text, the practical impact is moderate, but `blog/index.astro:77,115`, `[slug].astro:157,164,553`, `Navbar.astro` icons and the `pointer-events-none` magnifier at `popularity.astro:53` should all be hidden.
- `[CODE]` **Decorative glyphs announced.** `about.astro:37,41,45,49` uses `&#10003;` checkmarks in bare `<span>`s, so screen readers announce "check mark" before each list item. Use `aria-hidden` or a list marker.
- `[CODE]` **`role`-less widget:** `popularity.astro:56` `#compare-suggest` is a button list acting as a combobox popup with no roles and no `aria-live`.
- `[CODE]` **Invalid attributes:** `[LIVE]` 91 `key=""` attributes per name page (3.12). Harmless to AT, but invalid.

## 9.7 Headings and document structure

- `[CODE]` **`h1 → h3` skip on 7 page types**, caused by `NameCard.astro:29` emitting `<h3>` with no intervening `<h2>` (5.5).
- `[LIVE]` **17 sibling `<h2>`s** on the name page with no grouping (5.5, 7.4).
- `[CODE]` **Two `<main>` landmarks** on 6 pages (3.12).
- `[CODE]` **`<h2 class="sr-only">`** at `names-by-meaning.astro:57` — a legitimate technique, correctly used.
- `[CODE]` **No skip-to-content link anywhere.** With a sticky navbar, a 138 px ad and a share bar before `<main>` (7.6), a keyboard user tabs through ~10 controls on every page before reaching content. This is the single most valuable missing feature for keyboard users and it is roughly 6 lines in `Layout.astro`.

## 9.8 Images and alternative text

`[DATA]` The site has almost no images, which limits exposure:

- `[CODE]` `blog/[slug].astro:214-219` — `alt={title}` is correct. But `src` is `/og-trending-names.png`, which does not exist (8.5), so all 6 blog posts show a broken image with `loading="eager"`.
- `[CODE]` `Layout.astro:125-127` — `og:image:alt` is provided. Good.
- `[CODE]` All logos are text or CSS, not images — no alt needed.

## 9.9 Priority order for accessibility work

| Priority | Fix | Effort | Users affected |
|---|---|---|---|
| 1 | `--nv-muted` → `100 116 139` (light) / `148 163 184` (dark) | 2 lines | everyone, on every page |
| 2 | Replace hardcoded `bg-white` with `bg-nv-surface` in 6 files | 6 lines | all dark-mode users of those pages |
| 3 | Add a skip-to-content link in `Layout.astro` | ~6 lines | all keyboard users, every page |
| 4 | Label the `/popularity` and `/search` inputs | 2 lines | screen-reader users |
| 5 | Add `:focus-visible` to `advanced-search` filter chips | 3 lines | all keyboard users of that page |
| 6 | `Escape` + focus trap + focus return in the navbar drawer | ~30 lines | all keyboard users, every page |
| 7 | Raise touch targets to 44 px | ~15 class edits | all mobile users |
| 8 | Fix the `aria-labelledby="compare-heading"` dangling reference | 1 line | screen-reader users |
| 9 | `aria-hidden="true"` on decorative SVGs | many small edits | screen-reader users |
| 10 | Remove the second `<main>` from 6 pages | 6 lines | screen-reader users |

---

# 10. RESPONSIVE DESIGN REPORT

`[CODE]` `Layout.astro:70-73` — the viewport meta is correct and includes `viewport-fit=cover`:
`width=device-width, initial-scale=1.0, viewport-fit=cover`. No `maximum-scale` or `user-scalable=no`,
so pinch-zoom is allowed. Good.

`[CODE]` Tailwind defaults are in use — `sm:640 md:768 lg:1024 xl:1280 2xl:1536`. The container is
`max-w-page` (1152 px) with `px-4 sm:px-6 lg:px-8`.

**One structural gap to note up front:** there is **no breakpoint below 640 px**. Everything from 320 px
to 639 px receives the identical single-column, 16 px-padded layout. That is defensible at 320–430 px and
wasteful at 480–639 px.

## 10.1 Small mobile — 320 to 375 px

Available content width at 320 px: **288 px** (320 − 2×16 px).

| Component | Behaviour | Verdict |
|---|---|---|
| Navbar | Logo mark 36 px; brand text hidden below `sm` (`Navbar.astro:74`); right side = 36 px search + 36 px menu + 6 px gap. Total ~120 px of 288. | Fits comfortably |
| Ad band | `Ad.astro` — `max-width: 300px`, centred, 138 px tall including margins | Fits (300 > 288 is capped by `width:100%`) |
| SocialShare | 4 × 32 px + "Share:" label, `flex-wrap` | Fits, wraps if needed |
| Name page hero | Card `p-6` → inner **240 px**. `<h1>` at `text-4xl` (36 px). | **Risk:** a long single-word name has no `break-words`, so it can overflow the card. **UNVERIFIED** — needs visual confirmation with the longest slugs in the data. |
| Name page stat grid | `grid-cols-2 gap-3` → (288 − 48 card padding − 12 gap) / 2 = **114 px** per cell; `p-4` → **82 px** inner. Label at `text-[10px]` with `tracking-[0.2em]`: "POPULARITY SCORE" wraps to ~3 lines. | Functional but cramped and low-contrast (9.2) |
| Region table | Wrapped in `overflow-x-auto` (`[slug].astro:442`), 4 columns | **Correct** — horizontal scroll contained |
| AlphabetNav | Card `p-4` → 256 px usable; 36 px items + 6 px gap → 6 per row → **5 rows** | Works; targets too small (9.3) |
| FAQ `<details>` | `p-5`, full width | Good |
| Related-name chips | `flex-wrap`, `px-3 py-1.5 text-sm` | Good |
| Footer | `sm:grid-cols-2` → single column at 320 px | Good |
| Homepage hero | `grid gap-10 lg:grid-cols-2` → stacked | Good |
| Homepage stats | `grid-cols-2 gap-3` → 2 × ~138 px | Good |
| Homepage meaning section | `p-6` → 240 px inner; 8 chips at `px-4 py-2 text-sm`, e.g. "Names that mean blessing" ≈ 200 px | Fits |
| Blog CTA | `rounded-3xl p-8` → 224 px inner | Tight but fine |
| **Letter pages** | **2,626 cards single-column** | **Unusable — 8.1** |

**No confirmed horizontal overflow in the CSS.** Every chip row uses `flex-wrap`, the one table is
wrapped, and no fixed pixel widths exceed the container. The single risk is the unwrapped `<h1>`.

## 10.2 Standard mobile — 390 to 430 px

Content width 358–398 px. This is the primary real-world band (iPhone 14/15/Pro/Pro Max, most Android).
Everything from 10.1 applies with more breathing room; stat-grid cells reach 149–169 px, so the 10 px
labels stop wrapping to three lines.

**The defining problem at this size is vertical, not horizontal.** `[CODE]` Measured from
`Layout.astro:199-221` on a 390 × 844 viewport:

```
  0 –  56 px   sticky navbar
 56 – 194 px   Ad (24 px margin + 90 px reserved + 24 px margin)
194 – 242 px   SocialShare (mt-4 = 16 px + ~32 px)
242 px         <main> begins — the <h1> is here or below
```

**≈240 px, or 28% of the viewport height, before any content.** On a name page the user scrolls before
seeing the name. See 7.6.

## 10.3 Large mobile — 430 to 480 px, and the 480–639 px dead band

Content width 398–448 px, then up to 607 px at 639 px — all still using the 320 px single-column layout
because the first breakpoint is `sm:640`. At 600 px wide, name cards render as one full-width column when
two would fit comfortably.

**Recommended:** add a `min-[480px]:grid-cols-2` step to the card grids. Low risk, immediate density gain
on large phones and small tablets.

## 10.4 Tablet portrait — 768 px

`sm:` (640) and `md:` (768) active; `lg:` not yet. Content width **720 px** (768 − 2×24).

| Component | Behaviour | Verdict |
|---|---|---|
| Navbar | **Still the hamburger** — the desktop nav is gated at `lg` (`Navbar.astro:81`) | Wasteful: 720 px of room, menu hidden behind a tap |
| Card grids | `sm:grid-cols-2` → 2 columns × ~352 px | Good |
| Name stat grid | `md:grid-cols-3` → 3 × ~215 px | Good |
| Blog TOC | `hidden lg:block` → hidden | Acceptable |
| Blog layout | `lg:grid-cols-[1fr_260px]` → single column | Good |
| `advanced-search` | `lg:grid-cols-[320px_1fr]` → stacked | Good |
| Ad container | `[CODE]` `Ad.astro:50` uses `@media (min-width: 728px)` — an unusual value, not a Tailwind breakpoint. Combined with `width: 100%`, the 728 px max-width is not actually reached until the container itself is ≥728 px, i.e. viewport ≈776 px. | Minor inconsistency, not an overflow: `width:100%` caps it. Align to 768 px. |
| Letter pages | 2 columns × 1,313 cards | Still unusable |

## 10.5 Tablet landscape — 1024 px

`lg:` activates. Content width **960 px** (1024 − 2×32).

- Desktop navbar appears; both dropdowns work.
- Card grids → `lg:grid-cols-3` (~304 px each). Good.
- Name stat grid → `lg:grid-cols-4` (~222 px each). Good.
- Blog TOC sidebar appears at 260 px, `sticky top-24`. Good.
- `[CODE]` Name page inner is `max-w-5xl` (1024 px) but the container only offers 960 px, so it is constrained to 960. No overflow.
- `[CODE]` **Navbar/content alignment is still correct here**, because `max-w-7xl` (1280) exceeds the viewport so the navbar falls back to `px-6` — 1024 − 48 = 976 px vs the page's 960 px, a 8 px difference on each side. Barely visible.

## 10.6 Laptop — 1280 px

**This is where the alignment defect becomes visible.**

`[CODE]` Computed:

```
container-page :  min(1152, 1280 − 64) = 1152 px  →  64 px margins
Navbar inner   :  min(1280, 1280 − 48) = 1232 px  →  24 px margins
Offset         :  (1232 − 1152) / 2    =   40 px
```

The navbar logo sits **40 px left** of the page content's left edge and the "Start searching" CTA sits
40 px right of its right edge, on every page. **Fix:** replace `Navbar.astro:68`'s
`mx-auto … max-w-7xl … px-4 sm:px-6` with the shared `container-page` class.

Otherwise this width is the site's best: `xl:grid-cols-4` card grids (4 × ~270 px), full navbar, blog TOC.

## 10.7 Desktop — 1440 px

```
container-page : 1152 px  →  144 px margins
Navbar inner   : 1280 px  →   80 px margins
Offset         :   64 px
```

Misalignment grows to 64 px per side. `[CODE]` The name page is capped at `max-w-5xl` = **1024 px inside a
1440 px viewport (71% of the container, 53% of the screen)** and renders 20 stacked full-width cards
(7.3). A two-column arrangement for the secondary sections — numerology, lucky attributes, other
languages, regional table — would use the space and shorten the page substantially.

## 10.8 Large desktop — 1920 px and above

```
container-page : 1152 px  →  384 px margins  (60% of the screen is margin)
Navbar inner   : 1280 px  →  320 px margins
Offset         :   64 px
```

`[CODE]` `2xl:` (1536) is **never used anywhere in the codebase** — no `2xl:` class appears in any
`.astro` file. `max-w-page` at 72 rem is a deliberate, defensible reading-width choice for prose, and
should be kept for the article-like pages. But listing pages that top out at 4 columns leave a great deal
of room unused; a `2xl:grid-cols-5` step and a wider container for card grids specifically would be a
straightforward improvement.

## 10.9 Responsive defect summary by viewport

| Viewport | Defects |
|---|---|
| **320–375 px** | Letter pages unusable (8.1); 240 px ad/share band (7.6); 10 px stat labels wrap to 3 lines; 32/36 px touch targets (9.3); `<h1>` overflow risk on long names (**UNVERIFIED**) |
| **390–430 px** | Letter pages; 240 px ad/share band = 28% of the viewport; touch targets |
| **430–639 px** | All of the above, plus a **dead band** — no breakpoint below 640 px, so 600 px screens get the 320 px layout |
| **768 px** | Desktop nav still hidden behind the hamburger; `Ad.astro`'s 728 px media query is misaligned with the 768 px breakpoint |
| **1024 px** | No significant defects — the best-behaved breakpoint |
| **1280 px** | **40 px navbar/content misalignment** |
| **1440 px** | 64 px misalignment; name page uses 53% of screen width with 20 stacked cards |
| **1920 px+** | 64 px misalignment; `2xl:` unused; 60% of the screen is margin on listing pages |

**Not found:** no confirmed horizontal scrolling, no clipped content from fixed widths, no broken grids,
and no `user-scalable=no`. The responsive system is fundamentally sound; the defects are localised.

---

# 11. IMPLEMENTATION ROADMAP

**Sequencing principle.** Phases 0–2 are technical and must ship first, because they are cheap, they are
independent of content, and until they land no content improvement can be measured — Google currently
cannot reliably index the site at all. **Ship Phase 0–2, then wait 3–4 weeks and read Search Console
before starting Phase 3.** Doing content work first would burn effort on pages Google is not indexing and
would make attribution impossible.

Risk key: **None** = presentational or additive, no URL or data impact · **Low** = single-file logic, easily
reverted · **Medium** = affects many pages or adds URLs · **High** = changes URLs or deletes data. Nothing
in this roadmap is High.

---

## Phase 0 — Unblock the build (must be first; nothing else can ship)

| # | Change | Files | Exact purpose | Expected benefit | Risk |
|---|---|---|---|---|---|
| 0.1 | Declare the missing `faqs` array in the frontmatter, or delete the FAQ section at lines 310–330 | `src/pages/homepage/index.astro` | `faqs` is referenced at `:319` and never defined, which throws `faqs is not defined` and aborts the build (3.1) | **The build completes.** Currently nothing at `HEAD` is deployable | None |
| 0.2 | Run a full `npm run build` and confirm all 42,418 routes generate | — | Verify no second undefined-variable failure is hiding behind the first | Known-good baseline before any other change | None |
| 0.3 | Restore `src/lib/data/names-manifest.json` and the four `_search-index.json` files if a `build:test` was run | `src/lib/data/names-manifest.json`, `public/names/*/_search-index.json` | `build:test` overwrites them at a 100-record limit | Prevents shipping a 100-name site | None |

**Exit criteria:** `npm run build` exits 0; `dist/` contains `index.html` and 42,310 name pages.

---

## Phase 1 — Critical SEO (three small changes; the highest-leverage work in this document)

| # | Change | Files | Exact purpose | Expected benefit | Risk |
|---|---|---|---|---|---|
| 1.1 | Add `build: { format: 'file' }` | `astro.config.mjs` | Emit `about.html` instead of `about/index.html`, so GitHub Pages serves the slash-less URL directly and stops 301-ing it (3.3) | **~42,456 canonical declarations stop pointing at redirects.** Resolves *Page with redirect*, *Alternate page with proper canonical*, and *Duplicate — Google chose different canonical*. **Zero public URLs change.** | Low |
| 1.2 | Rewrite the sitemap `filter` to compare `new URL(page).pathname`; exclude `/homepage`, the 3 stubs, `/privacy`, `/terms`; include `/letter/`; set `entryLimit: 5000` | `astro.config.mjs` | The filter compares pathnames against values that are absolute URLs, so it returns false for everything and the integration silently writes no sitemap (3.2) | **42,000+ URLs become discoverable.** Directly addresses *Discovered — currently not indexed* | None |
| 1.3 | Delete `scripts/build-sitemap.js` and any stale `public/sitemaps/`; keep `robots.txt` pointing at `/sitemap-index.xml` | `scripts/build-sitemap.js`, `public/sitemaps/`, `public/robots.txt` | Two competing sitemap systems exist; the orphaned one is what is live, and it submits 42,310 redirect URLs (3.2) | One authoritative sitemap; no redirect URLs submitted | Low |
| 1.4 | Remove `noindex` from `homepage/index.astro`; stop nesting `Layout` — move the body into `src/pages/index.astro` and delete `src/pages/homepage/` | `src/pages/index.astro`, `src/pages/homepage/index.astro` | `/` currently emits both `index, follow` and `noindex, follow`, plus two `<html>`, two canonicals, two navbars and two footers (3.4) | **The homepage becomes indexable.** Removes the duplicate `/homepage` route and halves the homepage's DOM | Low |
| 1.5 | Fix `normalizeGender()`; export shared counting helpers; delete the 5 duplicate implementations | `src/lib/data/name-utils.mjs`, `names/[religion]/index.astro`, `names/[religion]/letter/[letter].astro`, `search.astro`, `advanced-search.astro`, `popularity.astro` | `'female'.includes('male')` is true, so 17,744 female records are classified `unisex` (3.6) | **17,744 names become reachable.** `/christian-girl-names` goes from 0 to 6,407; `/islamic-girl-names` 5 → 8,780; `/hindu-girl-names` 3 → 2,709. Fixes wrong "Unisex" badges on every listing page and the dead Girl filter in `/advanced-search` | Low |
| 1.6 | Stop emitting `Person` JSON-LD and remove the visible "in real life" section | `src/pages/names/[religion]/[slug].astro:87-96, 137, 468-477` | 41,113 pages publish an invented human being as a Schema.org `Person` (5.3) | Removes the site's largest deceptive-structured-data exposure. **Highest-priority content change** | None |

**Exit criteria:** `dist/sitemap-index.xml` exists with 42,000+ `<loc>`; `curl -I /names/islamic/aaban`
returns 200 not 301; `/` has exactly one `robots` meta reading `index, follow`; `/christian-girl-names`
renders thousands of cards; no `"@type":"Person"` anywhere in `dist/`.

**Then submit the sitemap in Search Console and wait. Do not start Phase 3 until you have 3–4 weeks of data.**

---

## Phase 2 — Indexing reliability

| # | Change | Files | Exact purpose | Expected benefit | Risk |
|---|---|---|---|---|---|
| 2.1 | Replace the `#` letter route with a URL-safe token (`other`), or `decodeURIComponent` the param | `names/[religion]/letter/[letter].astro:22,33,38-40`, `AlphabetNav.astro:13`, `names/[religion]/index.astro:149` | `Astro.params.letter` arrives as `'%23'`, so the filter matches nothing and `%23` is printed in the `<h1>` and `<title>` (3.7) | Fixes 4 soft-404s that receive internal links from 108 pages | Low |
| 2.2 | Add `noindex` to `/my-names`, `/popular-by-state`, `/guides/expert-naming-guide` and the 3 stub blog articles; remove `/my-names` from the sitemap allow-list | 6 stub pages, `astro.config.mjs` | Six "coming soon" pages are fully indexable and one is explicitly submitted (3.5) | Removes 6 soft-404s from the index | None |
| 2.3 | Import `slugify()` from `name-utils.mjs`; validate related-name slugs against a build-time `Set`; render unmatched values as plain text | `names/[religion]/[slug].astro:513,523` | The inline slugify only collapses whitespace, producing links like `/names/islamic/marudeen.` (3.11) | Removes ~1,300 dead internal links and the crawl budget they waste | Low |
| 2.4 | Generate origin and category routes from the data with a minimum-count threshold; add Hebrew and Greek buckets | `src/lib/data/name-utils.mjs:63-104`, `origins/[origin].astro`, `categories/[category].astro` | `/origins/urdu` renders 0 names; 978 names match no origin and 845 match no category (3.10) | Eliminates 1 empty and 5 thin hubs; brings 978 orphaned names into the taxonomy | Medium |
| 2.5 | Consolidate the duplicate hubs: 301 `/names-by-origin` → `/origins`; differentiate or merge `/trending-names` and `/popularity`; resolve `/name-meanings` vs `/names-by-meaning` | `names-by-origin.astro`, `origins/index.astro`, `trending-names.astro`, `popularity.astro`, `name-meanings.astro`, `names-by-meaning.astro`, `Navbar.astro`, `Footer.astro` | Four duplicate/near-duplicate pairs compete for the same queries with no canonical relationship (3.9) | Consolidates split signals | Medium |
| 2.6 | Add `src/pages/404.astro` | new file | GitHub Pages serves its own unbranded 404 | Branded recovery with search and top hubs; reduces exit rate on the ~1,300 dead links until 2.3 lands | None |
| 2.7 | Add `type="article"` to blog posts; switch `twitter:card` to `summary_large_image`; create the missing `/og-trending-names.png` and a real 1200×630 OG image | `blog/[slug].astro`, `Layout.astro:132`, `public/` | 6 posts declare `og:type="website"`; `Article.image` points at a non-existent file (3.12, 8.5) | Valid Article rich-result eligibility; correct social previews | None |
| 2.8 | Add `*.json -text` to `.gitattributes` | new file | `core.autocrlf` rewrites all 10 MB of the manifest on every rebuild (2.3) | Readable diffs; smaller commits | None |

---

## Phase 3 — Content architecture and integrity

**This is the largest phase and the one with the most judgement in it. Read 5.2's prohibitions before starting.**

| # | Change | Files | Exact purpose | Expected benefit | Risk |
|---|---|---|---|---|---|
| 3.1 | Remove `historical_references` and `celebrity_usage` from the template until entries can be sourced | `names/[religion]/[slug].astro:353-369, 480-489` | 36,846 pages carry fabricated historical claims — including invented companions of the Prophet — and 18,351 carry invented celebrities (5.3) | Removes the site's largest E-E-A-T liability. Prose length drops; **that is the correct trade** | None |
| 3.2 | Regenerate `seo.title` for all 42,310 records from real fields: `{Name} Name Meaning: {short_meaning} \| {Origin} {Gender} Name` | data migration over `public/names/**`, then regenerate the manifest | 18,308 records share one title pattern, grammatically wrong ("Islam" for "Islamic"), with a hardcoded year (5.2) | A distinct, accurate, data-derived title per page, from data already present | Medium |
| 3.3 | Regenerate `seo.meta_description` from `short_meaning` + `origin` + `lucky_number` + `pronunciation` | same | 18,239 records share one description (5.2) | A distinct description per page | Medium |
| 3.4 | Replace the 6 templated FAQs with 3–4 data-grounded ones (lucky attributes, script forms, regional popularity); delete "Is {N} a good name?" and "How popular is {N}?" | data migration + `[slug].astro:545-560, 125-135` | 18,244 pages share one FAQ answer; 2 of 6 answers contain no name-specific information (5.2) | `FAQPage` schema that matches visible, name-specific content | Medium |
| 3.5 | Resolve the etymology contradictions: pick one canonical meaning per record; drop `spiritual_symbolism` where it disagrees with `long_meaning` | data migration, `[slug].astro:285-290` | `aaban.json` asserts three mutually exclusive origins and the template renders all three (5.3) | A page that does not contradict itself | Medium |
| 3.6 | Enrich the 352 Italian records with real meanings, origins and gender — or `noindex` them and pull Italian from the homepage/footer until enriched | `public/names/italian/**`, `homepage/index.astro:44-49`, `Footer.astro:8` | All 352 Italian pages have empty `meaning`, no origin detail and a lowercase `<h1>` (5.1) | Removes 352 soft-404s. 352 records is a tractable content job | Medium |
| 3.7 | Title-case the 556 lowercase `name` values at the data layer | data migration | 556 pages render a lowercase `<h1>` (5.1) | Visible quality fix on the most prominent element | Low |
| 3.8 | Strip the mojibake `in_*` blocks on the 1,358 affected records | data migration | Vietnamese and Chinese characters are spliced into Urdu and Hindi text; `cleanText()` does not catch them (5.1) | A missing transliteration beats a corrupted one | Low |
| 3.9 | `noindex` the 845 thin non-Italian records pending enrichment | `[slug].astro` + a `thin` flag in the manifest | 845 records have no `long_meaning`, no FAQ and under 60 words (5.1) | Removes 845 thin pages from the index without deleting them | Medium |
| 3.10 | Strip the 6 unused field groups (`advanced_seo`, `user_engagement`, `social_optimization`, `accessibility`, `monetization`, `structured_data`) from all 42,310 files | data migration | No template reads any of them; they include fabricated self-assessments like `"core_web_vitals": "excellent"` (5.3) | ~30% smaller data files, faster builds, smaller repo | Low |
| 3.11 | Correct the false data claims in copy | `popularity.astro:138-139`, `trending-names.astro:30,31,40-41`, `unique-names.astro:20,29-30,47`, `name-meanings.astro:20,29-30`, `about.astro:38,42,57-62`, `contact.astro:66`, `privacy.astro`, `terms.astro:19` | Four pages present a static integer as live search data; `/unique-names` calls `Ahmad` one of the 100 rarest names; the privacy policy omits one of two ad networks (5.4) | **The cheapest high-value fixes in this audit — they are copy edits.** Direct trust gain | None |
| 3.12 | Exclude zero-score records from `/unique-names`' ascending sort | `unique-names.astro:13` | 1,197 records have `popularity_score: 0`, so the "100 rarest" is just the first 100 zero-score records, all islamic (5.4) | A two-line change that makes the page honest | Low |
| 3.13 | Reorder the name-detail template per 7.4: 9 grouped `<h2>`s, unique content before boilerplate | `names/[religion]/[slug].astro` | 17 flat sibling `<h2>`s; the templated `description_paragraph` sits above the unique `long_meaning` (5.5, 7.4) | Unique content surfaces first; a scannable page | Medium |
| 3.14 | Remove the two non-clickable "Related topics" chip blocks | `[slug].astro:243-250, 533-542` | Two identically labelled blocks of non-clickable SEO keywords (`"Islam name"`, `"baby names"`) — visible keyword stuffing (7.4) | Removes a keyword-stuffing signal and shortens the page | None |
| 3.15 | Write the 3 promoted-but-empty blog articles and the Expert Naming Guide, or remove the promotions | 3 stub blog pages, `guides/expert-naming-guide.astro`, `homepage/index.astro:72-91`, `Navbar.astro:28`, `Footer.astro:21` | Four destinations advertised from the navbar, footer and homepage are "coming soon" stubs (5.1, 6.2) | Stops sending users to empty pages | Low |

---

## Phase 4 — UI/UX improvements

| # | Change | Files | Exact purpose | Expected benefit | Risk |
|---|---|---|---|---|---|
| 4.1 | Raise `--nv-muted`: light `148 163 184` → `100 116 139`; dark `100 116 139` → `148 163 184` | `src/styles/global.css:13, 40` | 2.56:1 contrast, failing AA at every size, on 101 usages across 29 files including all FAQ answer bodies (7.2, 9.2) | **Two lines repair 101 usages sitewide.** Best accessibility-per-effort change available | Low |
| 4.2 | Replace hardcoded `bg-white` with `bg-nv-surface` | `my-names.astro:11`, `popular-by-state.astro:11`, `guides/expert-naming-guide.astro:11`, 3 stub blog pages `:12` | In dark mode `text-nv-text` on white is 1.10:1 — invisible (7.2, 9.2) | Fixes 6 unreadable pages | None |
| 4.3 | Define or replace `nv-container`, `nv-section`, `nv-display`; remove the nested `<main>` | same 6 files | These classes are defined nowhere, so 6 pages render with no max-width and no padding, edge to edge (2.6, 3.12) | 6 pages get a real layout; 2 `main` landmarks become 1 | None |
| 4.4 | Move `<Ad placement="inline" />` below the first content section; move `<SocialShare />` to the end of the article | `src/layouts/Layout.astro:199-221` | ~240 px — 28% of a 390×844 viewport — is consumed by an ad and a share bar before `<main>`, on all 42,418 routes (7.6) | The `<h1>` returns above the fold sitewide. **The single largest UX gain in this document** | Low |
| 4.5 | Make the navbar use `container-page` instead of `max-w-7xl … px-4 sm:px-6` | `Navbar.astro:68` | 40 px misalignment at 1280 px, 64 px at 1440 px+ (7.3, 10.6) | Navbar aligns with page content at every width | None |
| 4.6 | De-duplicate the mobile drawer's "Blog" and "About"; add Italian to the Names dropdown; trim the two overlapping dropdowns from 20 links to ~12 | `Navbar.astro:5-42, 204-259` | Blog and About appear twice; Italian is absent while the other three get 3 entries each; "Names" and "Explore" overlap (7.5) | Clearer navigation, less markup | Low |
| 4.7 | Add a skip-to-content link | `src/layouts/Layout.astro` | ~10 focusable controls precede `<main>` on every page (9.7) | ~6 lines; the highest-value keyboard fix | None |
| 4.8 | Give gender its own neutral badge colours | `NameCard.astro:35`, `search.astro:284`, `popularity.astro:178` | Girl names are badged with the Hindu tradition's red, colliding with the tradition colour system (7.2) | Coherent colour semantics | None |
| 4.9 | Label the `/popularity` and `/search` inputs; fix the dangling `aria-labelledby="compare-heading"`; add `:focus-visible` to the `advanced-search` filter chips | `popularity.astro:50,54`, `search.astro:51`, `advanced-search.astro:132-150` | Two of three search inputs have only a placeholder; one ARIA reference targets a nonexistent id; the filter panel has invisible focus (9.4, 9.5, 9.6) | The filter panel becomes keyboard-usable | None |
| 4.10 | Fix the two `advanced-search`/`popularity` script bugs: "Clear all filters" returning 0 results, and `Array.sort` mutating the user's comparison order | `advanced-search.astro:301-305`, `popularity.astro:231` | Clearing filters unchecks the religion boxes so `:243` rejects everything; `compare.sort()` sorts in place, silently reordering the user's list on every render | Two tools stop misbehaving | Low |
| 4.11 | Add `Escape`, a focus trap and focus return to the navbar drawer; add `aria-expanded`/`aria-controls` to mobile triggers; `role="dialog"`/`aria-modal` on the drawer | `Navbar.astro:188, 209-212, 292-445` | There is no `keydown` listener anywhere in the navbar (9.4) | Keyboard users can open and close the menu | Low |
| 4.12 | Delete the dead components and dependencies: `SectionHeading.astro`, `AdSlot.astro`, `clsx`, `tailwind-merge`, `rimraf`; remove the `key=` props | `src/components/`, `package.json`, `[slug].astro`, `Navbar.astro` | Two unused components, three unused dependencies, 91 invalid `key=""` attributes per page (2.6, 3.12) | Smaller surface, valid HTML | None |
| 4.13 | Fix the mis-nested tags in `search.astro` | `search.astro:116-137` | `</section>` closes before its child `</div>` (3.12) | Valid HTML | None |

---

## Phase 5 — Mobile improvements

| # | Change | Files | Exact purpose | Expected benefit | Risk |
|---|---|---|---|---|---|
| 5.1 | Raise touch targets to 44 px: `.btn` → `py-3`; `h-9 w-9` icon buttons → `h-11 w-11`; share buttons → `h-11 w-11`; `AlphabetNav` → `h-11 w-11` | `global.css:107`, `Navbar.astro:150,173,179`, `SocialShare.astro:14-23`, `AlphabetNav.astro:19,28`, `homepage/index.astro:141`, `popularity.astro:60` | 32 px share buttons on every page; 36 px alphabet letters as the primary browse control. Only `names/[religion]/index.astro:149` is already compliant at `h-11` (9.3) | WCAG 2.5.5 compliance; fewer mis-taps | Low |
| 5.2 | Raise body copy from `text-sm` to `text-base` on long-form prose | `[slug].astro` section bodies, `blog/[slug].astro:239`, hub SEO sections | 14 px for the `long_meaning`, `cultural_impact` and all FAQ answers (7.1) | Readability on the pages users actually read | Low |
| 5.3 | Raise the stat-grid labels from `text-[10px]` to `text-xs` and reduce `tracking-[0.2em]` | `[slug].astro:184,190,196,202,208,214,220,226` | 10 px, heavily letter-spaced, at 2.56:1, labelling the page's key facts (7.1, 7.4) | The best component on the page becomes legible | None |
| 5.4 | Add a `min-[480px]:grid-cols-2` step to the card grids | listing pages | No breakpoint below 640 px, so a 600 px screen gets the 320 px layout (10.3) | Density gain on large phones and small tablets | Low |
| 5.5 | Show the desktop nav from `md` (768 px) instead of `lg` | `Navbar.astro:81` | Tablet-portrait users get the hamburger despite 720 px of room (10.4) | Better tablet navigation | Low |
| 5.6 | Add `break-words` to the name `<h1>` | `[slug].astro:160` | A long single-word name in a 240 px card at `text-4xl` has no wrap opportunity (10.1 — **UNVERIFIED**, confirm visually first) | Prevents overflow on the longest names | None |
| 5.7 | Align `Ad.astro`'s `@media (min-width: 728px)` to 768 px | `Ad.astro:50` | 728 px is not a Tailwind breakpoint and the max-width is unreachable until ~776 px (10.4) | Consistency | None |
| 5.8 | Add a two-column desktop arrangement for the name page's secondary sections | `[slug].astro` | 20 stacked full-width cards in a 1024 px column inside a 1440 px viewport (7.3, 10.7) | Shorter page, better use of desktop width | Medium |

---

## Phase 6 — Performance

Ordered by measured impact (8.6).

| # | Change | Files | Exact purpose | Expected benefit | Risk |
|---|---|---|---|---|---|
| 6.1 | Paginate letter pages at ~100 per page, keeping page 1 at the existing URL; add real `<a>` pagination and `rel="prev"`/`rel="next"`; add the new pages to the sitemap | `names/[religion]/letter/[letter].astro` | 1,610,194 bytes and 2,626 cards on one page (8.1) | **1.61 MB → ~120 KB, a 93% reduction** on the 104 highest-link pages; fixes the crawl bottleneck (3.8) and the worst mobile page simultaneously | Medium — adds URLs; page 1 must keep its URL |
| 6.2 | Convert the navbar's inline SVGs to a `<symbol>` sprite + `<use>`; stop duplicating the 20 dropdown links between desktop and mobile | `Navbar/Navbar.astro` | The `<nav>` renders to 52,556 bytes — 52% of a name page — with 76 inline SVGs (8.2) | **52 KB → ~15 KB, a ~37% cut in total page weight across all 42,418 pages** (~2.2 GB of identical HTML today) | Low — verify both menus after |
| 6.3 | Load the search index on first interaction, not on load; fetch only the filtered religions; consider splitting by first letter; remove the `if (!indexes) return;` silent-drop guards | `popularity.astro:307-350`, `advanced-search.astro:234, 307-309` | 4.06 MB fetched eagerly on two pages whose above-the-fold content is already server-rendered (8.3) | Removes 4.06 MB from the critical path on 2 pages; interactions during load stop being silently discarded | Low |
| 6.4 | Import latin-only font subsets; preload the two latin woff2 files; confirm `font-display: swap` | `Layout.astro:4-5` | 10 woff2 / 293 KB declared for an `lang="en"` site, with no preload in front of an LCP that *is* the Fraunces `<h1>` (8.4) | 8 fewer `@font-face` blocks; 40.5 KB CSS → ~28 KB; faster LCP | Low |
| 6.5 | Produce right-sized icons and OG images; stop using the 921,872-byte PNG as favicon and apple-touch-icon | `public/`, `Layout.astro:14,120,141-150` | One 900 KB PNG serving three roles, fetched as an icon on first visit (8.5) | ~880 KB saved on first visit | None |
| 6.6 | Change `preconnect` to `revolthem.com` into `dns-prefetch` only | `Layout.astro:154-158` | An early connection for scripts deliberately deferred to idle (3.12) | Removes a wasted connection from the critical path | None |
| 6.7 | Strip the 6 unused JSON field groups (same work as 3.10) | `public/names/**` | ~30% of every record is never read | Faster builds, smaller repo, smaller manifest | Low |

---

## Phase 7 — Final validation

Run all of these before declaring the work done, and keep the outputs as a baseline.

**Build and output**

1. `npm run build` exits 0 and generates 42,418 routes.
2. `dist/sitemap-index.xml` exists; child sitemaps total 42,000+ `<loc>` entries; every `<loc>` returns 200 with no redirect.
3. `dist/robots.txt` points at `/sitemap-index.xml`; no `public/sitemaps/` remains.
4. Zero occurrences of `"@type":"Person"` in `dist/`.
5. Zero occurrences of ` key="` in `dist/`.
6. Zero occurrences of `nv-container`, `nv-section`, `nv-display` in `dist/`.
7. Exactly one `<html`, one `<title`, one `rel="canonical"` and one `name="robots"` per output file — check `dist/index.html` specifically.

**Live, after deploy**

8. `/names/islamic/aaban` → **200**, not 301. Same for `/about`, `/names`, `/popularity`, `/islamic-boy-names`.
9. Every page's canonical is self-referencing and matches the served URL exactly.
10. `/` has one `robots` meta reading `index, follow, …`.
11. `/christian-girl-names` renders thousands of cards; `/islamic-girl-names` and `/hindu-girl-names` likewise.
12. `/names/islamic/letter/a` is under ~150 KB and paginates.
13. `/origins/urdu` no longer exists, or is `noindex`.
14. No `letter/%23` page renders `%23` in its `<h1>`.
15. `/homepage` is gone or redirects.
16. `/does-not-exist` returns 404 with the branded page.

**Validation tools**

17. Rich Results Test on a name page: `WebPage` + `BreadcrumbList` + `FAQPage` valid; no `Person`; FAQ content matches the visible FAQ.
18. Rich Results Test on a blog post: `Article` valid with a **resolvable** image.
19. Lighthouse mobile on `/`, `/names/islamic/aaban`, `/names/islamic/letter/a`, `/popularity` — record before and after.
20. axe or Lighthouse accessibility: zero contrast failures; all controls have accessible names.
21. Keyboard-only pass: skip link works; the mobile drawer opens, traps focus and closes on `Escape`; the `advanced-search` filters show visible focus.
22. Visual pass at 320, 390, 430, 768, 1024, 1280, 1440 and 1920 px: no horizontal scroll; navbar aligned with content at ≥1280 px.
23. Dark mode pass on all 6 previously-`bg-white` pages.

**Search Console, 3–4 weeks after Phase 1**

24. *Page with redirect* and *Alternate page with proper canonical* should fall sharply — these are the direct measure of whether 1.1 worked.
25. Sitemap shows 42,000+ submitted and a rising *Indexed* count — the measure of 1.2.
26. `/` is indexed — the measure of 1.4.
27. *Crawled — currently not indexed* is the remaining signal; it is a **content** measure, so read it only after Phase 3.

---

# 12. DO-NOT-CHANGE LIST

These systems are correct, deliberate, or load-bearing. Do not modify them without a documented reason
that is stronger than the reasons given here.

## 12.1 URLs and routing — freeze completely

1. **Every public URL pattern.** `/names/{religion}/{slug}`, `/names/{religion}`, `/names/{religion}/letter/{letter}`, `/{religion}-{gender}-names`, `/origins/{slug}`, `/categories/{slug}`, `/blog/{slug}`, `/names`. These are semantic, stable and already indexed. **The trailing-slash fix in 1.1 is specifically designed to require zero URL changes — that is why it is the recommended option over `trailingSlash: 'always'`.**
2. **The 42,310 name slugs.** Derived from filenames in `public/names/**`. Renaming any of them breaks a live URL with no redirect layer available on GitHub Pages.
3. **`site: 'https://nameverse.site'`** in `astro.config.mjs:6`. No old domain exists anywhere in the repository — I checked; there is nothing to clean up.
4. **`output: 'static'`.** A static build is the right architecture for 42,310 read-only pages and it is why the site has no server costs and no 5xx risk.
5. **`export const prerender = true`** on every dynamic route.

## 12.2 SEO systems that are already correct

6. **`Layout.astro` as the single metadata owner.** One component owning title, description, canonical, robots, OG, Twitter and the `@graph` block is the right design. Extend it; do not fragment it into per-page `<head>` blocks.
7. **The `Organization` + `WebSite` + `SearchAction` `@graph`** at `Layout.astro:27-62`. Valid, correctly `@id`-linked, appropriate. Leave it.
8. **`robots.txt`.** Permissive, blocks nothing, correctly declares a sitemap. Only the sitemap filename may need to change.
9. **`noindex` on `/privacy` and `/terms`** (`privacy.astro:39`, `terms.astro:39`). Correct.
10. **`BreadcrumbList` JSON-LD plus visible breadcrumbs** on name, hub, letter and blog pages. Correctly paired — the schema matches what is on screen.
11. **`CollectionPage` schema** on the hub, letter, origin and category pages. Appropriate type, correct URLs.
12. **Server-rendered name-page content.** All 17 sections, the FAQ text and every internal link are in the served HTML. This is the reason the name pages are indexable at all. **Never move this to client-side rendering.**
13. **The `_search-index.json` generation strategy** (`scripts/generate-search-index.mjs`). Compact field names, per-religion split, generated at build time. The fix in 6.3 is about *when and how much* is fetched, not about the format.

## 12.3 Data architecture

14. **`public/names/**` as the source of truth**, with a generated manifest for listings and a generated compact index for search. Three artefacts, one direction of flow, no runtime dependency. Sound.
15. **The manifest memo cache** at `astro-data.mjs:13-22`. Without it, 42,310 renders would each re-parse 10 MB.
16. **The `{success, data}` envelope unwrapping** at `astro-data.mjs:41`. It handles both record shapes present in the data.
17. **`normalizeReligion()`** at `astro-data.mjs:24-31`. The `islam`→`islamic`, `christianity`→`christian`, `hinduism`→`hindu` aliases are deliberate and harmless.
18. **The genuinely unique per-name fields.** `long_meaning`, `spiritual_meaning`, `cultural_impact`, `spiritual_significance`, `numerology_meaning`, `pronunciation`, `lucky_*`, `life_path_number`, `popularity_by_region`, `in_arabic`/`in_urdu`/`in_hindi`/`in_english`, `name_variations`. **This is the site's entire competitive advantage. Do not delete any of it to reduce a duplication score.** The Phase 3 removals target *fabricated* fields only.

## 12.4 Design system

19. **The token architecture** — RGB triplets in `global.css:6-58` consumed via Tailwind with `<alpha-value>`. Well built. 4.1 changes **one token's value**, not the system.
20. **The Fraunces + Inter pairing.** Appropriate and distinctive for a cultural reference site. 6.4 changes which *subsets* load, not the fonts.
21. **The component classes** `.container-page`, `.card`, `.card-hover`, `.btn*`, `.badge`, `.input`, `.eyebrow`, `.faq-*`. Defined once, reused consistently.
22. **The four tradition accent pairs** (islamic teal, christian amber, hindu red, italian green). Culturally neutral and visually distinct.
23. **`max-w-page` at 72 rem** for prose and article-like pages. A deliberate reading-width choice. 10.8's suggestion applies to card grids only.
24. **`prefers-reduced-motion` handling** at `global.css:79-90`.
25. **The `:focus-visible` outline** at `global.css:74-77`. A real focus indicator exists by default — do not remove it while adding component-level focus styles.

## 12.5 Performance decisions already made correctly

26. **Deferred ad injection** at `Layout.astro:224-292` — `load` + `requestIdleCallback` with a `setTimeout` fallback. Do not make these synchronous, do not move them into `<head>`, do not remove the idle gate.
27. **`min-height` reservation** at `Ad.astro:33`. This prevents CLS. 4.4 moves *where* the ad sits; it must keep the reservation.
28. **The inline pre-paint theme script** at `Layout.astro:174-188`. Prevents a flash of the wrong theme. Must stay inline and must stay in `<head>`.
29. **Vanilla `<script>` islands with no framework.** 14 KB of JS across the whole site, zero hydration. Do not introduce React/Vue/Svelte for these widgets.
30. **The Vite dev-server watch exclusions** at `astro.config.mjs:38-54`. Without them, the dev server watches 42,310 files.
31. **`optimizeDeps.entries`** at `astro.config.mjs:34-37`. Stops Vite scanning the 42,310 data files.

## 12.6 Explicit prohibitions

32. **Do not delete pages in bulk** to improve aggregate quality metrics. `noindex` first, measure, then decide.
33. **Do not spin, paraphrase or randomise existing text** to defeat duplication detection. Rewrite templated surfaces *from data* (3.2–3.4) or leave them.
34. **Do not add keyword-stuffed chips.** 3.14 removes the two blocks that already do this.
35. **Do not add schema that does not match visible content.** 1.6 removes the `Person` schema for exactly this reason.
36. **Do not change canonical URLs arbitrarily.** 1.1 is the fix *because* it makes existing canonicals correct rather than rewriting them.
37. **Do not modify the sitemap URL set** beyond the filter correction and the letter-page inclusion, both documented in 1.2 and 6.1.
38. **Do not rewrite the application.** Every finding in this audit is fixable within the current architecture. Nothing here calls for a framework change, a rewrite, or a migration.
39. **Do not run `npm run build:test` before a deploy.** It overwrites the manifest and the four search indexes at a 100-record limit. If it is run, restore with `git checkout` and verify the manifest parses to 18,655 / 12,893 / 10,410 / 352.

---

# Appendix A — Verification commands used in this audit

Reproducible checks, for re-running after each phase.

**Build**

```
npm run build                     # full build; must exit 0
Get-ChildItem dist -Filter "sitemap*" -Force      # must NOT be empty after Phase 1
```

**Live HTTP behaviour (redirects must be off)**

```powershell
$h = New-Object System.Net.Http.HttpClientHandler; $h.AllowAutoRedirect = $false
$c = New-Object System.Net.Http.HttpClient($h)
'/names/islamic/aaban','/about','/names','/popularity','/islamic-boy-names' | ForEach-Object {
  $r = $c.GetAsync("https://nameverse.site$_").Result
  "{0,-34} {1} {2}" -f $_, [int]$r.StatusCode, $r.Headers.Location
}
```

**Canonical convention audit**

```powershell
# fetch each page and extract <link rel="canonical">; every value must equal the served URL
```

**Content census (all 42,310 records)**

Scan `public/names/{religion}/*.json`, unwrap `{success,data}`, and count: empty `meaning`, missing
`long_meaning`, missing `seo.faq`, prose under 60 words, `name === name.toLowerCase()`,
`name_in_real_life.person_name` present, `celebrity_usage` non-empty, `historical_references` non-empty,
and `/[\u4e00-\u9fff\uFFFD]|\?{3,}/` matches.

**Template-similarity census**

For each record, replace the name with `{N}` and the meaning with `{M}` in `seo.title`,
`seo.meta_description` and `seo.faq[0].a`, then count identical strings and report the top patterns plus
the share covered by the top 20.

**Gender-bug impact**

Apply both the current and the corrected `normalizeGender` across the manifest and diff the per-route
counts for the 8 `/{religion}-{gender}-names` pages.

**Contrast**

Compute WCAG 2.1 relative-luminance ratios for each token pair in both themes, compositing any
alpha-modified foreground over its background first.

**Page composition**

Fetch a name page and measure: total bytes, `<nav>` element bytes, `<footer>` bytes, `<head>` bytes,
`<svg>` count, `application/ld+json` count, ` key="` count, `<h1>`/`<h2>`/`<h3>` counts, and
`<a href="/` count.

---

# Appendix B — Open questions and unverified items

Stated explicitly so they are not mistaken for findings.

1. **`<h1>` overflow on the longest names.** `[CODE]` `[slug].astro:160` has no `break-words`, and at 320 px the hero card's inner width is 240 px with a 36 px font. Whether the longest slugs in the data actually overflow needs a visual check at 320 px. Fix 5.6 is cheap and harmless either way.
2. **Actual gzip transfer sizes.** All byte counts in this document are uncompressed. GitHub Pages serves gzip, so real transfer for the 1.61 MB letter page and the 4.06 MB search index will be substantially lower. The *relative* rankings in 8.6 hold, but measure real transfer before deciding how far to take 6.3.
3. **Whether `/homepage`, `/name-meanings`, `/advanced-search` or `/popular-by-state` have external backlinks.** This determines whether they need 301s or can simply be removed. Check Search Console's Links report.
4. **Real search demand per name.** Phase 3's prioritisation (which of the 845 thin records to enrich first, whether the 352 Italian records are worth the effort) should be driven by GSC impressions data, which I have no access to.
5. **Whether the `revolthem.com` ad scripts affect Core Web Vitals in the field.** They are deferred correctly (`Layout.astro:224-292`), but only field data can confirm the deferral is sufficient.
6. **Exact rendered LCP element per template.** I inferred the Fraunces `<h1>` from the markup; confirm with Lighthouse before optimising 6.4 for it.
7. **Whether GitHub Pages is serving from a branch with `.nojekyll`.** `[LIVE]` `_search-index.json` and `_astro/**` both return 200, so underscore paths are working today. I did not inspect the `gh-pages` branch directly. If a future deploy ever loses `.nojekyll`, all CSS and JS under `dist/_astro/` would 404 — worth adding `public/.nojekyll` defensively.
8. **The 978 names with no origin match and 845 with no category match** — I counted them but did not enumerate which origins they carry. That enumeration should drive the new buckets in 2.4.

---

**End of audit.** Every finding above is reproducible from the commands in Appendix A. No source file was
modified in producing this document.
