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

export const Dark = {
  primary: '#feb3b3',
  onPrimary: '#561d1f',
  primaryContainer: '#6c3738',
  onPrimaryContainer: '#ffdad9',
  inversePrimary: '#884e4f',

  secondary: '#ffb2bf',
  onSecondary: '#5e1228',
  secondaryContainer: '#792c3f',
  onSecondaryContainer: '#ffd9de',

  tertiary: '#9ed3ac',
  onTertiary: '#073821',
  tertiaryContainer: '#1f5033',
  onTertiaryContainer: '#b9efc7',

  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  surface: '#141210',
  surfaceDim: '#141210',
  surfaceBright: '#3a3835',
  surfaceContainerLowest: '#0f0d0b',
  surfaceContainerLow: '#1c1c19',
  surfaceContainer: '#201f1c',
  surfaceContainerHigh: '#2b2926',
  surfaceContainerHighest: '#363431',

  onSurface: '#e5e2dd',
  onSurfaceVariant: '#d7c2c1',
  inverseSurface: '#e5e2dd',
  inverseOnSurface: '#31302d',

  outline: '#9f8c8b',
  outlineVariant: '#524343',
  surfaceTint: '#feb3b3',
  surfaceVariant: '#524343',

  background: '#141210',
  onBackground: '#e5e2dd',

  earthBrown: '#c4a090',
  inkDark: '#f3f0eb',
  sepiaText: '#c4a090',
  offWhite: '#1c1c19',
  goldAccent: '#D4AF37',
} as const;

export type ColorScheme = typeof Colors;
