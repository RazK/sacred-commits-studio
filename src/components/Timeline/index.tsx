import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { allAuthors, Author } from '../../api/sefaria';
import { AppShell } from '../AppShell';
import type { AppView, Lang } from '../../App';

// ─── Layout constants ─────────────────────────────────────────────────────────

const Y_START = 50;
const Y_END   = 1350;
const SVG_H   = 860;
const M       = { top: 80, right: 90, bottom: 40, left: 56 };

// Columns: Tannaim | Bavli | Yerushalmi | Rishonim
const COL_FRACS = [0.12, 0.38, 0.62, 0.85];

const COLUMNS = [
  { label: 'Tannaim',    sublabel: 'Land of Israel', color: '#1A3A5C' },
  { label: 'Bavli',      sublabel: 'Babylonia',       color: '#8B4513' },
  { label: 'Yerushalmi', sublabel: 'Land of Israel',  color: '#228B22' },
  { label: 'Rishonim',   sublabel: 'Europe & Egypt',  color: '#8B0000' },
];

const ERA_BANDS = [
  { start: Y_START, end: 220,   fill: '#f0f4ff', label: 'Tannaitic Period'  },
  { start: 220,     end: 600,   fill: '#fff8f0', label: 'Amoraic Period'    },
  { start: 600,     end: 1060,  fill: '#f9fafb', label: ''                  },
  { start: 1060,    end: Y_END, fill: '#fff0f0', label: 'Rishonic Period'   },
];

const MILESTONES = [
  { year: 220,  label: 'Mishna compiled · Bavli & Yerushalmi diverge' },
  { year: 400,  label: 'Yerushalmi redacted'                           },
  { year: 600,  label: 'Bavli redacted'                                },
];

// ─── Column assignment ────────────────────────────────────────────────────────

function getCol(a: Author): number {
  if (a.era === 'Tannaim')  return 0;
  if (a.era === 'Rishonim') return 3;
  const loc = a.location.toLowerCase();
  return (
    loc.includes('babylonia') ||
    loc.includes('sura')      ||
    loc.includes('pumbedita') ||
    loc.includes('nehardea')  ||
    loc.includes('mahoza')
  ) ? 1 : 2;
}

// ─── Collision-aware placement ────────────────────────────────────────────────

interface Placed { x: number; y: number; col: number }

function placeAuthors(
  authors: Author[],
  colXs: number[],
  yScale: d3.ScaleLinear<number, number>,
): Map<string, Placed> {
  const placed   = new Map<string, Placed>();
  const colUsedY = new Map<number, number[]>(COLUMNS.map((_, i) => [i, []]));

  const sorted = [...authors].sort((a, b) => a.active_years[0] - b.active_years[0]);
  for (const author of sorted) {
    const col    = getCol(author);
    const baseY  = yScale(author.active_years[0]);
    const usedYs = colUsedY.get(col)!;
    let finalY   = baseY;
    while (usedYs.some(y => Math.abs(y - finalY) < 22)) finalY += 24;
    usedYs.push(finalY);
    placed.set(author.id, { x: colXs[col], y: finalY, col });
  }
  return placed;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function TooltipCard({ author }: { author: Author }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xl p-3 text-xs" style={{ minWidth: 210 }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: author.color }} />
        <span className="font-semibold text-gray-900">{author.name}</span>
        {author.hebrew && <span dir="rtl" className="text-gray-500">{author.hebrew}</span>}
      </div>
      <table className="w-full text-gray-600 mb-2">
        <tbody>
          <tr><td className="text-gray-400 pr-3 py-0.5 whitespace-nowrap">Era</td><td>{author.era}</td></tr>
          <tr><td className="text-gray-400 pr-3 py-0.5 whitespace-nowrap">Active</td><td>{author.active_years[0]}–{author.active_years[1]} CE</td></tr>
          <tr><td className="text-gray-400 pr-3 py-0.5 whitespace-nowrap">Location</td><td>{author.location}</td></tr>
          <tr><td className="text-gray-400 pr-3 py-0.5 whitespace-nowrap">Role</td><td>{author.role}</td></tr>
        </tbody>
      </table>
      <p className="text-gray-600 leading-relaxed">{author.bio}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  activeView:   AppView;
  onViewChange: (v: AppView) => void;
  lang:         Lang;
  onLangChange: (l: Lang) => void;
}

export default function Timeline({ activeView, onViewChange, lang, onLangChange }: Props) {
  const svgContainerRef             = useRef<HTMLDivElement>(null);
  const [svgW, setSvgW]             = useState(600);
  const [hovered, setHovered]       = useState<string | null>(null);
  const [pinned, setPinned]         = useState<string | null>(null);

  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSvgW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const iW = svgW - M.left - M.right;
  const iH = SVG_H - M.top - M.bottom;

  const yScale = d3.scaleLinear([Y_START, Y_END], [0, iH]);
  const colXs  = COL_FRACS.map(f => iW * f);
  const placed = placeAuthors(allAuthors, colXs, yScale);

  const yearTicks = d3.range(200, Y_END, 200).filter(y => y >= Y_START);

  const activeId     = pinned ?? hovered;
  const activeAuthor = activeId ? allAuthors.find(a => a.id === activeId) ?? null : null;
  const activePos    = activeId ? placed.get(activeId) ?? null : null;
  const tooltipRight = activePos ? activePos.col < 3 : true;

  const sidebar = (
    <div className="space-y-4">
      {/* Era legend */}
      <div>
        <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">Era</h2>
        <div className="space-y-1.5">
          {ERA_BANDS.filter(b => b.label).map(b => (
            <span key={b.label} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-sm border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: b.fill }} />
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* Column legend */}
      <div>
        <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">Tradition</h2>
        <div className="space-y-1.5">
          {COLUMNS.map(col => (
            <span key={col.label} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
              <span>
                <span className="font-medium">{col.label}</span>
                <span className="text-gray-400"> · {col.sublabel}</span>
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-gray-400 leading-relaxed">
        Hover to preview · click to pin author details
      </p>

      {/* Git metaphor */}
      <div>
        <h2 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">Git metaphor</h2>
        <ul className="space-y-1 text-xs text-gray-500">
          <li><span className="font-mono">commit</span> = scholarly contribution</li>
          <li><span className="font-mono">branch</span> = textual tradition</li>
          <li><span className="font-mono">author</span> = historical rabbi</li>
        </ul>
      </div>
    </div>
  );

  return (
    <AppShell
      activeView={activeView}
      onViewChange={onViewChange}
      lang={lang}
      onLangChange={onLangChange}
      subtitle="git graph — scholarly contributions · 50–1350 CE"
      sidebar={sidebar}
    >
      <div ref={svgContainerRef} className="relative">
        <svg
          width={svgW}
          height={SVG_H}
          style={{ overflow: 'visible' }}
          onMouseLeave={() => setHovered(null)}
        >
          <g transform={`translate(${M.left},${M.top})`}>

            {/* Era background bands */}
            {ERA_BANDS.map((b, i) => (
              <rect
                key={i}
                x={0} y={yScale(b.start)}
                width={iW} height={yScale(b.end) - yScale(b.start)}
                fill={b.fill} rx={2}
              />
            ))}

            {/* Column dashed guide lines */}
            {colXs.map((cx, i) => (
              <line
                key={i}
                x1={cx} y1={0} x2={cx} y2={iH}
                stroke={COLUMNS[i].color} strokeWidth={1}
                strokeDasharray="3 6" opacity={0.3}
              />
            ))}

            {/* Column header labels */}
            {COLUMNS.map((col, i) => (
              <g key={i} transform={`translate(${colXs[i]}, -28)`}>
                <circle cx={0} cy={-8} r={4} fill={col.color} />
                <text textAnchor="middle" fontSize={11} fontWeight={700}
                  fill={col.color} fontFamily="ui-monospace, monospace">
                  {col.label}
                </text>
                <text textAnchor="middle" fontSize={9} fill="#9ca3af"
                  fontFamily="system-ui, sans-serif" dy={14}>
                  {col.sublabel}
                </text>
              </g>
            ))}

            {/* Year axis */}
            <line x1={-1} y1={0} x2={-1} y2={iH} stroke="#e5e7eb" strokeWidth={1} />
            {yearTicks.map(year => (
              <g key={year} transform={`translate(0, ${yScale(year)})`}>
                <line x1={-8} y1={0} x2={0} y2={0} stroke="#d1d5db" strokeWidth={1} />
                <text x={-12} y={0} textAnchor="end" dominantBaseline="middle"
                  fontSize={9} fill="#9ca3af" fontFamily="ui-monospace, monospace">
                  {year}
                </text>
              </g>
            ))}

            {/* Milestone dividers */}
            {MILESTONES.map(({ year, label }) => {
              const my = yScale(year);
              return (
                <g key={year} transform={`translate(0, ${my})`}>
                  <line x1={0} y1={0} x2={iW} y2={0}
                    stroke="#6b7280" strokeWidth={0.75} strokeDasharray="6 3" />
                  <text x={iW + 4} y={0} dominantBaseline="middle"
                    fontSize={8} fill="#9ca3af" fontFamily="ui-monospace, monospace">
                    {year} CE
                  </text>
                  <text x={4} y={-5} fontSize={8} fill="#6b7280"
                    fontFamily="system-ui, sans-serif" fontStyle="italic">
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Active-years span bars */}
            {allAuthors.map(author => {
              const pos  = placed.get(author.id)!;
              const yTop = yScale(author.active_years[0]);
              const yBot = yScale(author.active_years[1]);
              return (
                <rect key={`bar-${author.id}`}
                  x={pos.x - 1} y={yTop}
                  width={2} height={Math.max(yBot - yTop, 2)}
                  fill={author.color} opacity={0.25} rx={1}
                />
              );
            })}

            {/* Author nodes */}
            {allAuthors.map(author => {
              const pos      = placed.get(author.id)!;
              const isActive = activeId === author.id;
              const isPinned = pinned === author.id;
              const name     = lang === 'he' && author.hebrew ? author.hebrew : author.name;

              return (
                <g key={author.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(author.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setPinned(p => p === author.id ? null : author.id)}
                >
                  {isPinned && (
                    <circle r={13} fill="none" stroke={author.color} strokeWidth={1.5} opacity={0.4} />
                  )}
                  <circle r={isActive ? 9 : 6} fill={author.color}
                    stroke="white" strokeWidth={isActive ? 2 : 1.5} />
                  <text x={13} y={0} dominantBaseline="middle"
                    fontSize={isActive ? 11 : 10}
                    fontWeight={isActive ? 600 : 400}
                    fill={isActive ? '#111827' : '#4b5563'}
                    fontFamily={lang === 'he' ? 'serif' : 'system-ui, sans-serif'}
                  >
                    {name}
                  </text>
                </g>
              );
            })}

            {/* Tooltip via foreignObject */}
            {activeAuthor && activePos && (
              <foreignObject
                x={tooltipRight ? activePos.x + 20 : activePos.x - 250}
                y={Math.max(activePos.y - 20, 0)}
                width={240} height={300}
                style={{ overflow: 'visible', pointerEvents: 'none' }}
              >
                <TooltipCard author={activeAuthor} />
              </foreignObject>
            )}

          </g>
        </svg>
      </div>
    </AppShell>
  );
}
