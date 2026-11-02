import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';

import { colors, fonts, radius, space } from '@/theme';

import { T } from './ui';

function DashboardIcon({ color, filled }: { color: string; filled: boolean }) {
  const p = { stroke: color, strokeWidth: 2, fill: filled ? color : 'none', rx: 1.5 };
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={7} height={10} {...p} />
      <Rect x={14} y={3} width={7} height={5} {...p} />
      <Rect x={3} y={17} width={7} height={4} {...p} />
      <Rect x={14} y={12} width={7} height={9} {...p} />
    </Svg>
  );
}

function StrategyIcon({ color, filled }: { color: string; filled: boolean }) {
  const p = { stroke: color, strokeWidth: 2, fill: filled ? color : 'none' };
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <Circle cx={12} cy={6} r={3.2} {...p} />
      <Circle cx={6} cy={17} r={3.2} {...p} />
      <Circle cx={18} cy={17} r={3.2} {...p} />
    </Svg>
  );
}

const TABS: Record<string, { label: string; icon: (color: string, focused: boolean) => React.ReactNode }> = {
  index: { label: 'Dashboard', icon: (c, f) => <DashboardIcon color={c} filled={f} /> },
  log: { label: 'Food Log', icon: (c, f) => <Ionicons name={f ? 'nutrition' : 'nutrition-outline'} size={28} color={c} /> },
  strategy: { label: 'Strategy', icon: (c, f) => <StrategyIcon color={c} filled={f} /> },
  more: {
    label: 'More',
    icon: (c, f) => <Ionicons name={f ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'} size={30} color={c} />,
  },
};

/** The floating "Search for a food" bar that sits above the tab bar. */
function SearchPill() {
  return (
    <View style={styles.searchWrap} pointerEvents="box-none">
      <Pressable
        testID="search-pill"
        onPress={() => router.push({ pathname: '/add-food', params: { tab: 'search' } })}
        style={({ pressed }) => [styles.search, pressed && { opacity: 0.8 }]}>
        <Ionicons name="search" size={24} color={colors.text} />
        <T style={styles.searchText}>Search for a food</T>
        <Pressable
          testID="search-pill-scan"
          accessibilityLabel="Scan a barcode"
          hitSlop={10}
          onPress={() => router.push({ pathname: '/add-food', params: { tab: 'scan' } })}>
          <Ionicons name="barcode-outline" size={26} color={colors.text} />
        </Pressable>
      </Pressable>
    </View>
  );
}

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const routes = state.routes.filter((r) => TABS[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]) => {
    const focused = route.name === current;
    const color = focused ? colors.text : colors.textDim;
    const tab = TABS[route.name];
    return (
      <Pressable
        key={route.key}
        testID={`tab-${route.name}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
        style={styles.tab}>
        {tab.icon(color, focused)}
        <T style={[styles.tabLabel, { color }]}>{tab.label}</T>
      </Pressable>
    );
  };

  return (
    <View>
      {current !== 'more' && <SearchPill />}
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
        {left.map(renderTab)}
        <View style={styles.tab}>
          <Pressable
            testID="tab-plus"
            accessibilityLabel="Shortcuts"
            onPress={() => router.push('/shortcuts')}
            style={({ pressed }) => [styles.plus, pressed && { opacity: 0.8 }]}>
            <Ionicons name="add" size={36} color={colors.onAccent} />
          </Pressable>
        </View>
        {right.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 12, fontFamily: fonts.medium },
  plus: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { position: 'absolute', left: 0, right: 0, bottom: '100%', paddingHorizontal: space.lg, paddingBottom: space.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 54,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  searchText: { flex: 1, color: colors.textDim, fontSize: 17 },
});
