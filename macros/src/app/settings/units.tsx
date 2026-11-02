import { ScrollView, StyleSheet } from 'react-native';

import { Card, Segmented, T } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { space } from '@/theme';

export default function UnitSettings() {
  const units = useStore((s) => s.profile?.units ?? 'imperial');
  const updateProfile = useStore((s) => s.updateProfile);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <T variant="label">Weight and height</T>
        <Segmented
          testID="units"
          options={[
            { value: 'imperial', label: 'lb / in' },
            { value: 'metric', label: 'kg / cm' },
          ]}
          value={units}
          onChange={(u) => updateProfile({ units: u })}
        />
        <T variant="caption">Food amounts always use grams and millilitres, as the databases report them.</T>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
});
