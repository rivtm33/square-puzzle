import { bounds, type Cells } from './geometry';
import { canPlace, type Board } from './board';

export type Anchor = { row: number; col: number };

/**
 * アンカー（走査順で最初のマス）を (row,col) に合わせたときの、盤面上の平行移動量。
 * 正規形なら cells[0] が必ず走査順で最初のマスになる。
 */
export function offsetFor(cells: Cells, row: number, col: number): { dr: number; dc: number } {
  return { dr: row - cells[0][0], dc: col - cells[0][1] };
}

/**
 * ピースが盤面からはみ出さないところまでアンカー位置を丸める。
 * キーボードのカーソル移動で、盤の外へ出ていかないようにするために使う。
 */
export function clampAnchor(cells: Cells, row: number, col: number, size: number): Anchor {
  if (cells.length === 0) {
    return {
      row: Math.min(Math.max(row, 0), size - 1),
      col: Math.min(Math.max(col, 0), size - 1),
    };
  }
  const { rows, cols } = bounds(cells);
  const ac = cells[0][1]; // アンカーの列。正規形なので行は必ず 0
  return {
    row: Math.min(Math.max(row, 0), Math.max(0, size - rows)),
    col: Math.min(Math.max(col, ac), Math.max(ac, size - cols + ac)),
  };
}

/** 走査順で最初に「そのピースがぴったり収まる」アンカー位置。無ければ null */
export function firstFit(board: Board, cells: Cells): Anchor | null {
  if (cells.length === 0) return null;
  const n = board.length;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const { dr, dc } = offsetFor(cells, row, col);
      if (canPlace(board, cells, dr, dc)) return { row, col };
    }
  }
  return null;
}
