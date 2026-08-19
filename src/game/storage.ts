/**
 * 進捗の保存。localStorage を触るのは load/save だけで、
 * 中身をいじる関数はすべて純粋にしてテストできるようにしている。
 */

export const STORAGE_KEY = 'square-puzzle:progress:v1';

/** 挑戦できるレベルの上限。ここまでクリアすると打ち止め */
export const MAX_LEVEL = 30;

export type LevelRecord = {
  /** ベストタイム(ミリ秒) */
  bestMs: number;
  /** そのときに使ったヒントの回数の最小値 */
  bestHints: number;
  /** 最後にクリアした時刻 */
  clearedAt: number;
  /** クリアした回数 */
  plays: number;
};

export type TimeAttackRecord = { score: number; at: number };

export type Progress = {
  version: 1;
  levels: Record<string, LevelRecord>;
  timeAttack: TimeAttackRecord[];
};

export const TIME_ATTACK_TOP = 5;

export const emptyProgress = (): Progress => ({ version: 1, levels: {}, timeAttack: [] });

/** クリアを記録する。ベスト更新なら isBest が true */
export function recordClear(
  progress: Progress,
  level: number,
  ms: number,
  hints: number,
  now = Date.now(),
): { progress: Progress; isBest: boolean } {
  const key = String(level);
  const prev = progress.levels[key];
  const isBest = !prev || ms < prev.bestMs;

  const next: LevelRecord = {
    bestMs: prev ? Math.min(prev.bestMs, ms) : ms,
    bestHints: prev ? Math.min(prev.bestHints, hints) : hints,
    clearedAt: now,
    plays: (prev?.plays ?? 0) + 1,
  };

  return {
    progress: { ...progress, levels: { ...progress.levels, [key]: next } },
    isBest,
  };
}

/** タイムアタックの結果を記録する。上位 TIME_ATTACK_TOP 件だけ残す */
export function recordTimeAttack(progress: Progress, score: number, now = Date.now()): Progress {
  const timeAttack = [...progress.timeAttack, { score, at: now }]
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, TIME_ATTACK_TOP);
  return { ...progress, timeAttack };
}

export const isCleared = (progress: Progress, level: number): boolean =>
  progress.levels[String(level)] !== undefined;

/** クリア済みレベルの最大値。ひとつもクリアしていなければ 0 */
export function maxClearedLevel(progress: Progress): number {
  let max = 0;
  for (const key of Object.keys(progress.levels)) {
    const n = Number(key);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/** レベル1は常に開いていて、以降は「ひとつ前をクリア済み」なら開く */
export function isUnlocked(progress: Progress, level: number): boolean {
  if (level < 1 || level > MAX_LEVEL) return false;
  if (level === 1) return true;
  return isCleared(progress, level - 1);
}

/** 次に挑むレベル。全部クリアしていれば MAX_LEVEL */
export function nextLevelToPlay(progress: Progress): number {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    if (!isCleared(progress, level)) return level;
  }
  return MAX_LEVEL;
}

export const clearedCount = (progress: Progress): number => Object.keys(progress.levels).length;

/** ヒントを使わずにクリアしたレベルの数 */
export const perfectCount = (progress: Progress): number =>
  Object.values(progress.levels).filter((r) => r.bestHints === 0).length;

// ---- 永続化 ----

type StoreLike = Pick<Storage, 'getItem' | 'setItem'>;

const defaultStore = (): StoreLike | null => {
  try {
    return window.localStorage;
  } catch {
    // プライベートモードなどで localStorage が触れないことがある
    return null;
  }
};

/** 壊れた保存データを読んでもゲームが起動しなくならないよう、必ず形を検証する */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  try {
    const data = JSON.parse(raw) as unknown;
    if (typeof data !== 'object' || data === null) return emptyProgress();
    const obj = data as Partial<Progress>;
    const levels: Record<string, LevelRecord> = {};
    for (const [key, value] of Object.entries(obj.levels ?? {})) {
      const level = Number(key);
      if (!Number.isInteger(level) || level < 1) continue;
      const r = value as Partial<LevelRecord>;
      if (typeof r?.bestMs !== 'number' || !Number.isFinite(r.bestMs)) continue;
      levels[key] = {
        bestMs: r.bestMs,
        bestHints: typeof r.bestHints === 'number' ? r.bestHints : 0,
        clearedAt: typeof r.clearedAt === 'number' ? r.clearedAt : 0,
        plays: typeof r.plays === 'number' ? r.plays : 1,
      };
    }
    const timeAttack = (Array.isArray(obj.timeAttack) ? obj.timeAttack : [])
      .filter((t): t is TimeAttackRecord => typeof t?.score === 'number' && Number.isFinite(t.score))
      .map((t) => ({ score: t.score, at: typeof t.at === 'number' ? t.at : 0 }))
      .sort((a, b) => b.score - a.score || a.at - b.at)
      .slice(0, TIME_ATTACK_TOP);
    return { version: 1, levels, timeAttack };
  } catch {
    return emptyProgress();
  }
}

export function loadProgress(store: StoreLike | null = defaultStore()): Progress {
  if (!store) return emptyProgress();
  try {
    return parseProgress(store.getItem(STORAGE_KEY));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress, store: StoreLike | null = defaultStore()): void {
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 容量オーバーなどで保存できなくても、遊べなくなるわけではないので黙って続ける
  }
}

/** mm:ss.d 表記 */
export function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 100) / 10);
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}
