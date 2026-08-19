import { useState } from 'react';
import { levelSpec } from '../lib/levelgen';
import { MAX_LEVEL, formatMs, isUnlocked, type Progress } from '../game/storage';
import type { Mode } from '../game/state';

type Props = {
  progress: Progress;
  onStart: (mode: Mode, level: number) => void;
  onBack: () => void;
};

const DIFF_LABEL: Record<string, string> = { easy: 'やさしい', normal: 'ふつう', hard: 'むずかしい' };

export function LevelSelect({ progress, onStart, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('normal');
  const levels = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 pb-8 pt-4">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-sm"
          aria-label="タイトルへ戻る"
        >
          ←
        </button>
        <h1 className="flex-1 text-lg font-bold text-amber-50">レベルをえらぶ</h1>
      </header>

      {/* 同じレベルをチャレンジ（ルーレット縛り）でも遊べる */}
      <div className="flex gap-2">
        {(['normal', 'challenge'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-xl border py-2 text-sm transition ${
              mode === m
                ? 'border-amber-300/60 bg-amber-300/15 font-bold text-amber-50'
                : 'border-white/10 bg-white/[0.04] text-amber-100/60'
            }`}
            aria-pressed={mode === m}
          >
            {m === 'normal' ? '🧩 ノーマル' : '🎯 チャレンジ'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {levels.map((level) => {
          const record = progress.levels[String(level)];
          const unlocked = isUnlocked(progress, level);
          const spec = levelSpec(level);

          return (
            <button
              key={level}
              type="button"
              disabled={!unlocked}
              onClick={() => onStart(mode, level)}
              aria-label={`レベル${level} ${spec.size}×${spec.size} ${DIFF_LABEL[spec.difficulty]}${
                record ? ` クリア済み ベスト${formatMs(record.bestMs)}` : ''
              }`}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl border transition active:scale-95 ${
                record
                  ? 'border-amber-300/50 bg-amber-300/12'
                  : unlocked
                    ? 'border-white/15 bg-white/[0.05]'
                    : 'border-white/5 bg-white/[0.02] opacity-35'
              }`}
            >
              {unlocked ? (
                <>
                  <span className="text-lg font-black leading-none text-amber-50">{level}</span>
                  <span className="mt-0.5 text-[9px] leading-none text-amber-100/40">
                    {spec.size}×{spec.size}
                  </span>
                  {record ? (
                    <span className="mt-1 text-[9px] leading-none text-amber-200/85">
                      {record.bestHints === 0 && '★'}
                      {formatMs(record.bestMs)}
                    </span>
                  ) : (
                    <span className="mt-1 text-[9px] leading-none text-transparent">-</span>
                  )}
                </>
              ) : (
                <span className="text-lg">🔒</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] leading-relaxed text-amber-100/35">
        ひとつ前のレベルをクリアすると次が開きます。
        <br />
        同じレベル番号なら毎回おなじ問題なので、タイムを縮められます。
        <br />★ はヒントなしでクリアした印。
      </p>
    </div>
  );
}
