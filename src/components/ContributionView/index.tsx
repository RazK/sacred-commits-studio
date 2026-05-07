import { useState, useEffect } from 'react';
import {
  Author, Branch, ChapterData, Commentary,
  authorById, branchById, branches,
  flatten, loadChapter, sefariaAvailable,
  bavliAmoraForChapter, yerushalmiAmoraForChapter,
  TOTAL_CHAPTERS,
} from '../../api/sefaria';

// ─── Layer model ──────────────────────────────────────────────────────────────

interface Layer {
  branchId: string;
  author: Author;
  label: string;
  textEn: string;
  textHe: string;
  sefariaUrl: string;
}

const ERAS = ['Tannaim', 'Amoraim', 'Rishonim'] as const;
const PREVIEW_CHARS = 600;

// ─── Build layers from a chapter's Sefaria data ───────────────────────────────

function buildLayers(ch: ChapterData, chapter: number): Layer[] {
  const rabbi    = authorById['rabbi-yehuda-hanasi'];
  const rashi    = authorById['rashi'];
  const tosafot  = authorById['tosafot'];
  const bavliA   = bavliAmoraForChapter(chapter, TOTAL_CHAPTERS);
  const yerushalmiA = yerushalmiAmoraForChapter(chapter);

  const findCommentary = (title: string): Commentary | undefined =>
    ch.bavli?.commentary?.find(c => c.collectiveTitle?.en === title);

  const gemara  = findCommentary('Gemara');
  const rashiC  = findCommentary('Rashi');
  const tosafotC = findCommentary('Tosafot');

  const candidates: (Layer | null)[] = [
    {
      branchId: 'main',
      author: rabbi,
      label: 'Mishna',
      textEn: flatten(ch.bavli?.text),
      textHe: flatten(ch.bavli?.he),
      sefariaUrl: `https://www.sefaria.org/Berakhot.${chapter}`,
    },
    gemara ? {
      branchId: 'bavli',
      author: bavliA,
      label: 'Babylonian Talmud (Bavli) — Gemara',
      textEn: flatten(gemara.text),
      textHe: flatten(gemara.he),
      sefariaUrl: `https://www.sefaria.org/Berakhot.${chapter}`,
    } : null,
    ch.yerushalmi ? {
      branchId: 'yerushalmi',
      author: yerushalmiA,
      label: 'Jerusalem Talmud (Yerushalmi)',
      textEn: flatten(ch.yerushalmi.text),
      textHe: flatten(ch.yerushalmi.he),
      sefariaUrl: `https://www.sefaria.org/Jerusalem_Talmud_Berakhot.${chapter}`,
    } : null,
    rashiC ? {
      branchId: 'rashi-commentary',
      author: rashi,
      label: 'Rashi Commentary',
      textEn: flatten(rashiC.text),
      textHe: flatten(rashiC.he),
      sefariaUrl: `https://www.sefaria.org/Rashi_on_Berakhot.${chapter}`,
    } : null,
    tosafotC ? {
      branchId: 'tosafot-commentary',
      author: tosafot,
      label: 'Tosafot',
      textEn: flatten(tosafotC.text),
      textHe: flatten(tosafotC.he),
      sefariaUrl: `https://www.sefaria.org/Tosafot_on_Berakhot.${chapter}`,
    } : null,
  ];

  return candidates.filter((l): l is Layer => l !== null);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContributionView() {
  const [chapter, setChapter]       = useState(1);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [activeEras, setActiveEras] = useState<Set<string>>(new Set(ERAS));
  const [activeBranches, setActiveBranches] = useState<Set<string>>(
    new Set(branches.map(b => b.id))
  );

  useEffect(() => {
    setLoading(true);
    setChapterData(null);
    loadChapter(chapter).then(data => {
      setChapterData(data);
      setLoading(false);
    });
  }, [chapter]);

  const layers = chapterData ? buildLayers(chapterData, chapter) : [];
  const visibleLayers = layers.filter(
    l => activeEras.has(l.author.era) && activeBranches.has(l.branchId)
  );

  function toggleEra(era: string) {
    setActiveEras(prev => {
      const next = new Set(prev);
      next.has(era) ? next.delete(era) : next.add(era);
      return next;
    });
  }

  function toggleBranch(id: string) {
    setActiveBranches(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="mx-auto max-w-5xl flex items-baseline justify-between">
          <div>
            <h1 className="font-mono text-lg font-semibold text-gray-900">
              sacred-commits
              <span className="text-gray-400 font-normal"> / Tractate Berakhot</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              1,300 years of scholarship — visualized as Git blame
            </p>
          </div>
          <div className="text-xs text-gray-400 font-mono">
            {layers.length} layer{layers.length !== 1 ? 's' : ''} · Ch. {chapter} of {TOTAL_CHAPTERS}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 space-y-6">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">
              Chapter
            </h2>
            <div className="space-y-0.5">
              {Array.from({ length: TOTAL_CHAPTERS }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setChapter(n)}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm font-mono transition-colors ${
                    chapter === n
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Chapter {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">
              Era
            </h2>
            <div className="space-y-1.5">
              {ERAS.map(era => (
                <label key={era} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeEras.has(era)}
                    onChange={() => toggleEra(era)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-0"
                  />
                  <span className="text-sm text-gray-700">{era}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">
              Tradition
            </h2>
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
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    {b.display_name.split(' (')[0]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">
              Git metaphor
            </h2>
            <ul className="space-y-1 text-xs text-gray-500">
              <li><span className="font-mono">commit</span> = scholarly contribution</li>
              <li><span className="font-mono">branch</span> = textual tradition</li>
              <li><span className="font-mono">author</span> = historical rabbi</li>
              <li><span className="font-mono">diff</span> = Bavli vs. Yerushalmi</li>
            </ul>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {!sefariaAvailable ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
              <p className="font-mono font-semibold mb-1">No text data found</p>
              <p>
                Run <code className="bg-amber-100 px-1 rounded font-mono">npm run fetch</code>{' '}
                to pull Talmudic text from the Sefaria API, then restart the dev server.
              </p>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-lg border border-gray-200 bg-white h-40 animate-pulse" />
              ))}
            </div>
          ) : visibleLayers.length === 0 ? (
            <p className="text-sm text-gray-400 font-mono">
              No layers match current filters.
            </p>
          ) : (
            <div className="space-y-4">
              {visibleLayers.map(layer => (
                <LayerCard
                  key={layer.branchId}
                  layer={layer}
                  branch={branchById[layer.branchId]}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Layer card ───────────────────────────────────────────────────────────────

function LayerCard({ layer, branch }: { layer: Layer; branch: Branch }) {
  const [expanded, setExpanded]   = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { author } = layer;

  const enPreview = expanded ? layer.textEn : layer.textEn.slice(0, PREVIEW_CHARS);
  const hePreview = expanded ? layer.textHe : layer.textHe.slice(0, PREVIEW_CHARS);
  const truncated = layer.textEn.length > PREVIEW_CHARS || layer.textHe.length > PREVIEW_CHARS;

  return (
    <article
      className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: branch.color }}
    >
      <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-start gap-3">
          <div
            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
            style={{ backgroundColor: author.color }}
          />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
              {layer.label}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <button
                className="font-semibold text-sm text-gray-900 hover:underline underline-offset-2"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                type="button"
              >
                {author.name}
              </button>
              {author.hebrew && (
                <span dir="rtl" className="text-gray-500 text-xs">{author.hebrew}</span>
              )}
              <span className="text-gray-300">·</span>
              <span className="text-gray-500 text-xs">{author.active_years[0]} CE</span>
              <span className="text-gray-300">·</span>
              <span className="text-gray-500 text-xs">{author.location}</span>
            </div>
          </div>
        </div>
        <a
          href={layer.sefariaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-700 mt-1 flex-shrink-0"
        >
          Sefaria ↗
        </a>
      </div>

      {showTooltip && <AuthorTooltip author={author} branch={branch} />}

      <div className="px-5 py-4 space-y-3">
        {layer.textHe && (
          <p dir="rtl" className="text-gray-700 leading-loose text-sm font-serif">
            {hePreview}{!expanded && truncated ? '…' : ''}
          </p>
        )}
        {layer.textEn && (
          <p className="text-gray-600 leading-relaxed text-sm">
            {enPreview}{!expanded && truncated ? '…' : ''}
          </p>
        )}
        {!layer.textEn && !layer.textHe && (
          <p className="text-gray-400 text-sm italic">Text not available for this layer.</p>
        )}
        {truncated && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-blue-500 hover:text-blue-700"
            type="button"
          >
            {expanded ? 'Show less' : 'Show full text'}
          </button>
        )}
      </div>

      <div className="px-5 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded"
          style={{ backgroundColor: branch.color + '22', color: branch.color }}
        >
          {branch.name}
        </span>
        <span className="font-mono text-[10px] text-gray-400">{author.era}</span>
        <span className="font-mono text-[10px] text-gray-400">
          {author.born}–{author.died} CE
        </span>
      </div>
    </article>
  );
}

// ─── Author tooltip ───────────────────────────────────────────────────────────

function AuthorTooltip({ author, branch }: { author: Author; branch: Branch }) {
  return (
    <div className="mx-5 mb-2 rounded-md border border-gray-200 bg-white p-3 text-xs shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: author.color }}
        />
        <span className="font-semibold text-gray-900">{author.name}</span>
        {author.hebrew && (
          <span dir="rtl" className="text-gray-500">{author.hebrew}</span>
        )}
      </div>
      <table className="w-full mb-2 text-gray-600">
        <tbody>
          <tr>
            <td className="text-gray-400 pr-3 py-0.5">Role</td>
            <td>{author.role}</td>
          </tr>
          <tr>
            <td className="text-gray-400 pr-3 py-0.5">Era</td>
            <td>{author.era}</td>
          </tr>
          <tr>
            <td className="text-gray-400 pr-3 py-0.5">Active</td>
            <td>{author.active_years[0]}–{author.active_years[1]} CE</td>
          </tr>
          <tr>
            <td className="text-gray-400 pr-3 py-0.5">Location</td>
            <td>{author.location}</td>
          </tr>
          <tr>
            <td className="text-gray-400 pr-3 py-0.5">Tradition</td>
            <td>
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: branch.color }}
                />
                {branch.display_name}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-gray-600 leading-relaxed">{author.bio}</p>
    </div>
  );
}
