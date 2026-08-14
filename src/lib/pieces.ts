/** ブロックス21種のポリオミノ定義。座標は [row, col]。 */
export const PIECES: Record<string, [number, number][]> = {
  I1: [[0, 0]],
  I2: [[0, 0], [0, 1]],
  I3: [[0, 0], [0, 1], [0, 2]],
  V3: [[0, 0], [0, 1], [1, 0]],
  I4: [[0, 0], [0, 1], [0, 2], [0, 3]],
  L4: [[0, 0], [1, 0], [2, 0], [2, 1]],
  O4: [[0, 0], [0, 1], [1, 0], [1, 1]],
  S4: [[0, 1], [0, 2], [1, 0], [1, 1]],
  T4: [[0, 0], [0, 1], [0, 2], [1, 1]],
  I5: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  L5: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],
  Y5: [[0, 1], [1, 0], [1, 1], [2, 1], [3, 1]],
  N5: [[0, 1], [1, 1], [2, 0], [2, 1], [3, 0]],
  P5: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]],
  U5: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]],
  V5: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  T5: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]],
  W5: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
  Z5: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  F5: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]],
  X5: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
};

export type PieceId = keyof typeof PIECES & string;

export const PIECE_IDS = Object.keys(PIECES) as PieceId[];

/** ピースのマス数 */
export const pieceSize = (id: PieceId): number => PIECES[id].length;

/** ルーレット用のカテゴリ分類（実機のルーレット面を再現） */
export type RouletteCategory = {
  id: string;
  label: string;
  emoji: string;
  pieces: PieceId[];
};

export const ROULETTE_CATEGORIES: RouletteCategory[] = [
  { id: 'single', label: '1マス', emoji: '▪', pieces: ['I1'] },
  { id: 'double', label: '2マス', emoji: '▬', pieces: ['I2'] },
  { id: 'bar', label: '長い棒', emoji: '≡', pieces: ['I3', 'I4', 'I5'] },
  { id: 'square', label: '四角', emoji: '◼', pieces: ['O4', 'P5'] },
  { id: 'ell', label: 'L字', emoji: '⌐', pieces: ['V3', 'L4', 'L5', 'V5', 'Y5', 'U5'] },
  { id: 'zig', label: 'ジグザグ', emoji: '⌇', pieces: ['S4', 'N5', 'Z5', 'W5'] },
  { id: 'tee', label: '十字・T', emoji: '✚', pieces: ['T4', 'T5', 'X5', 'F5'] },
];

const CATEGORY_OF: Record<string, string> = {};
for (const c of ROULETTE_CATEGORIES) for (const p of c.pieces) CATEGORY_OF[p] = c.id;

export const categoryOf = (id: PieceId): string => CATEGORY_OF[id];
