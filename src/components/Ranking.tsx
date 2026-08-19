import { levelSpec } from '../lib/levelgen';
import {
  clearedCount,
  formatMs,
  MAX_LEVEL,
  perfectCount,
  type Progress,
} from '../game/storage';

const MEDALS = ['🥇', '🥈', '🥉', '4', '5'];

const formatDate = (ms: number): string => {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export function Ranking({ progress, onBack }: { progress: Progress; onBack: () => void }) {
  const cleared = clearedCount(progress);
  const perfect = perfectCount(progress);

  // ベストタイムの速い順。これが「レベル別ランキング」の並び
  const byTime = Object.entries(progress.levels)
    .map(([key, record]) => ({ level: Number(key), ...record }))
    .sort((a, b) => a.bestMs - b.bestMs);

  const totalMs = byTime.reduce((sum, r) => sum + r.bestMs, 0);

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
        <h1 className="flex-1 text-lg font-bold text-amber-50">きろく</h1>
      </header>

      {/* まとめ */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'クリア', value: `${cleared}`, unit: `/ ${MAX_LEVEL}` },
          { label: '★ノーヒント', value: `${perfect}`, unit: '面' },
          { label: 'ベスト合計', value: cleared > 0 ? formatMs(totalMs) : '—', unit: '' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 text-center"
          >
            <p className="text-[10px] text-amber-100/45">{s.label}</p>
            <p className="text-lg font-black tabular-nums leading-tight text-amber-50">{s.value}</p>
            <p className="text-[10px] text-amber-100/35">{s.unit}</p>
          </div>
        ))}
      </div>

      {/* タイムアタック */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-amber-100/80">⏱️ タイムアタック ベスト5</h2>
        {progress.timeAttack.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-xs text-amber-100/40">
            まだ記録がありません
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {progress.timeAttack.map((entry, i) => (
              <li
                key={`${entry.at}-${i}`}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  i === 0 ? 'border-amber-300/45 bg-amber-300/12' : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                <span className="w-6 text-center text-sm">{MEDALS[i] ?? i + 1}</span>
                <span className="flex-1 text-lg font-black tabular-nums text-amber-50">
                  {entry.score}
                  <span className="ml-1 text-xs font-normal text-amber-100/50">面</span>
                </span>
                <span className="text-[11px] text-amber-100/35">{formatDate(entry.at)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* レベル別ベストタイム */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-amber-100/80">🏁 レベル別ベストタイム</h2>
        {byTime.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-xs text-amber-100/40">
            まだ1面もクリアしていません
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {byTime.map((record, i) => {
              const spec = levelSpec(record.level);
              return (
                <li
                  key={record.level}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                >
                  <span className="w-6 text-center text-xs text-amber-100/40">{i + 1}</span>
                  <span className="w-16 text-sm font-bold text-amber-50">Lv.{record.level}</span>
                  <span className="flex-1 text-[11px] text-amber-100/40">
                    {spec.size}×{spec.size}
                    {record.bestHints === 0 && <span className="ml-1 text-amber-200/90">★</span>}
                  </span>
                  <span className="tabular-nums text-sm font-bold text-amber-100">
                    {formatMs(record.bestMs)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <p className="text-center text-[11px] text-amber-100/30">
        記録はこの端末のブラウザに保存されます。
      </p>
    </div>
  );
}
