import { useState, useEffect, useMemo } from 'react';
import {
  Author, Branch, ChapterData, SefariaText,
  branchById, flatten, loadChapter, sefariaAvailable,
  bavliAmoraForChapter, yerushalmiAmoraForChapter,
  TOTAL_CHAPTERS,
} from '../../api/sefaria';
import type { AppView, Lang } from '../../App';
import { AppShell } from '../AppShell';
import { FilePathHeader } from '../FilePathHeader';

// ─── Word-level diff ─────────────────────────────────────────────────────────────

type DiffType = 'equal' | 'insert' | 'delete';
interface Seg { type: DiffType; text: string }

function tokenize(s: string): string[] {
  return s.match(/\S+|\s+/g) ?? [];
}

function hasNikud(s: string): boolean {
  return /[ְ-ׇ]/.test(s);
}

function stripNikud(s: string): string {
  return s.replace(/[֑-ׇ]/g, '');
}

function tokensEqual(a: string, b: string): boolean {
  if (a === b) return true;
  if (hasNikud(a) && hasNikud(b)) return false;
  return stripNikud(a) === stripNikud(b);
}

function wordDiff(left: string, right: string): { leftSegs: Seg[]; rightSegs: Seg[] } {
  const a = tokenize(left);
  const b = tokenize(right);
  const m = a.length, n = b.length;

  if (m * n > 2_000_000) {
    return {
      leftSegs:  [{ type: 'equal', text: left }],
      rightSegs: [{ type: 'equal', text: right }],
    };
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = tokensEqual(a[i-1], b[j-1])
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);

  const segs: Seg[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensEqual(a[i-1], b[j-1])) {
      segs.unshift({ type: 'equal', text: a[i-1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      segs.unshift({ type: 'insert', text: b[j-1] }); j--;
    } else {
      segs.unshift({ type: 'delete', text: a[i-1] }); i--;
    }
  }

  return {
    leftSegs:  segs.filter(s => s.type !== 'insert'),
    rightSegs: segs.filter(s => s.type !== 'delete'),
  };
}

// ─── Paragraph-pair diff ─────────────────────────────────────────────────────

interface ParaPair { leftSegs: Seg[]; rightSegs: Seg[]; leftText: string; rightText: string }

function buildPairs(leftFull: string, rightFull: string): ParaPair[] {
  const lefts  = leftFull.split('\n\n').filter(Boolean);
  const rights = rightFull.split('\n\n').filter(Boolean);
  const len    = Math.max(lefts.length, rights.length);
  return Array.from({ length: len }, (_, i) => {
    const l = lefts[i] ?? '';
    const r = rights[i] ?? '';
    const { leftSegs, rightSegs } = wordDiff(l, r);
    return { leftText: l, rightText: r, leftSegs, rightSegs };
  });
}

// ─── Highlighted diff text ─────────────────────────────────────────────────────

function DiffText({ segs, side }: { segs: Seg[]; side: 'left' | 'right' }) {
  return (
    <span>
      {segs.map((seg, i) => {
        if (seg.type === 'equal') return <span key={i}>{seg.text}</span>;
        if (side === 'left'  && seg.type === 'delete') return <mark key={i} className="bg-red-100 text-red-800 rounded-sm">{seg.text}</mark>;
        if (side === 'right' && seg.type === 'insert') return <mark key={i} className="bg-green-100 text-green-800 rounded-sm">{seg.text}</mark>;
        return null;
      })}
    </span>
  );
}

// ─── Branch header card ──────────────────────────────────────────────────────────

function BranchHeader({ branch, author, label, sefariaUrl }: {
  branch: Branch; author: Author; label: string; sefariaUrl: string;
}) {
  const aka = (author as Author & { aka?: string[] }).aka?.[0];
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"
         style={{ borderLeftWidth: 4, borderLeftColor: branch.color }}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-wider text-gray-400 truncate">{label}</p>
          <p className="text-sm font-semibold text-gray-800 leading-tight">{author.name}</p>
          {aka && <p className="text-[10px] text-gray-400 leading-tight">{aka}</p>}
          <p className="text-xs text-gray-500">{author.active_years[0]} CE</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="font-mono text-[9px] px-1 py-0.5 rounded whitespace-nowrap"
                style={{ backgroundColor: branch.color + '22', color: branch.color }}>
            {branch.name}
          </span>
          <a href={sefariaUrl} target="_blank" rel="noopener noreferrer"
             className="text-[10px] text-blue-500 hover:text-blue-700">↗</a>
        </div>
      </div>
    </div>
  );
}

// ─── Paragraph cell ──────────────────────────────────────────────────────────────

function ParaCell({ segs, side, rtl, empty, color }: {
  segs: Seg[]; side: 'left' | 'right'; rtl: boolean; empty: boolean; color: string;
}) {
  if (empty) return <div className="rounded border border-dashed border-gray-200 min-h-[48px] bg-gray-50/50" />;
  return (
    <div className="rounded border border-gray-100 bg-white p-3 text-sm leading-loose"
         style={{ borderLeftWidth: 2, borderLeftColor: color + '88' }}
         dir={rtl ? 'rtl' : undefined}>
      <DiffText segs={segs} side={side} />
    </div>
  );
}

// ─── Main DiffView ─────────────────────────────────────────────────────────────

export default function DiffView({
  activeView, onViewChange, lang, onLangChange,
}: {
  activeView: AppView; onViewChange: (v: AppView) => void;
  lang: Lang; onLangChange: (l: Lang) => void;
}) {
  const [chapter, setChapter]         = useState(1);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [legendOpen, setLegendOpen]   = useState(false);

  useEffect(() => {
    setLoading(true);
    setChapterData(null);
    loadChapter(chapter).then(data => {
      setChapterData(data);
      setLoading(false);
    });
  }, [chapter]);

  const bavliBranch       = branchById['bavli'];
  const yerushalamiBranch = branchById['yerushalmi'];
  const bavliAuthor       = bavliAmoraForChapter(chapter, TOTAL_CHAPTERS);
  const yerushalmiAuthor  = yerushalmiAmoraForChapter(chapter);
  const rtl               = lang === 'he';

  // Use the Bavli Gemara discussion (from commentary) vs the full Yerushalmi text.
  // This is the true apples-to-apples: both are the scholarly Talmudic analysis
  // of the same Mishna chapter. bavli.he contains the raw Mishna text but its
  // structure from the live API varies by chapter (empty arrays, cumulative content),
  // making it unreliable. The Gemara commentary is consistently structured.
  // Collapse both into one block for a single LCS diff across the full text.
  const collapse = (t: SefariaText | null | undefined) =>
    flatten(t).split('\n\n').filter(Boolean).join(' ');

  const leftText = useMemo(() => {
    if (!chapterData) return '';
    const gemara = chapterData.bavli?.commentary?.find(c => c.collectiveTitle?.en === 'Gemara');
    if (gemara) return collapse(rtl ? gemara.he : gemara.text);
    // fallback to main text if no Gemara commentary available
    return collapse(rtl ? chapterData.bavli?.he : chapterData.bavli?.text);
  }, [chapterData, rtl]);

  const rightText = useMemo(() =>
    chapterData ? collapse(rtl ? chapterData.yerushalmi?.he : chapterData.yerushalmi?.text) : '',
    [chapterData, rtl]);

  const pairs = useMemo(() =>
    leftText || rightText ? buildPairs(leftText, rightText) : [],
    [leftText, rightText]);

  const hasYerushalmi = !!chapterData?.yerushalmi;
  const deletions  = pairs.reduce((n, p) => n + p.leftSegs.filter(s => s.type === 'delete').length, 0);
  const insertions = pairs.reduce((n, p) => n + p.rightSegs.filter(s => s.type === 'insert').length, 0);

  const sidebar = (
    <>
      {/* Chapter list */}
      <div>
        <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">Chapter</h2>
        <div className="flex flex-wrap gap-1 md:flex-col md:gap-0 md:space-y-0.5">
          {Array.from({ length: TOTAL_CHAPTERS }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setChapter(n)}
              className={`px-2.5 py-1 rounded text-sm font-mono transition-colors md:w-full md:text-left md:px-3 md:py-1.5 ${
                chapter === n ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="md:hidden">{n}</span>
              <span className="hidden md:inline">Chapter {n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 md:mt-6">
        <button
          className="flex items-center w-full text-xs font-mono uppercase tracking-wider text-gray-400 md:hidden"
          onClick={() => setLegendOpen(o => !o)}
        >
          <span>Legend</span>
          <span className="ml-auto">{legendOpen ? '▲' : '▼'}</span>
        </button>
        <div className={`${legendOpen ? 'block' : 'hidden'} md:block mt-2 md:mt-0 space-y-2`}>
          <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2 hidden md:block">Legend</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-300 flex-shrink-0" />
            <span className="text-gray-600">Bavli only</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300 flex-shrink-0" />
            <span className="text-gray-600">Yerushalmi only</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-3 h-3 rounded-sm bg-white border border-gray-200 flex-shrink-0" />
            <span className="text-gray-600">Shared text</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <AppShell
      activeView={activeView}
      onViewChange={onViewChange}
      lang={lang}
      onLangChange={onLangChange}
      subtitle="Tractate Sukkah · Bavli vs. Yerushalmi — textual diff"
      sidebar={sidebar}
    >
      {!sefariaAvailable ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <p className="font-mono font-semibold mb-1">No text data found</p>
          <p>Run <code className="bg-amber-100 px-1 rounded font-mono">npm run fetch</code>{' '}
             to pull Talmudic text from the Sefaria API, then restart the dev server.</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map(i => <div key={i} className="rounded-lg border border-gray-200 bg-white h-48 animate-pulse" />)}
        </div>
      ) : !hasYerushalmi ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="font-mono text-sm text-gray-500 mb-1">No Yerushalmi for Chapter {chapter}</p>
          <p className="text-xs text-gray-400">The Jerusalem Talmud does not have a corresponding passage.</p>
        </div>
      ) : (
        <>
          {(deletions > 0 || insertions > 0) && (
            <div className="mb-3 flex items-center gap-3 font-mono text-xs text-gray-500">
              <span className="text-red-600">−{deletions} Bavli-only</span>
              <span className="text-green-600">+{insertions} Yerushalmi-only</span>
            </div>
          )}

          <FilePathHeader chapter={chapter} />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <BranchHeader branch={bavliBranch} author={bavliAuthor} label="Bavli — Gemara"
                          sefariaUrl={`https://www.sefaria.org/Sukkah.${chapter}`} />
            <BranchHeader branch={yerushalamiBranch} author={yerushalmiAuthor} label="Yerushalmi"
                          sefariaUrl={`https://www.sefaria.org/Jerusalem_Talmud_Sukkah.${chapter}`} />
          </div>

          <div className="space-y-2">
            {pairs.map((pair, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <ParaCell segs={pair.leftSegs}  side="left"  rtl={rtl} empty={!pair.leftText}  color={bavliBranch.color} />
                <ParaCell segs={pair.rightSegs} side="right" rtl={rtl} empty={!pair.rightText} color={yerushalamiBranch.color} />
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
