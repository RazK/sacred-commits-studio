import authorsRaw from '../../data/mock-repo/authors.json';
import branchesRaw from '../../data/mock-repo/branches.json';

// ─── Domain types ─────────────────────────────────────────────────────────────

export type Era = 'Tannaim' | 'Amoraim' | 'Rishonim';
export type BranchStatus = 'root' | 'active' | 'annotation-layer';

export interface Author {
  id: string;
  git_username: string;
  name: string;
  hebrew: string;
  era: Era;
  generation: number | null;
  born: number;
  died: number;
  active_years: [number, number];
  location: string;
  coordinates: [number, number];
  role: string;
  bio: string;
  color: string;
}

export interface Branch {
  id: string;
  name: string;
  display_name: string;
  description: string;
  diverged_from: string | null;
  divergence_year: number | null;
  color: string;
  status: BranchStatus;
}

// Sefaria text fields are deeply nested — any array shape is valid
export type SefariaText = string | (string | string[])[];

export interface Commentary {
  collectiveTitle?: { en?: string; he?: string };
  he_title?: string;
  text: SefariaText;
  he: SefariaText;
}

export interface ChapterData {
  ref: string;
  chapter: number;
  bavli: {
    text: SefariaText;
    he: SefariaText;
    commentary?: Commentary[];
  } | null;
  yerushalmi: {
    text: SefariaText;
    he: SefariaText;
  } | null;
}

// ─── Author / Branch lookup tables ───────────────────────────────────────────

export const allAuthors: Author[] = [
  ...authorsRaw.tannaim,
  ...authorsRaw.amoraim,
  ...authorsRaw.rishonim,
] as unknown as Author[];

export const authorById: Record<string, Author> = Object.fromEntries(
  allAuthors.map(a => [a.id, a])
);

export const branches: Branch[] = branchesRaw.branches as Branch[];

export const branchById: Record<string, Branch> = Object.fromEntries(
  branches.map(b => [b.id, b])
);

// ─── Text utilities ───────────────────────────────────────────────────────────

/** Recursively flatten Sefaria's nested text arrays and strip HTML tags. */
export function flatten(t: SefariaText | null | undefined): string {
  if (!t) return '';
  if (typeof t === 'string') return t.replace(/<[^>]*>/g, '').trim();
  return (t as (string | string[])[])
    .flatMap(item => (Array.isArray(item) ? item : [item]))
    .map(s => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim() : ''))
    .filter(Boolean)
    .join('\n\n');
}

// ─── Sefaria chapter cache ────────────────────────────────────────────────────

// Lazily import cached Sefaria chapter files populated by `npm run fetch`.
// Returns an empty object if the fetch hasn't been run yet.
const sefariaModules = import.meta.glob<{ default: ChapterData }>(
  '../../data/sefaria/berakhot-ch*.json'
);

export const sefariaAvailable = Object.keys(sefariaModules).length > 0;
export const TOTAL_CHAPTERS = sefariaAvailable
  ? Object.keys(sefariaModules).length
  : 9;

export async function loadChapter(n: number): Promise<ChapterData | null> {
  const key = `../../data/sefaria/berakhot-ch${n}.json`;
  if (!(key in sefariaModules)) return null;
  const mod = await sefariaModules[key]();
  return mod.default;
}

// ─── Author assignment (mirrors generate-repo.js logic) ──────────────────────

function isBavliLocation(loc: string): boolean {
  const l = loc.toLowerCase();
  return (
    l.includes('babylonia') ||
    l.includes('sura') ||
    l.includes('pumbedita') ||
    l.includes('nehardea') ||
    l.includes('mahoza')
  );
}

export function bavliAmoraForChapter(chapter: number, total: number): Author {
  const pool = authorsRaw.amoraim
    .filter(a => isBavliLocation(a.location))
    .sort((a, b) => ((a.generation ?? 99) - (b.generation ?? 99))) as unknown as Author[];
  const idx = Math.floor(((chapter - 1) * pool.length) / total);
  return pool[idx % pool.length];
}

export function yerushalmiAmoraForChapter(chapter: number): Author {
  const pool = authorsRaw.amoraim
    .filter(a => !isBavliLocation(a.location))
    .sort((a, b) => (a.generation ?? 99) - (b.generation ?? 99)) as unknown as Author[];
  return pool[chapter % pool.length];
}

// ─── Chapter metadata ─────────────────────────────────────────────────────────

export interface ChapterMeta { he: string; en: string; slug: string }

export const CHAPTER_NAMES: Record<number, ChapterMeta> = {
  1: { he: 'מֵאֵימָתַי',        en: 'From when',             slug: 'meimatai' },
  2: { he: 'הָיָה קוֹרֵא',      en: 'One who reads',         slug: 'haya-korei' },
  3: { he: 'מִי שֶּׁמֵתוֹ',     en: 'One whose dead',        slug: 'mi-shemeto' },
  4: { he: 'תְּפִלַּת הַשַּׁחַר', en: 'Morning prayer',        slug: 'tefilat-hashachar' },
  5: { he: 'אֵין עוֹמְדִין',     en: 'One may not stand',     slug: 'ein-omdin' },
  6: { he: 'כֵּיצַד מְבָרְכִין', en: 'How one blesses',       slug: 'keitzad-mevarkhim' },
  7: { he: 'שְּּלֹשָׁה שֶּׁאָכְלוּ', en: 'Three who ate',        slug: 'shlosha-sheakhlu' },
  8: { he: 'אֵלּוּ דְבָרִים',    en: 'These are the matters', slug: 'elu-devarim' },
  9: { he: 'הָרוֹאֶה',           en: 'One who sees',          slug: 'haroeh' },
};
