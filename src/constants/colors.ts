export const Colors = {
  primary: '#884e4f',
  onPrimary: '#ffffff',
  primaryContainer: '#e8a0a0',
  onPrimaryContainer: '#6a3537',
  inversePrimary: '#feb3b3',

  secondary: '#974356',
  onSecondary: '#ffffff',
  secondaryContainer: '#ff98ac',
  onSecondaryContainer: '#7a2c3f',

  tertiary: '#386849',
  onTertiary: '#ffffff',
  tertiaryContainer: '#8bbf9a',
  onTertiaryContainer: '#1d4e31',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  surface: '#fcf9f4',
  surfaceDim: '#dcdad5',
  surfaceBright: '#fcf9f4',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f6f3ee',
  surfaceContainer: '#f0ede9',
  surfaceContainerHigh: '#ebe8e3',
  surfaceContainerHighest: '#e5e2dd',

  onSurface: '#1c1c19',
  onSurfaceVariant: '#524343',
  inverseSurface: '#31302d',
  inverseOnSurface: '#f3f0eb',

  outline: '#847372',
  outlineVariant: '#d7c2c1',
  surfaceTint: '#884e4f',
  surfaceVariant: '#e5e2dd',

  background: '#fcf9f4',
  onBackground: '#1c1c19',

  earthBrown: '#6B4C3B',
  inkDark: '#2C1810',
  sepiaText: '#9C7B6E',
  offWhite: '#FFFDF9',
  goldAccent: '#D4AF37',
} as const;

export type ColorScheme = typeof Colors;
