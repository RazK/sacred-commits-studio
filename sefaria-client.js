/**
 * sefaria-client.js
 * Fetches Talmudic texts and commentaries from the Sefaria API.
 * Run: node scripts/sefaria-client.js
 * Output: data/sefaria/*.json
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.sefaria.org/api';
const OUTPUT_DIR = path.join(__dirname, '../data/sefaria');

// Tractate Berakhot has 9 chapters, 64 mishnayot total
const BERAKHOT_CHAPTERS = 9;

// Commentators we want to pull alongside each passage
const COMMENTATORS = [
  'Rashi on Berakhot',
  'Tosafot on Berakhot',
  'Rabbeinu Hananel on Berakhot',
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/**
 * Fetch a single Mishna/Gemara passage.
 * Sefaria ref format: "Berakhot.2.1" = tractate, chapter, mishnah
 */
async function fetchPassage(ref) {
  const encoded = encodeURIComponent(ref);
  const url = `${BASE_URL}/texts/${encoded}?context=0&commentary=1&language=both`;
  console.log(`  Fetching: ${ref}`);
  return fetchJSON(url);
}

/**
 * Fetch all links (cross-references) for a passage.
 */
async function fetchLinks(ref) {
  const encoded = encodeURIComponent(ref);
  const url = `${BASE_URL}/links/${encoded}`;
  return fetchJSON(url);
}

/**
 * Fetch index metadata for Berakhot (chapter structure, etc.)
 */
async function fetchIndex() {
  const url = `${BASE_URL}/index/Berakhot`;
  console.log('Fetching Berakhot index...');
  return fetchJSON(url);
}

/**
 * Fetch Yerushalmi (Jerusalem Talmud) version of the same tractate.
 */
async function fetchYerushalmiPassage(ref) {
  // Yerushalmi ref format differs slightly
  const yerushalmiRef = ref.replace('Berakhot', 'Jerusalem Talmud Berakhot');
  const encoded = encodeURIComponent(yerushalmiRef);
  const url = `${BASE_URL}/texts/${encoded}?context=0&language=both`;
  console.log(`  Fetching Yerushalmi: ${yerushalmiRef}`);
  try {
    return fetchJSON(url);
  } catch (e) {
    console.warn(`  No Yerushalmi match for ${ref}`);
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Fetch and save the index
  const index = await fetchIndex();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'berakhot-index.json'),
    JSON.stringify(index, null, 2)
  );
  console.log('Saved berakhot-index.json');

  const allPassages = [];

  // 2. Fetch each chapter/mishnah
  for (let chapter = 1; chapter <= BERAKHOT_CHAPTERS; chapter++) {
    console.log(`\nChapter ${chapter}...`);

    // Fetch the full chapter at once (Sefaria supports chapter-level refs)
    const ref = `Berakhot.${chapter}`;
    try {
      const data = await fetchPassage(ref);
      const yerushalmi = await fetchYerushalmiPassage(ref);

      const passage = {
        ref,
        chapter,
        bavli: data,
        yerushalmi: yerushalmi,
      };

      allPassages.push(passage);

      // Save individual chapter file
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `berakhot-ch${chapter}.json`),
        JSON.stringify(passage, null, 2)
      );

      // Be polite to the API — 300ms between requests
      await sleep(300);
    } catch (e) {
      console.error(`  Error fetching chapter ${chapter}: ${e.message}`);
    }
  }

  // 3. Save the full combined dataset
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'berakhot-all.json'),
    JSON.stringify(allPassages, null, 2)
  );

  console.log(`\nDone. Fetched ${allPassages.length} chapters.`);
  console.log('Output: data/sefaria/');
}

main().catch(console.error);
