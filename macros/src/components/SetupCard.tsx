import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GoalForm } from './GoalForm';
import { Button, Card, Field, parseNum, Segmented, T } from './ui';
import { ACTIVITY_LEVELS } from '@/lib/activity';
import { today } from '@/lib/dates';
import { computeTargets, initialExpenditure } from '@/lib/nutrition';
import type { Goal, Profile, Sex, UnitSystem } from '@/lib/types';
import { CM_PER_IN, toKg } from '@/lib/units';
import { DEFAULT_GOAL, useStore } from '@/store/useStore';
import { fonts, space } from '@/theme';

/** First-run plan setup, shown as a card on the Dashboard until it is completed. */
export function SetupCard() {
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [units, setUnits] = useState<UnitSystem>('imperial');
  const [sex, setSex] = useState<Sex>('male');
  const [birthYear, setBirthYear] = useState('');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [cm, setCm] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<string>('1.45');
  const [goal, setGoal] = useState<Goal>(DEFAULT_GOAL);

  const year = parseNum(birthYear);
  const heightCm = units === 'imperial' ? ((parseNum(feet) ?? 0) * 12 + (parseNum(inches) ?? 0)) * CM_PER_IN : (parseNum(cm) ?? 0);
  const w = parseNum(weight);
  const weightKg = w != null ? toKg(w, units) : null;
  const nowYear = new Date().getFullYear();
  const valid =
    year != null &&
    year > 1920 &&
    year < nowYear - 12 &&
    heightCm > 100 &&
    heightCm < 250 &&
    weightKg != null &&
    weightKg > 30 &&
    weightKg < 320;

  const profile: Profile | null = valid ? { sex, birthYear: year!, heightCm, activity: Number(activity), units } : null;
  const preview = profile && weightKg ? computeTargets(initialExpenditure(profile, weightKg), weightKg, goal) : null;

  const finish = () => {
    if (!profile || weightKg == null) return;
    completeOnboarding(profile, goal, { date: today(), kg: weightKg });
  };

  return (
    <Card testID="setup-card" style={{ gap: space.lg }}>
      <T style={{ fontSize: 20, fontFamily: fonts.semibold }}>Set up your plan</T>
      <T dim>Your starting calories come from a formula. After a week or two of logging, they adapt to how your body actually responds.</T>

      <Segmented
        testID="units"
        options={[
          { value: 'imperial', label: 'lb / ft' },
          { value: 'metric', label: 'kg / cm' },
        ]}
        value={units}
        onChange={setUnits}
      />
      <Segmented
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ]}
        value={sex}
        onChange={setSex}
      />
      <Field
        testID="ob-birth-year"
        label="Birth year"
        value={birthYear}
        onChangeText={setBirthYear}
        keyboardType="number-pad"
        placeholder="1998"
      />
      {units === 'imperial' ? (
        <View style={styles.row}>
          <Field
            testID="ob-feet"
            containerStyle={styles.flex}
            label="Height"
            value={feet}
            onChangeText={setFeet}
            keyboardType="number-pad"
            suffix="ft"
            placeholder="5"
          />
          <Field
            testID="ob-inches"
            containerStyle={styles.flex}
            label=" "
            value={inches}
            onChangeText={setInches}
            keyboardType="decimal-pad"
            suffix="in"
            placeholder="10"
          />
        </View>
      ) : (
        <Field testID="ob-cm" label="Height" value={cm} onChangeText={setCm} keyboardType="decimal-pad" suffix="cm" placeholder="178" />
      )}
      <Field
        testID="ob-weight"
        label="Current weight"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        suffix={units === 'imperial' ? 'lb' : 'kg'}
      />

      <View style={{ gap: space.sm }}>
        <T variant="label">Activity</T>
        <Segmented options={ACTIVITY_LEVELS.map((a) => ({ value: a.value, label: a.label }))} value={activity} onChange={setActivity} />
        <T variant="caption">{ACTIVITY_LEVELS.find((a) => a.value === activity)?.hint}</T>
      </View>

      <GoalForm goal={goal} units={units} onChange={setGoal} />

      {preview && (
        <View testID="ob-preview" style={{ gap: space.xs }}>
          <T variant="label">Starting targets</T>
          <T variant="number" style={{ fontSize: 22 }}>
            {preview.calories} kcal
          </T>
          <T dim>
            Protein {preview.protein} g · Fat {preview.fat} g · Carbs {preview.carbs} g
          </T>
        </View>
      )}

      <Button testID="ob-finish" title="Start tracking" onPress={finish} disabled={!valid} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});

/** Shown on screens that need a plan before setup is done. */
export function SetupHint() {
  return (
    <Card testID="setup-hint" style={{ margin: space.lg }}>
      <T dim>Set up your plan on the Dashboard first. It takes about a minute.</T>
      <Button title="Go to Dashboard" variant="secondary" onPress={() => router.navigate('/')} />
    </Card>
  );
}
