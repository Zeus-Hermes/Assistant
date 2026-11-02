import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, CircleButton, parseNum, T } from '@/components/ui';
import { addDays, formatDayLabel, today } from '@/lib/dates';
import { fromKg, toKg, weightUnit } from '@/lib/units';
import { useStore } from '@/store/useStore';
import { colors, fonts, space } from '@/theme';

export default function WeighIn() {
  const params = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState(params.date ?? today());
  const units = useStore((s) => s.profile?.units ?? 'imperial');
  const weighIns = useStore((s) => s.weighIns);
  const logWeight = useStore((s) => s.logWeight);
  const deleteWeight = useStore((s) => s.deleteWeight);
  const existing = weighIns.find((w) => w.date === date);
  const last = weighIns.at(-1);
  const [text, setText] = useState(existing ? fromKg(existing.kg, units).toFixed(1) : '');
  const value = parseNum(text);
  const valid = value != null && value > 20 && value < 700;

  const goTo = (d: string) => {
    setDate(d);
    const w = weighIns.find((x) => x.date === d);
    setText(w ? fromKg(w.kg, units).toFixed(1) : '');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.dayRow}>
        <CircleButton icon="chevron-back" size={40} accessibilityLabel="Previous day" onPress={() => goTo(addDays(date, -1))} />
        <T style={styles.day}>{formatDayLabel(date)}</T>
        <CircleButton icon="chevron-forward" size={40} accessibilityLabel="Next day" onPress={() => goTo(addDays(date, 1))} />
      </View>
      <View style={styles.valueRow}>
        <TextInput
          testID="weight-input"
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          placeholder={last ? fromKg(last.kg, units).toFixed(1) : '0.0'}
          placeholderTextColor={colors.textFaint}
          style={styles.value}
          autoFocus
          selectionColor={colors.text}
        />
        <T style={styles.unit}>{weightUnit(units)}</T>
      </View>
      <T variant="caption" style={{ textAlign: 'center' }}>
        Weigh in first thing in the morning for the most accurate trend.
      </T>
      <Button
        testID="weight-save"
        title="Save"
        disabled={!valid}
        onPress={() => {
          logWeight({ date, kg: toKg(value!, units) });
          router.back();
        }}
      />
      {existing && (
        <Button
          title="Delete this weigh-in"
          variant="danger"
          onPress={() => {
            deleteWeight(date);
            router.back();
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.xl },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  day: { fontSize: 18, fontFamily: fonts.medium },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: space.sm, paddingVertical: space.xl },
  value: { color: colors.text, fontSize: 64, fontFamily: fonts.semibold, minWidth: 160, textAlign: 'center' },
  unit: { fontSize: 24, color: colors.textDim },
});
