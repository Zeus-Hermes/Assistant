import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { FoodIcon } from '@/components/FoodBits';
import { HourPicker } from '@/components/HourPicker';
import { Button, Card, Chip, Divider, Field, parseNum, T } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { getFood } from '@/lib/foodCache';
import { isUnitServing, nutrientsFor } from '@/lib/nutrition';
import type { Nutrients } from '@/lib/types';
import { useCart } from '@/store/useCart';
import { useStore } from '@/store/useStore';
import { colors, fonts, space } from '@/theme';

function NutrientRow({ label, value, unit, indent }: { label: string; value?: number; unit: string; indent?: boolean }) {
  if (value == null) return null;
  return (
    <View style={styles.nRow}>
      <T style={indent ? { color: colors.textDim, paddingLeft: space.lg } : undefined}>{label}</T>
      <T variant="number">
        {value < 10 && value > 0 ? value.toFixed(1) : Math.round(value)} {unit}
      </T>
    </View>
  );
}

function Stat({ value, label, testID }: { value: string; label: string; testID?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <T style={styles.statValue} testID={testID}>
        {value}
      </T>
      <T variant="caption">{label}</T>
    </View>
  );
}

/**
 * Pick a serving for a food. Opened from the add-food sheet it adds to the
 * cart; opened from a log entry it edits that entry.
 */
export default function FoodDetail() {
  const params = useLocalSearchParams<{ foodId: string; entryId?: string }>();
  const entry = useStore((s) => (params.entryId ? s.entries.find((e) => e.id === params.entryId) : undefined));
  const food = entry?.food ?? getFood(params.foodId);
  const updateEntry = useStore((s) => s.updateEntry);
  const deleteEntry = useStore((s) => s.deleteEntry);
  const addToCart = useCart((s) => s.addFood);

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
  const [hour, setHour] = useState(entry?.hour ?? 12);

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
    if (entry) updateEntry(entry.id, { serving, quantity: qty, hour });
    else addToCart(food, serving, qty);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Stack.Screen options={{ title: entry ? 'Edit Entry' : 'Add Food' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <FoodIcon name={food.name} size={52} />
          <View style={{ flex: 1, gap: 2 }}>
            <T style={styles.name} testID="food-name">
              {food.name}
            </T>
            {food.brand ? <T dim>By {food.brand}</T> : null}
          </View>
        </View>

        <Card style={styles.summary}>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <T style={styles.kcal} testID="detail-kcal">
                {Math.round(n.calories)}
              </T>
              <Ionicons name="flame" size={22} color={colors.text} />
            </View>
            <T variant="caption">Calories</T>
          </View>
          <Stat value={`${Math.round(n.protein)}P`} label="Protein" />
          <Stat value={`${Math.round(n.fat)}F`} label="Fat" />
          <Stat value={`${Math.round(n.carbs)}C`} label="Carbs" />
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

        {entry && (
          <View style={{ gap: space.sm, marginHorizontal: -space.lg }}>
            <T variant="label" style={{ paddingHorizontal: space.lg }}>
              Time
            </T>
            <HourPicker hour={hour} onChange={setHour} />
          </View>
        )}

        <Card style={{ gap: space.sm }}>
          <T variant="label">Nutrition for this amount</T>
          <NutrientRow label="Calories" value={n.calories} unit="kcal" />
          <Divider />
          <NutrientRow label="Protein" value={n.protein} unit="g" />
          <NutrientRow label="Fat" value={n.fat} unit="g" />
          <NutrientRow label="Carbohydrates" value={n.carbs} unit="g" />
          <NutrientRow label="Fiber" value={n.fiber} unit="g" indent />
          <NutrientRow label="Sugar" value={n.sugar} unit="g" indent />
          <NutrientRow label="Sodium" value={n.sodium} unit="mg" />
          <Divider />
          <T variant="caption">
            Source: {food.source === 'off' ? 'Open Food Facts' : food.source === 'usda' ? 'USDA FoodData Central' : 'Custom food'}
            {food.barcode ? ` · ${food.barcode}` : ''}
          </T>
        </Card>

        <Button testID="save-food" title={entry ? 'Save' : 'Add'} onPress={save} disabled={!valid} />
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
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { fontSize: 22, fontFamily: fonts.medium },
  summary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: space.xl },
  kcal: { fontSize: 28, fontFamily: fonts.semibold },
  statValue: { fontSize: 20, fontFamily: fonts.medium },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  nRow: { flexDirection: 'row', justifyContent: 'space-between' },
  missing: { flex: 1, padding: space.xl, gap: space.lg, justifyContent: 'center' },
});
