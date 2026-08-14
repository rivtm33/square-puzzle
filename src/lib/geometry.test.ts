import { describe, it, expect } from 'vitest';
import { normalize, rotate, flip, allOrientations, shapeKey, bounds, anchorCell } from './geometry';
import { PIECES, PIECE_IDS } from './pieces';

describe('normalize', () => {
  it('左上を (0,0) に揃える', () => {
    expect(normalize([[3, 5], [3, 6], [4, 5]])).toEqual([[0, 0], [0, 1], [1, 0]]);
  });

  it('走査順にソートする', () => {
    expect(normalize([[1, 1], [0, 2], [0, 0]])).toEqual([[0, 0], [0, 2], [1, 1]]);
  });

  it('負の座標も扱える', () => {
    expect(normalize([[-2, -3], [-1, -3]])).toEqual([[0, 0], [1, 0]]);
  });

  it('冪等', () => {
    const once = normalize(PIECES.F5);
    expect(normalize(once)).toEqual(once);
  });
});

describe('rotate', () => {
  it('I2 を90度回すと縦棒になる', () => {
    expect(rotate([[0, 0], [0, 1]])).toEqual([[0, 0], [1, 0]]);
  });

  it('4回回すと元に戻る', () => {
    for (const id of PIECE_IDS) {
      let cells = normalize(PIECES[id]);
      const start = shapeKey(cells);
      for (let i = 0; i < 4; i++) cells = rotate(cells);
      expect(shapeKey(cells), id).toBe(start);
    }
  });

  it('マス数は変わらない', () => {
    for (const id of PIECE_IDS) {
      expect(rotate(PIECES[id]).length, id).toBe(PIECES[id].length);
    }
  });

  it('外接矩形の縦横が入れ替わる', () => {
    const b = bounds(normalize(PIECES.L5));
    const r = bounds(rotate(PIECES.L5));
    expect([r.rows, r.cols]).toEqual([b.cols, b.rows]);
  });
});

describe('flip', () => {
  it('左右が入れ替わる', () => {
    expect(flip([[0, 0], [0, 1], [1, 0]])).toEqual([[0, 0], [0, 1], [1, 1]]);
  });

  it('2回反転すると元に戻る', () => {
    for (const id of PIECE_IDS) {
      expect(shapeKey(flip(flip(PIECES[id]))), id).toBe(shapeKey(PIECES[id]));
    }
  });
});

describe('allOrientations', () => {
  it('重複形状を含まない', () => {
    for (const id of PIECE_IDS) {
      const keys = allOrientations(PIECES[id]).map(shapeKey);
      expect(new Set(keys).size, id).toBe(keys.length);
    }
  });

  it('最大でも8通り', () => {
    for (const id of PIECE_IDS) {
      expect(allOrientations(PIECES[id]).length, id).toBeLessThanOrEqual(8);
    }
  });

  it('対称なピースは向きが少ない', () => {
    expect(allOrientations(PIECES.I1)).toHaveLength(1); // 点対称
    expect(allOrientations(PIECES.X5)).toHaveLength(1); // 十字
    expect(allOrientations(PIECES.O4)).toHaveLength(1); // 正方形
    expect(allOrientations(PIECES.I2)).toHaveLength(2);
    expect(allOrientations(PIECES.I5)).toHaveLength(2);
    expect(allOrientations(PIECES.V3)).toHaveLength(4);
    expect(allOrientations(PIECES.T5)).toHaveLength(4);
    expect(allOrientations(PIECES.Z5)).toHaveLength(4); // 反転形は回転で重なるので4通り
    expect(allOrientations(PIECES.L5)).toHaveLength(8);
    expect(allOrientations(PIECES.F5)).toHaveLength(8);
    expect(allOrientations(PIECES.Y5)).toHaveLength(8);
  });

  it('すべて正規形で返る', () => {
    for (const id of PIECE_IDS) {
      for (const o of allOrientations(PIECES[id])) {
        expect(normalize(o)).toEqual(o.map(([r, c]) => [r, c]));
      }
    }
  });

  it('どの向きもマス数が同じ', () => {
    for (const id of PIECE_IDS) {
      for (const o of allOrientations(PIECES[id])) expect(o.length, id).toBe(PIECES[id].length);
    }
  });
});

describe('anchorCell', () => {
  it('走査順で最初のマスを返す', () => {
    expect(anchorCell(PIECES.Y5)).toEqual([0, 1]);
    expect(anchorCell(PIECES.I1)).toEqual([0, 0]);
    expect(anchorCell(PIECES.X5)).toEqual([0, 1]);
  });
});

describe('ピース定義', () => {
  it('21種ある', () => {
    expect(PIECE_IDS).toHaveLength(21);
  });

  it('すべて連結している', () => {
    for (const id of PIECE_IDS) {
      const cells = PIECES[id];
      const set = new Set(cells.map(([r, c]) => `${r},${c}`));
      const stack = [cells[0]];
      const seen = new Set<string>([`${cells[0][0]},${cells[0][1]}`]);
      while (stack.length) {
        const [r, c] = stack.pop()!;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${r + dr},${c + dc}`;
          if (set.has(k) && !seen.has(k)) {
            seen.add(k);
            stack.push([r + dr, c + dc]);
          }
        }
      }
      expect(seen.size, id).toBe(cells.length);
    }
  });

  it('マス数が名前の数字と一致する', () => {
    for (const id of PIECE_IDS) {
      expect(PIECES[id].length, id).toBe(Number(id.slice(-1)));
    }
  });

  it('形状がすべて異なる', () => {
    const keys = PIECE_IDS.map((id) => shapeKey(PIECES[id]));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
