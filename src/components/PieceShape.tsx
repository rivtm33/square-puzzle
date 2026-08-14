import { bounds, normalize, type Cells } from '../lib/geometry';
import { jewelVars, type ColorKey } from '../game/colors';

type Props = {
  cells: Cells;
  color: ColorKey;
  /** 1マスの辺の長さ(px) */
  cell?: number;
  gap?: number;
  className?: string;
};

/** 手持ちトレイやルーレットで使う、ピース単体の見た目 */
export function PieceShape({ cells, color, cell = 15, gap = 2, className }: Props) {
  const norm = normalize(cells);
  const { rows, cols } = bounds(norm);
  const step = cell + gap;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: cols * step - gap, height: rows * step - gap }}
    >
      {norm.map(([r, c]) => (
        <div
          key={`${r}-${c}`}
          className="jewel absolute rounded-[3px]"
          style={{
            ...jewelVars(color),
            left: c * step,
            top: r * step,
            width: cell,
            height: cell,
          }}
        />
      ))}
    </div>
  );
}
