import { PIECES, categoryOf, type PieceId } from '../lib/pieces';
import { normalize, rotate, flip, type Cells } from '../lib/geometry';
import { createBoard, canPlace, place, remove, isSolved, type Board } from '../lib/board';
import { clampAnchor, firstFit, offsetFor, type Anchor } from '../lib/placement';
import { generateLevel, levelSeed, levelSpec, findHint, type Difficulty } from '../lib/levelgen';
import { COLOR_ORDER, type ColorKey } from './colors';

export type Mode = 'normal' | 'time' | 'challenge';

export const TIME_ATTACK_SECONDS = 180;

export type HandPiece = { uid: string; pieceId: PieceId; color: ColorKey };
export type PlacedPiece = HandPiece & { cells: Cells };

type Snapshot = { board: Board; hand: HandPiece[]; placed: PlacedPiece[] };

export type GameState = {
  mode: Mode;
  level: number;
  size: number;
  difficulty: Difficulty;
  board: Board;
  hand: HandPiece[];
  placed: PlacedPiece[];
  /** 選択中の手持ちピース */
  selectedUid: string | null;
  /** 選択中ピースの現在の向き（正規形） */
  selCells: Cells;
  /**
   * 盤面カーソル。選択中ピースの「アンカー（走査順で最初のマス）」が来る位置。
   * キーボードでもタップでもここを動かし、プレビューは常にここに出る。
   */
  cursor: Anchor;
  history: Snapshot[];
  cleared: boolean;
  /** タイムアタックでクリアした面数 */
  clearedCount: number;
  /** この面で使ったヒントの回数 */
  hintsUsed: number;
  /** この面でピースを置いた回数 */
  moves: number;
  /** チャレンジモードで次に置かなければならないカテゴリ */
  requiredCategory: string | null;
  toast: { text: string; id: number } | null;
  /** 直近に置いたピース（アニメーション用） */
  lastPlacedUid: string | null;
};

let uidCounter = 0;
const nextUid = () => `p${++uidCounter}`;

function buildLevel(mode: Mode, level: number) {
  const spec = levelSpec(mode === 'time' ? Math.min(level, 8) : level);
  // ノーマル／チャレンジはレベル番号から問題を決める（＝毎回同じ問題なのでタイムを比べられる）。
  // タイムアタックは走るたびに違う問題にしたいので、シードを渡さず毎回ランダムにする。
  const generated =
    mode === 'time'
      ? generateLevel(spec.size, spec.difficulty)
      : generateLevel(spec.size, spec.difficulty, levelSeed(level));
  const hand: HandPiece[] = generated.hand.map((pieceId, i) => ({
    uid: nextUid(),
    pieceId,
    color: COLOR_ORDER[i % COLOR_ORDER.length],
  }));
  return { size: spec.size, difficulty: spec.difficulty, hand, board: createBoard(spec.size) };
}

export function initGame(mode: Mode, level = 1): GameState {
  const built = buildLevel(mode, level);
  return {
    mode,
    level,
    size: built.size,
    difficulty: built.difficulty,
    board: built.board,
    hand: built.hand,
    placed: [],
    selectedUid: null,
    selCells: [],
    cursor: { row: 0, col: 0 },
    history: [],
    cleared: false,
    clearedCount: 0,
    hintsUsed: 0,
    moves: 0,
    requiredCategory: null,
    toast: null,
    lastPlacedUid: null,
  };
}

export type Action =
  | { type: 'select'; uid: string }
  | { type: 'deselect' }
  | { type: 'rotate' }
  | { type: 'flip' }
  | { type: 'selectStep'; delta: number }
  | { type: 'selectIndex'; index: number }
  | { type: 'moveCursor'; dr: number; dc: number }
  | { type: 'setCursor'; row: number; col: number }
  | { type: 'place'; uid: string; cells: Cells; row: number; col: number }
  | { type: 'placeAtCursor' }
  | { type: 'pickupAtCursor' }
  | { type: 'pickup'; uid: string }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'hint' }
  | { type: 'spin'; category: string }
  | { type: 'nextLevel' }
  | { type: 'newRun' }
  | { type: 'clearToast' };

/** ピースを選び直したときのカーソル。まず「そのまま入る場所」を探し、無ければ今の位置を丸める */
function cursorForSelection(state: GameState, cells: Cells): Anchor {
  return firstFit(state.board, cells) ?? clampAnchor(cells, state.cursor.row, state.cursor.col, state.size);
}

const withSelection = (state: GameState, uid: string, cells: Cells): GameState => ({
  ...state,
  selectedUid: uid,
  selCells: cells,
  cursor: cursorForSelection(state, cells),
});

const snapshot = (s: GameState): Snapshot => ({ board: s.board, hand: s.hand, placed: s.placed });

const toast = (s: GameState, text: string): GameState => ({
  ...s,
  toast: { text, id: (s.toast?.id ?? 0) + 1 },
});

function commitPlace(
  state: GameState,
  piece: HandPiece,
  cells: Cells,
  row: number,
  col: number,
): GameState {
  if (!canPlace(state.board, cells, row, col)) return toast(state, 'そこには置けません');

  if (state.mode === 'challenge') {
    if (state.requiredCategory === null) return toast(state, 'まずルーレットを回してね');
    if (categoryOf(piece.pieceId) !== state.requiredCategory) {
      return toast(state, 'ルーレットで出た種類のピースを置いてね');
    }
  }

  const abs: Cells = cells.map(([r, c]) => [r + row, c + col] as const);
  const board = place(state.board, cells, row, col, piece.uid);
  const solved = isSolved(board);

  return {
    ...state,
    history: [...state.history, snapshot(state)],
    board,
    hand: state.hand.filter((h) => h.uid !== piece.uid),
    placed: [...state.placed, { ...piece, cells: abs }],
    selectedUid: null,
    selCells: [],
    requiredCategory: null,
    cleared: solved,
    clearedCount: solved ? state.clearedCount + 1 : state.clearedCount,
    lastPlacedUid: piece.uid,
    moves: state.moves + 1,
    toast: null,
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'select': {
      const piece = state.hand.find((h) => h.uid === action.uid);
      if (!piece) return state;
      if (state.selectedUid === action.uid) return { ...state, selectedUid: null, selCells: [] };
      return withSelection(state, action.uid, normalize(PIECES[piece.pieceId]));
    }

    /** トレイの前後のピースへ。何も選んでいなければ端から */
    case 'selectStep': {
      if (state.hand.length === 0) return state;
      const at = state.hand.findIndex((h) => h.uid === state.selectedUid);
      const next = at < 0
        ? (action.delta > 0 ? 0 : state.hand.length - 1)
        : (at + action.delta + state.hand.length) % state.hand.length;
      const piece = state.hand[next];
      return withSelection(state, piece.uid, normalize(PIECES[piece.pieceId]));
    }

    case 'selectIndex': {
      const piece = state.hand[action.index];
      if (!piece) return state;
      return withSelection(state, piece.uid, normalize(PIECES[piece.pieceId]));
    }

    case 'deselect':
      return { ...state, selectedUid: null, selCells: [] };

    /** 回転・反転してもカーソルは動かさない。はみ出す分だけ内側へ丸める */
    case 'rotate': {
      if (!state.selectedUid) return state;
      const cells = rotate(state.selCells);
      return { ...state, selCells: cells, cursor: clampAnchor(cells, state.cursor.row, state.cursor.col, state.size) };
    }

    case 'flip': {
      if (!state.selectedUid) return state;
      const cells = flip(state.selCells);
      return { ...state, selCells: cells, cursor: clampAnchor(cells, state.cursor.row, state.cursor.col, state.size) };
    }

    case 'moveCursor':
      return {
        ...state,
        cursor: clampAnchor(
          state.selCells,
          state.cursor.row + action.dr,
          state.cursor.col + action.dc,
          state.size,
        ),
        toast: null,
      };

    case 'setCursor':
      return {
        ...state,
        cursor: clampAnchor(state.selCells, action.row, action.col, state.size),
      };

    case 'placeAtCursor': {
      if (!state.selectedUid) return state;
      const piece = state.hand.find((h) => h.uid === state.selectedUid);
      if (!piece) return state;
      const { dr, dc } = offsetFor(state.selCells, state.cursor.row, state.cursor.col);
      return commitPlace(state, piece, state.selCells, dr, dc);
    }

    /** カーソルの下にあるピースを手元に戻す */
    case 'pickupAtCursor': {
      const uid = state.board[state.cursor.row]?.[state.cursor.col];
      if (!uid) return toast(state, 'ここにはピースがありません');
      return reducer(state, { type: 'pickup', uid });
    }

    case 'place': {
      const piece = state.hand.find((h) => h.uid === action.uid);
      if (!piece) return state;
      return commitPlace(state, piece, action.cells, action.row, action.col);
    }

    case 'pickup': {
      const piece = state.placed.find((p) => p.uid === action.uid);
      if (!piece) return state;
      return {
        ...state,
        history: [...state.history, snapshot(state)],
        board: remove(state.board, action.uid),
        placed: state.placed.filter((p) => p.uid !== action.uid),
        hand: [...state.hand, { uid: piece.uid, pieceId: piece.pieceId, color: piece.color }],
        cleared: false,
        lastPlacedUid: null,
      };
    }

    case 'undo': {
      const prev = state.history.at(-1);
      if (!prev) return toast(state, 'もう戻せません');
      return {
        ...state,
        ...prev,
        history: state.history.slice(0, -1),
        selectedUid: null,
        selCells: [],
        cursor: state.cursor,
        cleared: false,
        lastPlacedUid: null,
        toast: null,
      };
    }

    case 'reset': {
      if (state.placed.length === 0) return state;
      const first = state.history[0] ?? snapshot(state);
      return {
        ...state,
        ...first,
        history: [],
        selectedUid: null,
        selCells: [],
        cursor: { row: 0, col: 0 },
        cleared: false,
        hintsUsed: 0,
        moves: 0,
        requiredCategory: null,
        lastPlacedUid: null,
      };
    }

    case 'hint': {
      const hint = findHint(state.board, state.hand.map((h) => h.pieceId));
      if (!hint) return toast(state, 'この置き方だとクリアできません。戻してみよう');
      const piece = state.hand.find((h) => h.pieceId === hint.pieceId)!;
      const minR = Math.min(...hint.cells.map(([r]) => r));
      const minC = Math.min(...hint.cells.map(([, c]) => c));
      const rel: Cells = hint.cells.map(([r, c]) => [r - minR, c - minC] as const);
      const next = commitPlace(
        // ヒントはチャレンジの縛りを無視して置ける
        { ...state, requiredCategory: state.mode === 'challenge' ? categoryOf(piece.pieceId) : null },
        piece,
        rel,
        minR,
        minC,
      );
      return { ...next, hintsUsed: state.hintsUsed + 1 };
    }

    case 'spin':
      return { ...state, requiredCategory: action.category, toast: null };

    case 'nextLevel': {
      const level = state.level + 1;
      const built = buildLevel(state.mode, level);
      return {
        ...state,
        level,
        ...built,
        placed: [],
        selectedUid: null,
        selCells: [],
        cursor: { row: 0, col: 0 },
        history: [],
        cleared: false,
        hintsUsed: 0,
        moves: 0,
        requiredCategory: null,
        lastPlacedUid: null,
        toast: null,
      };
    }

    /** タイムアタックのやり直し。レベルもクリア数も最初から */
    case 'newRun':
      return initGame(state.mode);

    case 'clearToast':
      return { ...state, toast: null };

    default:
      return state;
  }
}
