import { useCallback, useState } from 'react';
import { ModeSelect } from './components/ModeSelect';
import { LevelSelect } from './components/LevelSelect';
import { Ranking } from './components/Ranking';
import Game from './Game';
import type { Mode } from './game/state';
import {
  loadProgress,
  nextLevelToPlay,
  recordClear,
  recordTimeAttack,
  saveProgress,
  type Progress,
} from './game/storage';

type Screen =
  | { name: 'title' }
  | { name: 'levels' }
  | { name: 'ranking' }
  | { name: 'game'; mode: Mode; level: number; runId: number };

export default function App() {
  // 起動時に前回の進捗を読み込む
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [runId, setRunId] = useState(0);

  const start = (mode: Mode, level: number) => {
    setRunId((n) => n + 1);
    setScreen({ name: 'game', mode, level, runId: runId + 1 });
  };

  /** クリアを保存して、ベスト更新かどうかを返す */
  const handleLevelClear = useCallback((level: number, ms: number, hints: number) => {
    const result = recordClear(loadProgress(), level, ms, hints);
    saveProgress(result.progress);
    setProgress(result.progress);
    return { isBest: result.isBest, bestMs: result.progress.levels[String(level)].bestMs };
  }, []);

  const handleTimeAttackEnd = useCallback((score: number) => {
    if (score <= 0) return;
    const next = recordTimeAttack(loadProgress(), score);
    saveProgress(next);
    setProgress(next);
  }, []);

  switch (screen.name) {
    case 'levels':
      return (
        <LevelSelect
          progress={progress}
          onStart={start}
          onBack={() => setScreen({ name: 'title' })}
        />
      );

    case 'ranking':
      return <Ranking progress={progress} onBack={() => setScreen({ name: 'title' })} />;

    case 'game':
      return (
        <Game
          key={screen.runId}
          mode={screen.mode}
          startLevel={screen.level}
          onExit={() => setScreen({ name: 'title' })}
          onLevelClear={handleLevelClear}
          onTimeAttackEnd={handleTimeAttackEnd}
        />
      );

    default:
      return (
        <ModeSelect
          progress={progress}
          // ノーマル／チャレンジは「まだクリアしていない一番小さいレベル」から続ける
          onStart={(mode) => start(mode, mode === 'time' ? 1 : nextLevelToPlay(progress))}
          onLevels={() => setScreen({ name: 'levels' })}
          onRanking={() => setScreen({ name: 'ranking' })}
        />
      );
  }
}
