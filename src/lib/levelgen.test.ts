import { describe, it, expect } from 'vitest';
import { generateLevel, levelSpec, findHint, type Difficulty } from './levelgen';
import { solve } from './solver';
import { createBoard, place, canPlace, isSolved } from './board';
import { PIECES } from './pieces';

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

describe('generateLevel', () => {
  it.each([4, 5, 6])('%i×%i：手持ちのマス数合計が盤面のマス数と一致する', (size) => {
    for (const d of DIFFICULTIES) {
      const level = generateLevel(size, d, 1234 + size);
      const area = level.hand.reduce((s, id) => s + PIECES[id].length, 0);
      expect(area, `${size}/${d}`).toBe(size * size);
    }
  });

  it.each([4, 5, 6])('%i×%i：生成された解が実際に盤面を埋める', (size) => {
    for (const d of DIFFICULTIES) {
      const level = generateLevel(size, d, 777 + size);
      let board = createBoard(size);
      level.solution.forEach((p, i) => {
        expect(canPlace(board, p.cells, 0, 0)).toBe(true);
        board = place(board, p.cells, 0, 0, `p${i}`);
      });
      expect(isSolved(board), `${size}/${d}`).toBe(true);
    }
  });

  it('生成したレベルは必ずソルバーで解ける', () => {
    for (let seed = 0; seed < 8; seed++) {
      for (const d of DIFFICULTIES) {
        const level = generateLevel(5, d, seed);
        expect(solve(createBoard(5), level.hand), `seed=${seed} ${d}`).not.toBeNull();
      }
    }
  });

  it('同じシードなら同じレベルになる', () => {
    const a = generateLevel(5, 'normal', 42);
    const b = generateLevel(5, 'normal', 42);
    expect(a.hand).toEqual(b.hand);
    expect(a.solution).toEqual(b.solution);
  });

  it('シードが違えば（だいたい）違うレベルになる', () => {
    const hands = new Set<string>();
    for (let seed = 0; seed < 10; seed++) hands.add(generateLevel(5, 'normal', seed).hand.join(','));
    expect(hands.size).toBeGreaterThan(5);
  });

  it('難易度が上がるほどピース数が減る（＝1個あたりが大きい）', () => {
    const avg = (d: Difficulty) => {
      let total = 0;
      for (let seed = 0; seed < 10; seed++) total += generateLevel(6, d, seed).hand.length;
      return total / 10;
    };
    const easy = avg('easy');
    const normal = avg('normal');
    const hard = avg('hard');
    expect(easy).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(hard);
  });

  it('hand の中身は solution の構成と一致する', () => {
    const level = generateLevel(5, 'normal', 99);
    expect([...level.hand].sort()).toEqual(level.solution.map((p) => p.pieceId).sort());
  });
});

describe('levelSpec', () => {
  it('レベルが進むと盤面が広がる', () => {
    expect(levelSpec(1).size).toBe(4);
    expect(levelSpec(5).size).toBe(5);
    expect(levelSpec(20).size).toBe(6);
  });

  it('盤面サイズは単調に増える', () => {
    let prev = 0;
    for (let l = 1; l <= 30; l++) {
      const s = levelSpec(l).size;
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
});

describe('findHint', () => {
  it('空盤面から正しい1手を返す', () => {
    const level = generateLevel(5, 'normal', 7);
    const hint = findHint(createBoard(5), level.hand)!;
    expect(hint).not.toBeNull();
    expect(level.hand).toContain(hint.pieceId);
    expect(canPlace(createBoard(5), hint.cells, 0, 0)).toBe(true);
  });

  it('ヒントに従い続ければクリアできる', () => {
    const level = generateLevel(5, 'easy', 3);
    let board = createBoard(5);
    let hand = [...level.hand];
    let guard = 0;
    while (hand.length > 0 && guard++ < 40) {
      const hint = findHint(board, hand);
      expect(hint, `残り ${hand.length}`).not.toBeNull();
      board = place(board, hint!.cells, 0, 0, `h${guard}`);
      hand.splice(hand.indexOf(hint!.pieceId), 1);
    }
    expect(isSolved(board)).toBe(true);
  });

  it('詰んだ盤面では null', () => {
    // 4×4 の中央に O4 を置くと、残り12マスは I4（直線）だけでは埋められない
    const board = place(createBoard(4), PIECES.O4, 1, 1, 'x');
    expect(findHint(board, ['I4', 'I4', 'I4'])).toBeNull();
  });
});
