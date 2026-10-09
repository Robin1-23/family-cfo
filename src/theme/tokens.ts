import { Platform } from 'react-native';

/**
 * Family CFO palette: "forest and lime". Deep green-black surfaces, one bright
 * lime for the brand and anything that is in place, amber only for what is due
 * or missing, red only for emergencies. One dark theme everywhere, so every
 * screen feels the same at night and in daylight.
 */
const palette = {
  bg: '#0A120A',
  surface: '#141E12',
  surfaceSunk: '#1C2819',
  ink: '#EEF5E6',
  /** Secondary text, tinted green so the palette stays one family. */
  inkSoft: '#B4C4A8',
  /** Faint text: #7D8C75 on bg is ~4.6:1, passing WCAG AA for small text. */
  inkFaint: '#7D8C75',
  line: '#26341F',
  /** Main buttons: lime with near-black text. */
  primary: '#C9F25C',
  primaryInk: '#0A120A',
  primaryWash: '#22301A',
  lime: '#C9F25C',
  /** The lighter lime of an inner card sitting on a lime panel. */
  limeSoft: '#DDF68F',
  /** Gradient ends for lime panels: top-left highlight to bottom-right depth. */
  limeHi: '#DCF77A',
  limeLo: '#B3DF3C',
  limeDeep: '#C9F25C',
  limeWash: '#1F2E14',
  amber: '#F5B544',
  amberDeep: '#F5B544',
  amberWash: '#33280F',
  /** Deep green panels: the quieter hero. */
  forest: '#1D3A17',
  forestDeep: '#2B5222',
  forestHi: '#26491D',
  due: '#F5B544',
  dueWash: '#33280F',
  danger: '#FF6B5B',
  dangerWash: '#3A1A16',
  /** Floating tab bar and dark buttons on lime. */
  bar: '#121B10',
  barActive: '#0A120A',
  /** Text on lime or amber fills. */
  onTint: '#0A120A',
  /** Text on dark or forest fills. */
  onBar: '#EEF5E6',
  shadow: '0px 10px 30px rgba(0, 0, 0, 0.35)',
  /** Emergency Mode red; white text stays readable on it. */
  emergency: '#C0281C',
  /** The SOS button: brighter than danger so it stands apart, with a soft glow. */
  sos: '#FF4D3D',
  sosGlow: '0px 0px 18px rgba(255, 77, 61, 0.55)',
  emergencyDeep: '#8F1D14',
};

export type Palette = typeof palette;

export function usePalette(): Palette {
  return palette;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 14, lg: 24, xl: 28, pill: 999 } as const;

/**
 * Plus Jakarta Sans, embedded at build time by the expo-font plugin (app.json).
 * Android registers it as one family with five weights; iOS uses the family name
 * inside the font file. fontWeight picks the face on both.
 */
export const FONT = Platform.select({ android: 'PlusJakartaSans', ios: 'Plus Jakarta Sans', default: undefined });
const f = { fontFamily: FONT };

/**
 * Type scale. Restrained on purpose: 20px titles, 14px body, 12px meta.
 * Only hero numbers go big. Numbers use tabular figures so amounts line up.
 */
export const type = {
  display: { ...f, fontSize: 30, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -1.2 },
  title: { ...f, fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.4 },
  heading: { ...f, fontSize: 16, lineHeight: 21, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { ...f, fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { ...f, fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { ...f, fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  /** Small spaced-out label above a title, e.g. "HEALTH INSURANCE · SUNITA". */
  overline: { ...f, fontSize: 10.5, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 0.9, textTransform: 'uppercase' as const, opacity: 0.75 },
  number: { fontVariant: ['tabular-nums' as const] },
};

/** Largest system font scale we honour, so big accessibility text never breaks a card. */
export const MAX_FONT_SCALE = 1.35;
