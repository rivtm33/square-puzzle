export type Cell = readonly [number, number];
export type Cells = readonly Cell[];

/** 走査順（上から下、左から右）で比較 */
const byScanOrder = (a: Cell, b: Cell): number => (a[0] - b[0]) || (a[1] - b[1]);

/**
 * 左上を (0,0) に揃え、走査順にソートした正規形を返す。
 * 形状の同一判定はこの正規形の文字列キーで行う。
 */
export function normalize(cells: Cells): Cells {
  if (cells.length === 0) return [];
  let minR = Infinity;
  let minC = Infinity;
  for (const [r, c] of cells) {
    if (r < minR) minR = r;
    if (c < minC) minC = c;
  }
  return cells
    .map(([r, c]) => [r - minR, c - minC] as Cell)
    .sort(byScanOrder);
}

/** 時計回りに90度回転: (r,c) -> (c, maxR - r) */
export function rotate(cells: Cells): Cells {
  if (cells.length === 0) return [];
  const maxR = Math.max(...cells.map(([r]) => r));
  return normalize(cells.map(([r, c]) => [c, maxR - r] as Cell));
}

/** 左右反転: (r,c) -> (r, maxC - c) */
export function flip(cells: Cells): Cells {
  if (cells.length === 0) return [];
  const maxC = Math.max(...cells.map(([, c]) => c));
  return normalize(cells.map(([r, c]) => [r, maxC - c] as Cell));
}

/** 正規形の文字列キー */
export function shapeKey(cells: Cells): string {
  return normalize(cells)
    .map(([r, c]) => `${r},${c}`)
    .join(' ');
}

/**
 * 回転4通り × 反転2通りの計8通りを生成し、重複形状を除いたものを返す。
 * 返り値はすべて正規形で、順序は安定（同じ入力なら常に同じ並び）。
 */
export function allOrientations(cells: Cells): Cells[] {
  const out: Cells[] = [];
  const seen = new Set<string>();
  let cur = normalize(cells);
  for (let f = 0; f < 2; f++) {
    for (let r = 0; r < 4; r++) {
      const key = shapeKey(cur);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(cur);
      }
      cur = rotate(cur);
    }
    cur = flip(cur);
  }
  return out;
}

/** 正規形の外接矩形サイズ */
export function bounds(cells: Cells): { rows: number; cols: number } {
  if (cells.length === 0) return { rows: 0, cols: 0 };
  const maxR = Math.max(...cells.map(([r]) => r));
  const maxC = Math.max(...cells.map(([, c]) => c));
  return { rows: maxR + 1, cols: maxC + 1 };
}

/**
 * そのピースを置くときの「基準マス」＝走査順で最初のマス。
 * 正規形はソート済みなので先頭がそれにあたる。
 * 盤面タップ時はこのマスがタップ位置に来るように配置する。
 */
export function anchorCell(cells: Cells): Cell {
  return normalize(cells)[0] ?? [0, 0];
}
