import { useState } from 'react';
import ContributionView from './components/ContributionView';
import DiffView from './components/DiffView';
import LogView from './components/LogView';
import Timeline from './components/Timeline';

export type AppView = 'blame' | 'diff' | 'log' | 'graph';
export type Lang = 'en' | 'he';

export default function App() {
  const [view, setView] = useState<AppView>('blame');
  const [lang, setLang] = useState<Lang>('he');

  if (view === 'diff')  return <DiffView  activeView={view} onViewChange={setView} lang={lang} onLangChange={setLang} />;
  if (view === 'log')   return <LogView   activeView={view} onViewChange={setView} lang={lang} onLangChange={setLang} />;
  if (view === 'graph') return <Timeline  activeView={view} onViewChange={setView} lang={lang} onLangChange={setLang} />;
  return <ContributionView activeView={view} onViewChange={setView} lang={lang} onLangChange={setLang} />;
}
