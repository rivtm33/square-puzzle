import { describe, it, expect } from 'vitest';
import {
  createBoard, canPlace, place, remove, isSolved, emptyCount,
  firstEmpty, emptyRegionSizes, translate,
} from './board';
import { PIECES } from './pieces';

describe('createBoard', () => {
  it('全マス空きの N×N を作る', () => {
    const b = createBoard(4);
    expect(b).toHaveLength(4);
    expect(b[0]).toHaveLength(4);
    expect(emptyCount(b)).toBe(16);
    expect(isSolved(b)).toBe(false);
  });
});

describe('canPlace', () => {
  const board = createBoard(4);

  it('空盤面の左上に置ける', () => {
    expect(canPlace(board, PIECES.O4, 0, 0)).toBe(true);
  });

  it('右端をはみ出すと置けない', () => {
    expect(canPlace(board, PIECES.O4, 0, 3)).toBe(false);
  });

  it('下端をはみ出すと置けない', () => {
    expect(canPlace(board, PIECES.I5, 0, 0)).toBe(false);
  });

  it('負の座標は置けない', () => {
    expect(canPlace(board, PIECES.I1, -1, 0)).toBe(false);
    expect(canPlace(board, PIECES.I1, 0, -1)).toBe(false);
  });

  it('既存ピースと重なると置けない', () => {
    const b = place(board, PIECES.O4, 0, 0, 'a');
    expect(canPlace(b, PIECES.O4, 1, 1)).toBe(false);
    expect(canPlace(b, PIECES.O4, 2, 2)).toBe(true);
  });

  it('隣接する配置は許される', () => {
    const b = place(board, PIECES.O4, 0, 0, 'a');
    expect(canPlace(b, PIECES.O4, 0, 2)).toBe(true);
  });
});

describe('place / remove', () => {
  it('元の盤面を変更しない（イミュータブル）', () => {
    const before = createBoard(3);
    const after = place(before, PIECES.I2, 0, 0, 'a');
    expect(emptyCount(before)).toBe(9);
    expect(emptyCount(after)).toBe(7);
    expect(after[0][0]).toBe('a');
    expect(after[0][1]).toBe('a');
  });

  it('remove で該当IDのマスだけ空く', () => {
    let b = createBoard(3);
    b = place(b, PIECES.I2, 0, 0, 'a');
    b = place(b, PIECES.I2, 1, 0, 'b');
    const c = remove(b, 'a');
    expect(c[0][0]).toBeNull();
    expect(c[1][0]).toBe('b');
    expect(emptyCount(c)).toBe(7);
  });

  it('存在しないIDを remove しても何も起きない', () => {
    const b = place(createBoard(3), PIECES.I2, 0, 0, 'a');
    expect(remove(b, 'zzz')).toEqual(b);
  });
});

describe('isSolved', () => {
  it('2×2 を O4 で埋めるとクリア', () => {
    const b = place(createBoard(2), PIECES.O4, 0, 0, 'a');
    expect(isSolved(b)).toBe(true);
  });

  it('1マスでも空いていればクリアではない', () => {
    const b = place(createBoard(2), PIECES.V3, 0, 0, 'a');
    expect(isSolved(b)).toBe(false);
  });
});

describe('firstEmpty', () => {
  it('走査順で最初の空きマスを返す', () => {
    const b = place(createBoard(3), PIECES.I2, 0, 0, 'a');
    expect(firstEmpty(b)).toEqual([0, 2]);
  });

  it('埋まっていれば null', () => {
    expect(firstEmpty(place(createBoard(2), PIECES.O4, 0, 0, 'a'))).toBeNull();
  });
});

describe('emptyRegionSizes', () => {
  it('分断された空きマスをそれぞれ数える', () => {
    // 3×3 の真ん中の列を縦に埋めて、左右に3マスずつ分断する
    let b = createBoard(3);
    b = place(b, PIECES.I3, 0, 0, 'a'); // 縦棒ではなく横棒なので回転済みの形を直接使う
    expect(emptyRegionSizes(b)).toEqual([6]);

    let c = createBoard(3);
    c = place(c, [[0, 0], [1, 0], [2, 0]], 0, 1, 'v');
    expect(emptyRegionSizes(c).sort()).toEqual([3, 3]);
  });

  it('空盤面はひとつの塊', () => {
    expect(emptyRegionSizes(createBoard(4))).toEqual([16]);
  });

  it('満杯なら空', () => {
    expect(emptyRegionSizes(place(createBoard(2), PIECES.O4, 0, 0, 'a'))).toEqual([]);
  });
});

describe('translate', () => {
  it('平行移動する', () => {
    expect(translate(PIECES.I2, 2, 3)).toEqual([[2, 3], [2, 4]]);
  });
});
