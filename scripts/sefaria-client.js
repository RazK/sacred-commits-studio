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

// Tractate Sukkah has 5 chapters
const SUKKAH_CHAPTERS = 5;

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

async function fetchYerushalmiPassage(yerushalmiRef) {
  const encoded = encodeURIComponent(yerushalmiRef);
  const url = `${BASE_URL}/texts/${encoded}?context=0&language=both`;
  console.log(`  Fetching Yerushalmi: ${yerushalmiRef}`);
  try {
    return await fetchJSON(url);
  } catch (e) {
    console.warn(`  No Yerushalmi data for ${yerushalmiRef}: ${e.message}`);
    return null;
  }
}

async function fetchIndex() {
  const url = `${BASE_URL}/index/Sukkah`;
  console.log('Fetching Sukkah index...');
  return fetchJSON(url);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const index = await fetchIndex();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'sukkah-index.json'),
    JSON.stringify(index, null, 2)
  );
  console.log('Saved sukkah-index.json\n');

  const allPassages = [];

  for (let chapter = 1; chapter <= SUKKAH_CHAPTERS; chapter++) {
    console.log(`Chapter ${chapter}...`);
    // "Mishna Sukkah.N" = chapter-based Mishna reference; returns Mishna text
    // with Gemara (and Rashi/Tosafot) as commentary entries.
    // Plain "Sukkah.N" resolves to Talmud daf N, which is daf-based (Sukkah
    // starts on daf 2a so daf 1 is empty and daf 2 = ch1 content — wrong).
    const bavliRef = `Mishna Sukkah.${chapter}`;
    const yerushalmiRef = `Jerusalem Talmud Sukkah.${chapter}`;
    try {
      const bavli = await fetchPassage(bavliRef);
      // 300ms between requests — Sefaria is rate-limited, do not remove
      await sleep(300);
      const yerushalmi = await fetchYerushalmiPassage(yerushalmiRef);
      await sleep(300);

      const passage = { ref: `Sukkah.${chapter}`, chapter, bavli, yerushalmi };
      allPassages.push(passage);

      fs.writeFileSync(
        path.join(OUTPUT_DIR, `sukkah-ch${chapter}.json`),
        JSON.stringify(passage, null, 2)
      );
      console.log(`  Saved sukkah-ch${chapter}.json`);
    } catch (e) {
      console.error(`  Error fetching chapter ${chapter}: ${e.message}`);
    }
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'sukkah-all.json'),
    JSON.stringify(allPassages, null, 2)
  );

  console.log(`\nDone. Fetched ${allPassages.length} chapters → data/sefaria/`);
}

main().catch(console.error);
