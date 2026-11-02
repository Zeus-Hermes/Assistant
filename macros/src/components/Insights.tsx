import { StyleSheet, View } from 'react-native';

import { space } from '@/theme';

import { T } from './ui';

export type Range = '30' | '90' | '365';

export const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '30', label: '1M' },
  { value: '90', label: '3M' },
  { value: '365', label: '1Y' },
];

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: i.color }]} />
          <T variant="caption">{i.label}</T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: space.lg },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
