import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { addDays, daysBetween, fromDateKey, today } from '@/lib/dates';
import { colors, fonts, space } from '@/theme';

import { T } from './ui';

const WEEKS_BACK = 52;
const WEEKS_AHEAD = 4;
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const dow = fromDateKey(date).getDay();
  return addDays(date, -((dow + 6) % 7));
}

/** Seven pill-shaped days per page, swipeable week to week, as on MacroFactor's food log. */
export function WeekStrip({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const [width, setWidth] = useState(0);
  const list = useRef<FlatList<number>>(null);
  const now = today();
  const thisWeek = weekStart(now);
  const weeks = useMemo(() => Array.from({ length: WEEKS_BACK + WEEKS_AHEAD + 1 }, (_, i) => i - WEEKS_BACK), []);
  const indexFor = (d: string) => WEEKS_BACK + Math.round(daysBetween(thisWeek, weekStart(d)) / 7);
  const selectedIndex = Math.min(weeks.length - 1, Math.max(0, indexFor(date)));

  useEffect(() => {
    if (width > 0) list.current?.scrollToIndex({ index: selectedIndex, animated: true });
  }, [selectedIndex, width]);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} testID="week-strip">
      {width > 0 && (
        <FlatList
          ref={list}
          data={weeks}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={selectedIndex}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          keyExtractor={(w) => String(w)}
          renderItem={({ item }) => {
            const start = addDays(thisWeek, item * 7);
            return (
              <View style={[styles.week, { width }]}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = addDays(start, i);
                  const selected = d === date;
                  return (
                    <Pressable
                      key={d}
                      testID={`day-${d}`}
                      accessibilityLabel={d}
                      accessibilityState={{ selected }}
                      onPress={() => onChange(d)}
                      style={[styles.day, selected ? styles.daySelected : styles.dayIdle]}>
                      <T style={styles.dayNum}>{fromDateKey(d).getDate()}</T>
                      <T style={styles.dayName}>{DAY_ABBR[fromDateKey(d).getDay()]}</T>
                      <View style={[styles.todayDot, d !== now && { opacity: 0 }]} />
                    </Pressable>
                  );
                })}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg },
  day: { width: 46, height: 68, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  dayIdle: { borderWidth: 2, borderColor: colors.outline },
  daySelected: { backgroundColor: colors.outline },
  dayNum: { fontSize: 17, fontFamily: fonts.regular, lineHeight: 20 },
  dayName: { fontSize: 13, color: colors.textDim, lineHeight: 17 },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.text, marginTop: 2 },
});
