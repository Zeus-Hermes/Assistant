/** Multipliers on BMR for the starting expenditure estimate. */
export const ACTIVITY_LEVELS = [
  { value: '1.3', label: 'Sedentary', hint: 'Desk job, little exercise' },
  { value: '1.45', label: 'Light', hint: 'Exercise 1–3×/week' },
  { value: '1.6', label: 'Moderate', hint: 'Exercise 3–5×/week' },
  { value: '1.75', label: 'Very active', hint: 'Hard training or physical job' },
] as const;
