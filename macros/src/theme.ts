/** Palette and type taken from MacroFactor's dark theme. */
export const colors = {
  bg: '#161616',
  header: '#1E1E1E',
  surface: '#222222',
  surfaceAlt: '#2B2B2B',
  pill: '#333333',
  border: '#2F2F2F',
  outline: '#3A3A3A',
  text: '#FFFFFF',
  textDim: '#A3A3A3',
  textFaint: '#6B6B6B',
  accent: '#FFFFFF',
  onAccent: '#111111',
  danger: '#FF5A5F',
  success: '#55B783',
  blue: '#3E7BF6',

  calories: '#FFFFFF',
  protein: '#FFFFFF',
  fat: '#FFFFFF',
  carbs: '#FFFFFF',
  weight: '#3E7BF6',
  expenditure: '#FF8A5C',
  trend: '#55B783',
} as const;

export const macroColor = {
  calories: colors.calories,
  protein: colors.protein,
  fat: colors.fat,
  carbs: colors.carbs,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 18, pill: 999 } as const;

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  /** Wide heavy face used for screen titles like "TODAY". */
  display: 'Unbounded_900Black',
} as const;

export const font = {
  tabular: { fontVariant: ['tabular-nums' as const] },
};
