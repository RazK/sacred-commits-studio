/**
 * generate-repo.js
 * 
 * Reads Sefaria API data from data/sefaria/ and generates a mock Git
 * repository structure: commits, trees, and diffs.
 * 
 * Run AFTER sefaria-client.js has populated data/sefaria/
 * Usage: node scripts/generate-repo.js
 * Output: data/mock-repo/commits.json, data/mock-repo/diffs.json
 */

const fs = require('fs');
const path = require('path');

const AUTHORS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/mock-repo/authors.json'), 'utf8')
);
const BRANCHES = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/mock-repo/branches.json'), 'utf8')
);

const SEFARIA_DIR = path.join(__dirname, '../data/sefaria');
const OUTPUT_DIR = path.join(__dirname, '../data/mock-repo');

// Flatten all authors into one lookup map
const allAuthors = [
  ...AUTHORS.tannaim,
  ...AUTHORS.amoraim,
  ...AUTHORS.rishonim,
];
const authorById = Object.fromEntries(allAuthors.map(a => [a.id, a]));

/**
 * Convert a historical year (CE) to a Unix-like timestamp.
 * We anchor 0 CE = 0, 1 year = 31,536,000 seconds.
 * Negative years = BCE.
 */
function yearToTimestamp(year) {
  return year * 31536000;
}

/**
 * Generate a deterministic SHA-like hash for a commit.
 * Not cryptographic — just unique enough for our purposes.
 */
function mockSha(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') +
         Math.abs(hash * 31).toString(16).padStart(8, '0') +
         Math.abs(hash * 37).toString(16).padStart(8, '0') +
         Math.abs(hash * 41).toString(16).padStart(8, '0') +
         Math.abs(hash * 43).toString(16).padStart(8, '0');
}

/**
 * The Mishna commits — Rabbi Yehuda HaNasi compiling the original text.
 * These form the root commits on 'main'.
 */
function generateMishnaCommits(chapters) {
  const author = authorById['rabbi-yehuda-hanasi'];
  const commits = [];

  for (const ch of chapters) {
    const ref = `Berakhot.${ch.chapter}`;
    const sha = mockSha(`mishna-${ref}`);

    commits.push({
      sha,
      short_sha: sha.slice(0, 7),
      branch: 'main',
      type: 'mishna',
      ref,
      tractate: 'Berakhot',
      chapter: ch.chapter,
      author_id: author.id,
      author: {
        name: author.name,
        git_username: author.git_username,
        email: `${author.git_username}@tannaim.il`,
      },
      timestamp: yearToTimestamp(200),
      year_ce: 200,
      era: 'Tannaim',
      location: author.location,
      coordinates: author.coordinates,
      message: `Mishna Berakhot Chapter ${ch.chapter}: compile and redact`,
      description: `Compilation of oral traditions into written Mishna form. Chapter ${ch.chapter} of Tractate Berakhot.`,
      text_he: ch.bavli?.he || null,
      text_en: ch.bavli?.text || null,
      sefaria_ref: ref,
      sefaria_url: `https://www.sefaria.org/${encodeURIComponent(ref)}`,
      parent_sha: ch.chapter > 1 ? mockSha(`mishna-Berakhot.${ch.chapter - 1}`) : null,
      stats: {
        additions: ch.bavli?.he ? (Array.isArray(ch.bavli.he) ? ch.bavli.he.length : 1) : 0,
        deletions: 0,
        changed_files: 1,
      }
    });
  }

  return commits;
}

/**
 * Babylonian Talmud (Bavli) commits — the Amoraim discussing the Mishna.
 */
function generateBavliCommits(chapters) {
  const bavliAmoraim = AUTHORS.amoraim.filter(a =>
    a.location.includes('Babylonia')
  );
  const commits = [];

  // Assign chapters to amoraim in a realistic way
  // Early chapters get earlier amoraim, later chapters get later ones
  const amoraimByGeneration = bavliAmoraim.sort((a, b) => a.generation - b.generation);

  for (const ch of chapters) {
    // Pick 1–3 amoraim to "contribute" to this chapter
    const contributors = amoraimByGeneration.slice(
      Math.floor((ch.chapter - 1) / 3),
      Math.floor((ch.chapter - 1) / 3) + 2
    );

    for (const amora of contributors) {
      const ref = `Berakhot.${ch.chapter}`;
      const sha = mockSha(`bavli-${ref}-${amora.id}`);
      const mishnaParentSha = mockSha(`mishna-${ref}`);

      commits.push({
        sha,
        short_sha: sha.slice(0, 7),
        branch: 'bavli',
        type: 'gemara',
        ref,
        tractate: 'Berakhot',
        chapter: ch.chapter,
        author_id: amora.id,
        author: {
          name: amora.name,
          git_username: amora.git_username,
          email: `${amora.git_username}@bavli.babylonia`,
        },
        timestamp: yearToTimestamp(amora.active_years[0] + 10),
        year_ce: amora.active_years[0] + 10,
        era: 'Amoraim',
        location: amora.location,
        coordinates: amora.coordinates,
        message: `[Bavli ${ref}] ${amora.name}: gemara discussion and analysis`,
        description: `Amoraic discussion of Mishna ${ref} in the Babylonian tradition. ${amora.bio}`,
        text_he: ch.bavli?.commentary?.find(c => c.collectiveTitle?.he === 'גמרא')?.he || null,
        text_en: ch.bavli?.commentary?.find(c => c.collectiveTitle?.en === 'Gemara')?.text || null,
        sefaria_ref: ref,
        sefaria_url: `https://www.sefaria.org/${encodeURIComponent(ref)}`,
        parent_sha: mishnaParentSha,
        stats: {
          additions: Math.floor(Math.random() * 20) + 5,
          deletions: 0,
          changed_files: 1,
        }
      });
    }
  }

  return commits;
}

/**
 * Jerusalem Talmud (Yerushalmi) commits — the Palestinian Amoraim.
 */
function generateYerushalmiCommits(chapters) {
  const israeliAmoraim = AUTHORS.amoraim.filter(a =>
    a.location.includes('Land of Israel') || a.location.includes('Tiberias')
  );
  const commits = [];

  for (const ch of chapters) {
    if (!ch.yerushalmi) continue; // No Yerushalmi data for this chapter

    const amora = israeliAmoraim[ch.chapter % israeliAmoraim.length];
    const ref = `Berakhot.${ch.chapter}`;
    const sha = mockSha(`yerushalmi-${ref}-${amora.id}`);
    const mishnaParentSha = mockSha(`mishna-${ref}`);

    commits.push({
      sha,
      short_sha: sha.slice(0, 7),
      branch: 'yerushalmi',
      type: 'gemara',
      ref,
      tractate: 'Berakhot',
      chapter: ch.chapter,
      author_id: amora.id,
      author: {
        name: amora.name,
        git_username: amora.git_username,
        email: `${amora.git_username}@yerushalmi.il`,
      },
      timestamp: yearToTimestamp(amora.active_years[0] + 5),
      year_ce: amora.active_years[0] + 5,
      era: 'Amoraim',
      location: amora.location,
      coordinates: amora.coordinates,
      message: `[Yerushalmi ${ref}] ${amora.name}: Palestinian Gemara tradition`,
      description: `Jerusalem Talmud discussion of Mishna ${ref}. Compiled in the Land of Israel tradition.`,
      text_he: ch.yerushalmi?.he || null,
      text_en: ch.yerushalmi?.text || null,
      sefaria_ref: ref,
      sefaria_url: `https://www.sefaria.org/Jerusalem_Talmud_${encodeURIComponent(ref)}`,
      parent_sha: mishnaParentSha,
      is_divergent_from_bavli: true,
      stats: {
        additions: Math.floor(Math.random() * 15) + 3,
        deletions: 0,
        changed_files: 1,
      }
    });
  }

  return commits;
}

/**
 * Rashi commentary commits.
 */
function generateRashiCommits(chapters) {
  const rashi = authorById['rashi'];
  const commits = [];

  for (const ch of chapters) {
    const ref = `Rashi on Berakhot ${ch.chapter}`;
    const sha = mockSha(`rashi-${ch.chapter}`);
    const bavliParentSha = mockSha(`bavli-Berakhot.${ch.chapter}-rava`);

    // Rashi's commentary from Sefaria
    const rashiData = ch.bavli?.commentary?.find(c =>
      c.collectiveTitle?.en === 'Rashi' || c.he_title?.includes('רש')
    );

    commits.push({
      sha,
      short_sha: sha.slice(0, 7),
      branch: 'rashi-commentary',
      type: 'commentary',
      ref,
      tractate: 'Berakhot',
      chapter: ch.chapter,
      author_id: rashi.id,
      author: {
        name: rashi.name,
        git_username: rashi.git_username,
        email: `${rashi.git_username}@troyes.fr`,
      },
      timestamp: yearToTimestamp(1080),
      year_ce: 1080,
      era: 'Rishonim',
      location: rashi.location,
      coordinates: rashi.coordinates,
      message: `[Rashi] Berakhot Ch.${ch.chapter}: commentary and clarification`,
      description: `Rashi's line-by-line commentary on Tractate Berakhot Chapter ${ch.chapter}. Explains difficult vocabulary, clarifies legal reasoning, and resolves apparent contradictions.`,
      text_he: rashiData?.he || null,
      text_en: rashiData?.text || null,
      sefaria_ref: ref,
      sefaria_url: `https://www.sefaria.org/Rashi_on_Berakhot.${ch.chapter}`,
      parent_sha: bavliParentSha,
      stats: {
        additions: Math.floor(Math.random() * 30) + 10,
        deletions: 0,
        changed_files: 1,
      }
    });
  }

  return commits;
}

/**
 * Tosafot commentary commits.
 */
function generateTosafotCommits(chapters) {
  const tosafot = authorById['tosafot'];
  const commits = [];

  for (const ch of chapters) {
    const ref = `Tosafot on Berakhot ${ch.chapter}`;
    const sha = mockSha(`tosafot-${ch.chapter}`);
    const rashiParentSha = mockSha(`rashi-${ch.chapter}`);

    commits.push({
      sha,
      short_sha: sha.slice(0, 7),
      branch: 'tosafot-commentary',
      type: 'commentary',
      ref,
      tractate: 'Berakhot',
      chapter: ch.chapter,
      author_id: tosafot.id,
      author: {
        name: tosafot.name,
        git_username: tosafot.git_username,
        email: `tosafot@rishonim.eu`,
      },
      timestamp: yearToTimestamp(1150 + (ch.chapter * 5)),
      year_ce: 1150 + (ch.chapter * 5),
      era: 'Rishonim',
      location: tosafot.location,
      coordinates: tosafot.coordinates,
      message: `[Tosafot] Berakhot Ch.${ch.chapter}: critical glosses on Rashi`,
      description: `Tosafist commentary on Berakhot Chapter ${ch.chapter}. Often challenges or extends Rashi's explanations with cross-references to other tractates.`,
      text_he: null,
      text_en: null,
      sefaria_ref: ref,
      sefaria_url: `https://www.sefaria.org/Tosafot_on_Berakhot.${ch.chapter}`,
      parent_sha: rashiParentSha,
      stats: {
        additions: Math.floor(Math.random() * 20) + 8,
        deletions: 0,
        changed_files: 1,
      }
    });
  }

  return commits;
}

/**
 * Generate diff objects comparing Bavli and Yerushalmi for each chapter.
 */
function generateDiffs(chapters) {
  const diffs = [];

  for (const ch of chapters) {
    if (!ch.yerushalmi) continue;

    const bavliText = ch.bavli?.text;
    const yerushalmiText = ch.yerushalmi?.text;

    if (!bavliText || !yerushalmiText) continue;

    diffs.push({
      id: `diff-berakhot-${ch.chapter}`,
      ref: `Berakhot.${ch.chapter}`,
      chapter: ch.chapter,
      branch_a: 'bavli',
      branch_b: 'yerushalmi',
      commit_a: mockSha(`bavli-Berakhot.${ch.chapter}-rava`),
      commit_b: mockSha(`yerushalmi-Berakhot.${ch.chapter}-rabbi-yochanan`),
      bavli_text_en: Array.isArray(bavliText) ? bavliText.flat() : [bavliText],
      yerushalmi_text_en: Array.isArray(yerushalmiText) ? yerushalmiText.flat() : [yerushalmiText],
      notes: `Comparison of Bavli and Yerushalmi traditions for Berakhot Chapter ${ch.chapter}. The Jerusalem Talmud (compiled ~350 CE) often preserves earlier Palestinian traditions that diverge from the Babylonian redaction.`
    });
  }

  return diffs;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  // Load Sefaria data
  const sefariaFiles = fs.readdirSync(SEFARIA_DIR)
    .filter(f => f.startsWith('berakhot-ch') && f.endsWith('.json'))
    .sort();

  if (sefariaFiles.length === 0) {
    console.log('No Sefaria data found. Run scripts/sefaria-client.js first.');
    console.log('Generating mock repo structure with placeholder data...\n');
  }

  // Load or stub chapter data
  const chapters = sefariaFiles.length > 0
    ? sefariaFiles.map(f => JSON.parse(fs.readFileSync(path.join(SEFARIA_DIR, f), 'utf8')))
    : Array.from({ length: 9 }, (_, i) => ({ chapter: i + 1, bavli: null, yerushalmi: null }));

  console.log(`Processing ${chapters.length} chapters of Berakhot...\n`);

  // Generate all commit types
  const mishnaCommits = generateMishnaCommits(chapters);
  const bavliCommits = generateBavliCommits(chapters);
  const yerushalmiCommits = generateYerushalmiCommits(chapters);
  const rashiCommits = generateRashiCommits(chapters);
  const tosafotCommits = generateTosafotCommits(chapters);

  const allCommits = [
    ...mishnaCommits,
    ...bavliCommits,
    ...yerushalmiCommits,
    ...rashiCommits,
    ...tosafotCommits,
  ].sort((a, b) => a.timestamp - b.timestamp);

  // Generate diffs
  const diffs = generateDiffs(chapters);

  // Write outputs
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'commits.json'),
    JSON.stringify(allCommits, null, 2)
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'diffs.json'),
    JSON.stringify(diffs, null, 2)
  );

  // Summary stats
  const stats = {
    generated_at: new Date().toISOString(),
    tractate: 'Berakhot',
    total_commits: allCommits.length,
    by_branch: {
      main: mishnaCommits.length,
      bavli: bavliCommits.length,
      yerushalmi: yerushalmiCommits.length,
      'rashi-commentary': rashiCommits.length,
      'tosafot-commentary': tosafotCommits.length,
    },
    total_diffs: diffs.length,
    unique_authors: [...new Set(allCommits.map(c => c.author_id))].length,
    year_range: {
      earliest: Math.min(...allCommits.map(c => c.year_ce)),
      latest: Math.max(...allCommits.map(c => c.year_ce)),
    }
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'stats.json'),
    JSON.stringify(stats, null, 2)
  );

  console.log('✓ Generated commits.json');
  console.log('✓ Generated diffs.json');
  console.log('✓ Generated stats.json');
  console.log('\nSummary:');
  console.log(JSON.stringify(stats, null, 2));
}

main();
