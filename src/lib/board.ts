import type { Cells } from './geometry';

/** 各マスは「置かれているピースのインスタンスID」または null（空き） */
export type Board = readonly (readonly (string | null)[])[];

export function createBoard(size: number): Board {
  return Array.from({ length: size }, () => Array<string | null>(size).fill(null));
}

export const boardSize = (board: Board): number => board.length;

/** cells を (row, col) だけ平行移動した絶対座標 */
export function translate(cells: Cells, row: number, col: number): Cells {
  return cells.map(([r, c]) => [r + row, c + col] as const);
}

/** 範囲内かつすべて空きマスなら true */
export function canPlace(board: Board, cells: Cells, row: number, col: number): boolean {
  const n = board.length;
  for (const [r, c] of cells) {
    const rr = r + row;
    const cc = c + col;
    if (rr < 0 || cc < 0 || rr >= n || cc >= n) return false;
    if (board[rr][cc] !== null) return false;
  }
  return true;
}

/** 配置した新しい盤面を返す（元の盤面は変更しない） */
export function place(board: Board, cells: Cells, row: number, col: number, id: string): Board {
  const next = board.map((r) => r.slice());
  for (const [r, c] of cells) next[r + row][c + col] = id;
  return next;
}

/** 指定IDのピースを取り除いた新しい盤面を返す */
export function remove(board: Board, id: string): Board {
  return board.map((row) => row.map((v) => (v === id ? null : v)));
}

/** 全マス埋まったか */
export function isSolved(board: Board): boolean {
  return board.every((row) => row.every((v) => v !== null));
}

export function emptyCount(board: Board): number {
  let n = 0;
  for (const row of board) for (const v of row) if (v === null) n++;
  return n;
}

/** 走査順で最初の空きマス。無ければ null */
export function firstEmpty(board: Board): readonly [number, number] | null {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board.length; c++) {
      if (board[r][c] === null) return [r, c];
    }
  }
  return null;
}

/** 空きマスの連結成分のサイズ一覧（4近傍） */
export function emptyRegionSizes(board: Board): number[] {
  const n = board.length;
  const seen = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const sizes: number[] = [];
  const stack: number[] = [];
  for (let r0 = 0; r0 < n; r0++) {
    for (let c0 = 0; c0 < n; c0++) {
      if (board[r0][c0] !== null || seen[r0][c0]) continue;
      let size = 0;
      seen[r0][c0] = true;
      stack.push(r0 * n + c0);
      while (stack.length > 0) {
        const cur = stack.pop()!;
        const r = (cur / n) | 0;
        const c = cur % n;
        size++;
        if (r > 0 && board[r - 1][c] === null && !seen[r - 1][c]) { seen[r - 1][c] = true; stack.push((r - 1) * n + c); }
        if (r < n - 1 && board[r + 1][c] === null && !seen[r + 1][c]) { seen[r + 1][c] = true; stack.push((r + 1) * n + c); }
        if (c > 0 && board[r][c - 1] === null && !seen[r][c - 1]) { seen[r][c - 1] = true; stack.push(r * n + (c - 1)); }
        if (c < n - 1 && board[r][c + 1] === null && !seen[r][c + 1]) { seen[r][c + 1] = true; stack.push(r * n + (c + 1)); }
      }
      sizes.push(size);
    }
  }
  return sizes;
}
