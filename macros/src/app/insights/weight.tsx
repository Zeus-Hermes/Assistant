import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Legend, RANGE_OPTIONS, type Range } from '@/components/Insights';
import { LineChart } from '@/components/LineChart';
import { Button, Card, Divider, Segmented, T } from '@/components/ui';
import { usePlan } from '@/hooks/usePlan';
import { addDays, daysBetween, formatDayLabel, today } from '@/lib/dates';
import { displayWeight, fromKg, weightUnit } from '@/lib/units';
import { useStore } from '@/store/useStore';
import { colors, fonts, space } from '@/theme';

export default function WeightInsight() {
  const [range, setRange] = useState<Range>('30');
  const date = today();
  const plan = usePlan(date);
  const weighIns = useStore((s) => s.weighIns);
  const units = useStore((s) => s.profile?.units ?? 'imperial');
  const since = addDays(date, -(Number(range) - 1));
  const x = (d: string) => daysBetween(since, d);

  const scale = weighIns.filter((w) => w.date >= since).map((w) => ({ x: x(w.date), y: fromKg(w.kg, units) }));
  const trend = (plan?.expenditure.trend ?? []).filter((p) => p.date >= since).map((p) => ({ x: x(p.date), y: fromKg(p.value, units) }));
  const first = trend[0]?.y;
  const last = trend.at(-1)?.y;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />
      <Card testID="weight-chart">
        <View style={styles.statRow}>
          <T style={styles.big}>{last != null ? `${last.toFixed(1)} ${weightUnit(units)}` : '—'}</T>
          {first != null && last != null && (
            <T variant="caption">
              {last - first >= 0 ? '+' : '−'}
              {Math.abs(last - first).toFixed(1)} {weightUnit(units)} over range
            </T>
          )}
        </View>
        <LineChart
          height={200}
          formatY={(v) => v.toFixed(1)}
          series={[
            { points: scale, color: colors.textDim, dots: true },
            { points: trend, color: colors.weight },
          ]}
        />
        <Legend
          items={[
            { color: colors.textDim, label: 'Scale weight' },
            { color: colors.weight, label: 'Trend weight' },
          ]}
        />
      </Card>
      <Button testID="progress-weigh-in" title="Log weight" onPress={() => router.push({ pathname: '/weigh-in', params: { date } })} />
      <Card style={{ gap: 0 }}>
        <T variant="label" style={{ paddingBottom: space.sm }}>
          Recent weigh-ins
        </T>
        {weighIns.length === 0 && <T dim>No weigh-ins yet.</T>}
        {[...weighIns]
          .reverse()
          .slice(0, 14)
          .map((w, i) => (
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
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  big: { fontSize: 28, fontFamily: fonts.semibold },
  wRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.md },
});
