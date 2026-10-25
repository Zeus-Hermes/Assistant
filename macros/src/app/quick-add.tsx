import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Field, parseNum, Segmented, T } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { today } from '@/lib/dates';
import { finishLogging } from '@/lib/nav';
import { caloriesFromMacros } from '@/lib/nutrition';
import { MEAL_LABEL, MEALS, type Meal } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

const str = (n?: number) => (n == null ? '' : String(Math.round(n * 10) / 10));

export default function QuickAdd() {
  const params = useLocalSearchParams<{ date?: string; meal?: Meal; entryId?: string }>();
  const entry = useStore((s) => (params.entryId ? s.entries.find((e) => e.id === params.entryId) : undefined));
  const quickAdd = useStore((s) => s.quickAdd);
  const updateEntry = useStore((s) => s.updateEntry);
  const deleteEntry = useStore((s) => s.deleteEntry);

  const [name, setName] = useState(entry && entry.name !== 'Quick add' ? entry.name : '');
  const [kcal, setKcal] = useState(str(entry?.nutrients.calories));
  const [protein, setProtein] = useState(str(entry?.nutrients.protein));
  const [carbs, setCarbs] = useState(str(entry?.nutrients.carbs));
  const [fat, setFat] = useState(str(entry?.nutrients.fat));
  const [meal, setMeal] = useState<Meal>(entry?.meal ?? (params.meal && MEALS.includes(params.meal) ? params.meal : 'snacks'));

  const p = parseNum(protein) ?? 0;
  const c = parseNum(carbs) ?? 0;
  const f = parseNum(fat) ?? 0;
  const fromMacros = caloriesFromMacros(p, c, f);
  const typed = parseNum(kcal);
  const calories = typed ?? fromMacros;
  const valid = calories > 0 && [p, c, f].every((x) => x >= 0);
  const mismatch = typed != null && fromMacros > 0 && Math.abs(typed - fromMacros) > Math.max(25, typed * 0.15);

  const save = () => {
    if (!valid) return;
    const nutrients = { calories, protein: p, carbs: c, fat: f };
    if (entry) updateEntry(entry.id, { nutrients, meal, name: name.trim() || 'Quick add' });
    else quickAdd({ date: params.date ?? today(), meal, name, nutrients });
    finishLogging();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Stack.Screen options={{ title: entry ? 'Edit Quick Add' : 'Quick Add' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <T dim>Log calories and macros directly, without looking up a food.</T>
        <Field testID="qa-name" label="Description (optional)" value={name} onChangeText={setName} placeholder="e.g. Restaurant burrito" />
        <Field
          testID="qa-kcal"
          label="Calories"
          value={kcal}
          onChangeText={setKcal}
          keyboardType="decimal-pad"
          placeholder={fromMacros > 0 ? `${Math.round(fromMacros)} from macros` : '0'}
          suffix="kcal"
        />
        <View style={styles.row}>
          <Field
            testID="qa-protein"
            containerStyle={styles.flex}
            label="Protein"
            value={protein}
            onChangeText={setProtein}
            keyboardType="decimal-pad"
            placeholder="0"
            suffix="g"
          />
          <Field
            testID="qa-fat"
            containerStyle={styles.flex}
            label="Fat"
            value={fat}
            onChangeText={setFat}
            keyboardType="decimal-pad"
            placeholder="0"
            suffix="g"
          />
          <Field
            testID="qa-carbs"
            containerStyle={styles.flex}
            label="Carbs"
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="decimal-pad"
            placeholder="0"
            suffix="g"
          />
        </View>
        {typed == null && fromMacros > 0 && (
          <T variant="caption">Calories will be calculated from macros: {Math.round(fromMacros)} kcal.</T>
        )}
        {mismatch && (
          <T variant="caption" style={{ color: colors.fat }}>
            Heads up: these macros add up to {Math.round(fromMacros)} kcal, not {Math.round(typed!)}. The calories you typed will be used.
          </T>
        )}
        <View style={{ gap: space.sm }}>
          <T variant="label">Meal</T>
          <Segmented options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))} value={meal} onChange={setMeal} />
        </View>
        <Button testID="qa-save" title={entry ? 'Save' : 'Add to log'} onPress={save} disabled={!valid} />
        {entry && (
          <Button
            title="Delete entry"
            variant="danger"
            onPress={async () => {
              if (await confirm('Delete entry?', entry.name, 'Delete', true)) {
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
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
