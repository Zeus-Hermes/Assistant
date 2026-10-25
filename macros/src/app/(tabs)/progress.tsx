import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LineChart } from '@/components/LineChart';
import { Button, Card, Divider, Segmented, T } from '@/components/ui';
import { usePlan } from '@/hooks/usePlan';
import { addDays, daysBetween, formatDayLabel, today } from '@/lib/dates';
import { intakeByDay } from '@/lib/plan';
import { displayWeight, fromKg, weightUnit } from '@/lib/units';
import { useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

type Range = '30' | '90' | '365';

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: i.color }]} />
          <T variant="caption">{i.label}</T>
        </View>
      ))}
    </View>
  );
}

export default function Progress() {
  const [range, setRange] = useState<Range>('30');
  const date = today();
  const plan = usePlan(date);
  const weighIns = useStore((s) => s.weighIns);
  const entries = useStore((s) => s.entries);
  const units = useStore((s) => s.profile?.units ?? 'imperial');
  const since = addDays(date, -(Number(range) - 1));
  const x = (d: string) => daysBetween(since, d);

  const scale = weighIns.filter((w) => w.date >= since).map((w) => ({ x: x(w.date), y: fromKg(w.kg, units) }));
  const trend = (plan?.expenditure.trend ?? []).filter((p) => p.date >= since).map((p) => ({ x: x(p.date), y: fromKg(p.value, units) }));
  const exp = (plan?.expenditure.series ?? []).filter((p) => p.date >= since).map((p) => ({ x: x(p.date), y: p.value }));
  const intake = Object.entries(intakeByDay(entries))
    .filter(([d]) => d >= since && d <= date)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, v]) => ({ x: x(d), y: v }));

  const trendFirst = trend[0]?.y;
  const trendLast = trend.at(-1)?.y;
  const recentWeighIns = [...weighIns].reverse().slice(0, 14);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <T variant="title">Progress</T>
          <Button
            testID="progress-weigh-in"
            title="Weigh in"
            variant="secondary"
            onPress={() => router.push({ pathname: '/weigh-in', params: { date } })}
          />
        </View>
        <Segmented
          options={[
            { value: '30', label: '1M' },
            { value: '90', label: '3M' },
            { value: '365', label: '1Y' },
          ]}
          value={range}
          onChange={setRange}
        />

        <Card testID="weight-chart">
          <T variant="label">Weight</T>
          <View style={styles.statRow}>
            <T variant="number" style={styles.big}>
              {trendLast != null ? `${trendLast.toFixed(1)} ${weightUnit(units)}` : '—'}
            </T>
            {trendFirst != null && trendLast != null && (
              <T variant="caption">
                {trendLast - trendFirst >= 0 ? '+' : '−'}
                {Math.abs(trendLast - trendFirst).toFixed(1)} {weightUnit(units)} over range
              </T>
            )}
          </View>
          <LineChart
            formatY={(v) => v.toFixed(1)}
            series={[
              { points: scale, color: colors.textDim, dots: true },
              { points: trend, color: colors.weight },
            ]}
          />
          <Legend
            items={[
              { color: colors.textDim, label: 'Scale weight' },
              { color: colors.weight, label: 'Trend' },
            ]}
          />
        </Card>

        <Card testID="expenditure-chart">
          <T variant="label">Expenditure &amp; intake</T>
          <View style={styles.statRow}>
            <T variant="number" style={styles.big}>
              {plan ? Math.round(plan.expenditure.current) : '—'} <T dim>kcal/day</T>
            </T>
          </View>
          <LineChart
            series={[
              { points: intake, color: colors.calories, dots: true },
              { points: exp, color: colors.expenditure },
            ]}
          />
          <Legend
            items={[
              { color: colors.calories, label: 'Calories eaten' },
              { color: colors.expenditure, label: 'Expenditure' },
            ]}
          />
          <T variant="caption">
            {plan?.expenditure.adaptive
              ? 'Calculated from your food log and weight trend. Days with nothing logged are skipped, so log fully on days you track.'
              : 'Currently a formula estimate. After about a week of logging food and weight, it starts adapting to your real data.'}
          </T>
        </Card>

        <Card style={{ gap: 0 }}>
          <T variant="label" style={{ paddingBottom: space.sm }}>
            Recent weigh-ins
          </T>
          {recentWeighIns.length === 0 && <T dim>No weigh-ins yet.</T>}
          {recentWeighIns.map((w, i) => (
            <View key={w.date}>
              {i > 0 && <Divider />}
              <Pressable onPress={() => router.push({ pathname: '/weigh-in', params: { date: w.date } })} style={styles.wRow}>
                <T>{formatDayLabel(w.date)}</T>
                <T variant="number">{displayWeight(w.kg, units)}</T>
              </Pressable>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  big: { fontSize: 24, fontWeight: '700' },
  legend: { flexDirection: 'row', gap: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  wRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.md },
});
