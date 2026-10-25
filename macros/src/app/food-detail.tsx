import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { MacroInline } from '@/components/MacroBars';
import { Button, Card, Chip, Divider, Field, parseNum, Segmented, T } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { today } from '@/lib/dates';
import { getFood } from '@/lib/foodCache';
import { finishLogging } from '@/lib/nav';
import { isUnitServing, nutrientsFor } from '@/lib/nutrition';
import { MEAL_LABEL, MEALS, type Meal, type Nutrients } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { colors, macroColor, space } from '@/theme';

function NutrientRow({ label, value, unit, color }: { label: string; value?: number; unit: string; color?: string }) {
  if (value == null) return null;
  return (
    <View style={styles.nRow}>
      <T style={color ? { color } : undefined}>{label}</T>
      <T variant="number">
        {value < 10 && value > 0 ? value.toFixed(1) : Math.round(value)} {unit}
      </T>
    </View>
  );
}

export default function FoodDetail() {
  const params = useLocalSearchParams<{ foodId: string; entryId?: string; date?: string; meal?: Meal }>();
  const entry = useStore((s) => (params.entryId ? s.entries.find((e) => e.id === params.entryId) : undefined));
  const food = entry?.food ?? getFood(params.foodId);
  const logFood = useStore((s) => s.logFood);
  const updateEntry = useStore((s) => s.updateEntry);
  const deleteEntry = useStore((s) => s.deleteEntry);

  const initialServingIdx = useMemo(() => {
    if (!food || !entry?.serving) return 0;
    const i = food.servings.findIndex((s) => s.label === entry.serving!.label && s.amount === entry.serving!.amount);
    return i >= 0 ? i : 0;
  }, [food, entry]);

  const [servingIdx, setServingIdx] = useState(initialServingIdx);
  const [qtyText, setQtyText] = useState(() => {
    if (entry?.quantity != null) return String(Math.round(entry.quantity * 100) / 100);
    const s = food?.servings[0];
    // Gram/ml-only foods default to 100 units; servings default to one.
    return s && isUnitServing(s) ? '100' : '1';
  });
  const [meal, setMeal] = useState<Meal>(entry?.meal ?? (params.meal && MEALS.includes(params.meal) ? params.meal : 'snacks'));

  if (!food) {
    return (
      <View style={styles.missing}>
        <T dim>This food is no longer available. Go back and search again.</T>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const serving = food.servings[servingIdx] ?? food.servings[0];
  const qty = parseNum(qtyText);
  const valid = qty != null && qty > 0;
  const n: Nutrients = valid ? nutrientsFor(food, serving, qty) : { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const isUnit = isUnitServing(serving);

  const save = () => {
    if (!valid) return;
    if (entry) {
      updateEntry(entry.id, { serving, quantity: qty, meal });
    } else {
      logFood({ date: params.date ?? today(), meal, food, serving, quantity: qty });
    }
    finishLogging();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Stack.Screen options={{ title: entry ? 'Edit Entry' : 'Add Food' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <T variant="title" style={{ fontSize: 22 }} testID="food-name">
            {food.name}
          </T>
          {food.brand ? <T dim>{food.brand}</T> : null}
        </View>

        <Card style={styles.summary}>
          <View style={{ alignItems: 'center' }}>
            <T variant="number" style={{ fontSize: 30, fontWeight: '700' }} testID="detail-kcal">
              {Math.round(n.calories)}
            </T>
            <T variant="caption">kcal</T>
          </View>
          {(['protein', 'fat', 'carbs'] as const).map((k) => (
            <View key={k} style={{ alignItems: 'center' }}>
              <T variant="number" style={{ fontSize: 20, color: macroColor[k] }}>
                {Math.round(n[k])}g
              </T>
              <T variant="caption">{k === 'carbs' ? 'Carbs' : k === 'fat' ? 'Fat' : 'Protein'}</T>
            </View>
          ))}
        </Card>

        <View style={{ gap: space.sm }}>
          <T variant="label">Serving</T>
          <View style={styles.chips}>
            {food.servings.map((s, i) => (
              <Chip
                key={`${s.label}-${i}`}
                label={s.label}
                active={i === servingIdx}
                onPress={() => {
                  if (i === servingIdx) return;
                  setServingIdx(i);
                  const nextIsUnit = isUnitServing(s);
                  if (nextIsUnit !== isUnit) setQtyText(nextIsUnit ? String(Math.round(serving.amount * (qty ?? 1))) : '1');
                }}
              />
            ))}
          </View>
        </View>

        <Field
          testID="qty-input"
          label={isUnit ? `Amount (${serving.label})` : 'Number of servings'}
          value={qtyText}
          onChangeText={setQtyText}
          keyboardType="decimal-pad"
          selectTextOnFocus
          suffix={isUnit ? serving.label : '×'}
        />

        <View style={{ gap: space.sm }}>
          <T variant="label">Meal</T>
          <Segmented options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))} value={meal} onChange={setMeal} />
        </View>

        <Card style={{ gap: space.sm }}>
          <T variant="label">Nutrition for this amount</T>
          <NutrientRow label="Calories" value={n.calories} unit="kcal" color={colors.calories} />
          <Divider />
          <NutrientRow label="Protein" value={n.protein} unit="g" color={colors.protein} />
          <NutrientRow label="Fat" value={n.fat} unit="g" color={colors.fat} />
          <NutrientRow label="Carbohydrates" value={n.carbs} unit="g" color={colors.carbs} />
          <NutrientRow label="  Fiber" value={n.fiber} unit="g" />
          <NutrientRow label="  Sugar" value={n.sugar} unit="g" />
          <NutrientRow label="Sodium" value={n.sodium} unit="mg" />
          <Divider />
          <T variant="caption">
            Per {food.base.amount} {food.base.unit}: {Math.round(food.nutrients.calories)} kcal · <MacroInline n={food.nutrients} />
          </T>
          <T variant="caption">
            Source: {food.source === 'off' ? 'Open Food Facts' : food.source === 'usda' ? 'USDA FoodData Central' : 'Custom food'}
            {food.barcode ? ` · ${food.barcode}` : ''}
          </T>
        </Card>

        <Button testID="save-food" title={entry ? 'Save' : 'Add to log'} onPress={save} disabled={!valid} />
        {entry && (
          <Button
            title="Delete entry"
            variant="danger"
            onPress={async () => {
              if (await confirm('Delete entry?', food.name, 'Delete', true)) {
                deleteEntry(entry.id);
                router.back();
              }
            }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  summary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  nRow: { flexDirection: 'row', justifyContent: 'space-between' },
  missing: { flex: 1, padding: space.xl, gap: space.lg, justifyContent: 'center' },
});
