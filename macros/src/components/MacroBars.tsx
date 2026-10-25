import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { Nutrients, Targets } from '@/lib/types';
import { colors, macroColor, space } from '@/theme';

import { T } from './ui';

type Key = 'calories' | 'protein' | 'fat' | 'carbs';

const LABEL: Record<Key, string> = { calories: 'Calories', protein: 'Protein', fat: 'Fat', carbs: 'Carbs' };

function Bar({ k, value, target }: { k: Key; value: number; target: number }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const over = target > 0 && value > target * 1.05;
  const unit = k === 'calories' ? '' : 'g';
  return (
    <View style={styles.barRow} testID={`bar-${k}`}>
      <View style={styles.barHead}>
        <T variant="caption" style={{ color: macroColor[k], fontWeight: '600' }}>
          {LABEL[k]}
        </T>
        <T variant="caption" style={over && { color: colors.danger }}>
          <T variant="number" style={{ fontSize: 13 }}>
            {Math.round(value)}
          </T>
          {` / ${Math.round(target)}${unit}`}
        </T>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: macroColor[k] }]} />
      </View>
    </View>
  );
}

export function MacroBars({
  totals,
  targets,
  keys = ['calories', 'protein', 'fat', 'carbs'],
}: {
  totals: Nutrients;
  targets: Targets;
  keys?: Key[];
}) {
  return (
    <View style={{ gap: space.md }}>
      {keys.map((k) => (
        <Bar key={k} k={k} value={totals[k]} target={targets[k]} />
      ))}
    </View>
  );
}

/** Ring showing calories consumed against the target, remaining in the centre. */
export function CalorieRing({ consumed, target, size = 132 }: { consumed: number; target: number; size?: number }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const remaining = Math.round(target - consumed);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} testID="calorie-ring">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={remaining < 0 ? colors.danger : colors.calories}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <T variant="number" style={{ fontSize: 26, fontWeight: '700' }}>
        {Math.abs(remaining)}
      </T>
      <T variant="caption">{remaining < 0 ? 'over' : 'remaining'}</T>
    </View>
  );
}

/** Compact "P 30 · F 10 · C 45" line. */
export function MacroInline({ n }: { n: Nutrients }) {
  return (
    <T variant="caption">
      <T variant="caption" style={{ color: colors.protein }}>
        P{' '}
      </T>
      {Math.round(n.protein)}
      <T variant="caption" style={{ color: colors.fat }}>
        {'  '}F{' '}
      </T>
      {Math.round(n.fat)}
      <T variant="caption" style={{ color: colors.carbs }}>
        {'  '}C{' '}
      </T>
      {Math.round(n.carbs)}
    </T>
  );
}

const styles = StyleSheet.create({
  barRow: { gap: 6 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
