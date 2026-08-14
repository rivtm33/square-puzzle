import type { Mode } from '../game/state';
import { TIME_ATTACK_SECONDS } from '../game/state';

const MODES: { id: Mode; title: string; desc: string; emoji: string }[] = [
  { id: 'normal', title: 'ノーマル', desc: 'レベル1から順に。盤面がだんだん大きくなるよ', emoji: '🧩' },
  { id: 'time', title: 'タイムアタック', desc: `${TIME_ATTACK_SECONDS}秒で何面クリアできる？`, emoji: '⏱️' },
  { id: 'challenge', title: 'チャレンジ', desc: 'ルーレットで出た種類のピースしか置けない', emoji: '🎯' },
];

export function ModeSelect({ onStart }: { onStart: (mode: Mode) => void }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-amber-50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          四角をつくる
        </h1>
        <p className="mt-2 text-sm text-amber-100/60">
          ピースを敷き詰めて、盤面をぴったり埋めよう
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onStart(m.id)}
            className="flex items-center gap-4 rounded-2xl border border-amber-100/15 bg-white/[0.05] p-4 text-left transition active:scale-[0.98]"
          >
            <span className="text-3xl">{m.emoji}</span>
            <span className="min-w-0">
              <span className="block text-lg font-bold text-amber-50">{m.title}</span>
              <span className="block text-xs text-amber-100/55">{m.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] leading-relaxed text-amber-100/35">
        ピースをタップして選び、盤面をタップかドラッグで配置。
        <br />
        置いたピースをタップすると手元に戻ります。
      </p>
    </div>
  );
}
