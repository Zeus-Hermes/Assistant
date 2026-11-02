import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { caloriesFromMacros } from '@/lib/nutrition';
import type { Nutrients } from '@/lib/types';
import { colors, space } from '@/theme';

import { Button, Field, parseNum, T } from './ui';

const str = (n?: number) => (n == null ? '' : String(Math.round(n * 10) / 10));

/** Calories and macros typed in directly. Leaving calories blank derives them from the macros. */
export function QuickAddForm({
  initialName = '',
  initial,
  submitLabel,
  onSubmit,
}: {
  initialName?: string;
  initial?: Nutrients;
  submitLabel: string;
  onSubmit: (name: string, nutrients: Nutrients) => void;
}) {
  const [name, setName] = useState(initialName);
  const [kcal, setKcal] = useState(str(initial?.calories));
  const [protein, setProtein] = useState(str(initial?.protein));
  const [fat, setFat] = useState(str(initial?.fat));
  const [carbs, setCarbs] = useState(str(initial?.carbs));

  const p = parseNum(protein) ?? 0;
  const c = parseNum(carbs) ?? 0;
  const f = parseNum(fat) ?? 0;
  const fromMacros = caloriesFromMacros(p, c, f);
  const typed = parseNum(kcal);
  const calories = typed ?? fromMacros;
  const valid = calories > 0 && [p, c, f].every((x) => x >= 0);
  const mismatch = typed != null && fromMacros > 0 && Math.abs(typed - fromMacros) > Math.max(25, typed * 0.15);

  const submit = () => {
    if (!valid) return;
    onSubmit(name, { calories, protein: p, carbs: c, fat: f });
    setName('');
    setKcal('');
    setProtein('');
    setFat('');
    setCarbs('');
  };

  return (
    <View style={{ gap: space.lg }}>
      <Field testID="qa-name" label="Name (optional)" value={name} onChangeText={setName} placeholder="Quick add" />
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
      {typed == null && fromMacros > 0 && <T variant="caption">Calories will be calculated from macros: {Math.round(fromMacros)} kcal.</T>}
      {mismatch && (
        <T variant="caption" style={{ color: colors.expenditure }}>
          These macros add up to {Math.round(fromMacros)} kcal, not {Math.round(typed!)}. The calories you typed will be used.
        </T>
      )}
      <Button testID="qa-save" title={submitLabel} onPress={submit} disabled={!valid} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
