import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
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
  type ViewStyle,
} from 'react-native';

import { colors, font, fonts, radius, space } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'number';

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

/** Pill-shaped button; primary is MacroFactor's white pill with dark text. */
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
  const fg = { primary: colors.onAccent, secondary: colors.text, ghost: colors.text, danger: colors.danger }[variant];
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

/** Round dark icon button used in headers (calendar, filters, ⋮, ×). */
export function CircleButton({
  icon,
  onPress,
  size = 46,
  accessibilityLabel,
  testID,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && styles.pressed,
        style,
      ]}>
      <Ionicons name={icon} size={size * 0.46} color={colors.text} />
    </Pressable>
  );
}

/** Unbounded is very wide, so longer titles step down in size to stay on one line. */
function titleSize(title: string): number {
  const n = title.length;
  return n <= 6 ? 32 : n <= 8 ? 28 : n <= 9 ? 24 : 20;
}

/** Screen header: wide uppercase title with round action buttons on the right. */
export function ScreenTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <T variant="display" numberOfLines={1} style={{ flexShrink: 1, fontSize: titleSize(title) }}>
        {title.toUpperCase()}
      </T>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

export function SectionHeader({ title, style }: { title: string; style?: StyleProp<ViewStyle> }) {
  return (
    <T variant="title" style={[{ fontSize: 22, marginTop: space.md }, style]}>
      {title}
    </T>
  );
}

/** Rounded group of rows, as on MacroFactor's More screen. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function ListRow({
  icon,
  label,
  value,
  onPress,
  last,
  trailing = 'chevron',
  testID,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  trailing?: 'chevron' | 'external' | 'none';
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed && onPress && { backgroundColor: colors.surfaceAlt }]}>
      {icon ? <Ionicons name={icon} size={24} color={colors.text} style={{ width: 28 }} /> : null}
      <View style={[styles.listRowBody, !last && styles.listRowBorder]}>
        <T style={{ flex: 1, fontSize: 17 }}>{label}</T>
        {value ? <T dim>{value}</T> : null}
        {trailing === 'chevron' && <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
        {trailing === 'external' && <Ionicons name="open-outline" size={20} color={colors.textFaint} />}
      </View>
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
        <TextInput placeholderTextColor={colors.textFaint} selectionColor={colors.text} {...rest} style={[styles.input, style]} />
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
            <Text style={[styles.segmentText, active && { color: colors.onAccent }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: colors.onAccent }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.outline }, style]} />;
}

/** Parses user-typed numbers, accepting commas as decimal separators. */
export function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const styles = StyleSheet.create({
  display: { color: colors.text, fontFamily: fonts.display, fontSize: 30, letterSpacing: 0.5 },
  title: { color: colors.text, fontFamily: fonts.semibold, fontSize: 24 },
  heading: { color: colors.text, fontFamily: fonts.medium, fontSize: 17 },
  body: { color: colors.text, fontFamily: fonts.regular, fontSize: 15 },
  label: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 13 },
  caption: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13 },
  number: { color: colors.text, fontFamily: fonts.medium, fontSize: 15, ...font.tabular },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 50 },
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 17, fontFamily: fonts.medium },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.xl, gap: space.lg },
  listRowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 20, paddingRight: space.xl },
  listRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outline },
  fieldWrap: { gap: 6 },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, fontFamily: fonts.regular, paddingVertical: 13, minWidth: 0 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
  },
  segmentItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.accent },
  segmentText: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 14 },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    maxWidth: 280,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14, fontFamily: fonts.medium },
});
