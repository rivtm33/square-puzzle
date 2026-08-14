import { PIECES, type PieceId } from './pieces';
import { allOrientations, type Cells } from './geometry';
import { type Board } from './board';

/** 各ピースの全向き（回転4×反転2から重複を除いたもの）をモジュール初期化時に一度だけ計算 */
export const ORIENTATIONS: Record<string, Cells[]> = Object.fromEntries(
  Object.entries(PIECES).map(([id, cells]) => [id, allOrientations(cells)]),
);

export type Placement = {
  pieceId: PieceId;
  /** 盤面上の絶対座標 */
  cells: Cells;
};

export type SolveOptions = {
  /** 探索ノード数の上限（超えたら打ち切って null を返す） */
  maxNodes?: number;
  /** 候補の並びをシャッフルする乱数。省略時は決定的 */
  rng?: () => number;
};

type Grid = Uint8Array;

function toGrid(board: Board): { grid: Grid; n: number } {
  const n = board.length;
  const grid = new Uint8Array(n * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) grid[r * n + c] = board[r][c] === null ? 0 : 1;
  }
  return { grid, n };
}

/** 与えられたサイズの多重集合から作れる合計値の集合（有界ナップサック） */
function reachableSums(sizeCounts: number[], total: number): Uint8Array {
  const ok = new Uint8Array(total + 1);
  ok[0] = 1;
  for (let size = 1; size < sizeCounts.length; size++) {
    let count = sizeCounts[size];
    // 1,2,4,... のまとめ方（バイナリ分割）で有界個数を扱う
    let chunk = 1;
    while (count > 0) {
      const take = Math.min(chunk, count) * size;
      for (let s = total; s >= take; s--) if (ok[s - take]) ok[s] = 1;
      count -= Math.min(chunk, count);
      chunk *= 2;
    }
  }
  return ok;
}

/**
 * 空きマスの連結成分を調べ、どれか一つでも
 * 「手持ちピースのサイズの組み合わせで作れないサイズ」なら false（＝枝刈り）。
 */
function regionsFeasible(grid: Grid, n: number, sizeCounts: number[], totalLeft: number): boolean {
  const sums = reachableSums(sizeCounts, totalLeft);
  const seen = new Uint8Array(n * n);
  const stack: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 1 || seen[i]) continue;
    let size = 0;
    seen[i] = 1;
    stack.push(i);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const r = (cur / n) | 0;
      const c = cur % n;
      size++;
      if (r > 0 && !grid[cur - n] && !seen[cur - n]) { seen[cur - n] = 1; stack.push(cur - n); }
      if (r < n - 1 && !grid[cur + n] && !seen[cur + n]) { seen[cur + n] = 1; stack.push(cur + n); }
      if (c > 0 && !grid[cur - 1] && !seen[cur - 1]) { seen[cur - 1] = 1; stack.push(cur - 1); }
      if (c < n - 1 && !grid[cur + 1] && !seen[cur + 1]) { seen[cur + 1] = 1; stack.push(cur + 1); }
    }
    if (size > totalLeft || !sums[size]) return false;
  }
  return true;
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 「この盤面を、この手持ちピース集合でぴったり埋められるか」をバックトラッキングで解く。
 *
 * 探索順は "残りの空きマスのうち最も左上のマスを必ず埋める" 方式。
 * 正規形の先頭マス（走査順で最初のマス）がその目標マスに一致する置き方だけを試せばよいので、
 * 位置の候補が一気に減る。これが高速化の要。
 *
 * @returns 解が見つかれば配置一覧、見つからなければ null
 */
export function solve(board: Board, hand: PieceId[], options: SolveOptions = {}): Placement[] | null {
  const { maxNodes = 2_000_000, rng } = options;
  const { grid, n } = toGrid(board);

  let empty = 0;
  for (let i = 0; i < grid.length; i++) if (!grid[i]) empty++;

  const counts = new Map<PieceId, number>();
  let handArea = 0;
  for (const id of hand) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
    handArea += PIECES[id].length;
  }
  // マス数が合わなければ探索するまでもない
  if (handArea !== empty) return null;

  const sizeCounts = new Array<number>(6).fill(0);
  for (const [id, count] of counts) sizeCounts[PIECES[id].length] += count;

  const result: Placement[] = [];
  let nodes = 0;

  const search = (left: number, from: number): boolean => {
    if (left === 0) return true;
    if (++nodes > maxNodes) return false;

    let target = from;
    while (target < grid.length && grid[target] === 1) target++;
    if (target >= grid.length) return false;
    const tr = (target / n) | 0;
    const tc = target % n;

    if (!regionsFeasible(grid, n, sizeCounts, left)) return false;

    const ids = [...counts.keys()].filter((id) => (counts.get(id) ?? 0) > 0);
    for (const pieceId of rng ? shuffled(ids, rng) : ids) {
      const size = PIECES[pieceId].length;
      const oris = rng ? shuffled(ORIENTATIONS[pieceId].slice(), rng) : ORIENTATIONS[pieceId];

      for (const ori of oris) {
        // ori[0] が走査順で最初のマス。これを target に合わせる。
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
        counts.set(pieceId, counts.get(pieceId)! - 1);
        sizeCounts[size]--;
        const abs = ori.map(([r, c]) => [r + dr, c + dc] as const);
        result.push({ pieceId, cells: abs });

        if (search(left - size, target + 1)) return true;

        result.pop();
        sizeCounts[size]++;
        counts.set(pieceId, counts.get(pieceId)! + 1);
        for (const [r, c] of ori) grid[(r + dr) * n + (c + dc)] = 0;
      }
    }
    return false;
  };

  return search(empty, 0) ? result : null;
}

/** 解が存在するかどうかだけ知りたいとき */
export function isSolvable(board: Board, hand: PieceId[], options?: SolveOptions): boolean {
  return solve(board, hand, options) !== null;
}
