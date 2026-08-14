import { PIECES, categoryOf } from '../lib/pieces';
import { normalize, type Cells } from '../lib/geometry';
import { PieceShape } from './PieceShape';
import type { HandPiece } from '../game/state';

type Props = {
  hand: HandPiece[];
  selectedUid: string | null;
  selCells: Cells;
  requiredCategory: string | null;
  onPiecePointerDown: (uid: string, e: React.PointerEvent) => void;
};

export function PieceTray({
  hand,
  selectedUid,
  selCells,
  requiredCategory,
  onPiecePointerDown,
}: Props) {
  if (hand.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-amber-100/50">
        ピースはぜんぶ置いたよ
      </div>
    );
  }

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 py-2">
      {hand.map((piece) => {
        const selected = piece.uid === selectedUid;
        // 選択中は今の向きを、それ以外は基本の向きを表示
        const cells = selected && selCells.length > 0 ? selCells : normalize(PIECES[piece.pieceId]);
        const locked = requiredCategory !== null && categoryOf(piece.pieceId) !== requiredCategory;

        return (
          <button
            key={piece.uid}
            type="button"
            onPointerDown={(e) => onPiecePointerDown(piece.uid, e)}
            className={`flex h-24 min-w-20 shrink-0 touch-none flex-col items-center justify-center rounded-xl border px-2 transition ${
              selected
                ? 'border-amber-200/80 bg-amber-200/15 shadow-[0_0_16px_rgba(251,191,36,0.35)]'
                : 'border-white/10 bg-white/[0.04]'
            } ${locked ? 'opacity-30' : ''}`}
            aria-pressed={selected}
            aria-label={`${piece.pieceId} (${PIECES[piece.pieceId].length}マス)`}
          >
            <div className="flex h-16 items-center justify-center">
              <PieceShape cells={cells} color={piece.color} cell={13} />
            </div>
            <span className="text-[10px] tracking-wide text-amber-100/45">{piece.pieceId}</span>
          </button>
        );
      })}
    </div>
  );
}
