import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, font, radius, space } from '@/theme';

type Variant = 'title' | 'heading' | 'body' | 'label' | 'caption' | 'number';

export function T({ variant = 'body', dim, style, ...rest }: TextProps & { variant?: Variant; dim?: boolean }) {
  return <Text {...rest} style={[styles[variant], dim && { color: colors.textDim }, style]} />;
}

export function Card({
  children,
  style,
  onPress,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}) {
  if (onPress) {
    return (
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Button({
  title,
  variant = 'primary',
  loading,
  style,
  icon,
  ...rest
}: PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
}) {
  const bg = { primary: colors.accent, secondary: colors.surfaceAlt, ghost: 'transparent', danger: 'transparent' }[variant];
  const fg = { primary: '#fff', secondary: colors.text, ghost: colors.accent, danger: colors.danger }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [styles.button, { backgroundColor: bg }, (pressed || rest.disabled) && styles.pressed, style]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  suffix,
  containerStyle,
  style,
  ...rest
}: TextInputProps & { label?: string; suffix?: string; containerStyle?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      {label ? <T variant="label">{label}</T> : null}
      <View style={styles.fieldBox}>
        <TextInput placeholderTextColor={colors.textFaint} selectionColor={colors.accent} {...rest} style={[styles.input, style]} />
        {suffix ? <T dim>{suffix}</T> : null}
      </View>
    </View>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  testID?: string;
}) {
  return (
    <View style={styles.segment} testID={testID}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && { color: colors.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />;
}

/** Parses user-typed numbers, accepting commas as decimal separators. */
export function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const base: TextStyle = { color: colors.text, fontFamily: font.family };

const styles = StyleSheet.create({
  title: { ...base, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  heading: { ...base, fontSize: 17, fontWeight: '600' },
  body: { ...base, fontSize: 15 },
  label: { ...base, fontSize: 13, fontWeight: '600', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.6 },
  caption: { ...base, fontSize: 12, color: colors.textDim },
  number: { ...base, fontSize: 15, fontWeight: '600', ...font.tabular },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  fieldWrap: { gap: space.xs },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12, minWidth: 0 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
  },
  segmentItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.border },
  segmentText: { color: colors.textDim, fontWeight: '600', fontSize: 14 },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    maxWidth: 260,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '500' },
});
