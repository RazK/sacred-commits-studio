import { useMemo, useState } from 'react';
import {
  Branch,
  authorById, branchById, branches,
  bavliAmoraForChapter, yerushalmiAmoraForChapter,
  TOTAL_CHAPTERS, CHAPTER_NAMES,
} from '../../api/sefaria';
import type { AppView, Lang } from '../../App';
import { AppShell } from '../AppShell';

// ─── Commit model ─────────────────────────────────────────────────────────────

interface Commit {
  id: string;
  hash: string;
  chapter: number;
  branchId: string;
  branch: Branch;
  authorName: string;
  authorLocation: string;
  authorEra: string;
  year: number;
  message: string;
  isHead: boolean;
}

function fakeHash(chapter: number, branchId: string): string {
  let h = (chapter * 0x9e3779b9) ^ (branchId.charCodeAt(0) * 0x6c62272e);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return ((h >>> 0) + 0x10000000).toString(16).slice(-7);
}

function buildCommits(): Commit[] {
  const rabbi   = authorById['rabbi-yehuda-hanasi'];
  const rashi   = authorById['rashi'];
  const tosafot = authorById['tosafot'];

  const list: Commit[] = [];

  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    const meta   = CHAPTER_NAMES[ch];
    const suffix = meta ? `: ${meta.he}` : '';
    const bavliA = bavliAmoraForChapter(ch, TOTAL_CHAPTERS);
    const yerusA = yerushalmiAmoraForChapter(ch);

    list.push(
      {
        id: `tosafot-${ch}`,
        hash: fakeHash(ch, 'tosafot-commentary'),
        chapter: ch, branchId: 'tosafot-commentary',
        branch: branchById['tosafot-commentary'],
        authorName: tosafot.name, authorLocation: tosafot.location, authorEra: tosafot.era,
        year: tosafot.active_years[0] + (ch - 1) * 10,
        message: `Add Tosafot critical notes Ch.${ch}${suffix}`,
        isHead: false,
      },
      {
        id: `rashi-${ch}`,
        hash: fakeHash(ch, 'rashi-commentary'),
        chapter: ch, branchId: 'rashi-commentary',
        branch: branchById['rashi-commentary'],
        authorName: rashi.name, authorLocation: rashi.location, authorEra: rashi.era,
        year: rashi.active_years[0] + (ch - 1) * 2,
        message: `Add Rashi commentary Ch.${ch}${suffix}`,
        isHead: false,
      },
      {
        id: `bavli-${ch}`,
        hash: fakeHash(ch, 'bavli'),
        chapter: ch, branchId: 'bavli',
        branch: branchById['bavli'],
        authorName: bavliA.name, authorLocation: bavliA.location, authorEra: bavliA.era,
        year: bavliA.active_years[0],
        message: `Add Gemara discussion Ch.${ch}${suffix}`,
        isHead: false,
      },
      {
        id: `yerushalmi-${ch}`,
        hash: fakeHash(ch, 'yerushalmi'),
        chapter: ch, branchId: 'yerushalmi',
        branch: branchById['yerushalmi'],
        authorName: yerusA.name, authorLocation: yerusA.location, authorEra: yerusA.era,
        year: yerusA.active_years[0],
        message: `Add Yerushalmi Gemara Ch.${ch}${suffix}`,
        isHead: false,
      },
      {
        id: `main-${ch}`,
        hash: fakeHash(ch, 'main'),
        chapter: ch, branchId: 'main',
        branch: branchById['main'],
        authorName: rabbi.name, authorLocation: rabbi.location, authorEra: rabbi.era,
        year: rabbi.active_years[0] + (ch - 1) * 2,
        message: `Add Mishna Ch.${ch}${suffix}`,
        isHead: false,
      },
    );
  }

  list.sort((a, b) => b.year - a.year || a.chapter - b.chapter);
  if (list.length > 0) list[0].isHead = true;
  return list;
}

// ─── Commit row ──────────────────────────────────────────────────────────────

function CommitRow({ commit }: { commit: Commit }) {
  const { branch } = commit;
  return (
    <div className="flex items-stretch group hover:bg-white/80 transition-colors rounded-sm">
      <div className="flex flex-col items-center w-5 flex-shrink-0">
        <div className="mt-2.5 w-2.5 h-2.5 rounded-full z-10 flex-shrink-0" style={{ backgroundColor: branch.color }} />
        <div className="flex-1 w-px mt-0.5" style={{ backgroundColor: branch.color + '40' }} />
      </div>
      <div className="flex-1 min-w-0 py-2 pl-2 pr-3">
        <div className="flex items-baseline gap-1.5 flex-wrap leading-snug">
          <span className="font-mono text-[11px] text-gray-400 select-all">{commit.hash}</span>
          {commit.isHead && (
            <span className="font-mono text-[9px] px-1 py-0.5 rounded border bg-blue-50 border-blue-200 text-blue-600">HEAD</span>
          )}
          <span className="font-mono text-[9px] px-1 py-0.5 rounded"
                style={{ backgroundColor: branch.color + '22', color: branch.color }}>
            {branch.name}
          </span>
          <span className="text-sm text-gray-800 min-w-0">{commit.message}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
          <span className="text-xs text-gray-600 font-medium">{commit.authorName}</span>
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-xs text-gray-400 hidden sm:inline">{commit.authorLocation}</span>
          <span className="text-gray-300 text-xs hidden sm:inline">·</span>
          <span className="font-mono text-[11px] text-gray-400">{commit.year} CE</span>
        </div>
      </div>
    </div>
  );
}

function EraDivider({ era, span }: { era: string; span: string }) {
  return (
    <div className="flex items-center gap-2 py-2 px-1">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400 whitespace-nowrap">
        {era} · {span}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ─── Main LogView ─────────────────────────────────────────────────────────────

const ERA_SPANS: Record<string, string> = {
  Rishonim: '1000–1500 CE',
  Amoraim:  '200–500 CE',
  Tannaim:  '10–200 CE',
};

export default function LogView({
  activeView, onViewChange, lang, onLangChange,
}: {
  activeView: AppView; onViewChange: (v: AppView) => void;
  lang: Lang; onLangChange: (l: Lang) => void;
}) {
  const [activeBranches, setActiveBranches] = useState<Set<string>>(
    new Set(branches.map(b => b.id))
  );

  const allCommits = useMemo(() => buildCommits(), []);
  const visible    = allCommits.filter(c => activeBranches.has(c.branchId));

  function toggleBranch(id: string) {
    setActiveBranches(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  type Row = { type: 'commit'; commit: Commit } | { type: 'era'; era: string; span: string };
  const rows: Row[] = [];
  let lastEra: string | null = null;
  for (const c of visible) {
    if (c.authorEra !== lastEra) {
      rows.push({ type: 'era', era: c.authorEra, span: ERA_SPANS[c.authorEra] ?? '' });
      lastEra = c.authorEra;
    }
    rows.push({ type: 'commit', commit: c });
  }

  const span = visible.length > 0
    ? `${visible[visible.length - 1].year}–${visible[0].year} CE`
    : '';

  const sidebar = (
    <>
      <div>
        <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">Branch</h2>
        <div className="space-y-1.5">
          {branches.map(b => (
            <label key={b.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeBranches.has(b.id)}
                onChange={() => toggleBranch(b.id)}
                className="rounded border-gray-300 focus:ring-0"
                style={{ accentColor: b.color }}
              />
              <span className="flex items-center gap-1.5 text-sm text-gray-700">
                <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                {b.display_name.split(' (')[0]}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-6 hidden md:block">
        <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">Era</h2>
        <ul className="space-y-1 text-xs text-gray-500">
          {Object.entries(ERA_SPANS).map(([era, span]) => (
            <li key={era} className="flex items-center gap-2">
              <span className="font-mono">{era}</span>
              <span className="text-gray-300">·</span>
              <span>{span}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  return (
    <AppShell
      activeView={activeView}
      onViewChange={onViewChange}
      lang={lang}
      onLangChange={onLangChange}
      subtitle={`${visible.length} commits · ${span}`}
      sidebar={sidebar}
    >
      <div className="font-mono text-xs text-gray-400 mb-3 select-none">
        $ git log --all --oneline --graph
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50/80 overflow-hidden">
        {visible.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 font-mono text-center">No commits match current filters.</p>
        ) : (
          <div className="px-2 py-1">
            {rows.map((row, i) =>
              row.type === 'era'
                ? <EraDivider key={`era-${i}`} era={row.era} span={row.span} />
                : <CommitRow key={row.commit.id} commit={row.commit} />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
