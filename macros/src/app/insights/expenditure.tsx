import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Legend, RANGE_OPTIONS, type Range } from '@/components/Insights';
import { LineChart } from '@/components/LineChart';
import { Card, Segmented, T } from '@/components/ui';
import { usePlan } from '@/hooks/usePlan';
import { addDays, daysBetween, today } from '@/lib/dates';
import { formatKcal } from '@/lib/format';
import { intakeByDay } from '@/lib/plan';
import { useStore } from '@/store/useStore';
import { colors, fonts, space } from '@/theme';

export default function ExpenditureInsight() {
  const [range, setRange] = useState<Range>('30');
  const date = today();
  const plan = usePlan(date);
  const entries = useStore((s) => s.entries);
  const since = addDays(date, -(Number(range) - 1));
  const x = (d: string) => daysBetween(since, d);

  const exp = (plan?.expenditure.series ?? []).filter((p) => p.date >= since).map((p) => ({ x: x(p.date), y: p.value }));
  const intake = Object.entries(intakeByDay(entries))
    .filter(([d]) => d >= since && d <= date)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, v]) => ({ x: x(d), y: v }));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />
      <Card testID="expenditure-chart">
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <T style={styles.big}>{plan ? formatKcal(plan.expenditure.current) : '—'}</T>
          <T dim>kcal / day</T>
        </View>
        <LineChart
          height={200}
          series={[
            { points: intake, color: colors.textDim, dots: true },
            { points: exp, color: colors.expenditure },
          ]}
        />
        <Legend
          items={[
            { color: colors.textDim, label: 'Calories eaten' },
            { color: colors.expenditure, label: 'Expenditure' },
          ]}
        />
      </Card>
      <T dim>
        {plan?.expenditure.adaptive
          ? 'Calculated from your food log and weight trend. Days with nothing logged are skipped, so log fully on the days you track.'
          : 'Currently a formula estimate. After about a week of logging food and weight, it starts adapting to your real data.'}
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  big: { fontSize: 28, fontFamily: fonts.semibold },
});
