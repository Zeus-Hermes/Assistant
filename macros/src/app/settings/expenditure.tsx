import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { Button, Card, Segmented, T } from '@/components/ui';
import { ACTIVITY_LEVELS } from '@/lib/activity';
import { useStore } from '@/store/useStore';
import { space } from '@/theme';

export default function ExpenditureSettings() {
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  if (!profile) return null;
  const value = ACTIVITY_LEVELS.find((a) => Number(a.value) === profile.activity)?.value ?? '1.45';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <T variant="label">Starting activity level</T>
        <Segmented
          options={ACTIVITY_LEVELS.map((a) => ({ value: a.value, label: a.label }))}
          value={value as string}
          onChange={(v) => updateProfile({ activity: Number(v) })}
        />
        <T variant="caption">{ACTIVITY_LEVELS.find((a) => a.value === value)?.hint}</T>
        <T dim>
          This only sets the first estimate. After about a week of logging food and weight, expenditure is calculated from your own data and
          updates daily.
        </T>
      </Card>
      <Button title="View expenditure chart" variant="secondary" onPress={() => router.push('/insights/expenditure')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
});
