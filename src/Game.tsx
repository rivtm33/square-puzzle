import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { PIECES } from './lib/pieces';
import { normalize, type Cells } from './lib/geometry';
import { canPlace, type Board } from './lib/board';
import { clampAnchor, offsetFor } from './lib/placement';
import { initGame, reducer, TIME_ATTACK_SECONDS, type Mode } from './game/state';
import { BoardView, type Preview } from './components/BoardView';
import { PieceTray } from './components/PieceTray';
import { PieceShape } from './components/PieceShape';
import { Controls } from './components/Controls';
import { Roulette } from './components/Roulette';
import { Confetti } from './components/Confetti';
import { KeyHelp } from './components/KeyHelp';

const DRAG_THRESHOLD = 8;
/** 指でピースを隠さないように、ドラッグ中は指の少し上を狙う */
const DRAG_LIFT_CELLS = 1.2;

const MODE_LABEL: Record<Mode, string> = {
  normal: 'ノーマル',
  time: 'タイムアタック',
  challenge: 'チャレンジ',
};

/**
 * アンカーを (row,col) に合わせたときの、盤面上のプレビュー。
 * 位置は盤面内に丸めてから作る。見えているプレビューと実際に置かれる場所を必ず一致させるため、
 * 配置側（commit）でも同じ clampAnchor を通す。
 */
function makePreview(board: Board, cells: Cells, row: number, col: number, size: number): Preview {
  if (cells.length === 0) return null;
  const anchor = clampAnchor(cells, row, col, size);
  const { dr, dc } = offsetFor(cells, anchor.row, anchor.col);
  return {
    cells: cells.map(([r, c]) => [r + dr, c + dc] as const),
    valid: canPlace(board, cells, dr, dc),
  };
}

export default function Game({ mode, onExit }: { mode: Mode; onExit: () => void }) {
  const [state, dispatch] = useReducer(reducer, mode, (m) => initGame(m));
  const [dragPreview, setDragPreview] = useState<Preview>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [showRoulette, setShowRoulette] = useState(mode === 'challenge');
  const [showHelp, setShowHelp] = useState(false);
  /** キーボードを使い始めたらカーソルを表示する */
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [remaining, setRemaining] = useState(TIME_ATTACK_SECONDS);
  const [timeUp, setTimeUp] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const dragRef = useRef<{ uid: string; x0: number; y0: number; moved: boolean; wasSelected: boolean } | null>(null);
  const boardPressRef = useRef(false);

  /** 画面座標 → 盤面のマス。盤外なら null */
  const cellAt = useCallback((clientX: number, clientY: number, lift = 0) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const step = rect.width / stateRef.current.size;
    const col = Math.floor((clientX - rect.left) / step);
    const row = Math.floor((clientY - rect.top) / step - lift);
    const n = stateRef.current.size;
    if (row < 0 || col < 0 || row >= n || col >= n) return null;
    return { row, col };
  }, []);

  const activeCells = useCallback((uid: string): Cells => {
    const s = stateRef.current;
    if (s.selectedUid === uid && s.selCells.length > 0) return s.selCells;
    const piece = s.hand.find((h) => h.uid === uid);
    return piece ? normalize(PIECES[piece.pieceId]) : [];
  }, []);

  const commit = useCallback((uid: string, cells: Cells, row: number, col: number) => {
    const anchor = clampAnchor(cells, row, col, stateRef.current.size);
    const { dr, dc } = offsetFor(cells, anchor.row, anchor.col);
    dispatch({ type: 'place', uid, cells, row: dr, col: dc });
  }, []);

  // ---- キーボード操作 ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const s = stateRef.current;
      const k = e.key;
      const lower = k.toLowerCase();
      let handled = true;

      if (k === 'ArrowUp' || lower === 'w') dispatch({ type: 'moveCursor', dr: -1, dc: 0 });
      else if (k === 'ArrowDown' || lower === 's') dispatch({ type: 'moveCursor', dr: 1, dc: 0 });
      else if (k === 'ArrowLeft' || lower === 'a') dispatch({ type: 'moveCursor', dr: 0, dc: -1 });
      else if (k === 'ArrowRight' || lower === 'd') dispatch({ type: 'moveCursor', dr: 0, dc: 1 });
      else if (lower === 'r') dispatch({ type: 'rotate' });
      else if (lower === 'f') dispatch({ type: 'flip' });
      else if (k === 'Enter' || k === ' ') {
        if (s.cleared) dispatch({ type: 'nextLevel' });
        else if (s.selectedUid) dispatch({ type: 'placeAtCursor' });
        else dispatch({ type: 'pickupAtCursor' });
      } else if (k === 'Backspace' || k === 'Delete') dispatch({ type: 'pickupAtCursor' });
      else if (k === 'Escape') {
        if (showHelp) setShowHelp(false);
        else dispatch({ type: 'deselect' });
      } else if (k === 'Tab') dispatch({ type: 'selectStep', delta: e.shiftKey ? -1 : 1 });
      else if (lower === 'e') dispatch({ type: 'selectStep', delta: 1 });
      else if (lower === 'q') dispatch({ type: 'selectStep', delta: -1 });
      else if (/^[1-9]$/.test(k)) dispatch({ type: 'selectIndex', index: Number(k) - 1 });
      else if (lower === 'z') dispatch({ type: 'undo' });
      else if (lower === 'h') dispatch({ type: 'hint' });
      else if (k === '?' || k === '/') setShowHelp((v) => !v);
      else handled = false;

      if (handled) {
        e.preventDefault();
        setKeyboardMode(true);
        // ボタンにフォーカスが残っていると Space / Enter がそちらへ吸われるので外す
        containerRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showHelp]);

  // ---- トレイからのドラッグ（Pointer Events）----
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < DRAG_THRESHOLD) return;
      d.moved = true;
      e.preventDefault();
      setDragPos({ x: e.clientX, y: e.clientY });
      const cell = cellAt(e.clientX, e.clientY, DRAG_LIFT_CELLS);
      setDragPreview(
        cell
          ? makePreview(
              stateRef.current.board,
              activeCells(d.uid),
              cell.row,
              cell.col,
              stateRef.current.size,
            )
          : null,
      );
    };

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDragPos(null);
      setDragPreview(null);
      if (!d) return;
      if (d.moved) {
        const cell = cellAt(e.clientX, e.clientY, DRAG_LIFT_CELLS);
        if (cell) commit(d.uid, activeCells(d.uid), cell.row, cell.col);
      } else if (d.wasSelected) {
        dispatch({ type: 'deselect' });
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [activeCells, cellAt, commit]);

  const onPiecePointerDown = (uid: string, e: React.PointerEvent) => {
    setKeyboardMode(false);
    const wasSelected = state.selectedUid === uid;
    if (!wasSelected) dispatch({ type: 'select', uid });
    dragRef.current = { uid, x0: e.clientX, y0: e.clientY, moved: false, wasSelected };
  };

  // ---- 盤面へのタップ／ドラッグ ----
  const onBoardDown = (e: React.PointerEvent) => {
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    setKeyboardMode(false);
    if (state.selectedUid) {
      boardPressRef.current = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // 指が盤外に出たときの追従が効かないだけなので、失敗しても続行する
      }
      dispatch({ type: 'setCursor', row: cell.row, col: cell.col });
    }
  };

  const onBoardMove = (e: React.PointerEvent) => {
    if (!state.selectedUid) return;
    // 押している間の追従と、マウスならホバーでも追従させる
    if (!boardPressRef.current && e.pointerType !== 'mouse') return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell) dispatch({ type: 'setCursor', row: cell.row, col: cell.col });
  };

  const onBoardUp = (e: React.PointerEvent) => {
    const cell = cellAt(e.clientX, e.clientY);
    if (boardPressRef.current && state.selectedUid) {
      boardPressRef.current = false;
      if (cell) commit(state.selectedUid, activeCells(state.selectedUid), cell.row, cell.col);
      return;
    }
    // 何も選んでいないときに置いたピースをタップ → 手元に戻す
    if (cell) {
      const uid = state.board[cell.row][cell.col];
      if (uid) dispatch({ type: 'pickup', uid });
    }
  };

  const onBoardCancel = () => {
    boardPressRef.current = false;
  };

  // ---- タイムアタックの残り時間 ----
  useEffect(() => {
    if (mode !== 'time' || timeUp) return;
    const id = window.setInterval(() => {
      setRemaining((t) => {
        if (t <= 1) {
          setTimeUp(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [mode, timeUp]);

  // タイムアタックはクリアしたら自動で次の面へ
  useEffect(() => {
    if (mode !== 'time' || !state.cleared || timeUp) return;
    const id = window.setTimeout(() => dispatch({ type: 'nextLevel' }), 1100);
    return () => window.clearTimeout(id);
  }, [mode, state.cleared, timeUp]);

  // トーストの自動消去
  useEffect(() => {
    if (!state.toast) return;
    const id = window.setTimeout(() => dispatch({ type: 'clearToast' }), 1800);
    return () => window.clearTimeout(id);
  }, [state.toast]);

  const dragPiece = dragRef.current
    ? state.hand.find((h) => h.uid === dragRef.current!.uid)
    : undefined;

  const mustSpin = mode === 'challenge' && state.requiredCategory === null && state.hand.length > 0;

  // 選択中はプレビューを出しっぱなしにする。ドラッグ中だけは指の位置を優先。
  const preview =
    dragPreview ??
    (state.selectedUid
      ? makePreview(state.board, state.selCells, state.cursor.row, state.cursor.col, state.size)
      : null);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="mx-auto flex min-h-full w-full max-w-md flex-col gap-3 px-3 pb-4 pt-3 outline-none"
    >
      {/* ヘッダー */}
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-sm"
          aria-label="タイトルへ戻る"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-amber-100/50">{MODE_LABEL[mode]}</p>
          <p className="text-base font-bold leading-tight text-amber-50">
            レベル {state.level}
            <span className="ml-2 text-xs font-normal text-amber-100/50">
              {state.size}×{state.size}／{state.difficulty}
            </span>
          </p>
        </div>
        {mode === 'time' && (
          <div className="text-right">
            <p
              className={`text-xl font-black tabular-nums ${remaining <= 30 ? 'text-red-400' : 'text-amber-50'}`}
            >
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
            </p>
            <p className="text-[11px] text-amber-100/50">クリア {state.clearedCount}</p>
          </div>
        )}
        {mode !== 'time' && (
          <button
            type="button"
            onClick={() => setShowRoulette((v) => !v)}
            disabled={mode === 'challenge'}
            className={`rounded-lg border px-2.5 py-1.5 text-sm disabled:opacity-40 ${
              showRoulette ? 'border-amber-300/50 bg-amber-300/15' : 'border-white/10 bg-white/[0.06]'
            }`}
            aria-label="ルーレットの表示切り替え"
          >
            🎡
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-sm"
          aria-label="キーボード操作の一覧"
        >
          ⌨
        </button>
      </header>

      {showRoulette && (
        <Roulette
          hand={state.hand}
          requiredCategory={state.requiredCategory}
          mustSpin={mustSpin}
          onResult={(category) => dispatch({ type: 'spin', category })}
        />
      )}

      <BoardView
        board={state.board}
        placed={state.placed}
        preview={preview}
        cursor={keyboardMode ? state.cursor : null}
        lastPlacedUid={state.lastPlacedUid}
        boardRef={boardRef}
        onPointerDown={onBoardDown}
        onPointerMove={onBoardMove}
        onPointerUp={onBoardUp}
        onPointerCancel={onBoardCancel}
      />

      <Controls
        hasSelection={state.selectedUid !== null}
        canUndo={state.history.length > 0}
        canReset={state.placed.length > 0}
        onRotate={() => dispatch({ type: 'rotate' })}
        onFlip={() => dispatch({ type: 'flip' })}
        onUndo={() => dispatch({ type: 'undo' })}
        onReset={() => dispatch({ type: 'reset' })}
        onHint={() => dispatch({ type: 'hint' })}
      />

      <div className="rounded-2xl border border-amber-100/10 bg-black/25">
        <PieceTray
          hand={state.hand}
          selectedUid={state.selectedUid}
          selCells={state.selCells}
          requiredCategory={mode === 'challenge' ? state.requiredCategory : null}
          onPiecePointerDown={onPiecePointerDown}
        />
      </div>

      {/* ドラッグ中に指を追いかけるピース */}
      {dragPos && dragPiece && (
        <div
          className="pointer-events-none fixed z-50 opacity-85"
          style={{ left: dragPos.x, top: dragPos.y, transform: 'translate(-50%, -140%)' }}
        >
          <PieceShape cells={activeCells(dragPiece.uid)} color={dragPiece.color} cell={20} />
        </div>
      )}

      {/* トースト */}
      {state.toast && (
        <div
          key={state.toast.id}
          className="shake pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-stone-900/95 px-4 py-2 text-sm text-amber-50 shadow-lg"
          role="status"
        >
          {state.toast.text}
        </div>
      )}

      {showHelp && <KeyHelp onClose={() => setShowHelp(false)} />}

      {/* クリア演出 */}
      {state.cleared && !timeUp && (
        <>
          <Confetti />
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
            <div className="w-full max-w-xs rounded-3xl border border-amber-200/25 bg-stone-900/95 p-6 text-center">
              <p className="text-3xl font-black text-amber-200">クリア！</p>
              <p className="mt-1 text-sm text-amber-100/60">
                レベル {state.level}（{state.size}×{state.size}）
                {state.hintsUsed > 0 && ` ／ ヒント ${state.hintsUsed}回`}
              </p>
              {mode !== 'time' && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'nextLevel' })}
                  className="mt-5 w-full rounded-xl bg-amber-300 py-3 font-bold text-stone-900 active:scale-95"
                >
                  つぎのレベルへ
                  <span className="ml-2 text-xs font-normal opacity-60">Enter</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* タイムアップ */}
      {timeUp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-xs rounded-3xl border border-amber-200/25 bg-stone-900/95 p-6 text-center">
            <p className="text-2xl font-black text-amber-200">タイムアップ！</p>
            <p className="mt-2 text-5xl font-black tabular-nums text-amber-50">{state.clearedCount}</p>
            <p className="text-sm text-amber-100/60">面クリア</p>
            <button
              type="button"
              onClick={() => {
                setRemaining(TIME_ATTACK_SECONDS);
                setTimeUp(false);
                dispatch({ type: 'newRun' });
              }}
              className="mt-5 w-full rounded-xl bg-amber-300 py-3 font-bold text-stone-900 active:scale-95"
            >
              もういちど
            </button>
            <button
              type="button"
              onClick={onExit}
              className="mt-2 w-full rounded-xl border border-white/15 py-2.5 text-sm text-amber-50"
            >
              タイトルへ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
