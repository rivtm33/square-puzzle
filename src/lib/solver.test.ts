import { describe, it, expect } from 'vitest';
import { solve, isSolvable, ORIENTATIONS } from './solver';
import { createBoard, place, canPlace, isSolved, type Board } from './board';
import { PIECES, type PieceId } from './pieces';

/** 解を盤面に適用して、重なりなく全マス埋まることを確かめる */
function applyAndCheck(size: number, placements: { pieceId: PieceId; cells: readonly (readonly [number, number])[] }[]): Board {
  let board = createBoard(size);
  placements.forEach((p, i) => {
    expect(canPlace(board, p.cells, 0, 0), `重なり: ${p.pieceId}`).toBe(true);
    board = place(board, p.cells, 0, 0, `p${i}`);
  });
  return board;
}

describe('solve', () => {
  it('2×2 を O4 ひとつで埋める', () => {
    const sol = solve(createBoard(2), ['O4']);
    expect(sol).not.toBeNull();
    expect(isSolved(applyAndCheck(2, sol!))).toBe(true);
  });

  it('4×4 をテトロミノ4つで埋める', () => {
    const hand: PieceId[] = ['I4', 'I4', 'I4', 'I4'];
    const sol = solve(createBoard(4), hand);
    expect(sol).not.toBeNull();
    expect(sol!).toHaveLength(4);
    expect(isSolved(applyAndCheck(4, sol!))).toBe(true);
  });

  it('5×5 をペントミノ5つで埋める', () => {
    const hand: PieceId[] = ['I5', 'L5', 'Y5', 'P5', 'U5'];
    const sol = solve(createBoard(5), hand);
    expect(sol).not.toBeNull();
    expect(isSolved(applyAndCheck(5, sol!))).toBe(true);
  });

  it('返される解は手持ちピースと過不足なく一致する', () => {
    const hand: PieceId[] = ['O4', 'O4', 'L4', 'L4'];
    const sol = solve(createBoard(4), hand)!;
    expect(sol.map((p) => p.pieceId).sort()).toEqual([...hand].sort());
  });

  it('マス数が合わなければ null', () => {
    expect(solve(createBoard(4), ['I4', 'I4', 'I4'])).toBeNull();
    expect(solve(createBoard(4), ['I4', 'I4', 'I4', 'I4', 'I1'])).toBeNull();
  });

  it('マス数は合うが敷き詰められない場合は null', () => {
    // 3×3 を X5 と I4 で: 合計9マスだが十字を置くと必ず角が孤立する
    expect(solve(createBoard(3), ['X5', 'I4'])).toBeNull();
    // 5×5 を I5 ×4 と X5: I5 は直線なので十字と共存できない
    expect(solve(createBoard(5), ['I5', 'I5', 'I5', 'I5', 'X5'])).toBeNull();
    // 4×4 を O4/T4/L4/S4 で: 市松模様で数えると T4 だけ 3:1 に偏るので 8:8 にならない
    expect(solve(createBoard(4), ['O4', 'T4', 'L4', 'S4'])).toBeNull();
  });

  it('部分的に埋まった盤面の続きも解ける', () => {
    const board = place(createBoard(4), PIECES.O4, 0, 0, 'x');
    const sol = solve(board, ['O4', 'O4', 'O4']);
    expect(sol).not.toBeNull();
    for (const p of sol!) {
      for (const [r, c] of p.cells) expect(board[r][c]).toBeNull();
    }
  });

  it('置ける場所が無い盤面は null', () => {
    // 左上1マスだけ空いていて手持ちが I2（2マス）→ マス数不一致
    let board = createBoard(2);
    board = place(board, PIECES.V3, 0, 0, 'x');
    expect(solve(board, ['I2'])).toBeNull();
    expect(solve(board, ['I1'])).not.toBeNull();
  });

  it('同じ入力なら同じ解を返す（決定的）', () => {
    const hand: PieceId[] = ['L4', 'T4', 'S4', 'O4'];
    const a = solve(createBoard(4), hand);
    const b = solve(createBoard(4), hand);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('maxNodes を超えると打ち切る', () => {
    expect(solve(createBoard(6), Array(36).fill('I1') as PieceId[], { maxNodes: 1 })).toBeNull();
  });

  it('6×6 のペントミノ問題も現実的な時間で解ける', () => {
    // 36 = 5*7 + 1
    const hand: PieceId[] = ['I1', 'F5', 'I5', 'L5', 'N5', 'P5', 'T5', 'U5'];
    const t = Date.now();
    const sol = solve(createBoard(6), hand);
    expect(sol).not.toBeNull();
    expect(isSolved(applyAndCheck(6, sol!))).toBe(true);
    expect(Date.now() - t).toBeLessThan(5000);
  });
});

describe('isSolvable', () => {
  it('解けるかどうかだけ返す', () => {
    expect(isSolvable(createBoard(2), ['O4'])).toBe(true);
    expect(isSolvable(createBoard(2), ['I4'])).toBe(false);
  });
});

describe('ORIENTATIONS', () => {
  it('21種すべて事前計算されている', () => {
    expect(Object.keys(ORIENTATIONS)).toHaveLength(21);
  });

  it('各向きの先頭マスが走査順で最小になっている（配置基準の前提）', () => {
    for (const [id, oris] of Object.entries(ORIENTATIONS)) {
      for (const ori of oris) {
        for (const cell of ori) {
          const isAfter = cell[0] > ori[0][0] || (cell[0] === ori[0][0] && cell[1] >= ori[0][1]);
          expect(isAfter, `${id}: ${JSON.stringify(ori)}`).toBe(true);
        }
      }
    }
  });
});
