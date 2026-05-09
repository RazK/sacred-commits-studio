import type { ReactNode } from 'react';
import type { AppView } from '../../App';

interface AppShellProps {
  activeView: AppView;
  onViewChange: (v: AppView) => void;
  lang: 'en' | 'he';
  onLangChange: (l: 'en' | 'he') => void;
  subtitle: string;
  info?: string;
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({
  activeView, onViewChange,
  lang, onLangChange,
  subtitle, info,
  sidebar, children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-mono text-base font-semibold text-gray-900 truncate">
              sacred-commits
            </h1>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs font-mono">
              <button
                onClick={() => onViewChange('blame')}
                className={`px-2.5 py-1.5 transition-colors ${activeView === 'blame' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                blame
              </button>
              <button
                onClick={() => onViewChange('diff')}
                className={`px-2.5 py-1.5 border-l border-gray-200 transition-colors ${activeView === 'diff' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                diff
              </button>
              <button
                onClick={() => onViewChange('log')}
                className={`px-2.5 py-1.5 border-l border-gray-200 transition-colors ${activeView === 'log' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                log
              </button>
            </div>
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs font-mono">
              <button
                onClick={() => onLangChange('en')}
                className={`px-2.5 py-1.5 transition-colors ${lang === 'en' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                EN
              </button>
              <button
                onClick={() => onLangChange('he')}
                className={`px-2.5 py-1.5 border-l border-gray-200 transition-colors ${lang === 'he' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                עב
              </button>
            </div>
            {info && (
              <span className="text-xs text-gray-400 font-mono whitespace-nowrap hidden sm:inline">
                {info}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col md:flex-row gap-4 md:gap-6">
        <aside className="md:w-48 md:flex-shrink-0">{sidebar}</aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
