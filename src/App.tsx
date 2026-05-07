import { useState } from 'react';
import ContributionView from './components/ContributionView';
import DiffView from './components/DiffView';

export type AppView = 'blame' | 'diff';

export default function App() {
  const [view, setView] = useState<AppView>('blame');
  return view === 'blame'
    ? <ContributionView activeView={view} onViewChange={setView} />
    : <DiffView activeView={view} onViewChange={setView} />;
}
