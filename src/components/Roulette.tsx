import { useRef, useState } from 'react';
import { ROULETTE_CATEGORIES, categoryOf, PIECES } from '../lib/pieces';
import { COLORS, COLOR_ORDER } from '../game/colors';
import { PieceShape } from './PieceShape';
import type { HandPiece } from '../game/state';

const SECTORS = ROULETTE_CATEGORIES.length;
const SECTOR_DEG = 360 / SECTORS;
const SPIN_MS = 2200;

type Props = {
  hand: HandPiece[];
  requiredCategory: string | null;
  /** チャレンジモードでは回すまで置けない */
  mustSpin: boolean;
  onResult: (categoryId: string) => void;
};

export function Roulette({ hand, requiredCategory, mustSpin, onResult }: Props) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<number | null>(null);

  // 手持ちに残っている種類だけを対象にする（絶対に置けない目が出ないように）
  const available = ROULETTE_CATEGORIES.filter((cat) =>
    hand.some((h) => categoryOf(h.pieceId) === cat.id),
  );

  const wheel = ROULETTE_CATEGORIES.map((_, i) => {
    const c = COLORS[COLOR_ORDER[i % COLOR_ORDER.length]];
    return `${c.base} ${i * SECTOR_DEG}deg ${(i + 1) * SECTOR_DEG}deg`;
  }).join(', ');

  const spin = () => {
    if (spinning || available.length === 0) return;
    const target = available[Math.floor(Math.random() * available.length)];
    const index = ROULETTE_CATEGORIES.indexOf(target);
    const center = index * SECTOR_DEG + SECTOR_DEG / 2;
    // 現在の回転量より必ず先へ進むように、5周ぶん足してから目的の角度に合わせる
    const turns = Math.ceil(rotation / 360) + 5;
    setRotation(turns * 360 - center);
    setSpinning(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setSpinning(false);
      onResult(target.id);
    }, SPIN_MS);
  };

  const current = ROULETTE_CATEGORIES.find((c) => c.id === requiredCategory) ?? null;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-amber-100/10 bg-black/25 p-3">
      <div className="relative shrink-0">
        {/* 上の指針 */}
        <div
          className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '14px solid #fde68a',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
          }}
        />
        <button
          type="button"
          onClick={spin}
          disabled={spinning || available.length === 0}
          aria-label="ルーレットを回す"
          className={`relative h-24 w-24 rounded-full border-2 border-amber-100/40 disabled:opacity-60 ${
            mustSpin && !spinning ? 'spin-glow' : ''
          }`}
          style={{
            background: `conic-gradient(${wheel})`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.17,0.72,0.19,1)` : 'none',
            boxShadow: 'inset 0 0 18px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.45)',
          }}
        >
          {ROULETTE_CATEGORIES.map((cat, i) => {
            const angle = i * SECTOR_DEG + SECTOR_DEG / 2;
            return (
              <span
                key={cat.id}
                className="absolute left-1/2 top-1/2 text-[13px] leading-none text-black/80"
                style={{
                  transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(-30px) rotate(${-angle}deg)`,
                }}
              >
                {cat.emoji}
              </span>
            );
          })}
          <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/50 bg-stone-900/90" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        {spinning ? (
          <p className="text-sm text-amber-100/70">まわしてるよ…</p>
        ) : current ? (
          <div>
            <p className="text-xs text-amber-100/55">つぎに置くのは</p>
            <p className="text-lg font-bold text-amber-100">{current.label}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[...new Set(hand.filter((h) => categoryOf(h.pieceId) === current.id).map((h) => h.pieceId))]
                .slice(0, 5)
                .map((pieceId) => (
                  <PieceShape key={pieceId} cells={PIECES[pieceId]} color="yellow" cell={9} gap={1} />
                ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-100/70">
            {available.length === 0 ? 'ピースが残っていません' : 'ルーレットを回してね'}
          </p>
        )}
      </div>
    </div>
  );
}
