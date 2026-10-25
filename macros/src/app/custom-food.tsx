import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Field, parseNum, T } from '@/components/ui';
import { putFood } from '@/lib/foodCache';
import { uid } from '@/lib/id';
import { caloriesFromMacros } from '@/lib/nutrition';
import type { Food, Meal, Serving } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { space } from '@/theme';

export default function CustomFood() {
  const params = useLocalSearchParams<{ date?: string; meal?: Meal }>();
  const saveCustomFood = useStore((s) => s.saveCustomFood);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [servingLabel, setServingLabel] = useState('1 serving');
  const [servingGrams, setServingGrams] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const p = parseNum(protein) ?? 0;
  const c = parseNum(carbs) ?? 0;
  const f = parseNum(fat) ?? 0;
  const calories = parseNum(kcal) ?? caloriesFromMacros(p, c, f);
  const grams = parseNum(servingGrams);
  const valid = name.trim().length > 0 && calories > 0;

  const save = () => {
    if (!valid) return;
    const label = servingLabel.trim() || '1 serving';
    const nutrients = { calories, protein: p, carbs: c, fat: f };
    let food: Food;
    if (grams && grams > 0) {
      // With a known weight, store per gram so any amount can be logged.
      const servings: Serving[] = [
        { label: `${label} (${grams} g)`, amount: grams },
        { label: 'g', amount: 1 },
      ];
      food = {
        id: `custom:${uid()}`,
        source: 'custom',
        name: name.trim(),
        brand: brand.trim() || undefined,
        base: { unit: 'g', amount: grams },
        nutrients,
        servings,
      };
    } else {
      food = {
        id: `custom:${uid()}`,
        source: 'custom',
        name: name.trim(),
        brand: brand.trim() || undefined,
        base: { unit: 'serving', amount: 1 },
        nutrients,
        servings: [{ label, amount: 1 }],
      };
    }
    saveCustomFood(food);
    putFood(food);
    router.replace({ pathname: '/food-detail', params: { foodId: food.id, date: params.date, meal: params.meal } });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <T dim>Saved to My Foods so you can log it again.</T>
        <Field testID="cf-name" label="Name" value={name} onChangeText={setName} placeholder="e.g. Mom's lasagna" />
        <Field label="Brand (optional)" value={brand} onChangeText={setBrand} />
        <View style={styles.row}>
          <Field containerStyle={styles.flex} label="Serving" value={servingLabel} onChangeText={setServingLabel} />
          <Field
            containerStyle={styles.flex}
            label="Weight (optional)"
            value={servingGrams}
            onChangeText={setServingGrams}
            keyboardType="decimal-pad"
            suffix="g"
          />
        </View>
        <T variant="label">Per serving</T>
        <Field
          testID="cf-kcal"
          label="Calories"
          value={kcal}
          onChangeText={setKcal}
          keyboardType="decimal-pad"
          suffix="kcal"
          placeholder={calories > 0 ? String(Math.round(calories)) : '0'}
        />
        <View style={styles.row}>
          <Field
            testID="cf-protein"
            containerStyle={styles.flex}
            label="Protein"
            value={protein}
            onChangeText={setProtein}
            keyboardType="decimal-pad"
            suffix="g"
            placeholder="0"
          />
          <Field
            containerStyle={styles.flex}
            label="Fat"
            value={fat}
            onChangeText={setFat}
            keyboardType="decimal-pad"
            suffix="g"
            placeholder="0"
          />
          <Field
            containerStyle={styles.flex}
            label="Carbs"
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="decimal-pad"
            suffix="g"
            placeholder="0"
          />
        </View>
        <Button testID="cf-save" title="Save food" onPress={save} disabled={!valid} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
