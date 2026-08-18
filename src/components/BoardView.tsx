import type { RefObject } from 'react';
import type { Board } from '../lib/board';
import type { Cells } from '../lib/geometry';
import { jewelVars, type ColorKey } from '../game/colors';
import type { PlacedPiece } from '../game/state';

export type Preview = { cells: Cells; valid: boolean } | null;

type Props = {
  board: Board;
  placed: PlacedPiece[];
  preview: Preview;
  /** キーボード操作中に出す、単マスのカーソル */
  cursor: { row: number; col: number } | null;
  lastPlacedUid: string | null;
  boardRef: RefObject<HTMLDivElement | null>;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
};

export function BoardView({
  board,
  placed,
  preview,
  cursor,
  lastPlacedUid,
  boardRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: Props) {
  const size = board.length;
  const colorByUid = new Map<string, ColorKey>(placed.map((p) => [p.uid, p.color]));
  const previewSet = new Set(preview?.cells.map(([r, c]) => `${r},${c}`) ?? []);

  return (
    <div
      ref={boardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className="relative aspect-square w-full touch-none select-none rounded-2xl border border-amber-100/15 bg-black/45 p-[3px] shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
        gap: 2,
      }}
    >
      {board.map((row, r) =>
        row.map((uid, c) => {
          const key = `${r},${c}`;
          const color = uid ? colorByUid.get(uid) : undefined;
          const inPreview = previewSet.has(key);
          const isCursor = cursor?.row === r && cursor?.col === c;

          return (
            <div
              key={key}
              className="relative rounded-[4px] bg-white/[0.045] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
            >
              {color && (
                <div
                  className={`jewel absolute inset-0 rounded-[4px] ${uid === lastPlacedUid ? 'pop-in' : ''}`}
                  style={jewelVars(color)}
                />
              )}
              {inPreview && (
                <div
                  className="absolute inset-0 rounded-[4px] border-2"
                  style={{
                    background: preview!.valid
                      ? 'rgba(255,255,255,0.34)'
                      : 'rgba(244,63,94,0.42)',
                    borderColor: preview!.valid
                      ? 'rgba(255,255,255,0.85)'
                      : 'rgba(244,63,94,0.95)',
                  }}
                />
              )}
              {isCursor && (
                <div className="pointer-events-none absolute inset-0 rounded-[4px] border-2 border-dashed border-amber-200/90" />
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
