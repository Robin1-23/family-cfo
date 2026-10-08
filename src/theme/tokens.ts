import { useColorScheme } from 'react-native';

/**
 * Family CFO palette: warm peach, soft lavender and charcoal on an off-white
 * canvas. Big rounded cards, dark pill buttons, a floating dark tab bar.
 * Peach is for anything that is due or missing; lavender for what is in place.
 */
const light = {
  bg: '#F5F3F0',
  surface: '#FFFFFF',
  surfaceSunk: '#EEECE8',
  ink: '#1E1E24',
  inkSoft: '#5D5C66',
  inkFaint: '#9B9AA3',
  line: '#E5E2DD',
  /** Buttons, the tab bar and other solid controls. */
  primary: '#26262D',
  primaryInk: '#FFFFFF',
  primaryWash: '#ECEAF9',
  peach: '#F49A5E',
  peachDeep: '#B9551D',
  peachWash: '#FCE9DC',
  lavender: '#8F8BEA',
  lavenderDeep: '#4E49B5',
  lavenderWash: '#E8E7FC',
  due: '#F49A5E',
  dueWash: '#FCE9DC',
  danger: '#C2321F',
  dangerWash: '#FBE2DD',
  /** The floating tab bar stays dark in both modes. */
  bar: '#26262D',
  barActive: '#0D0D11',
  /** Text on peach or lavender fills: always dark, for contrast in both modes. */
  onTint: '#1E1E24',
  onBar: '#FFFFFF',
};

const dark: typeof light = {
  bg: '#141418',
  surface: '#1E1E24',
  surfaceSunk: '#2A2A31',
  ink: '#F2F1EF',
  inkSoft: '#B5B4BC',
  inkFaint: '#7C7B85',
  line: '#33333B',
  primary: '#F2F1EF',
  primaryInk: '#141418',
  primaryWash: '#2D2C45',
  peach: '#F4A672',
  peachDeep: '#F8C29E',
  peachWash: '#3D2A1E',
  lavender: '#A19EF0',
  lavenderDeep: '#C9C7F7',
  lavenderWash: '#2B2A47',
  due: '#F4A672',
  dueWash: '#3D2A1E',
  danger: '#F2725F',
  dangerWash: '#3D1F1B',
  bar: '#2C2C34',
  barActive: '#0D0D11',
  onTint: '#1E1E24',
  onBar: '#FFFFFF',
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 18, lg: 28, pill: 999 } as const;

/** Type scale (~1.25 ratio). Numbers use tabular figures so amounts line up. */
export const type = {
  display: { fontSize: 34, lineHeight: 38, fontWeight: '800' as const, letterSpacing: -0.8 },
  title: { fontSize: 26, lineHeight: 31, fontWeight: '800' as const, letterSpacing: -0.5 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  number: { fontVariant: ['tabular-nums' as const] },
};
