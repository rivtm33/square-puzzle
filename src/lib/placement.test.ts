import { describe, it, expect } from 'vitest';
import { offsetFor, clampAnchor, firstFit } from './placement';
import { normalize, rotate } from './geometry';
import { createBoard, place, canPlace } from './board';
import { PIECES } from './pieces';

const N = (id: keyof typeof PIECES) => normalize(PIECES[id]);

describe('offsetFor', () => {
  it('アンカーが (0,0) のピースはそのまま', () => {
    expect(offsetFor(N('O4'), 2, 3)).toEqual({ dr: 2, dc: 3 });
  });

  it('アンカーが右にずれているピースは列が補正される', () => {
    // Y5 の正規形は先頭が [0,1]
    expect(N('Y5')[0]).toEqual([0, 1]);
    expect(offsetFor(N('Y5'), 0, 1)).toEqual({ dr: 0, dc: 0 });
  });

  it('offsetFor の結果で置くと、アンカーが指定マスに来る', () => {
    for (const id of ['Y5', 'X5', 'F5', 'S4'] as const) {
      const cells = N(id);
      const { dr, dc } = offsetFor(cells, 2, 3);
      const abs = cells.map(([r, c]) => [r + dr, c + dc]);
      expect(abs[0], id).toEqual([2, 3]);
    }
  });
});

describe('clampAnchor', () => {
  it('上と左にはみ出さない', () => {
    expect(clampAnchor(N('O4'), -5, -5, 5)).toEqual({ row: 0, col: 0 });
  });

  it('下と右にはみ出さない', () => {
    // O4 は 2×2 なので 5×5 ではアンカーの上限が (3,3)
    expect(clampAnchor(N('O4'), 9, 9, 5)).toEqual({ row: 3, col: 3 });
  });

  it('アンカーが内側にあるピースは、その分だけ左端がずれる', () => {
    // Y5 縦長(4行2列)、アンカー列は 1。5×5 なら行 0..1、列 1..4
    const y = N('Y5');
    expect(clampAnchor(y, 0, 0, 5)).toEqual({ row: 0, col: 1 });
    expect(clampAnchor(y, 9, 9, 5)).toEqual({ row: 1, col: 4 });
  });

  it('丸めた位置なら必ず盤面内に収まる', () => {
    const size = 5;
    for (const id of Object.keys(PIECES) as (keyof typeof PIECES)[]) {
      let cells = N(id);
      for (let rot = 0; rot < 4; rot++) {
        const { rows, cols } = { rows: Math.max(...cells.map(([r]) => r)) + 1, cols: Math.max(...cells.map(([, c]) => c)) + 1 };
        if (rows > size || cols > size) { cells = rotate(cells); continue; }
        for (let r = -3; r < size + 3; r++) {
          for (let c = -3; c < size + 3; c++) {
            const a = clampAnchor(cells, r, c, size);
            const { dr, dc } = offsetFor(cells, a.row, a.col);
            expect(canPlace(createBoard(size), cells, dr, dc), `${id} rot${rot} (${r},${c})`).toBe(true);
          }
        }
        cells = rotate(cells);
      }
    }
  });

  it('盤面より大きいピースでも例外にならず、収まる軸だけ丸める', () => {
    // I5 は縦5×横1。3×3 の盤には縦が入らないので行は 0 に張り付き、列だけ 0..2 で動く
    expect(clampAnchor(N('I5'), 3, 3, 3)).toEqual({ row: 0, col: 2 });
    expect(clampAnchor(N('I5'), -9, -9, 3)).toEqual({ row: 0, col: 0 });
  });
});

describe('firstFit', () => {
  it('空盤面なら左上', () => {
    expect(firstFit(createBoard(5), N('O4'))).toEqual({ row: 0, col: 0 });
  });

  it('埋まっている場所を避ける', () => {
    const board = place(createBoard(4), PIECES.O4, 0, 0, 'x');
    const fit = firstFit(board, N('O4'))!;
    const { dr, dc } = offsetFor(N('O4'), fit.row, fit.col);
    expect(canPlace(board, N('O4'), dr, dc)).toBe(true);
  });

  it('どこにも入らなければ null', () => {
    const board = place(createBoard(2), PIECES.V3, 0, 0, 'x');
    expect(firstFit(board, N('I2'))).toBeNull();
  });

  it('返る位置は必ず配置可能', () => {
    const board = place(createBoard(5), PIECES.X5, 1, 1, 'x');
    for (const id of Object.keys(PIECES) as (keyof typeof PIECES)[]) {
      const cells = N(id);
      const fit = firstFit(board, cells);
      if (!fit) continue;
      const { dr, dc } = offsetFor(cells, fit.row, fit.col);
      expect(canPlace(board, cells, dr, dc), id).toBe(true);
    }
  });
});
