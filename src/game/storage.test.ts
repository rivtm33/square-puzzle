import { describe, it, expect } from 'vitest';
import {
  emptyProgress, recordClear, recordTimeAttack, isCleared, isUnlocked,
  maxClearedLevel, nextLevelToPlay, clearedCount, perfectCount,
  parseProgress, loadProgress, saveProgress, formatMs,
  STORAGE_KEY, MAX_LEVEL, TIME_ATTACK_TOP,
} from './storage';

/** localStorage の代わり */
function fakeStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; },
  };
}

describe('recordClear', () => {
  it('初クリアは必ずベスト', () => {
    const { progress, isBest } = recordClear(emptyProgress(), 3, 12_000, 0, 100);
    expect(isBest).toBe(true);
    expect(progress.levels['3']).toEqual({ bestMs: 12_000, bestHints: 0, clearedAt: 100, plays: 1 });
  });

  it('速くなればベスト更新', () => {
    let p = recordClear(emptyProgress(), 3, 12_000, 2).progress;
    const r = recordClear(p, 3, 9_000, 3);
    expect(r.isBest).toBe(true);
    expect(r.progress.levels['3'].bestMs).toBe(9_000);
    // ヒント回数は別々に最小を持つ
    expect(r.progress.levels['3'].bestHints).toBe(2);
    expect(r.progress.levels['3'].plays).toBe(2);
  });

  it('遅ければベスト更新しないが、回数と日時は増える', () => {
    const p = recordClear(emptyProgress(), 3, 9_000, 1, 100).progress;
    const r = recordClear(p, 3, 20_000, 0, 500);
    expect(r.isBest).toBe(false);
    expect(r.progress.levels['3'].bestMs).toBe(9_000);
    expect(r.progress.levels['3'].bestHints).toBe(0);
    expect(r.progress.levels['3'].clearedAt).toBe(500);
    expect(r.progress.levels['3'].plays).toBe(2);
  });

  it('元の進捗を書き換えない', () => {
    const before = emptyProgress();
    recordClear(before, 1, 1000, 0);
    expect(before.levels).toEqual({});
  });
});

describe('recordTimeAttack', () => {
  it('高い順に並ぶ', () => {
    let p = emptyProgress();
    for (const s of [3, 9, 5]) p = recordTimeAttack(p, s, s);
    expect(p.timeAttack.map((t) => t.score)).toEqual([9, 5, 3]);
  });

  it(`上位 ${TIME_ATTACK_TOP} 件だけ残す`, () => {
    let p = emptyProgress();
    for (let i = 1; i <= 12; i++) p = recordTimeAttack(p, i, i);
    expect(p.timeAttack).toHaveLength(TIME_ATTACK_TOP);
    expect(p.timeAttack[0].score).toBe(12);
    expect(p.timeAttack.at(-1)!.score).toBe(8);
  });

  it('同点なら先に出した方が上', () => {
    let p = emptyProgress();
    p = recordTimeAttack(p, 4, 200);
    p = recordTimeAttack(p, 4, 100);
    expect(p.timeAttack.map((t) => t.at)).toEqual([100, 200]);
  });
});

describe('レベルの解放と進行', () => {
  it('レベル1は最初から開いている', () => {
    expect(isUnlocked(emptyProgress(), 1)).toBe(true);
    expect(isUnlocked(emptyProgress(), 2)).toBe(false);
  });

  it('ひとつ前をクリアすると開く', () => {
    const p = recordClear(emptyProgress(), 1, 5000, 0).progress;
    expect(isUnlocked(p, 2)).toBe(true);
    expect(isUnlocked(p, 3)).toBe(false);
  });

  it('範囲外は開かない', () => {
    const p = recordClear(emptyProgress(), MAX_LEVEL, 1, 0).progress;
    expect(isUnlocked(p, 0)).toBe(false);
    expect(isUnlocked(p, MAX_LEVEL + 1)).toBe(false);
  });

  it('nextLevelToPlay は「まだクリアしていない最小のレベル」', () => {
    let p = emptyProgress();
    expect(nextLevelToPlay(p)).toBe(1);
    p = recordClear(p, 1, 1, 0).progress;
    p = recordClear(p, 2, 1, 0).progress;
    expect(nextLevelToPlay(p)).toBe(3);
    // 飛ばしてクリアしていても、空いている一番小さいところを返す
    p = recordClear(p, 7, 1, 0).progress;
    expect(nextLevelToPlay(p)).toBe(3);
  });

  it('maxClearedLevel / clearedCount / perfectCount', () => {
    let p = emptyProgress();
    p = recordClear(p, 2, 1, 0).progress;
    p = recordClear(p, 5, 1, 3).progress;
    expect(maxClearedLevel(p)).toBe(5);
    expect(clearedCount(p)).toBe(2);
    expect(perfectCount(p)).toBe(1);
    expect(isCleared(p, 2)).toBe(true);
    expect(isCleared(p, 3)).toBe(false);
  });
});

describe('parseProgress', () => {
  it('空や壊れたデータでも落ちない', () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress('')).toEqual(emptyProgress());
    expect(parseProgress('{')).toEqual(emptyProgress());
    expect(parseProgress('null')).toEqual(emptyProgress());
    expect(parseProgress('123')).toEqual(emptyProgress());
    expect(parseProgress('[]')).toEqual(emptyProgress());
  });

  it('おかしなレベル記録は捨てる', () => {
    const raw = JSON.stringify({
      version: 1,
      levels: {
        '1': { bestMs: 5000, bestHints: 1, clearedAt: 9, plays: 2 },
        '0': { bestMs: 1 },
        abc: { bestMs: 1 },
        '4': { bestMs: 'なんか' },
      },
      timeAttack: [{ score: 3, at: 1 }, { nope: true }],
    });
    const p = parseProgress(raw);
    expect(Object.keys(p.levels)).toEqual(['1']);
    expect(p.timeAttack).toEqual([{ score: 3, at: 1 }]);
  });

  it('足りない項目は既定値で埋める', () => {
    const p = parseProgress(JSON.stringify({ levels: { '2': { bestMs: 100 } } }));
    expect(p.levels['2']).toEqual({ bestMs: 100, bestHints: 0, clearedAt: 0, plays: 1 });
  });
});

describe('load / save', () => {
  it('保存したものを読み戻せる', () => {
    const store = fakeStore();
    const p = recordTimeAttack(recordClear(emptyProgress(), 4, 8_000, 1, 42).progress, 6, 43);
    saveProgress(p, store);
    expect(store.data[STORAGE_KEY]).toBeTruthy();
    expect(loadProgress(store)).toEqual(p);
  });

  it('保存が無ければ空の進捗', () => {
    expect(loadProgress(fakeStore())).toEqual(emptyProgress());
  });

  it('store が使えなくても落ちない', () => {
    expect(loadProgress(null)).toEqual(emptyProgress());
    expect(() => saveProgress(emptyProgress(), null)).not.toThrow();
  });

  it('setItem が失敗しても落ちない', () => {
    const broken = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceeded'); },
    };
    expect(() => saveProgress(emptyProgress(), broken)).not.toThrow();
  });
});

describe('formatMs', () => {
  it('分:秒.1桁', () => {
    expect(formatMs(0)).toBe('0:00.0');
    expect(formatMs(9_400)).toBe('0:09.4');
    expect(formatMs(65_000)).toBe('1:05.0');
    expect(formatMs(600_000)).toBe('10:00.0');
  });

  it('負の値は0扱い', () => {
    expect(formatMs(-5)).toBe('0:00.0');
  });
});
