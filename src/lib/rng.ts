/** mulberry32: 小さくて十分に良い、シード可能な擬似乱数生成器 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

export function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 重み付きの「非復元抽出の順序」を作る。
 * 各要素に -log(u)/w をキーとして与えて昇順に並べる（指数レース法）。
 */
export function weightedOrder<T>(items: readonly T[], weight: (item: T) => number, rng: () => number): T[] {
  return items
    .map((item) => {
      const w = Math.max(weight(item), 1e-9);
      return { item, key: -Math.log(1 - rng()) / w };
    })
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);
}
