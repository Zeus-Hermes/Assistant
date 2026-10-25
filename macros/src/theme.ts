import { Platform } from 'react-native';

/** Dark, high-contrast palette modelled on MacroFactor's dark theme. */
export const colors = {
  bg: '#0E0F12',
  surface: '#17191E',
  surfaceAlt: '#1F2228',
  border: '#2A2E36',
  text: '#F4F5F7',
  textDim: '#9BA1AD',
  textFaint: '#5F6672',
  accent: '#4C8DFF',
  danger: '#FF5A5F',
  success: '#3DD68C',

  calories: '#4C8DFF',
  protein: '#FF5A6E',
  fat: '#FFC048',
  carbs: '#3DD68C',
  weight: '#B07CFF',
  expenditure: '#FF8A3D',
} as const;

export const macroColor = {
  calories: colors.calories,
  protein: colors.protein,
  fat: colors.fat,
  carbs: colors.carbs,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const font = {
  family: Platform.select({ ios: 'System', default: undefined }),
  tabular: { fontVariant: ['tabular-nums' as const] },
};
