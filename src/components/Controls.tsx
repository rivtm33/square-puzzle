type Props = {
  hasSelection: boolean;
  canUndo: boolean;
  canReset: boolean;
  onRotate: () => void;
  onFlip: () => void;
  onUndo: () => void;
  onReset: () => void;
  onHint: () => void;
};

const BASE =
  'flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.06] py-2 text-[11px] font-medium text-amber-50 transition active:scale-95 disabled:opacity-30 disabled:active:scale-100';

export function Controls({
  hasSelection,
  canUndo,
  canReset,
  onRotate,
  onFlip,
  onUndo,
  onReset,
  onHint,
}: Props) {
  return (
    <div className="grid grid-cols-5 gap-2">
      <button type="button" className={BASE} onClick={onRotate} disabled={!hasSelection}>
        <span className="text-lg leading-none">↻</span>
        回転
      </button>
      <button type="button" className={BASE} onClick={onFlip} disabled={!hasSelection}>
        <span className="text-lg leading-none">⇄</span>
        反転
      </button>
      <button type="button" className={BASE} onClick={onUndo} disabled={!canUndo}>
        <span className="text-lg leading-none">↶</span>
        もどす
      </button>
      <button type="button" className={BASE} onClick={onReset} disabled={!canReset}>
        <span className="text-lg leading-none">⟲</span>
        リセット
      </button>
      <button
        type="button"
        className={`${BASE} border-amber-300/30 bg-amber-300/10`}
        onClick={onHint}
      >
        <span className="text-lg leading-none">💡</span>
        ヒント
      </button>
    </div>
  );
}
