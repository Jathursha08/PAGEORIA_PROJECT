// PAGEORIA design tokens — "Warm Editorial Sanctuary" with switchable themes.
import { Platform, StyleSheet } from 'react-native';

const base = {
  white: '#FFFFFF',
  onGold: '#3A2D12', // ink used on gold fills
  star: '#D4A017',
};

export const palettes = {
  // Default light theme
  sage: {
    ...base,
    isDark: false,
    background: '#F8F5EF', surface: '#FFFFFF', surfaceTint: '#E8EFEA', parchment: '#FAF7F2',
    primary: '#3D4E45', primaryText: '#3D4E45', primarySoft: '#5B7065',
    sage: '#879B80', olive: '#A6AD8A', gold: '#D8B875', ochre: '#B98A4E', terracotta: '#C45A5A', complete: '#4B7B58',
    text: '#2D312E', textSoft: '#606863', textFaint: '#8A918C',
    border: '#EAE4DC', borderStrong: '#DDD5C9',
    danger: '#B3261E', dangerSoft: '#FBE4E2', dangerBorder: '#E8B9B5', goldSoft: '#F7ECD3', overlay: 'rgba(45, 49, 46, 0.45)',
    softBg: '#F1F3EF', parchmentAlt: '#F4F2EC', segmentBg: '#ECEFE9', roseSoft: '#F6E1DE', roseInk: '#8A3F3A',
    greenSoft: '#DDEEDF', goldInk: '#7A5A22', holdBg: '#F1E3E0', holdFg: '#8A4A44', plainBg: '#EFEDE7',
  },
  // Warm sepia reading theme
  parchment: {
    ...base,
    isDark: false,
    background: '#F3E9D6', surface: '#FBF5E6', surfaceTint: '#EADFC6', parchment: '#F7EDD8',
    primary: '#6B4F3A', primaryText: '#5A3F2C', primarySoft: '#8A6A4F',
    sage: '#A58B6A', olive: '#B7A47A', gold: '#D2A24A', ochre: '#9A6B2F', terracotta: '#B5523F', complete: '#5E7A44',
    text: '#3B2F25', textSoft: '#6B5B4B', textFaint: '#9A8A78',
    border: '#E2D3B8', borderStrong: '#D2C0A0',
    danger: '#A52A1F', dangerSoft: '#F5DDD3', dangerBorder: '#DDB3A3', goldSoft: '#F3E3BC', overlay: 'rgba(59, 47, 37, 0.5)',
    softBg: '#EFE4CC', parchmentAlt: '#F0E4CB', segmentBg: '#E8DCC0', roseSoft: '#F1D9CF', roseInk: '#8A3F2F',
    greenSoft: '#DCE5C8', goldInk: '#7A5418', holdBg: '#EEDACF', holdFg: '#8A4A3A', plainBg: '#EADFC6',
  },
  // Dark reading theme
  midnight: {
    ...base,
    isDark: true,
    background: '#131715', surface: '#1C2220', surfaceTint: '#25312B', parchment: '#212824',
    primary: '#3F5C4D', primaryText: '#A8C9B3', primarySoft: '#86AA94',
    sage: '#86AA94', olive: '#A6AD8A', gold: '#D8B875', ochre: '#D9B27A', terracotta: '#E07A7A', complete: '#7FBF8F',
    text: '#EDEBE4', textSoft: '#B5B9B2', textFaint: '#848A84',
    border: '#2C3430', borderStrong: '#3A4540',
    danger: '#F2877F', dangerSoft: '#3A2220', dangerBorder: '#6B3A36', goldSoft: '#3A3322', overlay: 'rgba(0, 0, 0, 0.62)',
    softBg: '#242B27', parchmentAlt: '#222925', segmentBg: '#212824', roseSoft: '#3A2626', roseInk: '#F0A8A0',
    greenSoft: '#22362A', goldInk: '#E5C98C', holdBg: '#3A2926', holdFg: '#E6A59C', plainBg: '#2A322E',
  },
};

export const THEME_OPTIONS = ['system', 'sage', 'parchment', 'midnight'];

// `colors` is mutated in place when the theme changes, so every file can keep importing it.
export const colors = { ...palettes.sage };

let themeVersion = 0;
export function applyTheme(name) {
  Object.assign(colors, palettes[name] || palettes.sage);
  themeVersion += 1;
}

// Like StyleSheet.create, but re-evaluated whenever the theme changes.
export function themedStyles(factory) {
  let cache = null;
  let version = -1;
  const resolve = () => {
    if (version !== themeVersion) {
      cache = StyleSheet.create(factory());
      version = themeVersion;
    }
    return cache;
  };
  return new Proxy({}, { get: (_, key) => resolve()[key] });
}

export const fonts = {
  serif: 'PlayfairDisplay_600SemiBold',
  serifMedium: 'PlayfairDisplay_500Medium',
  serifRegular: 'PlayfairDisplay_400Regular',
  serifBold: 'PlayfairDisplay_700Bold',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',
  serifItalicMedium: 'PlayfairDisplay_500Medium_Italic',
  sans: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemi: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, gutter: 20 };

export const radius = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 };

const shadowColor = '#000000';

export const shadows = {
  card: Platform.select({
    ios: { shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
    android: { elevation: 2 },
    default: {},
  }),
  lifted: Platform.select({
    ios: { shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
    android: { elevation: 6 },
    default: {},
  }),
};

// Typography presets. Getters keep them in sync with the active theme.
export const type = {
  get display() { return { fontFamily: fonts.serif, fontSize: 32, lineHeight: 42, color: colors.text, letterSpacing: -0.3 }; },
  get h1() { return { fontFamily: fonts.serif, fontSize: 28, lineHeight: 38, color: colors.text, letterSpacing: -0.2 }; },
  get h2() { return { fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, color: colors.text }; },
  get h3() { return { fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, color: colors.text }; },
  get title() { return { fontFamily: fonts.sansSemi, fontSize: 16, lineHeight: 24, color: colors.text }; },
  get body() { return { fontFamily: fonts.sans, fontSize: 15, lineHeight: 25, color: colors.text }; },
  get bodySoft() { return { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: colors.textSoft }; },
  get small() { return { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: colors.textSoft }; },
  get label() {
    return { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.textSoft };
  },
  get quote() { return { fontFamily: fonts.serifItalic, fontSize: 16, lineHeight: 27, color: colors.text }; },
};

// Book-cloth cover palettes used for generated placeholder covers
export const coverPalettes = [
  { bg: '#3E5C4B', ink: '#E9D9A6', accent: '#C9A961' }, // forest cloth
  { bg: '#2F4A63', ink: '#F0E3B8', accent: '#D6B86A' }, // midnight blue
  { bg: '#7A3B3B', ink: '#F5E3C4', accent: '#D9B26F' }, // burgundy
  { bg: '#B7773A', ink: '#FFF3D6', accent: '#F3D58E' }, // ochre leather
  { bg: '#2F6A6B', ink: '#EFE6C3', accent: '#D9C27A' }, // teal
  { bg: '#B4573F', ink: '#FBEBD0', accent: '#F0CE93' }, // terracotta
  { bg: '#5B3F63', ink: '#F2E4C8', accent: '#D9B87A' }, // plum
  { bg: '#4A525A', ink: '#EDE6D0', accent: '#C9B27A' }, // slate
];
