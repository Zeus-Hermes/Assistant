import { useState } from 'react';
import { View } from 'react-native';

import { parseNum, Segmented, Field, T } from '@/components/ui';
import { KG_PER_LB } from '@/lib/units';
import type { Goal, GoalType, UnitSystem } from '@/lib/types';
import { space } from '@/theme';

const fmt = (n: number, d = 2) => String(Math.round(n * 10 ** d) / 10 ** d);

/** Edits a Goal. Rates and protein are shown in the user's units, stored metric. */
export function GoalForm({ goal, units, onChange }: { goal: Goal; units: UnitSystem; onChange: (g: Goal) => void }) {
  const imperial = units === 'imperial';
  const [rate, setRate] = useState(fmt(imperial ? goal.rateKgPerWeek / KG_PER_LB : goal.rateKgPerWeek));
  const [protein, setProtein] = useState(fmt(imperial ? goal.proteinPerKg * KG_PER_LB : goal.proteinPerKg));
  const [fat, setFat] = useState(fmt(goal.fatShare * 100, 0));

  const emit = (patch: Partial<Goal>) => onChange({ ...goal, ...patch });

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.sm }}>
        <T variant="label">Goal</T>
        <Segmented<GoalType>
          testID="goal-type"
          options={[
            { value: 'lose', label: 'Lose' },
            { value: 'maintain', label: 'Maintain' },
            { value: 'gain', label: 'Gain' },
          ]}
          value={goal.type}
          onChange={(type) => emit({ type })}
        />
      </View>
      {goal.type !== 'maintain' && (
        <Field
          testID="goal-rate"
          label={`Rate per week`}
          value={rate}
          onChangeText={(t) => {
            setRate(t);
            const v = parseNum(t);
            if (v != null && v >= 0 && v <= (imperial ? 3 : 1.5)) emit({ rateKgPerWeek: imperial ? v * KG_PER_LB : v });
          }}
          keyboardType="decimal-pad"
          suffix={imperial ? 'lb / week' : 'kg / week'}
        />
      )}
      <Field
        testID="goal-protein"
        label="Protein target"
        value={protein}
        onChangeText={(t) => {
          setProtein(t);
          const v = parseNum(t);
          if (v != null && v > 0 && v < 5) emit({ proteinPerKg: imperial ? v / KG_PER_LB : v });
        }}
        keyboardType="decimal-pad"
        suffix={imperial ? 'g per lb' : 'g per kg'}
      />
      <Field
        label="Fat share of calories"
        value={fat}
        onChangeText={(t) => {
          setFat(t);
          const v = parseNum(t);
          if (v != null && v >= 10 && v <= 60) emit({ fatShare: v / 100 });
        }}
        keyboardType="decimal-pad"
        suffix="%"
      />
      <T variant="caption">Carbs fill the remaining calories.</T>
    </View>
  );
}
