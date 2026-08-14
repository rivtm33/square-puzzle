import { useState } from 'react';
import { ModeSelect } from './components/ModeSelect';
import Game from './Game';
import type { Mode } from './game/state';

export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);
  // モードを選び直したときにゲームを作り直すためのキー
  const [runId, setRunId] = useState(0);

  if (mode === null) return <ModeSelect onStart={(m) => { setMode(m); setRunId((n) => n + 1); }} />;

  return <Game key={runId} mode={mode} onExit={() => setMode(null)} />;
}
