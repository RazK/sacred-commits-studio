import { CHAPTER_NAMES } from '../../api/sefaria';

export function FilePathHeader({ chapter }: { chapter: number }) {
  const meta = CHAPTER_NAMES[chapter];
  const num  = String(chapter).padStart(2, '0');
  const slug = meta?.slug ?? `chapter-${num}`;

  return (
    <div className="mb-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between gap-2 overflow-hidden">
      <span className="font-mono text-sm text-gray-600 min-w-0 truncate">
        <span className="text-gray-400">talmud</span>
        <span className="text-gray-300"> / </span>
        <span className="text-gray-400">sukkah</span>
        <span className="text-gray-300"> / </span>
        <span className="text-gray-700 font-medium">
          chapter-{num}-{slug}.md
        </span>
      </span>
      {meta && (
        <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:flex items-center gap-2">
          <span dir="rtl">{meta.he}</span>
          <span>·</span>
          <span className="italic">{meta.en}</span>
        </span>
      )}
    </div>
  );
}
