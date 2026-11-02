import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Button, Card, CircleButton, ScreenTitle, SectionHeader, T } from '@/components/ui';
import { usePlan } from '@/hooks/usePlan';
import { addDays, daysBetween, fromDateKey, today } from '@/lib/dates';
import { formatKcal } from '@/lib/format';
import { fromKg, weightUnit } from '@/lib/units';
import { useStore } from '@/store/useStore';
import { colors, fonts, radius, space } from '@/theme';

const SIZE = 220;

/** White ring inside a green arc that fills as the week since check-in goes by. */
function CheckInRing({ days }: { days: number }) {
  const c = SIZE / 2;
  const outerR = c - 4;
  const innerR = c - 22;
  const outerLen = 2 * Math.PI * outerR;
  const innerLen = 2 * Math.PI * innerR;
  const pct = Math.min(1, days / 7);
  const gap = 0.04;
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }} testID="checkin-ring">
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={outerR} stroke={colors.surfaceAlt} strokeWidth={5} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={outerR}
          stroke={colors.success}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${outerLen * Math.max(0.02, pct)} ${outerLen}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
        <Circle
          cx={c}
          cy={c}
          r={innerR}
          stroke={colors.text}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${innerLen * (1 - gap)} ${innerLen}`}
          transform={`rotate(${-90 + 360 * (pct + gap / 2)} ${c} ${c})`}
        />
      </Svg>
      <T variant="display" style={{ fontSize: 32 }}>
        {days} {days === 1 ? 'DAY' : 'DAYS'}
      </T>
      <T dim style={{ fontSize: 16 }}>
        since check-in
      </T>
    </View>
  );
}

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Strategy() {
  const date = today();
  const plan = usePlan(date);
  const goal = useStore((s) => s.goal);
  const units = useStore((s) => s.profile?.units ?? 'imperial');
  const firstWeighIn = useStore((s) => s.weighIns[0]?.date);
  if (!plan) return null;

  const days = daysBetween(plan.checkInDate, date);
  const next = addDays(plan.checkInDate, 7);
  const nextLabel = fromDateKey(next).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const since = firstWeighIn ? fromDateKey(firstWeighIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(plan.checkInDate, i));
  const rate = fromKg(goal.rateKgPerWeek, units).toFixed(2);
  const goalText =
    goal.type === 'maintain' ? 'Maintain weight' : `${goal.type === 'lose' ? 'Lose' : 'Gain'} ${rate} ${weightUnit(units)} per week`;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle title="Strategy">
          <CircleButton icon="ellipsis-vertical" accessibilityLabel="Program settings" onPress={() => router.push('/settings/goal')} />
        </ScreenTitle>

        <View style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <CheckInRing days={days} />
        </View>

        <View style={styles.legend}>
          <Pressable style={styles.legendItem} onPress={() => router.push('/settings/goal')} testID="strategy-goal">
            <MaterialCommunityIcons name="bullseye" size={32} color={colors.success} />
            <T style={styles.legendText}>Goal</T>
          </Pressable>
          <View style={styles.legendItem}>
            <MaterialCommunityIcons name="calendar-today" size={30} color={colors.text} />
            <T style={styles.legendText}>Check-In</T>
          </View>
        </View>

        <View style={styles.banner} testID="checkin-banner">
          <Ionicons name="time-outline" size={28} color={colors.text} />
          <T style={styles.bannerText}>Next check-in is {nextLabel}.</T>
          <Button title="Goal" onPress={() => router.push('/settings/goal')} style={{ minHeight: 44 }} />
        </View>

        <SectionHeader title="In Progress" />
        <Card style={styles.program} testID="program-card">
          <View>
            <T style={styles.programTitle}>{goalText}</T>
            <T dim style={{ fontSize: 16 }}>
              {since ? `${since} - Now` : 'Starting today'}
            </T>
          </View>
          <View style={styles.days}>
            {weekDays.map((d) => (
              <View key={d} style={styles.dayCol}>
                <View style={styles.kcalPill}>
                  <T style={styles.kcalText}>{plan.targets.calories}</T>
                </View>
                <View style={styles.bar} />
                <T variant="caption" style={d === date ? { color: colors.text } : undefined}>
                  {DAY_LETTER[fromDateKey(d).getDay()]}
                </T>
              </View>
            ))}
          </View>
          <View style={styles.rows}>
            <View style={styles.targetRow}>
              <T dim>Calories</T>
              <T variant="number">{formatKcal(plan.targets.calories)} kcal</T>
            </View>
            <View style={styles.targetRow}>
              <T dim>Protein</T>
              <T variant="number">{plan.targets.protein} g</T>
            </View>
            <View style={styles.targetRow}>
              <T dim>Fat</T>
              <T variant="number">{plan.targets.fat} g</T>
            </View>
            <View style={styles.targetRow}>
              <T dim>Carbs</T>
              <T variant="number">{plan.targets.carbs} g</T>
            </View>
            <View style={styles.targetRow}>
              <T dim>Expenditure at check-in</T>
              <T variant="number">{formatKcal(plan.checkInExpenditure)} kcal</T>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: 150 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: space.xxl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  legendText: { fontSize: 19 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: '#111111', padding: space.lg, borderRadius: 4 },
  bannerText: { flex: 1, fontSize: 15 },
  program: { gap: space.md },
  programTitle: { fontSize: 22, fontFamily: fonts.medium },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  dayCol: { flex: 1, alignItems: 'center', gap: 6 },
  kcalPill: { backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 3, alignSelf: 'stretch', alignItems: 'center' },
  kcalText: { fontSize: 12, fontFamily: fonts.medium },
  bar: { alignSelf: 'stretch', height: 44, backgroundColor: colors.expenditure },
  rows: { gap: space.sm },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
