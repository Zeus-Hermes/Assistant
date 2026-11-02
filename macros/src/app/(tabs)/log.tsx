import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodIcon, MacroLine } from '@/components/FoodBits';
import { MacroPager } from '@/components/MacroPager';
import { CircleButton, ScreenTitle, T } from '@/components/ui';
import { WeekStrip } from '@/components/WeekStrip';
import { usePlan } from '@/hooks/usePlan';
import { confirm } from '@/lib/confirm';
import { addDays, formatDayLabel, today } from '@/lib/dates';
import { putFood } from '@/lib/foodCache';
import { amountLabel } from '@/lib/format';
import { sumNutrients } from '@/lib/nutrition';
import { hourLabel, type LogEntry } from '@/lib/types';
import { useSelectedDate } from '@/store/useSelectedDate';
import { useStore } from '@/store/useStore';
import { colors, fonts, radius, space } from '@/theme';

const HOUR_ROW = 60;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

function openEntry(e: LogEntry) {
  if (e.food) {
    putFood(e.food);
    router.push({ pathname: '/food-detail', params: { foodId: e.food.id, entryId: e.id } });
  } else {
    router.push({ pathname: '/quick-add', params: { entryId: e.id } });
  }
}

function EntryRow({ e }: { e: LogEntry }) {
  const del = useStore((s) => s.deleteEntry);
  return (
    <Pressable
      testID={`entry-${e.id}`}
      onPress={() => openEntry(e)}
      onLongPress={async () => {
        if (await confirm('Delete entry?', e.name, 'Delete', true)) del(e.id);
      }}
      style={({ pressed }) => [styles.entry, pressed && { opacity: 0.6 }]}>
      <FoodIcon name={e.name} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <T style={styles.entryName} numberOfLines={2}>
          {e.name}
        </T>
        <MacroLine n={e.nutrients} amount={amountLabel(e.serving, e.quantity) || undefined} />
      </View>
    </Pressable>
  );
}

export default function FoodLog() {
  const { date, setDate } = useSelectedDate();
  const allEntries = useStore((s) => s.entries);
  const copyDay = useStore((s) => s.copyDay);
  const deleteEntry = useStore((s) => s.deleteEntry);
  const plan = usePlan(date);
  const scroll = useRef<ScrollViewInstance>(null);
  const entries = useMemo(() => allEntries.filter((e) => e.date === date).sort((a, b) => a.createdAt - b.createdAt), [allEntries, date]);
  const totals = useMemo(() => sumNutrients(entries.map((e) => e.nutrients)), [entries]);
  const isToday = date === today();
  const nowHour = new Date().getHours();

  // Open centred on the current hour, like MacroFactor; on other days start at the first entry or morning.
  // Rows grow with their entries, so position comes from the focus row's measured layout.
  const focusHour = isToday ? nowHour : (entries[0]?.hour ?? 7);
  const centredFor = useRef<string | null>(null);
  const onHourLayout = (h: number, y: number) => {
    if (h !== focusHour || centredFor.current === date) return;
    centredFor.current = date;
    scroll.current?.scrollTo({ y: Math.max(0, y - 4 * HOUR_ROW), animated: false });
  };

  const dayActions = async () => {
    const prev = addDays(date, -1);
    const prevCount = allEntries.filter((e) => e.date === prev).length;
    if (entries.length === 0 && prevCount > 0) {
      if (await confirm('Copy previous day?', `Copy ${prevCount} item${prevCount === 1 ? '' : 's'} from ${formatDayLabel(prev)}.`, 'Copy'))
        copyDay(prev, date);
    } else if (entries.length > 0) {
      if (await confirm('Clear this day?', `Delete all ${entries.length} entries logged on ${formatDayLabel(date)}.`, 'Clear', true)) {
        entries.forEach((e) => deleteEntry(e.id));
      }
    }
  };

  const addAt = (hour: number) => router.push({ pathname: '/add-food', params: { date, hour: String(hour), tab: 'search' } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerInner}>
          <ScreenTitle title={formatDayLabel(date)}>
            <CircleButton icon="calendar-clear" accessibilityLabel="Jump to today" onPress={() => setDate(today())} />
            <CircleButton icon="options" accessibilityLabel="Targets" onPress={() => router.push('/settings/goal')} />
            <CircleButton icon="ellipsis-vertical" accessibilityLabel="Day actions" testID="day-actions" onPress={dayActions} />
          </ScreenTitle>
        </View>
        <WeekStrip date={date} onChange={setDate} />
        <View style={{ paddingTop: space.lg, paddingBottom: space.md }}>
          {plan && <MacroPager totals={totals} targets={plan.targets} />}
        </View>
      </SafeAreaView>

      <ScrollView ref={scroll} contentContainerStyle={styles.timeline} testID="timeline">
        <View style={styles.rail} />
        {HOURS.map((h) => {
          const list = entries.filter((e) => e.hour === h);
          return (
            <View key={h} testID={`hour-${h}`} onLayout={(e) => onHourLayout(h, e.nativeEvent.layout.y)}>
              <View style={styles.hourRow}>
                <View style={styles.hourPill}>
                  <T style={styles.hourText}>
                    {hourLabel(h)}
                    {isToday && h === nowHour ? ' •' : ''}
                  </T>
                </View>
                <Pressable
                  testID={`add-${h}`}
                  accessibilityLabel={`Add food at ${hourLabel(h)}`}
                  onPress={() => addAt(h)}
                  style={styles.plus}>
                  <Ionicons name="add" size={22} color={colors.text} />
                </Pressable>
              </View>
              {list.map((e) => (
                <EntryRow key={e.id} e={e} />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.header, paddingBottom: space.sm },
  headerInner: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md },
  timeline: { paddingTop: space.lg, paddingBottom: 150 },
  rail: { position: 'absolute', left: 36, top: 0, bottom: 0, width: 1, backgroundColor: colors.outline },
  hourRow: { flexDirection: 'row', alignItems: 'center', height: HOUR_ROW, paddingLeft: 7, gap: space.md },
  hourPill: {
    width: 62,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourText: { fontSize: 14, fontFamily: fonts.regular },
  plus: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginLeft: 56, marginRight: space.lg, paddingVertical: space.sm },
  entryName: { fontSize: 16, fontFamily: fonts.regular },
});
