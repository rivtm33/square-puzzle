export type ColorKey = 'red' | 'blue' | 'green' | 'yellow';

export const COLOR_ORDER: ColorKey[] = ['red', 'blue', 'green', 'yellow'];

export const COLORS: Record<ColorKey, { base: string; light: string; dark: string }> = {
  red: { base: '#f5335c', light: '#ffa8b8', dark: '#8e0524' },
  blue: { base: '#2f7bff', light: '#a5c8ff', dark: '#0a3391' },
  green: { base: '#1fd167', light: '#a2f5c4', dark: '#046b34' },
  yellow: { base: '#fbc11a', light: '#ffe89a', dark: '#96660a' },
};

/** ジュエル描画用の CSS 変数 */
export function jewelVars(color: ColorKey): React.CSSProperties {
  const c = COLORS[color];
  return {
    ['--jc-base' as string]: c.base,
    ['--jc-light' as string]: c.light,
    ['--jc-dark' as string]: c.dark,
  };
}
