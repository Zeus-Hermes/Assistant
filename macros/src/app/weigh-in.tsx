import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { DateBar } from '@/components/DateBar';
import { Button, Field, parseNum, T } from '@/components/ui';
import { today } from '@/lib/dates';
import { fromKg, toKg, weightUnit } from '@/lib/units';
import { useStore } from '@/store/useStore';
import { space } from '@/theme';

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

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <DateBar
        date={date}
        onChange={(d) => {
          setDate(d);
          const w = weighIns.find((x) => x.date === d);
          setText(w ? fromKg(w.kg, units).toFixed(1) : '');
        }}
      />
      <Field
        testID="weight-input"
        label="Scale weight"
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        suffix={weightUnit(units)}
        placeholder={last ? fromKg(last.kg, units).toFixed(1) : ''}
        autoFocus
      />
      <T variant="caption">Weigh in daily, first thing in the morning, for the most accurate trend.</T>
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
  content: { padding: space.lg, gap: space.lg },
});
