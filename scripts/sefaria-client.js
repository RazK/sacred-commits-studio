/**
 * sefaria-client.js
 * Fetches Talmudic texts and commentaries from the Sefaria API.
 * Run: node scripts/sefaria-client.js
 * Output: data/sefaria/*.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.sefaria.org/api';
const OUTPUT_DIR = path.join(__dirname, '../data/sefaria');

// Tractate Berakhot has 9 chapters
const BERAKHOT_CHAPTERS = 9;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchPassage(ref) {
  const encoded = encodeURIComponent(ref);
  const url = `${BASE_URL}/texts/${encoded}?context=0&commentary=1&language=both`;
  console.log(`  Fetching: ${ref}`);
  return fetchJSON(url);
}

async function fetchYerushalmiPassage(ref) {
  const yerushalmiRef = ref.replace('Berakhot', 'Jerusalem Talmud Berakhot');
  const encoded = encodeURIComponent(yerushalmiRef);
  const url = `${BASE_URL}/texts/${encoded}?context=0&language=both`;
  console.log(`  Fetching Yerushalmi: ${yerushalmiRef}`);
  try {
    return await fetchJSON(url);
  } catch (e) {
    console.warn(`  No Yerushalmi data for ${ref}: ${e.message}`);
    return null;
  }
}

async function fetchIndex() {
  const url = `${BASE_URL}/index/Berakhot`;
  console.log('Fetching Berakhot index...');
  return fetchJSON(url);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const index = await fetchIndex();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'berakhot-index.json'),
    JSON.stringify(index, null, 2)
  );
  console.log('Saved berakhot-index.json\n');

  const allPassages = [];

  for (let chapter = 1; chapter <= BERAKHOT_CHAPTERS; chapter++) {
    console.log(`Chapter ${chapter}...`);
    const ref = `Berakhot.${chapter}`;
    try {
      const bavli = await fetchPassage(ref);
      // 300ms between requests — Sefaria is rate-limited, do not remove
      await sleep(300);
      const yerushalmi = await fetchYerushalmiPassage(ref);
      await sleep(300);

      const passage = { ref, chapter, bavli, yerushalmi };
      allPassages.push(passage);

      fs.writeFileSync(
        path.join(OUTPUT_DIR, `berakhot-ch${chapter}.json`),
        JSON.stringify(passage, null, 2)
      );
      console.log(`  Saved berakhot-ch${chapter}.json`);
    } catch (e) {
      console.error(`  Error fetching chapter ${chapter}: ${e.message}`);
    }
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'berakhot-all.json'),
    JSON.stringify(allPassages, null, 2)
  );

  console.log(`\nDone. Fetched ${allPassages.length} chapters → data/sefaria/`);
}

main().catch(console.error);
