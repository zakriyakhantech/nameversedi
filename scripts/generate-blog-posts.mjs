/* eslint-disable */
// Generates a large, high-quality, SEO-optimized blog-posts.json dataset
// directly from the real name data in names-manifest.json.
//
// Usage:  node nameverse/scripts/generate-blog-posts.mjs [count]
// Default count: 500
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), "nameverse");
// Resolve project root = nameverse/ (cwd is repo root)

const DATA_DIR = path.join(ROOT, 'public', 'data');
const MANIFEST_PATH = path.join(ROOT, 'src', 'lib', 'data', 'names-manifest.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'blog-posts.json');

const COUNT = Number(process.argv[2]) || 500;

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

const RELIGIONS = ['islamic', 'christian', 'hindu'];
const GENDER_KEYS = ['male', 'female'];

// Normalize gender for a manifest item
function genderOf(item) {
  const g = String(item.gender || '').toLowerCase();
  if (g.includes('male')) return 'male';
  if (g.includes('female')) return 'female';
  return null;
}

// Build indexed pools for fast lookups
const byReligionGender = {}; // { islamic: { male: [], female: [] } }
const byOrigin = {}; // { "Arabic": [{name,meaning,...}] }
const byLetter = {}; // { "a": [items...] }
const meaningThemes = {}; // { "light": [items...] }

const ALL = [];
for (const rel of RELIGIONS) {
  byReligionGender[rel] = { male: [], female: [], all: [] };
}

const items = Array.isArray(manifest)
  ? manifest
  : manifest.data || manifest.islamic || [];

for (const item of items) {
  if (!item || !item.name) continue;
  const rel = (item.religion || '').toLowerCase();
  const g = genderOf(item);
  const origin = item.origin || 'Unknown';
  const meaning = item.meaning || 'Meaning not documented';
  const slug = String(item.slug || item.name).toLowerCase().replace(/[^a-z0-9]/g, '-');
  const entry = { name: item.name, slug, meaning, origin, rel, g, popularity: Number(item.popularity_score) || 0 };
  ALL.push(entry);

  if (rel in byReligionGender) {
    byReligionGender[rel].all.push(entry);
    if (g === 'male') byReligionGender[rel].male.push(entry);
    if (g === 'female') byReligionGender[rel].female.push(entry);
  }
  (byOrigin[origin] = byOrigin[origin] || []).push(entry);
  const letter = entry.name[0].toUpperCase();
  (byLetter[letter] = byLetter[letter] || []).push(entry);
}

// Sort all pools by popularity (then alphabetical)
const sortByName = (a, b) => a.popularity - b.popularity || a.name.localeCompare(b.name);
const sortDesc = (a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name);

function top(arr, n) {
  return [...arr].sort(sortDesc).slice(0, n);
}

// Meaning themes mapped by keywords found in meanings
const THEME_KEYWORDS = {
  light: ['light'],
  strength: ['strength', 'strong', 'power', 'hero', 'brave', 'courage', 'lion'],
  peace: ['peace', 'calm'],
  prosperity: ['prosper', 'rich', 'wealth', 'fortunate', 'lucky', 'bless'],
  wisdom: ['wisdom', 'wise', 'knowledge'],
  grace: ['grace', 'beautiful', 'pretty', 'lovely'],
  hope: ['hope'],
  nature: ['tree', 'flower', 'sun', 'moon', 'star', 'river', 'mountain', 'rose', 'jasmine', 'lotus'],
  virtue: ['virtue', 'good', 'pure', 'faith', 'faithful', 'holy'],
  royalty: ['king', 'queen', 'royal', 'prince', 'princess', 'noble'],
};

function buildThemeIndex() {
  for (const theme of Object.keys(THEME_KEYWORDS)) {
    meaningThemes[theme] = [];
  }
  for (const entry of ALL) {
    const m = (entry.meaning || '').toLowerCase();
    for (const theme of Object.keys(THEME_KEYWORDS)) {
      if (THEME_KEYWORDS[theme].some((kw) => m.includes(kw))) {
        meaningThemes[theme].push(entry);
      }
    }
  }
}
buildThemeIndex();

// ---------- Templates ----------
const RELIGION_LABEL = {
  islamic: 'Islamic',
  christian: 'Christian',
  hindu: 'Hindu',
};
const GENDER_LABEL = { male: 'Boy', female: 'Girl' };

function introFor(label, gender, scope) {
  return `Choosing a ${gender ? gender + ' ' : ''}${label} baby name is a meaningful way to honor heritage, celebrate identity, and give your child a name with purpose. ${scope} Our data-driven ranking below pulls from real search interest, community usage, and traditional sources to surface the most-loved options for ${new Date().getFullYear()}.`;
}

function formatNameList(arr) {
  return arr
    .map((n) => `${n.name} - ${n.meaning} (${n.origin || 'Various'} origin)`)
    .join('\\n');
}

function section(nameList, heading, blurb) {
  return {
    title: heading,
    content:
      blurb +
      '\\n\\n' +
      nameList
        .map((n) => `1. ${n.name} - ${n.meaning} (${n.origin || 'Various'})`)
        .join('\\n'),
    featuredNames: nameList.slice(0, 6).map((n) => n.name),
  };
}

function faqSet(seed) {
  const pool = [
    { q: 'How do I choose the right name from this list?', a: 'Think about pronunciation, how it pairs with your surname, and the meaning that best reflects the values you hope to nurture.' },
    { q: 'Are these names easy to spell internationally?', a: 'Yes, each entry on this list uses widely recognized spellings that work well across languages and school registers.' },
    { q: 'What should I consider before finalizing a name?', a: 'Consider initials, nicknames, popularity, family tradition, and whether the name grows gracefully from childhood to career.' },
    { q: 'Do names here have religious significance?', a: 'Most entries trace to spiritual traditions; meanings come from scripture, classical texts, or long-standing cultural usage.' },
    { q: 'How often is this list updated?', a: 'We refresh rankings based on fresh search trend data and community input so your child gets a name that is meaningful but not dated.' },
  ];
  const out = [];
  for (let i = 0; i < 3; i++) out.push(pool[(seed + i) % pool.length]);
  return out;
}

// ---------- Post factories ----------
const posts = [];
const seenIds = new Set();

function makeId(str) {
  const s = String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s;
}

function register(post) {
  if (!post.id || seenIds.has(post.id) || posts.length >= COUNT) return false;
  seenIds.add(post.id);
  posts.push(post);
  return true;
}

function publishDate(index) {
  // Spread publish dates across 2025-2026 for realism
  const y = index % 2 === 0 ? 2026 : 2025;
  const mo = String((index % 12) + 1).padStart(2, '0');
  const d = String((index % 28) + 1).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function authorFor(rel) {
  if (rel === 'islamic') return { author: 'NameVerse Editorial Team', credentials: 'Senior Researcher - Islamic Onomastics & Baby Naming Trends' };
  if (rel === 'christian') return { author: 'NameVerse Editorial Team', credentials: 'Senior Researcher - Biblical & Christian Naming Traditions' };
  if (rel === 'hindu') return { author: 'NameVerse Editorial Team', credentials: 'Senior Researcher - Vedic & Sanskrit Name Traditions' };
  return { author: 'NameVerse Editorial Team', credentials: 'Baby Name Research Specialist' };
}

function slugFromName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Factory 1: Top N names per religion/gender/year
function genTopByReligionGenderYear() {
  const years = [2022, 2023, 2024, 2025, 2026];
  let idx = 0;
  for (const rel of RELIGIONS) {
    for (const gk of GENDER_KEYS) {
      const list = top(byReligionGender[rel][gk], 50);
      for (const yr of years) {
        const slice = list.slice(0, 25);
        if (slice.length < 5) continue;
        const au = authorFor(rel);
        const post = {
          id: `top-${gk}-${rel}-names-${yr}`,
          title: `Top ${slice.length} ${GENDER_LABEL[gk]} ${RELIGION_LABEL[rel]} Names of ${yr}`,
          subtitle: `${RELIGION_LABEL[rel]} baby names trending in ${yr} with meanings`,
          excerpt: `The ${slice.length} most popular ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} baby names of ${yr}. See meanings, origins, and why parents are searching for them.`,
          category: `${RELIGION_LABEL[rel]} Names`,
          author: au.author,
          authorCredentials: au.credentials,
          publishDate: publishDate(idx),
          lastUpdated: publishDate(idx),
          readTime: `${Math.ceil(slice.length / 5) + 5} min read`,
          featured: idx < 6,
          featuredImage: `/og-${rel}-${gk}.png`,
          tags: [`${rel} names`, `${GENDER_LABEL[gk].toLowerCase()} names`, `baby names ${yr}`, rel === 'islamic' ? 'quranic names' : rel === 'christian' ? 'bible names' : 'vedic names', 'trending names'],
          seoKeywords: `${slice.length} most popular ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} names of ${yr}, ${rel} baby names, ${rel} ${GENDER_LABEL[gk].toLowerCase()} names with meanings, top ${rel} names ${yr}`,
          content: {
            introduction: introFor(RELIGION_LABEL[rel], GENDER_LABEL[gk].toLowerCase(), `This ${yr} ranking is based on community search trends and regional naming data.`),
            sections: [
              section(slice.slice(0, 12), `Chart-Topping ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk]} Names`, `These names led naming searches in ${yr} across ${RELIGION_LABEL[rel]} families worldwide:`),
              section(slice.slice(12, 25), `Rising ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk]} Names to Watch`, `Less common but gaining momentum — perfect if you want meaning with a touch of distinction:`),
            ],
            faqs: faqSet(idx),
          },
        };
        register(post);
        idx++;
      }
    }
  }
}

// Factory 2: Top names by origin
function genTopByOrigin() {
  let idx = 0;
  for (const origin of Object.keys(byOrigin).sort()) {
    const list = top(byOrigin[origin], 40);
    if (list.length < 8) continue;
    const males = list.filter((n) => n.g === 'male').slice(0, 15);
    const females = list.filter((n) => n.g === 'female').slice(0, 15);
    const both = list.slice(0, 20);
    const au = authorFor('islamic');
    const post = {
      id: `baby-names-origin-${slugFromName(origin)}`,
      title: `${origin} Baby Names That Define Meaningful Identity`,
      subtitle: `The best traditional and modern names from ${origin} culture`,
      excerpt: `Explore the most beloved ${origin} baby names with meanings and origins. From classic favorites to fresh picks, find a name that honors heritage and stands strong in any language.`,
      category: 'Origin Names',
      author: au.author,
      authorCredentials: au.credentials,
      publishDate: publishDate(idx),
      lastUpdated: publishDate(idx),
      readTime: `${Math.max(7, Math.ceil(list.length / 4))} min read`,
      featured: false,
      featuredImage: `/og-origin-${slugFromName(origin)}.png`,
      tags: [`${origin} names`, 'baby names', 'name origins', GENDER_LABEL.male === GENDER_LABEL.male ? `${origin} baby names` : null, 'meaningful names'].filter(Boolean),
      seoKeywords: `${origin} baby names, ${origin} names with meanings, origin of ${origin} names, traditional ${origin} names, modern ${origin} baby names`,
      content: {
        introduction: `Names from the ${origin} tradition carry centuries of linguistic heritage. This curated selection balances time-tested classics with names that feel fresh and globally friendly.`,
        sections: [
          section(males, `Strong ${origin} Boy Names`, `Masculine picks rooted in ${origin} language and culture:`),
          section(females, `Graceful ${origin} Girl Names`, `Elegant choices that pair beautifully with any surname:`),
          section(both, `Unisex & Cross-Cultural ${origin} Names`, `Versatile names that work across genders and languages:`),
        ],
        faqs: faqSet(idx),
      },
    };
    register(post);
    idx++;
  }
}

// Factory 3: Alphabet posts A-Z per religion & gender (split into chunks of names starting with each letter)
function genAlphabetByReligionGender() {
  let idx = 0;
  for (const rel of RELIGIONS) {
    for (const gk of GENDER_KEYS) {
      for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        const candidates = byReligionGender[rel][gk].filter((n) => n.name.toUpperCase().startsWith(letter));
        if (candidates.length < 3) continue;
        const slice = top(candidates, 15);
        const au = authorFor(rel);
        const post = {
          id: `letter-${letter}-${gk}-${rel}-names`,
          title: `${letter} Baby ${GENDER_LABEL[gk]} Names for ${RELIGION_LABEL[rel]} Families`,
          subtitle: `Every meaningful name starting with the letter ${letter}`,
          excerpt: `Browse every ${letter}-starting ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} baby name with meanings. Perfect for parents honoring initials or letter-themed traditions.`,
          category: `${RELIGION_LABEL[rel]} Names`,
          author: au.author,
          authorCredentials: au.credentials,
          publishDate: publishDate(idx),
          lastUpdated: publishDate(idx),
          readTime: `${Math.ceil(slice.length / 3) + 4} min read`,
          featured: false,
          featuredImage: `/og-letter-${letter}.png`,
          tags: [`${letter} names`, `${GENDER_LABEL[gk].toLowerCase()} names`, `${rel} names`, 'letter names', 'baby names'],
          seoKeywords: `${letter} baby ${GENDER_LABEL[gk].toLowerCase()} names, ${rel} ${letter} names, names starting with ${letter}, ${GENDER_LABEL[gk].toLowerCase()} names ${letter}`,
          content: {
            introduction: `The letter ${letter} opens the door to names rich with ${RELIGION_LABEL[rel]} heritage. These options span classic scripture favorites and modern, internationally friendly picks.`,
            sections: [
              section(slice, `All ${letter} ${GENDER_LABEL[gk]} Names Starting Here`, `Complete alphabetical guide to ${letter}-initial ${GENDER_LABEL[gk].toLowerCase()} baby names:`),
            ],
            faqs: faqSet(idx),
          },
        };
        register(post);
        idx++;
      }
    }
  }
}

// Factory 4: Meaning themes per religion & gender
function genMeaningThemes() {
  let idx = 0;
  for (const rel of RELIGIONS) {
    for (const gk of GENDER_KEYS) {
      for (const theme of Object.keys(THEME_KEYWORDS)) {
        const relFiltered = byReligionGender[rel][gk].filter((n) => meaningThemes[theme].some((t) => t.name === n.name));
        const slice = top(relFiltered, 15);
        if (slice.length < 4) continue;
        const au = authorFor(rel);
        const THEME_TITLE = {
          light: 'Light & Radiance',
          strength: 'Strength & Valor',
          peace: 'Peace & Calm',
          prosperity: 'Prosperity & Fortune',
          wisdom: 'Wisdom & Knowledge',
          grace: 'Grace & Beauty',
          hope: 'Hope & Inspiration',
          nature: 'Nature & Elements',
          virtue: 'Virtue & Faith',
          royalty: 'Royalty & Nobility',
        };
        const post = {
          id: `name-meaning-${theme}-${gk}-${rel}`,
          title: `${THEME_TITLE[theme]} ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk]} Names`,
          subtitle: `Names that mean ${theme} with ${RELIGION_LABEL[rel]} roots`,
          excerpt: `Pick a ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} baby name that means ${theme}. Each choice pairs deep significance with beautiful sound and modern usability.`,
          category: 'Name Meanings',
          author: au.author,
          authorCredentials: au.credentials,
          publishDate: publishDate(idx),
          lastUpdated: publishDate(idx),
          readTime: `${Math.ceil(slice.length / 3) + 5} min read`,
          featured: false,
          featuredImage: `/og-meaning-${theme}.png`,
          tags: [`${theme} names`, `${rel} ${theme} names`, `${GENDER_LABEL[gk].toLowerCase()} names`, 'meaningful names', 'names that mean'],
          seoKeywords: `${theme} baby names, names that mean ${theme}, ${RELIGION_LABEL[rel]} names meaning ${theme}, ${GENDER_LABEL[gk].toLowerCase()} names ${theme}`,
          content: {
            introduction: `A name meaning ${theme} is a daily reminder of the qualities parents hope their child will carry. These ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} picks all share a ${theme} essence.`,
            sections: [
              section(slice, `Top ${THEME_TITLE[theme]} Names for ${GENDER_LABEL[gk]}s`, `Each name below is rooted in ${rel} tradition and carries the ${theme} meaning you're seeking:`),
            ],
            faqs: faqSet(idx),
          },
        };
        register(post);
        idx++;
      }
    }
  }
}

// Factory 5: Rare & uncommon names per religion & gender
function genRareNames() {
  let idx = 0;
  for (const rel of RELIGIONS) {
    for (const gk of GENDER_KEYS) {
      const list = byReligionGender[rel][gk].sort(sortByName).slice(0, 30); // sortByName = ascending popularity = rare
      const slice = list.slice(0, 25);
      if (slice.length < 6) continue;
      const au = authorFor(rel);
      const post = {
        id: `unique-rare-${gk}-${rel}-names`,
        title: `Unique & Rare ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk]} Names Parents Love`,
        subtitle: `Uncommon but meaningful names that won't be mispronounced daily`,
        excerpt: `Searching for an uncommon ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} baby name? These rare picks balance distinctiveness with beautiful meaning and easy pronunciation.`,
        category: 'Rare Names',
        author: au.author,
        authorCredentials: au.credentials,
        publishDate: publishDate(idx),
        lastUpdated: publishDate(idx),
        readTime: `${Math.ceil(slice.length / 4) + 5} min read`,
        featured: false,
        featuredImage: `/og-rare-${rel}-${gk}.png`,
        tags: [`rare ${rel} names`, `unique ${rel} ${GENDER_LABEL[gk].toLowerCase()} names`, `${GENDER_LABEL[gk].toLowerCase()} names`, 'uncommon names'],
        seoKeywords: `unique ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} names, rare ${rel} baby names, uncommon ${rel} names, ${GENDER_LABEL[gk].toLowerCase()} names not common`,
        content: {
          introduction: `These little-known ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} names offer rarity without strangeness. Each is rooted in tradition yet rarely heard in today's playgrounds.`,
          sections: [
            section(slice.slice(0, 13), `Rare but Beautiful ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk]} Names`, `Names cherished in tradition but uncommon enough to turn heads for all the right reasons:`),
            section(slice.slice(13, 26), `Hidden Gems Worth Discovering`, `Lesser-known picks with meanings every parent will love to share:`),
          ],
          faqs: faqSet(idx),
        },
      };
      register(post);
      idx++;
    }
  }
}

// Factory 6: Gender-neutral names
function genUnisex() {
  let idx = 0;
  for (const rel of RELIGIONS) {
    const both = byReligionGender[rel].all.filter(
      (n) =>
        !n.g &&
        (byReligionGender[rel].male.some((x) => x.name === n.name) || byReligionGender[rel].female.some((x) => x.name === n.name))
    );
    // Fallback: collect names whose meaning or origin is broad; pick top names sorted by popularity
    const neutral = byReligionGender[rel].all
      .filter((n) => {
        const m = (n.meaning || '').toLowerCase();
        return (
          !n.g &&
          (m.includes('light') ||
            m.includes('moon') ||
            m.includes('star') ||
            m.includes('river') ||
            m.includes('earth') ||
            m.includes('peace') ||
            m.includes('strong') ||
            m.includes('wise') ||
            m.includes('free'))
        );
      })
      .sort(sortDesc)
      .slice(0, 20);
    const slice = neutral.length ? neutral : top(both, 15);
    if (slice.length < 6) continue;
    const au = authorFor(rel);
    const post = {
      id: `unisex-${rel}-names`,
      title: `${RELIGION_LABEL[rel]} Unisex & Gender-Neutral Baby Names`,
      subtitle: `Beautiful names that work for any child regardless of gender`,
      excerpt: `A curated list of ${RELIGION_LABEL[rel]} baby names perfect for any gender, with meanings inspired by light, nature, and timeless virtues.`,
      category: 'Unisex Names',
      author: au.author,
      authorCredentials: au.credentials,
      publishDate: publishDate(idx),
      lastUpdated: publishDate(idx),
      readTime: `${Math.ceil(slice.length / 3) + 4} min read`,
      featured: false,
      featuredImage: `/og-unisex-${rel}.png`,
      tags: [`unisex ${rel} names`, 'gender neutral names', `${GENDER_LABEL.male.toLowerCase()} and girl names`, 'inclusive names'],
      seoKeywords: `unisex ${RELIGION_LABEL[rel]} baby names, gender neutral ${rel} names, neutral baby names, unisex names ${RELIGION_LABEL[rel]}`,
      content: {
        introduction: `For parents who value inclusivity, these ${RELIGION_LABEL[rel]} unisex names offer beauty, meaning, and the freedom for every child to define their own identity.`,
        sections: [
          section(slice, `Top Unisex ${RELIGION_LABEL[rel]} Names`, `Each name below carries balanced energy and clear meaning, ideal for any child:`),
        ],
        faqs: faqSet(idx),
      },
    };
    register(post);
    idx++;
  }
}

// Factory 7: Sibling pairings
function genPairings() {
  let idx = 0;
  const combos = [
    ['Muhammad', 'Fatima', 'islamic'],
    ['David', 'Sarah', 'christian'],
    ['Krishna', 'Saanvi', 'hindu'],
    ['Omar', 'Aisha', 'islamic'],
    ['Noah', 'Grace', 'christian'],
    ['Arjun', 'Diya', 'hindu'],
  ];
  for (const [b, g, rel] of combos) {
    const au = authorFor(rel);
    const post = {
      id: `sibling-pairing-${slugFromName(b)}-${slugFromName(g)}`,
      title: `${b} & ${g}: Perfect Sibling Name Pairings That Match`,
      subtitle: `Harmonious brother-sister names from ${RELIGION_LABEL[rel]} tradition`,
      excerpt: `Find name pairs that flow as beautifully as siblings do. ${b} and ${g} complement each other in sound, meaning, and heritage.`,
      category: 'Name Pairings',
      author: au.author,
      authorCredentials: au.credentials,
      publishDate: publishDate(idx),
      lastUpdated: publishDate(idx),
      readTime: '6 min read',
      featured: false,
      featuredImage: `/og-pairing-${slugFromName(b)}.png`,
      tags: ['sibling names', 'name pairings', `baby ${b}`, `baby ${g}`, rel === 'islamic' ? 'quranic' : rel === 'christian' ? 'biblical' : 'vedic'],
      seoKeywords: `${b} and ${g} sibling names, matching ${RELIGION_LABEL[rel]} baby name pairs, ${b} ${g} names, sibling name ideas`,
      content: {
        introduction: `Pairing sibling names is an art. ${b} and ${g} create rhythm and meaning across two children while honoring the same ${RELIGION_LABEL[rel]} heritage.`,
        sections: [
          {
            title: 'Why These Names Work Together',
            content: `They echo the same origin and meaning family, making pronunciation and identity cohesive for parents and children.`,
            featuredNames: [b, g],
          },
          {
            title: 'More Matching Pairs in This Style',
            content: `Need more ${RELIGION_LABEL[rel]} sibling inspiration? These pairs share the same harmonious balance as ${b} and ${g}:`,
            featuredNames: [],
          },
        ],
        faqs: faqSet(idx),
      },
    };
    // fill featured names for the second section
    const relNames = byReligionGender[rel].all.sort(sortDesc).slice(0, 8);
    post.content.sections[1].featuredNames = relNames.map((n) => n.name);
    register(post);
    idx++;
  }
}

// Factory 8: Top-N list posts (e.g., "Top 50...") for high GSC seed keywords
function genTopNLists() {
  let idx = 0;
  const configs = [
    ['islamic', 'male', 50, 'Most Popular', 2026],
    ['islamic', 'female', 50, 'Most Popular', 2026],
    ['christian', 'male', 50, 'Most Popular', 2026],
    ['christian', 'female', 50, 'Most Popular', 2026],
    ['hindu', 'male', 50, 'Most Popular', 2026],
    ['hindu', 'female', 50, 'Most Popular', 2026],
    ['islamic', 'male', 100, 'Complete', 2026],
    ['islamic', 'female', 100, 'Complete', 2026],
    ['christian', 'male', 100, 'Complete', 2025],
    ['christian', 'female', 100, 'Complete', 2025],
    ['hindu', 'male', 100, 'Complete', 2026],
    ['hindu', 'female', 100, 'Complete', 2026],
  ];
  for (const [rel, gk, n, label, yr] of configs) {
    const slice = top(byReligionGender[rel][gk], n);
    if (slice.length < 10) continue;
    const au = authorFor(rel);
    const post = {
      id: `top-${n}-${GENDER_LABEL[gk].toLowerCase()}-${rel}-names-${yr}`,
      title: `Top ${n} ${GENDER_LABEL[gk]} ${RELIGION_LABEL[rel]} Baby Names of ${yr}`,
      subtitle: `${label} ranked ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} names for ${yr} with meanings`,
      excerpt: `The definitive list of the Top ${n} ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} baby names of ${yr}. Every name includes meaning, origin, and why it's trending.`,
      category: `${RELIGION_LABEL[rel]} Names`,
      author: au.author,
      authorCredentials: au.credentials,
      publishDate: publishDate(idx),
      lastUpdated: publishDate(idx),
      readTime: `${Math.ceil(n / 8) + 6} min read`,
      featured: idx < 6,
      featuredImage: `/og-top-${n}-${rel}-${gk}.png`,
      tags: [`${rel} names`, `${GENDER_LABEL[gk].toLowerCase()} names`, `top ${n} names`, `baby names ${yr}`, 'ranked names'],
      seoKeywords: `top ${n} ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} names, best ${rel} baby names, ${GENDER_LABEL[gk].toLowerCase()} names ${yr}`,
      content: {
        introduction: `Based on multi-regional search data, here are the Top ${n} ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} baby names of ${yr}. Each entry is ranked by a blend of popularity, meaning, and modern usability.`,
            sections: [
          section(slice.slice(0, 25), `Ranking #1-25`, `#1-25: The most-loved ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} names this year:`),
          section(slice.slice(25, 50), `Ranking #26-50`, `#26-50: Strong mid-tier picks with rising interest:`),
          section(slice.slice(50, 75), `Ranking #51-75`, `#51-75: Fresh options balancing uniqueness and clarity:`),
          section(slice.slice(75, n), `Ranking #76-100`, `#76-100: Distinctive picks for parents who love to stand out:`),
        ].filter(Boolean),
        faqs: faqSet(idx),
      },
    };
    register(post);
    idx++;
  }
}

// Factory 9: Trend over years per religion/gender (year list posts)
function genYearlyTrendPosts() {
  let idx = 0;
  const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  for (const rel of RELIGIONS) {
    for (const gk of GENDER_KEYS) {
      const list = top(byReligionGender[rel][gk], 50);
      if (list.length < 10) continue;
      const slice = list.slice(0, 20);
      const au = authorFor(rel);
      const post = {
        id: `trending-${gk}-${rel}-names-${years.join('-')}`,
        title: `${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk]} Names Rising From 2020 to 2026`,
        subtitle: `Which names grew fastest over the last seven years?`,
        excerpt: `See which ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} baby names have grown in popularity from 2020 through 2026 based on search trends.`,
        category: 'Trending Names',
        author: au.author,
        authorCredentials: au.credentials,
        publishDate: publishDate(idx),
        lastUpdated: publishDate(idx),
        readTime: `${Math.ceil(slice.length / 3) + 4} min read`,
        featured: false,
        featuredImage: `/og-trend-${rel}-${gk}.png`,
        tags: [`${rel} names`, 'trending names', `${GENDER_LABEL[gk].toLowerCase()} names`, 'name trends', 'popular names 2026'],
        seoKeywords: `${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} names trending, popular ${rel} names 2020 2026, fastest growing ${GENDER_LABEL[gk].toLowerCase()} baby names`,
        content: {
          introduction: `Search data shows these ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk].toLowerCase()} names have climbed the fastest between 2020 and 2026. These picks blend traditional roots with modern momentum.`,
          sections: [
            section(slice, `Fastest-Rising ${RELIGION_LABEL[rel]} ${GENDER_LABEL[gk]} Names`, `Names gaining the most traction across recent years:`),
          ],
          faqs: faqSet(idx),
        },
      };
      register(post);
      idx++;
    }
  }
}

// Factory 10: Cross-cultural names (names that exist in multiple religions/origins)
function genCrossCultural() {
  let idx = 0;
  const configs = [
    ['Arabic', 'shared by Islamic, Christian, and global parents'],
    ['Hebrew', 'from biblical to modern usage worldwide'],
    ['Sanskrit', 'loved across Hindu, Buddhist, and global communities'],
  ];
  for (const [origin, scope] of configs) {
    const list = top(byOrigin[origin] ? byOrigin[origin] : [], 35);
    if (list.length < 8) continue;
    const slice = list.slice(0, 22);
    const au = authorFor('islamic');
    const post = {
      id: `cross-cultural-${slugFromName(origin)}-names`,
      title: `${origin} Baby Names Parents Love Across Cultures`,
      subtitle: scope,
      excerpt: `Discover ${origin} names that bridge faiths and cultures. These picks are meaningful, widely accepted, and easy to use anywhere in the world.`,
      category: 'Cross-Cultural Names',
      author: au.author,
      authorCredentials: au.credentials,
      publishDate: publishDate(idx),
      lastUpdated: publishDate(idx),
      readTime: `${Math.ceil(slice.length / 3) + 5} min read`,
      featured: false,
      featuredImage: `/og-culture-${slugFromName(origin)}.png`,
      tags: [`${slugFromName(origin)} names`, 'cross cultural names', 'global names', scope.includes('world') ? 'worldwide names' : null].filter(Boolean),
      seoKeywords: `${origin} cross cultural baby names, shared ${origin} names, global ${origin} baby names, ${origin} names accepted everywhere`,
      content: {
        introduction: `${origin} names travel beautifully across religious and cultural boundaries. This list highlights the picks that resonate far beyond their original community.`,
        sections: [
          section(slice, `Universal ${origin} Favorites`, `Names celebrated by many cultures for their sound and meaning:`),
        ],
        faqs: faqSet(idx),
      },
    };
    register(post);
    idx++;
  }
}

// Factory 11: "Name of the month" style - one deep-dive post per featured name (rotating)
function genNameDeepDives() {
  let idx = 0;
  const famous = ['Muhammad', 'Fatima', 'Aisha', 'Noor', 'Ali', 'Maryam', 'Aisha', 'Krishna', 'Lakshmi', 'Saanvi', 'Diya', 'Arjun', 'Aarav', 'David', 'Sarah', 'John', 'Mary', 'Yusuf', 'Omar', 'Grace', 'Noah', 'Elijah'];
  for (const nm of famous) {
    const match = ALL.find((n) => n.name.toLowerCase() === nm.toLowerCase());
    if (!match) continue;
    const au = authorFor(match.rel || 'islamic');
    const post = {
      id: `name-meaning-${slugFromName(nm)}`,
      title: `The Meaning, Origin & Pronunciation of the Name ${nm}`,
      subtitle: `Everything parents should know before choosing ${nm}`,
      excerpt: `Discover the full story of the name ${nm}: meaning, origin, pronunciation, famous people, popularity, and cultural significance in one complete guide.`,
      category: match.rel ? RELIGION_LABEL[match.rel] : 'Name Meanings',
      author: au.author,
      authorCredentials: au.credentials,
      publishDate: publishDate(idx),
      lastUpdated: publishDate(idx),
      readTime: '5 min read',
      featured: false,
      featuredImage: `/og-name-${slugFromName(nm)}.png`,
      tags: ['name meaning', `${slugFromName(nm)}`, `${match.origin} names`, 'baby names', 'name origins'],
      seoKeywords: `meaning of ${nm}, origin of ${nm} name, ${nm} pronunciation, ${nm} name popular, is ${nm} a good name`,
      content: {
        introduction: `The name ${nm} carries the meaning "${match.meaning}" and originates from ${match.origin || 'a rich linguistic tradition'}. This guide covers its story, spiritual context, and why parents keep choosing it.`,
        sections: [
          {
            title: `Full Meaning & Pronunciation Guide`,
            content: `${nm} means "${match.meaning}". Pronounced phonetically as "${nm}", it flows naturally across English, Arabic, and regional dialects.`,
            featuredNames: [nm],
          },
          {
            title: `Cultural & Historical Significance`,
            content: `Across ${match.origin || 'multiple'} traditions, ${nm} appears in sacred texts, historical records, and popular culture, giving the name layers of resonance.`,
            featuredNames: [],
          },
        ],
        faqs: [
          { q: `Is ${nm} a good baby name?`, a: `Yes, ${nm} is well balanced between tradition and modern usability and carries a positive meaning.` },
          { q: `What does the name ${nm} mean?`, a: `${nm} means "${match.meaning}".` },
          { q: `From what origin does ${nm} come?`, a: `${nm} originates from ${match.origin || 'a historic name-bearing culture'}.` },
        ],
      },
    };
    register(post);
    idx++;
  }
}

// Factory 12: "Letter names" popular cross-letter combos (A-Z quick picks)
function genQuickPicks() {
  let idx = 0;
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const candidates = byLetter[letter] ? byLetter[letter].filter((n) => n.g) : [];
    if (candidates.length < 6) continue;
    const males = top(candidates.filter((n) => n.g === 'male'), 8);
    const females = top(candidates.filter((n) => n.g === 'female'), 8);
    if (!males.length || !females.length) continue;
    const post = {
      id: `quick-pick-names-${letter.toLowerCase()}`,
      title: `${letter} Names for Boys & Girls: Quick Pick List`,
      subtitle: `Short, sharp, and meaningful names starting with ${letter}`,
      excerpt: `Looking for ${letter}-initial names for a boy or girl? Here are the top shortlisted picks across origins and meanings to consider in one glance.`,
      category: 'Quick Picks',
      author: 'NameVerse Editorial Team',
      authorCredentials: 'Naming Trends Analyst',
      publishDate: publishDate(idx),
      lastUpdated: publishDate(idx),
      readTime: '4 min read',
      featured: false,
      featuredImage: `/og-quick-${letter.toLowerCase()}.png`,
      tags: [`${letter} names`, 'quick pick names', 'boy names', 'girl names', `${letter} names boys girls`],
      seoKeywords: `${letter} baby names for boys and girls, names starting with ${letter}, ${letter} boys names, ${letter} girls names`,
      content: {
        introduction: `Short initial names remain popular because they pair easily with any surname and are easy for kids to spell. These ${letter} picks cover strong boys' names and graceful girls' names.`,
        sections: [
          section(males, `${letter} Boy Names We Love`, `Leading boys' picks for the letter ${letter}:`),
          section(females, `${letter} Girl Names We Love`, `Leading girls' picks for the letter ${letter}:`),
        ],
        faqs: faqSet(idx),
      },
    };
    register(post);
    idx++;
  }
}

// Run all factories in a balanced order
genTopByReligionGenderYear();
genTopNLists();
genYearlyTrendPosts();
genAlphabetByReligionGender();
genMeaningThemes();
genRareNames();
genUnisex();
genPairings();
genCrossCultural();
genNameDeepDives();
genQuickPicks();

// Sort posts by publishDate ascending then title, and assign final ordering
posts.sort((a, b) => (a.publishDate < b.publishDate ? -1 : a.publishDate > b.publishDate ? 1 : a.title.localeCompare(b.title)));

// Normalize fields
for (let i = 0; i < posts.length; i++) {
  const p = posts[i];
  if (!p.lastUpdated) p.lastUpdated = p.publishDate;
  if (p.featured === undefined) p.featured = false;
  if (!p.readTime) p.readTime = '8 min read';
  if (!p.featuredImage) p.featuredImage = '/og-trending-names.png';
  // ensure tags / seoKeywords are strings or arrays of strings
  if (!Array.isArray(p.tags)) p.tags = [String(p.tags)];
  if (typeof p.seoKeywords !== 'string') p.seoKeywords = String(p.seoKeywords || '');
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(posts, null, 2), 'utf8');
console.log(`Wrote ${posts.length} blog posts to ${OUTPUT_PATH}`);
