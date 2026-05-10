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
    // Dual fetch strategy:
    // - "Sukkah, Chapter N" uses Sefaria's alt-structure (chapter-based) ref for the
    //   daf-indexed Bavli tractate. This returns the Gemara text + commentary array
    //   which includes collectiveTitle.en === 'Gemara'.
    // - "Mishna Sukkah.N" returns the clean chapter-based Mishna text (he/text).
    // We merge: Mishna text as the base, Talmud commentary for the Gemara layer.
    const talmudRef  = `Sukkah, Chapter ${chapter}`;
    const mishnaRef  = `Mishna Sukkah.${chapter}`;
    const yerushalmiRef = `Jerusalem Talmud Sukkah.${chapter}`;
    try {
      const talmudData = await fetchPassage(talmudRef);
      // 300ms between requests — Sefaria is rate-limited, do not remove
      await sleep(300);
      const mishnaData = await fetchPassage(mishnaRef);
      await sleep(300);
      const yerushalmi = await fetchYerushalmiPassage(yerushalmiRef);
      await sleep(300);

      // Log available commentary titles so we can verify Gemara is present
      const commentaryTitles = (talmudData?.commentary ?? [])
        .map(c => c.collectiveTitle?.en ?? c.he_title ?? '(no title)')
        .join(', ');
      console.log(`  Commentary titles for ch${chapter}: [${commentaryTitles || 'none'}]`);

      // Merge: clean Mishna text + Talmud commentary (Gemara, Rashi, Tosafot)
      const bavli = {
        text:        mishnaData?.text ?? talmudData?.text,
        he:          mishnaData?.he   ?? talmudData?.he,
        commentary:  talmudData?.commentary ?? mishnaData?.commentary ?? [],
      };

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
