import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LineChart } from '@/components/LineChart';
import { CalorieRing, MacroBars } from '@/components/MacroBars';
import { Card, CircleButton, ScreenTitle, SectionHeader, T } from '@/components/ui';
import { weekStart } from '@/components/WeekStrip';
import { usePlan } from '@/hooks/usePlan';
import { addDays, daysBetween, fromDateKey, today } from '@/lib/dates';
import { formatKcal } from '@/lib/format';
import { intakeByDay, totalsForDay } from '@/lib/plan';
import { fromKg, weightUnit } from '@/lib/units';
import { useSelectedDate } from '@/store/useSelectedDate';
import { useStore } from '@/store/useStore';
import { colors, fonts, radius, space } from '@/theme';

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function InsightCard({
  title,
  value,
  unit,
  sub,
  points,
  color,
  onPress,
  testID,
}: {
  title: string;
  value: string;
  unit: string;
  sub?: string;
  points: { x: number; y: number }[];
  color: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Card onPress={onPress} testID={testID} style={styles.insight}>
      <T style={styles.insightTitle}>{title}</T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <T style={styles.insightValue}>{value}</T>
        <T dim style={{ fontSize: 13 }}>
          {unit}
        </T>
      </View>
      {sub ? <T variant="caption">{sub}</T> : null}
      {points.length > 1 ? <LineChart height={64} series={[{ points, color }]} axis={false} /> : <View style={{ height: 64 }} />}
    </Card>
  );
}

export default function Dashboard() {
  const date = today();
  const entries = useStore((s) => s.entries);
  const units = useStore((s) => s.profile?.units ?? 'imperial');
  const plan = usePlan(date);
  const totals = useMemo(() => totalsForDay(entries, date), [entries, date]);
  const intake = useMemo(() => intakeByDay(entries), [entries]);

  const since = addDays(date, -20);
  const trend = (plan?.expenditure.trend ?? []).filter((p) => p.date >= since);
  const exp = (plan?.expenditure.series ?? []).filter((p) => p.date >= since);
  const latest = trend.at(-1)?.value;
  const weekAgo = trend.find((p) => p.date === addDays(date, -7))?.value;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i));
  const maxKcal = Math.max((plan?.targets.calories ?? 1) * 1.2, ...weekDays.map((d) => intake[d] ?? 0));

  const openLog = (d: string) => {
    useSelectedDate.getState().setDate(d);
    router.navigate('/log');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle title="Dashboard">
          <CircleButton
            icon="scale"
            accessibilityLabel="Log weight"
            testID="dash-weigh-in"
            onPress={() => router.push({ pathname: '/weigh-in', params: { date } })}
          />
          <CircleButton icon="ellipsis-vertical" accessibilityLabel="Settings" onPress={() => router.navigate('/more')} />
        </ScreenTitle>

        <Card testID="nutrition-card" onPress={() => openLog(date)}>
          <T style={styles.cardTitle}>Daily Nutrition</T>
          {plan ? (
            <View style={styles.nutritionRow}>
              <CalorieRing consumed={totals.calories} target={plan.targets.calories} />
              <View style={{ flex: 1 }}>
                <MacroBars totals={totals} targets={plan.targets} />
              </View>
            </View>
          ) : (
            <T dim>Log a weigh-in to get your targets.</T>
          )}
          {plan && (
            <T variant="caption">
              {formatKcal(totals.calories)} of {formatKcal(plan.targets.calories)} kcal eaten
            </T>
          )}
        </Card>

        {plan && (
          <Card testID="week-card">
            <T style={styles.cardTitle}>This Week</T>
            <View style={styles.week}>
              {weekDays.map((d) => {
                const kcal = intake[d] ?? 0;
                return (
                  <View key={d} style={styles.weekCol}>
                    <View style={styles.weekTrack}>
                      <View style={[styles.weekTarget, { bottom: `${(plan.targets.calories / maxKcal) * 100}%` }]} />
                      <View style={[styles.weekFill, { height: `${(kcal / maxKcal) * 100}%` }, d > date && { opacity: 0 }]} />
                    </View>
                    <T variant="caption" style={d === date ? { color: colors.text } : undefined}>
                      {DAY_LETTER[fromDateKey(d).getDay()]}
                    </T>
                  </View>
                );
              })}
            </View>
            <T variant="caption">Calories eaten each day. The line marks your target.</T>
          </Card>
        )}

        <SectionHeader title="Insights & Analytics" />
        <View style={styles.grid}>
          <InsightCard
            testID="expenditure-card"
            title="Expenditure"
            value={plan ? formatKcal(plan.expenditure.current) : '—'}
            unit="kcal"
            sub={plan && !plan.expenditure.adaptive ? 'Estimated' : 'Last 3 weeks'}
            points={exp.map((p) => ({ x: daysBetween(since, p.date), y: p.value }))}
            color={colors.expenditure}
            onPress={() => router.push('/insights/expenditure')}
          />
          <InsightCard
            testID="weight-card"
            title="Weight Trend"
            value={latest != null ? fromKg(latest, units).toFixed(1) : '—'}
            unit={weightUnit(units)}
            sub={
              latest != null && weekAgo != null
                ? `${latest - weekAgo >= 0 ? '+' : '−'}${Math.abs(fromKg(latest - weekAgo, units)).toFixed(1)} this week`
                : 'Last 3 weeks'
            }
            points={trend.map((p) => ({ x: daysBetween(since, p.date), y: fromKg(p.value, units) }))}
            color={colors.weight}
            onPress={() => router.push('/insights/weight')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: 150 },
  cardTitle: { fontSize: 18, fontFamily: fonts.medium },
  nutritionRow: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  week: { flexDirection: 'row', gap: space.sm, height: 110 },
  weekCol: { flex: 1, alignItems: 'center', gap: 6 },
  weekTrack: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  weekFill: { backgroundColor: colors.expenditure, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  weekTarget: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.blue, zIndex: 1 },
  grid: { flexDirection: 'row', gap: space.md },
  insight: { flex: 1, gap: 4, borderRadius: radius.lg },
  insightTitle: { fontSize: 15, fontFamily: fonts.medium },
  insightValue: { fontSize: 24, fontFamily: fonts.semibold },
});
