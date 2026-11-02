import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SetupHint } from '@/components/SetupCard';
import { Card, Field, parseNum, Segmented, T } from '@/components/ui';
import { CM_PER_IN } from '@/lib/units';
import { useStore } from '@/store/useStore';
import { space } from '@/theme';

export default function ProfileSettings() {
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const imperial = profile?.units === 'imperial';
  const [height, setHeight] = useState(() =>
    profile ? String(Math.round(imperial ? profile.heightCm / CM_PER_IN : profile.heightCm)) : '',
  );
  if (!profile) return <SetupHint />;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <T variant="label">Sex</T>
        <Segmented
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
          value={profile.sex}
          onChange={(sex) => updateProfile({ sex })}
        />
        <View style={styles.row}>
          <Field
            containerStyle={styles.flex}
            label="Birth year"
            defaultValue={String(profile.birthYear)}
            keyboardType="number-pad"
            onChangeText={(t) => {
              const v = parseNum(t);
              if (v && v > 1920 && v < new Date().getFullYear() - 12) updateProfile({ birthYear: v });
            }}
          />
          <Field
            containerStyle={styles.flex}
            label="Height"
            value={height}
            suffix={imperial ? 'in' : 'cm'}
            keyboardType="decimal-pad"
            onChangeText={(t) => {
              setHeight(t);
              const v = parseNum(t);
              const cm = v != null ? (imperial ? v * CM_PER_IN : v) : 0;
              if (cm > 100 && cm < 250) updateProfile({ heightCm: cm });
            }}
          />
        </View>
        <T variant="caption">Used for the starting expenditure estimate only.</T>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
