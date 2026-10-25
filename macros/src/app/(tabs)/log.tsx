import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateBar } from '@/components/DateBar';
import { MacroBars, MacroInline } from '@/components/MacroBars';
import { Button, Card, Divider, T } from '@/components/ui';
import { usePlan } from '@/hooks/usePlan';
import { confirm } from '@/lib/confirm';
import { addDays } from '@/lib/dates';
import { putFood } from '@/lib/foodCache';
import { isUnitServing, sumNutrients } from '@/lib/nutrition';
import { MEAL_LABEL, MEALS, type LogEntry } from '@/lib/types';
import { useSelectedDate } from '@/store/useSelectedDate';
import { useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

function amountLabel(e: LogEntry): string {
  if (!e.serving || e.quantity == null) return 'Quick add';
  const q = Math.round(e.quantity * 100) / 100;
  // "150 g" reads better than "150 × g", and "1 × 1 cup" is just "1 cup".
  if (isUnitServing(e.serving)) return `${q} ${e.serving.label}`;
  if (q === 1) return e.serving.label;
  return `${q} × ${e.serving.label}`;
}

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
      <View style={{ flex: 1, gap: 2 }}>
        <T numberOfLines={1}>{e.name}</T>
        <T variant="caption" numberOfLines={1}>
          {e.food?.brand ? `${e.food.brand} · ` : ''}
          {amountLabel(e)}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <T variant="number">{Math.round(e.nutrients.calories)}</T>
        <MacroInline n={e.nutrients} />
      </View>
    </Pressable>
  );
}

export default function FoodLog() {
  const { date, setDate } = useSelectedDate();
  const allEntries = useStore((s) => s.entries);
  const copyDay = useStore((s) => s.copyDay);
  const plan = usePlan(date);
  const entries = useMemo(() => allEntries.filter((e) => e.date === date).sort((a, b) => a.createdAt - b.createdAt), [allEntries, date]);
  const totals = useMemo(() => sumNutrients(entries.map((e) => e.nutrients)), [entries]);
  const yesterday = addDays(date, -1);
  const yesterdayCount = useMemo(() => allEntries.filter((e) => e.date === yesterday).length, [allEntries, yesterday]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <DateBar date={date} onChange={setDate} />
        {plan && (
          <Card>
            <MacroBars totals={totals} targets={plan.targets} />
          </Card>
        )}

        {MEALS.map((meal) => {
          const list = entries.filter((e) => e.meal === meal);
          const kcal = list.reduce((a, e) => a + e.nutrients.calories, 0);
          return (
            <Card key={meal} testID={`meal-${meal}`} style={{ gap: 0, paddingVertical: space.sm }}>
              <View style={styles.mealHead}>
                <T variant="heading">{MEAL_LABEL[meal]}</T>
                <View style={styles.mealRight}>
                  {kcal > 0 && (
                    <T variant="number" dim>
                      {Math.round(kcal)} kcal
                    </T>
                  )}
                  <Pressable
                    testID={`add-${meal}`}
                    accessibilityLabel={`Add to ${MEAL_LABEL[meal]}`}
                    hitSlop={10}
                    onPress={() => router.push({ pathname: '/add-food', params: { date, meal } })}>
                    <Ionicons name="add-circle" size={26} color={colors.accent} />
                  </Pressable>
                </View>
              </View>
              {list.map((e, i) => (
                <View key={e.id}>
                  {i > 0 && <Divider />}
                  <EntryRow e={e} />
                </View>
              ))}
            </Card>
          );
        })}

        {entries.length === 0 && yesterdayCount > 0 && (
          <Button
            variant="secondary"
            title={`Copy ${yesterdayCount} item${yesterdayCount === 1 ? '' : 's'} from previous day`}
            onPress={() => copyDay(yesterday, date)}
          />
        )}
        {entries.length > 0 && (
          <T variant="caption" style={{ textAlign: 'center' }}>
            Tap an entry to edit · long-press to delete
          </T>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
});
