#!/usr/bin/env node
/**
 * generate-repo.js
 *
 * Generates a real Git repository at a configurable output path.
 *
 * Each commit is authored by a historical rabbi using git --author and --date.
 * Branches mirror the actual textual traditions:
 *   main               ← Mishna (~200 CE, Rabbi Yehuda HaNasi)
 *   bavli              ← Babylonian Talmud (~220–500 CE), diverges from main
 *   yerushalmi         ← Jerusalem Talmud (~220–400 CE), diverges from main
 *   rashi-commentary   ← Rashi's glosses (~1080 CE), diverges from bavli
 *   tosafot-commentary ← Tosafist notes (~1150–1300 CE), diverges from rashi-commentary
 *
 * Talmudic text is read from data/sefaria/ (run `npm run fetch` first).
 * Without cached Sefaria data the repo is still generated with stub placeholders.
 *
 * Usage:
 *   node scripts/generate-repo.js [output-path]
 *   OUTPUT_PATH=/path/to/repo node scripts/generate-repo.js
 *
 * Default output: ../sacred-commits-product  (sibling of this studio repo)
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────────────────

const OUTPUT_PATH = path.resolve(
  process.argv[2] ||
  process.env.OUTPUT_PATH ||
  path.join(__dirname, '../sacred-commits-product')
);

const SEFARIA_DIR = path.join(__dirname, '../data/sefaria');
const DATA_DIR    = path.join(__dirname, '../data/mock-repo');

// ─── Load hand-curated definitions ─────────────────────────────────────────────────────

const AUTHORS_DATA  = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'authors.json'),  'utf8'));
const BRANCHES_DATA = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'branches.json'), 'utf8'));

const allAuthors = [
  ...AUTHORS_DATA.tannaim,
  ...AUTHORS_DATA.amoraim,
  ...AUTHORS_DATA.rishonim,
];
const authorById = Object.fromEntries(allAuthors.map(a => [a.id, a]));

// ─── Git helpers ──────────────────────────────────────────────────────────────────────────────

function git(args, extraEnv = {}) {
  const result = spawnSync('git', args, {
    cwd: OUTPUT_PATH,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    const msg = (result.stderr || result.stdout || '').trim();
    throw new Error(`git ${args.join(' ')} failed:\n${msg}`);
  }
  return result.stdout.trim();
}

/**
 * Convert a historical year (CE) to a git date string.
 * Maps year → year × 31,536,000 Unix seconds so commits are always chronologically
 * ordered and git never has to deal with pre-epoch negative timestamps.
 * Dates in git log will appear as proportionally-scaled future years (200 CE → ~2169);
 * the real historical year is always in the commit message.
 */
function yearToGitDate(year) {
  const unix = year * 31536000;
  return `@${unix} +0000`;
}

/** Return the email domain for a rabbi based on era and location. */
function emailDomain(author) {
  if (author.era === 'Tannaim') return 'tannaim.il';
  if (author.era === 'Amoraim') {
    const loc = author.location.toLowerCase();
    return (
      loc.includes('babylonia') ||
      loc.includes('sura')      ||
      loc.includes('pumbedita') ||
      loc.includes('nehardea')  ||
      loc.includes('mahoza')
    ) ? 'bavli.babylonia' : 'yerushalmi.il';
  }
  // Rishonim
  const loc = author.location.toLowerCase();
  if (loc.includes('france') || loc.includes('troyes'))                    return 'rishonim.fr';
  if (loc.includes('spain')  || loc.includes('córdoba') || loc.includes('girona')) return 'rishonim.es';
  if (loc.includes('egypt'))                                                return 'rishonim.eg';
  return 'rishonim.eu';
}

/**
 * Stage all changes and create a commit attributed to a historical rabbi.
 * Uses --author and --date flags plus GIT_COMMITTER_* env vars so both
 * author and committer reflect the historical date.
 */
function makeCommit(message, author, year) {
  const isoDate   = yearToGitDate(year);
  const email     = `${author.git_username}@${emailDomain(author)}`;
  const authorStr = `${author.name} <${email}>`;

  git(['add', '-A']);
  git(
    ['commit', `--author=${authorStr}`, `--date=${isoDate}`, '-m', message],
    {
      GIT_COMMITTER_NAME:  author.name,
      GIT_COMMITTER_EMAIL: email,
      GIT_COMMITTER_DATE:  isoDate,
    }
  );
}

// ─── File helper ────────────────────────────────────────────────────────────────────────────

function write(relPath, content) {
  const fullPath = path.join(OUTPUT_PATH, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

// ─── Markdown formatters ─────────────────────────────────────────────────────────────────────────

/** Flatten Sefaria's nested text arrays to a plain string, stripping HTML tags. */
function flatten(t) {
  if (!t) return '';
  if (typeof t === 'string') return t.replace(/<[^>]*>/g, '').trim();
  if (Array.isArray(t)) return t.map(flatten).filter(Boolean).join('\n\n');
  return '';
}

function mishnaDoc(n, ch) {
  const he = flatten(ch.bavli?.he);
  const en = flatten(ch.bavli?.text);
  return `# Mishna Berakhot ${n}\n\n> *Compiled by Rabbi Yehuda HaNasi — Beit She'arim, Land of Israel, ~200 CE*\n> *Tractate Berakhot, Chapter ${n}*\n\n---\n\n## Hebrew (עברית)\n\n${he || "*Text not available — run `npm run fetch` to populate Sefaria cache*"}\n\n---\n\n## English\n\n${en || '*Translation not available*'}\n\n---\n\n*Source: [Sefaria — Berakhot ${n}](https://www.sefaria.org/Berakhot.${n})*\n`;
}

function gemaraDoc(n, ch, tradition) {
  const isBavli = tradition === 'bavli';
  const data    = isBavli ? ch.bavli : ch.yerushalmi;
  const he      = flatten(data?.he);
  const en      = flatten(data?.text);
  const label   = isBavli
    ? 'Babylonian Talmud (Bavli)'
    : 'Jerusalem Talmud (Yerushalmi)';
  const url = isBavli
    ? `https://www.sefaria.org/Berakhot.${n}`
    : `https://www.sefaria.org/Jerusalem_Talmud_Berakhot.${n}`;

  return `# Gemara — ${label}, Berakhot ${n}\n\n---\n\n## Hebrew / Aramaic\n\n${he || '*Text not available*'}\n\n---\n\n## English\n\n${en || '*Translation not available*'}\n\n---\n\n*Source: [Sefaria](${url})*\n`;
}

function rashiDoc(n, ch) {
  const commentary = ch.bavli?.commentary || [];
  const entry = commentary.find(c =>
    c.collectiveTitle?.en === 'Rashi' ||
    (c.he_title && c.he_title.includes('רש'))
  );
  const he = flatten(entry?.he);
  const en = flatten(entry?.text);

  return `# Rashi on Berakhot ${n}\n\n> *Rabbi Shlomo Yitzchaki (Rashi) — Troyes, France, ~1080 CE*\n\n---\n\n## Commentary (Hebrew)\n\n${he || '*Commentary not available in Sefaria cache*'}\n\n---\n\n## Commentary (English)\n\n${en || '*Translation not available*'}\n\n---\n\n*Source: [Sefaria — Rashi on Berakhot ${n}](https://www.sefaria.org/Rashi_on_Berakhot.${n})*\n`;
}

function tosafotDoc(n) {
  return `# Tosafot on Berakhot ${n}\n\n> *The Tosafists — France and Germany, 12th–13th century CE*\n\n---\n\nTosafot's critical glosses on this chapter engage primarily with Rashi's commentary,\nraising difficulties from parallel sugyas in other tractates and resolving them.\n\n*Source: [Sefaria — Tosafot on Berakhot ${n}](https://www.sefaria.org/Tosafot_on_Berakhot.${n})*\n`;
}

function readmeDoc() {
  const branchLines = BRANCHES_DATA.branches
    .map(b => `- \`${b.name}\` — ${b.display_name}: ${b.description.split('.')[0]}.`)
    .join('\n');

  return `# Sacred Commits — Tractate Berakhot\n\n> A Git repository encoding 1,300 years of Talmudic scholarship as real Git history.\n> Each commit is authored by a historical rabbi. Each branch is a distinct textual tradition.\n\n## Branches\n\n${branchLines}\n\n## Explore\n\n\`\`\`bash\n# See the full history across all branches\ngit log --all --oneline --graph --decorate\n\n# Diff the Babylonian and Jerusalem traditions\ngit diff bavli yerushalmi -- berakhot/chapter-01-gemara-bavli.md\n\n# Find every commit by Rashi\ngit log --all --author="Rashi"\n\n# See who wrote which layer\ngit log --all --format="%an (%ae)  %ad  %s" --date=format:'%Y CE'\n\`\`\`\n\n*Generated by [Sacred Commits Studio](https://github.com/razk/sacred-commits-studio)*\n`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────────────────

function main() {
  // Load Sefaria chapter cache
  const sefFiles = fs.existsSync(SEFARIA_DIR)
    ? fs.readdirSync(SEFARIA_DIR)
        .filter(f => /^berakhot-ch\d+\.json$/.test(f))
        .sort()
    : [];

  const chapters = sefFiles.length > 0
    ? sefFiles.map(f => JSON.parse(fs.readFileSync(path.join(SEFARIA_DIR, f), 'utf8')))
    : Array.from({ length: 9 }, (_, i) => ({ chapter: i + 1, bavli: null, yerushalmi: null }));

  const dataSource = sefFiles.length > 0
    ? `Sefaria cache (${sefFiles.length} files)`
    : 'stub data — run `npm run fetch` first for real text';

  console.log(`Sacred Commits — repository generator`);
  console.log(`  Chapters : ${chapters.length} (${dataSource})`);
  console.log(`  Output   : ${OUTPUT_PATH}\n`);

  // Wipe and re-init a clean repo
  if (fs.existsSync(OUTPUT_PATH)) {
    fs.rmSync(OUTPUT_PATH, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });

  // git init — support both git ≥2.28 (-b flag) and older versions
  const initWithB = spawnSync('git', ['init', '-b', 'main'], {
    cwd: OUTPUT_PATH, encoding: 'utf8',
  });
  if (initWithB.status !== 0) {
    spawnSync('git', ['init'], { cwd: OUTPUT_PATH, encoding: 'utf8' });
    spawnSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], {
      cwd: OUTPUT_PATH, encoding: 'utf8',
    });
  }
  git(['config', 'user.email',       'generator@sacred-commits']);
  git(['config', 'user.name',        'Sacred Commits Generator']);
  git(['config', 'commit.gpgsign',   'false']);
  git(['config', 'tag.gpgsign',      'false']);

  // ── main: Mishna (Rabbi Yehuda HaNasi, ~200 CE) ───────────────────────────────────────────
  console.log('Building main (Mishna)...');
  const rabbi = authorById['rabbi-yehuda-hanasi'];

  write('README.md', readmeDoc());
  makeCommit('Initial commit: Tractate Berakhot repository', rabbi, 170);

  for (const ch of chapters) {
    const n = String(ch.chapter).padStart(2, '0');
    write(`berakhot/chapter-${n}-mishna.md`, mishnaDoc(ch.chapter, ch));
    makeCommit(`Mishna Berakhot ${ch.chapter}: compile and redact`, rabbi, 200);
    console.log(`  [main] Chapter ${ch.chapter}`);
  }

  // ── bavli: Babylonian Gemara (diverges from main at ~220 CE) ───────────────────────
  console.log('\nBuilding bavli (Babylonian Talmud)...');
  git(['checkout', '-b', 'bavli']);

  const bavliAmoraim = AUTHORS_DATA.amoraim
    .filter(a => emailDomain(a) === 'bavli.babylonia')
    .sort((a, b) => a.generation - b.generation);

  for (const ch of chapters) {
    const n    = String(ch.chapter).padStart(2, '0');
    const idx  = Math.floor((ch.chapter - 1) * bavliAmoraim.length / chapters.length);
    const amora = bavliAmoraim[idx % bavliAmoraim.length];
    write(`berakhot/chapter-${n}-gemara-bavli.md`, gemaraDoc(ch.chapter, ch, 'bavli'));
    makeCommit(
      `[Bavli Berakhot ${ch.chapter}] ${amora.name}: Gemara discussion`,
      amora,
      amora.active_years[0] + 10
    );
    console.log(`  [bavli] Chapter ${ch.chapter} — ${amora.name}`);
  }

  // ── yerushalmi: Jerusalem Gemara (diverges from main at ~220 CE) ──────────────────────
  console.log('\nBuilding yerushalmi (Jerusalem Talmud)...');
  git(['checkout', 'main']);
  git(['checkout', '-b', 'yerushalmi']);

  const israeliAmoraim = AUTHORS_DATA.amoraim
    .filter(a => emailDomain(a) === 'yerushalmi.il')
    .sort((a, b) => a.generation - b.generation);

  for (const ch of chapters) {
    // Yerushalmi has fewer tractates covered — skip chapters with no data
    if (!ch.yerushalmi && sefFiles.length > 0) {
      console.log(`  [yerushalmi] Chapter ${ch.chapter} — no data, skipping`);
      continue;
    }
    const n     = String(ch.chapter).padStart(2, '0');
    const amora = israeliAmoraim[ch.chapter % israeliAmoraim.length];
    write(`berakhot/chapter-${n}-gemara-yerushalmi.md`, gemaraDoc(ch.chapter, ch, 'yerushalmi'));
    makeCommit(
      `[Yerushalmi Berakhot ${ch.chapter}] ${amora.name}: Palestinian Gemara tradition`,
      amora,
      amora.active_years[0] + 5
    );
    console.log(`  [yerushalmi] Chapter ${ch.chapter} — ${amora.name}`);
  }

  // ── rashi-commentary: Rashi's glosses (diverges from bavli at ~1060 CE) ─────────────────
  console.log('\nBuilding rashi-commentary...');
  git(['checkout', 'bavli']);
  git(['checkout', '-b', 'rashi-commentary']);

  const rashi = authorById['rashi'];
  for (const ch of chapters) {
    const n = String(ch.chapter).padStart(2, '0');
    write(`berakhot/chapter-${n}-rashi.md`, rashiDoc(ch.chapter, ch));
    makeCommit(
      `[Rashi] Berakhot ${ch.chapter}: commentary and clarification`,
      rashi,
      1060 + ch.chapter
    );
    console.log(`  [rashi-commentary] Chapter ${ch.chapter}`);
  }

  // ── tosafot-commentary: Tosafist glosses (diverges from rashi-commentary) ────────────────
  console.log('\nBuilding tosafot-commentary...');
  git(['checkout', '-b', 'tosafot-commentary']);

  const tosafot = authorById['tosafot'];
  for (const ch of chapters) {
    const n = String(ch.chapter).padStart(2, '0');
    write(`berakhot/chapter-${n}-tosafot.md`, tosafotDoc(ch.chapter));
    makeCommit(
      `[Tosafot] Berakhot ${ch.chapter}: critical glosses on Rashi`,
      tosafot,
      1150 + ch.chapter * 5
    );
    console.log(`  [tosafot-commentary] Chapter ${ch.chapter}`);
  }

  // Leave HEAD on main
  git(['checkout', 'main']);

  // ── Summary ─────────────────────────────────────────────────────────────────────────────
  console.log('\n✓ Sacred Commits repository generated!\n');
  console.log(`  Location : ${OUTPUT_PATH}`);
  console.log('\n  Branch overview:');
  const branches = git(['branch', '--all']);
  branches.split('\n').forEach(b => console.log(`    ${b}`));
  console.log('\n  Try:');
  console.log(`    cd ${OUTPUT_PATH}`);
  console.log('    git log --all --oneline --graph --decorate');
  console.log('    git diff bavli yerushalmi');
  console.log('    git log --all --author="Rashi"');
}

main();
