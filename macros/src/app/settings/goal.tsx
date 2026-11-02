import { ScrollView, StyleSheet, View } from 'react-native';

import { GoalForm } from '@/components/GoalForm';
import { Card, T } from '@/components/ui';
import { usePlan } from '@/hooks/usePlan';
import { today } from '@/lib/dates';
import { formatKcal } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { fonts, space } from '@/theme';

export default function GoalSettings() {
  const profile = useStore((s) => s.profile);
  const goal = useStore((s) => s.goal);
  const updateGoal = useStore((s) => s.updateGoal);
  const plan = usePlan(today());
  if (!profile) return null;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {plan && (
        <Card testID="settings-targets">
          <T variant="label">Daily targets this week</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <T style={{ fontSize: 30, fontFamily: fonts.semibold }}>{formatKcal(plan.targets.calories)}</T>
            <T dim>kcal</T>
          </View>
          <T dim>
            {plan.targets.protein}P · {plan.targets.fat}F · {plan.targets.carbs}C
          </T>
          <T variant="caption">Goal changes apply right away. Expenditure-based adjustments happen at the Monday check-in.</T>
        </Card>
      )}
      <Card>
        <GoalForm goal={goal} units={profile.units} onChange={updateGoal} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
});
