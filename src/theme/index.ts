import { Platform, useColorScheme } from 'react-native';

/**
 * Apol design tokens.
 *
 * The palette is intentionally low-chroma: clinicians read this screen many
 * times a day, and adherence data should be the only thing that carries
 * saturation. Colour is reserved for state (on-track / slipping / missed).
 *
 * Every foreground token clears WCAG AA (4.5:1) against every surface it is
 * used on, at the small sizes it is actually used at. That is a stricter test
 * than it sounds: `inkFaint` has to clear both the canvas and the raised
 * surface, and `good`/`warn` sit on their own soft tints inside pills, so all
 * three are darker than they would be if chosen by eye.
 */

const palette = {
  light: {
    canvas: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF1F5',
    border: '#DFE4EB',
    borderStrong: '#C7D0DB',
    ink: '#0E1726',
    inkMuted: '#5B6879',
    inkFaint: '#67717F',
    accent: '#0E7C7B',
    accentInk: '#FFFFFF',
    accentSoft: '#DCEFEE',
    good: '#176F4F',
    goodSoft: '#DCF0E7',
    warn: '#8A5810',
    warnSoft: '#FBEEDA',
    bad: '#B33A3A',
    badSoft: '#FADEDE',
    shadow: 'rgba(14, 23, 38, 0.10)',
  },
  dark: {
    canvas: '#0B1017',
    surface: '#141B24',
    surfaceAlt: '#1C2531',
    border: '#243040',
    borderStrong: '#33425642',
    ink: '#EAF0F7',
    inkMuted: '#9AA8B8',
    inkFaint: '#8996A8',
    accent: '#3EB8B4',
    accentInk: '#05201F',
    accentSoft: '#123230',
    good: '#4CC38A',
    goodSoft: '#12301F',
    warn: '#E0A64B',
    warnSoft: '#332512',
    bad: '#E86A6A',
    badSoft: '#331A1A',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
};

export type Colors = typeof palette.light;

/** 4pt base scale. Every gap in the app comes from here. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const font = {
  display: Platform.select({ ios: 'System', default: 'sans-serif' }),
} as const;

/** Type ramp — capped at six steps so screens stay visually quiet. */
export const type = {
  hero: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.2 },
};

/** Reading measure for text-heavy screens — keeps the desktop build from
 *  stretching a paragraph to 2000px. */
export const CONTENT_MAX_WIDTH = 720;

/** Roomier measure for dashboards and lists, where scanning beats reading. */
export const CONTENT_MAX_WIDTH_WIDE = 1120;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? palette.dark : palette.light, isDark };
}

export function elevate(colors: Colors, level: 1 | 2 = 1) {
  return Platform.select({
    web: {
      boxShadow:
        level === 1
          ? `0 1px 2px ${colors.shadow}, 0 6px 18px -10px ${colors.shadow}`
          : `0 2px 6px ${colors.shadow}, 0 18px 40px -18px ${colors.shadow}`,
    } as any,
    default: {
      shadowColor: '#000',
      shadowOpacity: level === 1 ? 0.06 : 0.12,
      shadowRadius: level === 1 ? 10 : 20,
      shadowOffset: { width: 0, height: level === 1 ? 3 : 8 },
      elevation: level === 1 ? 2 : 6,
    },
  })!;
}
