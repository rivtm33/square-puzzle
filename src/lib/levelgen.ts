import { PIECES, type PieceId } from './pieces';
import { createBoard, type Board } from './board';
import { ORIENTATIONS, solve, type Placement } from './solver';
import { mulberry32, randomSeed, shuffle, weightedOrder } from './rng';

export type Difficulty = 'easy' | 'normal' | 'hard';

/**
 * 難易度ごとの出やすさ。値が大きいほど選ばれやすい。
 * 小さいピースが多いほど簡単なので、easy は 2〜4マスを厚くする。
 */
const WEIGHTS: Record<Difficulty, Partial<Record<PieceId, number>>> = {
  easy: {
    I1: 2, I2: 7, I3: 5, V3: 7,
    O4: 4, L4: 3, T4: 3, S4: 2, I4: 2,
    P5: 1,
  },
  normal: {
    I1: 1, I2: 2, I3: 3, V3: 3,
    I4: 3, L4: 4, O4: 3, S4: 3, T4: 4,
    I5: 1.5, L5: 2, Y5: 2, N5: 2, P5: 2.5, U5: 1.5,
    V5: 2, T5: 2, W5: 2, Z5: 2, F5: 1.5, X5: 1,
  },
  hard: {
    I1: 0.3, I2: 0.6, I3: 1, V3: 1,
    I4: 1.2, L4: 1.2, O4: 1, S4: 1.2, T4: 1.2,
    I5: 4, L5: 5, Y5: 5, N5: 5, P5: 5, U5: 4,
    V5: 5, T5: 5, W5: 4, Z5: 4, F5: 4, X5: 3,
  },
};

const poolFor = (d: Difficulty): PieceId[] =>
  (Object.keys(WEIGHTS[d]) as PieceId[]).filter((id) => (WEIGHTS[d][id] ?? 0) > 0);

export type Level = {
  size: number;
  difficulty: Difficulty;
  seed: number;
  /** 手持ちピース（並びはシャッフル済み）。マス数の合計 = size*size */
  hand: PieceId[];
  /** 生成時に使った正解の一例 */
  solution: Placement[];
};

/**
 * 空盤面をランダムに敷き詰める。
 * solve() と同じ「最も左上の空きマスを必ず埋める」方式だが、
 * ピースの在庫は無制限で、候補の順序を難易度の重みでランダム化する。
 */
function tileBoard(size: number, difficulty: Difficulty, rng: () => number): Placement[] | null {
  const n = size;
  const grid = new Uint8Array(n * n);
  const pool = poolFor(difficulty);
  const weights = WEIGHTS[difficulty];
  const result: Placement[] = [];
  let nodes = 0;

  const search = (left: number, from: number): boolean => {
    if (left === 0) return true;
    if (++nodes > 200_000) return false;

    let target = from;
    while (target < grid.length && grid[target] === 1) target++;
    if (target >= grid.length) return false;
    const tr = (target / n) | 0;
    const tc = target % n;

    for (const pieceId of weightedOrder(pool, (id) => weights[id] ?? 0, rng)) {
      const size2 = PIECES[pieceId].length;
      if (size2 > left) continue;

      for (const ori of shuffle(ORIENTATIONS[pieceId], rng)) {
        const dr = tr - ori[0][0];
        const dc = tc - ori[0][1];

        let fits = true;
        for (const [r, c] of ori) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n || grid[rr * n + cc] === 1) { fits = false; break; }
        }
        if (!fits) continue;

        for (const [r, c] of ori) grid[(r + dr) * n + (c + dc)] = 1;
        result.push({ pieceId, cells: ori.map(([r, c]) => [r + dr, c + dc] as const) });

        if (search(left - size2, target + 1)) return true;

        result.pop();
        for (const [r, c] of ori) grid[(r + dr) * n + (c + dc)] = 0;
      }
    }
    return false;
  };

  return search(n * n, 0) ? result : null;
}

/**
 * 必ず解が存在するレベルを生成する。
 * 完成状態をランダムに作り、その構成をそのまま手持ちピースとして出題するので、
 * 「解けないレベル」は原理的に出ない（念のため solve() でも検証している）。
 */
export function generateLevel(size: number, difficulty: Difficulty, seed = randomSeed()): Level {
  for (let attempt = 0; attempt < 40; attempt++) {
    const rng = mulberry32((seed + attempt * 0x9e3779b1) >>> 0);
    const solution = tileBoard(size, difficulty, rng);
    if (!solution) continue;

    const hand = shuffle(solution.map((p) => p.pieceId), rng);
    // 生成ロジックの自己検証。ここが落ちることは通常ない。
    if (!solve(createBoard(size), hand, { maxNodes: 300_000 })) continue;

    return { size, difficulty, seed, hand, solution };
  }
  throw new Error(`レベル生成に失敗しました (size=${size}, difficulty=${difficulty})`);
}

/** ノーマルモードのレベル進行：4×4 → 5×5 → 6×6 と広がり、難易度も上がる */
export function levelSpec(level: number): { size: number; difficulty: Difficulty } {
  if (level <= 2) return { size: 4, difficulty: 'easy' };
  if (level <= 4) return { size: 4, difficulty: 'normal' };
  if (level <= 7) return { size: 5, difficulty: 'easy' };
  if (level <= 10) return { size: 5, difficulty: 'normal' };
  if (level <= 13) return { size: 5, difficulty: 'hard' };
  if (level <= 16) return { size: 6, difficulty: 'normal' };
  return { size: 6, difficulty: 'hard' };
}

/**
 * ヒント：今の盤面と残り手持ちから解を1つ求め、その最初の配置を返す。
 * 解が無い（＝どこかで間違えている）場合は null。
 */
export function findHint(board: Board, hand: PieceId[]): Placement | null {
  const solution = solve(board, hand, { maxNodes: 500_000 });
  return solution && solution.length > 0 ? solution[0] : null;
}
