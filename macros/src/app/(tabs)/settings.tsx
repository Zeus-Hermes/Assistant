import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalForm } from '@/components/GoalForm';
import { Button, Card, Field, parseNum, Segmented, T } from '@/components/ui';
import { usePlan } from '@/hooks/usePlan';
import { ACTIVITY_LEVELS } from '@/lib/activity';
import { exportBackup, pickBackup } from '@/lib/backupFiles';
import { confirm, notify } from '@/lib/confirm';
import { today } from '@/lib/dates';
import type { UnitSystem } from '@/lib/types';
import { CM_PER_IN } from '@/lib/units';
import { pickData, useStore } from '@/store/useStore';
import { space } from '@/theme';

export default function Settings() {
  const state = useStore();
  const { profile, goal, updateGoal, updateProfile, usdaApiKey, setUsdaApiKey, replaceAll, reset } = state;
  const plan = usePlan(today());
  const [key, setKey] = useState(usdaApiKey);
  const [height, setHeight] = useState(() =>
    profile ? (profile.units === 'imperial' ? String(Math.round(profile.heightCm / CM_PER_IN)) : String(Math.round(profile.heightCm))) : '',
  );
  // Remount the goal form when units change so its text fields reformat.
  const [goalFormKey, setGoalFormKey] = useState(0);
  if (!profile) return null;

  const setUnits = (units: UnitSystem) => {
    updateProfile({ units });
    setHeight(units === 'imperial' ? String(Math.round(profile.heightCm / CM_PER_IN)) : String(Math.round(profile.heightCm)));
    setGoalFormKey((k) => k + 1);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <T variant="title">Settings</T>

        {plan && (
          <Card>
            <T variant="label">Current targets</T>
            <T variant="number" style={{ fontSize: 22 }} testID="settings-targets">
              {plan.targets.calories} kcal
            </T>
            <T dim>
              Protein {plan.targets.protein} g · Fat {plan.targets.fat} g · Carbs {plan.targets.carbs} g
            </T>
            <T variant="caption">Goal changes apply right away. Expenditure-based adjustments happen at the Monday check-in.</T>
          </Card>
        )}

        <Card>
          <T variant="label">Program</T>
          <GoalForm key={goalFormKey} goal={goal} units={profile.units} onChange={(g) => updateGoal(g)} />
        </Card>

        <Card>
          <T variant="label">Profile</T>
          <Segmented
            options={[
              { value: 'imperial', label: 'lb / in' },
              { value: 'metric', label: 'kg / cm' },
            ]}
            value={profile.units}
            onChange={setUnits}
          />
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
              suffix={profile.units === 'imperial' ? 'in' : 'cm'}
              keyboardType="decimal-pad"
              onChangeText={(t) => {
                setHeight(t);
                const v = parseNum(t);
                const cm = v != null ? (profile.units === 'imperial' ? v * CM_PER_IN : v) : 0;
                if (cm > 100 && cm < 250) updateProfile({ heightCm: cm });
              }}
            />
          </View>
          <T variant="label">Starting activity level</T>
          <Segmented
            options={ACTIVITY_LEVELS.map((a) => ({ value: a.value, label: a.label }))}
            value={(ACTIVITY_LEVELS.find((a) => Number(a.value) === profile.activity)?.value ?? '1.45') as string}
            onChange={(v) => updateProfile({ activity: Number(v) })}
          />
          <T variant="caption">Only affects the starting estimate. Once you have logged data, expenditure follows your real numbers.</T>
        </Card>

        <Card>
          <T variant="label">Food database</T>
          <T dim>
            Search uses Open Food Facts (no key needed) and USDA FoodData Central. USDA's shared demo key is heavily rate-limited, so get a
            free personal key.
          </T>
          <Field
            testID="usda-key"
            label="USDA API key"
            value={key}
            onChangeText={setKey}
            placeholder="Using DEMO_KEY"
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={() => setUsdaApiKey(key)}
          />
          <View style={styles.row}>
            <Button style={styles.flex} title="Save key" variant="secondary" onPress={() => setUsdaApiKey(key)} />
            <Button
              style={styles.flex}
              title="Get a free key"
              variant="ghost"
              onPress={() => Linking.openURL('https://fdc.nal.usda.gov/api-key-signup')}
            />
          </View>
        </Card>

        <Card>
          <T variant="label">Your data</T>
          <T dim>
            Everything is stored only on this device: {state.entries.length} log entries, {state.weighIns.length} weigh-ins,{' '}
            {state.customFoods.length} custom foods. Export a backup regularly.
          </T>
          <Button
            testID="export"
            title="Export backup"
            variant="secondary"
            onPress={async () => {
              try {
                await exportBackup(pickData(useStore.getState()));
              } catch (e) {
                notify('Export failed', (e as Error).message);
              }
            }}
          />
          <Button
            title="Import backup"
            variant="secondary"
            onPress={async () => {
              try {
                const data = await pickBackup();
                if (!data) return;
                if (
                  await confirm(
                    'Replace all data?',
                    `This replaces everything on this device with the backup (${data.entries.length} entries).`,
                    'Replace',
                    true,
                  )
                ) {
                  replaceAll(data);
                  notify('Backup restored');
                }
              } catch (e) {
                notify('Import failed', (e as Error).message);
              }
            }}
          />
          <Button
            title="Erase all data"
            variant="danger"
            onPress={async () => {
              if (await confirm('Erase everything?', 'This deletes your log, weigh-ins and settings from this device.', 'Erase', true))
                reset();
            }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
