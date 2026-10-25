import { Pressable, StyleSheet, View } from 'react-native';

import { isUnitServing } from '@/lib/nutrition';
import type { Food } from '@/lib/types';
import { colors, radius, space } from '@/theme';

import { T } from './ui';

const SOURCE_LABEL = { off: 'OFF', usda: 'USDA', custom: 'Mine' } as const;

/** Nutrients for the food's first (default) serving. */
function defaultServing(food: Food) {
  const s = food.servings[0];
  const f = s.amount / food.base.amount;
  return {
    label: s.label,
    kcal: food.nutrients.calories * f,
    p: food.nutrients.protein * f,
    fat: food.nutrients.fat * f,
    c: food.nutrients.carbs * f,
  };
}

export function FoodRow({ food, onPress, testID }: { food: Food; onPress: () => void; testID?: string }) {
  const d = defaultServing(food);
  // A 1-unit default (just "g") is not helpful to show; use the per-100 basis instead.
  const show =
    isUnitServing(food.servings[0]) && food.base.amount === 100
      ? {
          label: `100 ${food.base.unit}`,
          kcal: food.nutrients.calories,
          p: food.nutrients.protein,
          fat: food.nutrients.fat,
          c: food.nutrients.carbs,
        }
      : d;
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T numberOfLines={2}>{food.name}</T>
        <T variant="caption" numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ''}
          {show.label}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <T variant="number">{Math.round(show.kcal)}</T>
        <View style={styles.badge}>
          <T variant="caption" style={{ fontSize: 10 }}>
            {SOURCE_LABEL[food.source]}
          </T>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  badge: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm },
});
