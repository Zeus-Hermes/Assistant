import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { Nutrients, Targets } from '@/lib/types';
import { colors, fonts, space } from '@/theme';

import { T } from './ui';

type Key = 'protein' | 'fat' | 'carbs';

const LETTER: Record<Key, string> = { protein: 'P', fat: 'F', carbs: 'C' };
const LABEL: Record<Key, string> = { protein: 'Protein', fat: 'Fat', carbs: 'Carbs' };

function Bar({ k, value, target }: { k: Key; value: number; target: number }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View style={styles.barRow} testID={`bar-${k}`}>
      <View style={styles.barHead}>
        <T style={styles.barLabel}>
          <T style={styles.letter}>{LETTER[k]} </T>
          {LABEL[k]}
        </T>
        <T style={styles.barValue}>
          {Math.round(value)} / {Math.round(target)}g
        </T>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

export function MacroBars({ totals, targets }: { totals: Nutrients; targets: Targets }) {
  return (
    <View style={{ gap: space.md }}>
      {(['protein', 'fat', 'carbs'] as Key[]).map((k) => (
        <Bar key={k} k={k} value={totals[k]} target={targets[k]} />
      ))}
    </View>
  );
}

/** White progress ring with calories remaining in the centre. */
export function CalorieRing({ consumed, target, size = 140 }: { consumed: number; target: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const remaining = Math.round(target - consumed);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} testID="calorie-ring">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.outline} strokeWidth={stroke} fill="none" />
        {pct > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={remaining < 0 ? colors.danger : colors.text}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${c * pct} ${c}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <T style={{ fontSize: 28, fontFamily: fonts.semibold }}>{Math.abs(remaining)}</T>
        <Ionicons name="flame" size={18} color={colors.text} />
      </View>
      <T variant="caption">{remaining < 0 ? 'over' : 'left'}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  barRow: { gap: 6 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 14 },
  letter: { fontFamily: fonts.bold, fontSize: 14 },
  barValue: { fontSize: 14, color: colors.textDim },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.outline, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.text },
});
