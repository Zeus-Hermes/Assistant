import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton, T, type IconName } from '@/components/ui';
import { today } from '@/lib/dates';
import { useSelectedDate } from '@/store/useSelectedDate';
import { colors, fonts, space } from '@/theme';

function go(href: Href) {
  router.replace(href);
}

function Shortcut({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.shortcut, pressed && { opacity: 0.7 }]}>
      <View style={styles.shortcutCircle}>
        <Ionicons name={icon} size={30} color={colors.text} />
      </View>
      <T style={styles.shortcutLabel}>{label}</T>
    </Pressable>
  );
}

function Row({
  icon,
  label,
  onPress,
  last,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  last?: boolean;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons name={icon} size={28} color={colors.text} style={{ width: 34 }} />
      <View style={[styles.rowBody, !last && styles.rowBorder]}>
        <T style={{ flex: 1, fontSize: 18 }}>{label}</T>
        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
      </View>
    </Pressable>
  );
}

export default function Shortcuts() {
  const insets = useSafeAreaInsets();
  const date = useSelectedDate((s) => s.date);
  const hour = String(new Date().getHours());
  const addFood = (tab: string) => go({ pathname: '/add-food', params: { date: today(), hour, tab } });

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close shortcuts" onPress={() => router.back()} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]} testID="shortcuts">
        <View style={styles.handle} />
        <View style={styles.header}>
          <CircleButton
            icon="close"
            size={40}
            style={{ backgroundColor: 'transparent' }}
            accessibilityLabel="Close"
            onPress={() => router.back()}
          />
          <T style={styles.title}>Shortcuts</T>
          <CircleButton
            icon="options"
            size={40}
            style={{ backgroundColor: 'transparent' }}
            accessibilityLabel="Settings"
            onPress={() => go('/more')}
          />
        </View>
        <View style={styles.shortcuts}>
          <Shortcut
            testID="sc-weight"
            icon="scale"
            label="Weight"
            onPress={() => go({ pathname: '/weigh-in', params: { date: today() } })}
          />
          <Shortcut testID="sc-search" icon="search" label="Search" onPress={() => addFood('search')} />
          <Shortcut testID="sc-barcode" icon="barcode-outline" label="Barcode" onPress={() => addFood('scan')} />
          <Shortcut testID="sc-quick" icon="rocket" label="Quick Add" onPress={() => addFood('quick')} />
        </View>
        <Row testID="sc-create" icon="create-outline" label="Create Food" onPress={() => go('/custom-food')} />
        <Row
          icon="list"
          label="Edit Day"
          onPress={() => {
            useSelectedDate.getState().setDate(date);
            router.back();
            router.navigate('/log');
          }}
        />
        <Row icon="chatbox-ellipses-outline" label="Describe" onPress={() => addFood('ai')} last />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: colors.header, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: colors.outline, marginTop: space.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.outline,
  },
  title: { fontSize: 22, fontFamily: fonts.semibold },
  shortcuts: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: space.xl },
  shortcut: { alignItems: 'center', gap: space.sm, width: 90 },
  shortcutCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.pill, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.xl, gap: space.lg },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 22, paddingRight: space.xl },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outline },
});
