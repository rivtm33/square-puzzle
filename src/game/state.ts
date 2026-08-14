import { PIECES, categoryOf, type PieceId } from '../lib/pieces';
import { normalize, rotate, flip, type Cells } from '../lib/geometry';
import { createBoard, canPlace, place, remove, isSolved, type Board } from '../lib/board';
import { generateLevel, levelSpec, findHint, type Difficulty } from '../lib/levelgen';
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
  history: Snapshot[];
  cleared: boolean;
  /** タイムアタックでクリアした面数 */
  clearedCount: number;
  hintsUsed: number;
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
  const generated = generateLevel(spec.size, spec.difficulty);
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
    history: [],
    cleared: false,
    clearedCount: 0,
    hintsUsed: 0,
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
  | { type: 'place'; uid: string; cells: Cells; row: number; col: number }
  | { type: 'pickup'; uid: string }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'hint' }
  | { type: 'spin'; category: string }
  | { type: 'nextLevel' }
  | { type: 'newRun' }
  | { type: 'clearToast' };

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
    toast: null,
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'select': {
      const piece = state.hand.find((h) => h.uid === action.uid);
      if (!piece) return state;
      if (state.selectedUid === action.uid) return { ...state, selectedUid: null, selCells: [] };
      return { ...state, selectedUid: action.uid, selCells: normalize(PIECES[piece.pieceId]) };
    }

    case 'deselect':
      return { ...state, selectedUid: null, selCells: [] };

    case 'rotate':
      return state.selectedUid ? { ...state, selCells: rotate(state.selCells) } : state;

    case 'flip':
      return state.selectedUid ? { ...state, selCells: flip(state.selCells) } : state;

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
        cleared: false,
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
        history: [],
        cleared: false,
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
