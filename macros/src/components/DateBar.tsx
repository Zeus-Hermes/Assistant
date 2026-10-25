import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { addDays, formatDayLabel, today } from '@/lib/dates';
import { colors, space } from '@/theme';

import { T } from './ui';

export function DateBar({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityLabel="Previous day" hitSlop={12} onPress={() => onChange(addDays(date, -1))}>
        <Ionicons name="chevron-back" size={22} color={colors.textDim} />
      </Pressable>
      <Pressable onPress={() => onChange(today())} accessibilityLabel="Jump to today">
        <T variant="heading" testID="date-label">
          {formatDayLabel(date)}
        </T>
      </Pressable>
      <Pressable accessibilityLabel="Next day" hitSlop={12} onPress={() => onChange(addDays(date, 1))}>
        <Ionicons name="chevron-forward" size={22} color={colors.textDim} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.sm },
});
