const KEYS: { keys: string[]; desc: string }[] = [
  { keys: ['←', '↑', '→', '↓'], desc: 'カーソルを動かす（WASD でも可）' },
  { keys: ['R'], desc: '回転' },
  { keys: ['F'], desc: '反転' },
  { keys: ['Enter', 'Space'], desc: 'そこに置く／クリア後はつぎのレベルへ' },
  { keys: ['1', '…', '9'], desc: '手持ちのピースを番号で選ぶ' },
  { keys: ['Q', 'E'], desc: '前後のピースへ（Tab でも可）' },
  { keys: ['Back'], desc: 'カーソルの下のピースを手元に戻す' },
  { keys: ['Z'], desc: 'ひとつ戻す' },
  { keys: ['H'], desc: 'ヒント' },
  { keys: ['Esc'], desc: '選択をやめる' },
  { keys: ['?'], desc: 'この一覧' },
];

export function KeyHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-5"
      onClick={onClose}
      role="dialog"
      aria-label="キーボード操作"
    >
      <div
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-amber-200/25 bg-stone-900/97 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-lg font-bold text-amber-100">キーボードで操作する</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/50">
          ピースを選ぶと、置く場所のプレビューが盤面に出たままになります。
          矢印キーで動かし、R で回して、Enter で確定。
        </p>

        <dl className="mt-4 flex flex-col gap-2">
          {KEYS.map((row) => (
            <div key={row.desc} className="flex items-start gap-3">
              <dt className="flex shrink-0 flex-wrap gap-1">
                {row.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-7 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-center font-mono text-[11px] text-amber-50"
                  >
                    {k}
                  </kbd>
                ))}
              </dt>
              <dd className="pt-0.5 text-xs text-amber-100/70">{row.desc}</dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-white/15 py-2.5 text-sm text-amber-50"
        >
          とじる
        </button>
      </div>
    </div>
  );
}
