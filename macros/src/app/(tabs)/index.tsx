import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateBar } from '@/components/DateBar';
import { LineChart } from '@/components/LineChart';
import { CalorieRing, MacroBars } from '@/components/MacroBars';
import { Card, T } from '@/components/ui';
import { usePlan } from '@/hooks/usePlan';
import { addDays, daysBetween, formatDayLabel } from '@/lib/dates';
import { totalsForDay } from '@/lib/plan';
import { displayWeight, fromKg, weightUnit } from '@/lib/units';
import { useSelectedDate } from '@/store/useSelectedDate';
import { useStore } from '@/store/useStore';
import { colors, radius, space } from '@/theme';

function Action({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <T variant="caption" style={{ color: colors.text }}>
        {label}
      </T>
    </Pressable>
  );
}

export default function Dashboard() {
  const { date, setDate } = useSelectedDate();
  const entries = useStore((s) => s.entries);
  const units = useStore((s) => s.profile?.units ?? 'imperial');
  const plan = usePlan(date);
  const totals = useMemo(() => totalsForDay(entries, date), [entries, date]);

  const since = addDays(date, -29);
  const trend = plan?.expenditure.trend.filter((p) => p.date >= since) ?? [];
  const exp = plan?.expenditure.series.filter((p) => p.date >= since) ?? [];
  const latestTrend = trend.at(-1)?.value;
  const weekAgo = trend.find((p) => p.date === addDays(date, -7))?.value;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <DateBar date={date} onChange={setDate} />

        <Card testID="nutrition-card" onPress={() => router.navigate('/log')}>
          <T variant="label">Nutrition</T>
          {plan ? (
            <View style={styles.nutritionRow}>
              <CalorieRing consumed={totals.calories} target={plan.targets.calories} />
              <View style={{ flex: 1 }}>
                <MacroBars totals={totals} targets={plan.targets} keys={['protein', 'fat', 'carbs']} />
              </View>
            </View>
          ) : (
            <T dim>Log a weigh-in to get your targets.</T>
          )}
          {plan && (
            <T variant="caption">
              {Math.round(totals.calories)} of {plan.targets.calories} kcal eaten
            </T>
          )}
        </Card>

        <View style={styles.actions}>
          <Action
            testID="dash-log-food"
            icon="search"
            label="Log food"
            onPress={() => router.push({ pathname: '/add-food', params: { date, meal: 'snacks' } })}
          />
          <Action
            testID="dash-quick-add"
            icon="flash-outline"
            label="Quick add"
            onPress={() => router.push({ pathname: '/quick-add', params: { date, meal: 'snacks' } })}
          />
          <Action
            icon="barcode-outline"
            label="Scan"
            onPress={() => router.push({ pathname: '/scan', params: { date, meal: 'snacks' } })}
          />
          <Action
            testID="dash-weigh-in"
            icon="scale-outline"
            label="Weigh in"
            onPress={() => router.push({ pathname: '/weigh-in', params: { date } })}
          />
        </View>

        <Card onPress={() => router.navigate('/progress')} testID="expenditure-card">
          <View style={styles.cardHead}>
            <T variant="label">Expenditure</T>
            {plan && !plan.expenditure.adaptive && <T variant="caption">Estimated · adapts as you log</T>}
          </View>
          <T variant="number" style={styles.big}>
            {plan ? Math.round(plan.expenditure.current) : '—'} <T dim>kcal</T>
          </T>
          {exp.length > 1 && (
            <LineChart
              height={90}
              series={[{ points: exp.map((p) => ({ x: daysBetween(since, p.date), y: p.value })), color: colors.expenditure }]}
            />
          )}
        </Card>

        <Card onPress={() => router.navigate('/progress')} testID="weight-card">
          <T variant="label">Weight trend</T>
          <View style={styles.cardHead}>
            <T variant="number" style={styles.big}>
              {latestTrend != null ? displayWeight(latestTrend, units) : '—'}
            </T>
            {latestTrend != null && weekAgo != null && (
              <T variant="caption">
                {latestTrend - weekAgo >= 0 ? '+' : '−'}
                {Math.abs(fromKg(latestTrend - weekAgo, units)).toFixed(1)} {weightUnit(units)} this week
              </T>
            )}
          </View>
          {trend.length > 1 && (
            <LineChart
              height={90}
              formatY={(v) => v.toFixed(1)}
              series={[{ points: trend.map((p) => ({ x: daysBetween(since, p.date), y: fromKg(p.value, units) })), color: colors.weight }]}
            />
          )}
        </Card>

        {plan && (
          <Card>
            <T variant="label">This week's plan</T>
            <T dim>
              {plan.checkInAdaptive
                ? `Set at the ${formatDayLabel(plan.checkInDate)} check-in from your measured expenditure of ${Math.round(plan.checkInExpenditure)} kcal.`
                : `Based on your starting estimate of ${Math.round(plan.checkInExpenditure)} kcal. Once you have about a week of food and weight logs, the Monday check-in switches to your measured expenditure.`}
            </T>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  nutritionRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  actions: { flexDirection: 'row', gap: space.sm },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  big: { fontSize: 24, fontWeight: '700' },
});
