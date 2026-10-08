import { useColorScheme } from 'react-native';

/**
 * Family CFO palette — "passbook": the ink and teal of an Indian bank
 * passbook, marigold for anything that is due, a clear red for lapses.
 */
const light = {
  bg: '#F4F7F6',
  surface: '#FFFFFF',
  surfaceSunk: '#E9EFED',
  ink: '#14213D',
  inkSoft: '#4A566E',
  inkFaint: '#8590A3',
  line: '#D5DFDC',
  primary: '#0F6E66',
  primaryInk: '#FFFFFF',
  primaryWash: '#DCEFEC',
  due: '#E8A317',
  dueWash: '#FBF0D6',
  danger: '#B42318',
  dangerWash: '#FBE3E0',
};

const dark: typeof light = {
  bg: '#0D181C',
  surface: '#152429',
  surfaceSunk: '#1C3036',
  ink: '#E8EFED',
  inkSoft: '#AAB8B6',
  inkFaint: '#73858A',
  line: '#26393F',
  primary: '#3FB8A9',
  primaryInk: '#062420',
  primaryWash: '#173B38',
  due: '#F2B83A',
  dueWash: '#3A3017',
  danger: '#F2725F',
  dangerWash: '#3D1F1B',
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 12, lg: 20, pill: 999 } as const;

/** Type scale (~1.25 ratio). Numbers use tabular figures so amounts line up. */
export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  number: { fontVariant: ['tabular-nums' as const] },
};
