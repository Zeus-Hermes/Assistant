import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodIcon, MacroLine } from '@/components/FoodBits';
import { HourPicker } from '@/components/HourPicker';
import { QuickAddForm } from '@/components/QuickAddForm';
import { ScanPanel } from '@/components/ScanPanel';
import { CircleButton, T, type IconName } from '@/components/ui';
import { usePlan } from '@/hooks/usePlan';
import { today } from '@/lib/dates';
import { searchFoods } from '@/lib/foodApi';
import { putFood } from '@/lib/foodCache';
import { amountLabel, formatKcal } from '@/lib/format';
import { isUnitServing, nutrientsFor } from '@/lib/nutrition';
import { totalsForDay } from '@/lib/plan';
import { hourLabel, type Food, type Serving } from '@/lib/types';
import { cartTotals, useCart } from '@/store/useCart';
import { useSelectedDate } from '@/store/useSelectedDate';
import { useStore } from '@/store/useStore';
import { colors, fonts, radius, space } from '@/theme';

type Tab = 'scan' | 'search' | 'ai' | 'quick' | 'library';

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'scan', label: 'Scan', icon: 'barcode-outline' },
  { key: 'search', label: 'Search', icon: 'search' },
  { key: 'ai', label: 'AI', icon: 'sparkles' },
  { key: 'quick', label: 'Quick Add', icon: 'rocket' },
  { key: 'library', label: 'Library', icon: 'book' },
];

const DEBOUNCE_MS = 450;

/** The portion a "+" tap adds: what was logged last time, else one serving, else 100 g/ml. */
function defaultPortion(food: Food): { serving: Serving; quantity: number } {
  if (food.last) return food.last;
  const serving = food.servings[0];
  return { serving, quantity: isUnitServing(serving) ? 100 : 1 };
}

function FoodResult({ food, onOpen, onAdd, testID }: { food: Food; onOpen: () => void; onAdd: () => void; testID?: string }) {
  const { serving, quantity } = defaultPortion(food);
  return (
    <Pressable testID={testID} onPress={onOpen} style={({ pressed }) => [styles.result, pressed && { opacity: 0.7 }]}>
      <FoodIcon name={food.name} />
      <View style={styles.resultRight}>
        <View style={styles.resultBody}>
          <T style={styles.resultName} numberOfLines={2}>
            {food.name}
            {food.brand ? ` By ${food.brand}` : ''}
          </T>
          <MacroLine n={nutrientsFor(food, serving, quantity)} amount={amountLabel(serving, quantity)} />
        </View>
        <Pressable
          testID={testID ? `${testID}-add` : undefined}
          accessibilityLabel={`Add ${food.name}`}
          hitSlop={8}
          onPress={onAdd}
          style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.text} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function AddFood() {
  const params = useLocalSearchParams<{ date?: string; hour?: string; tab?: Tab }>();
  const cart = useCart();
  const setSelectedDate = useSelectedDate((s) => s.setDate);
  const [tab, setTab] = useState<Tab>(params.tab && TABS.some((t) => t.key === params.tab) ? params.tab : 'search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<'none' | 'time' | 'cart'>('none');
  const recent = useStore((s) => s.recentFoods);
  const mine = useStore((s) => s.customFoods);
  const entries = useStore((s) => s.entries);
  const usdaApiKey = useStore((s) => s.usdaApiKey);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    cart.open(params.date ?? today(), params.hour != null ? Number(params.hour) : new Date().getHours());
    // The cart belongs to this sheet: start it fresh once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const date = cart.date || params.date || today();
  const plan = usePlan(date);
  const loggedKcal = useMemo(() => totalsForDay(entries, date).calories, [entries, date]);
  const pending = cartTotals(cart.items);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setErrors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const r = await searchFoods(q, { usdaApiKey, signal: ctrl.signal, local: [...mine, ...recent] });
        if (ctrl.signal.aborted) return;
        setResults(r.foods);
        setErrors(r.errors);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, usdaApiKey, mine, recent]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const open = (food: Food) => {
    putFood(food);
    router.push({ pathname: '/food-detail', params: { foodId: food.id } });
  };
  const quickAddFood = (food: Food) => {
    const { serving, quantity } = defaultPortion(food);
    cart.addFood(food, serving, quantity);
  };

  const logFoods = () => {
    if (cart.items.length === 0) return;
    const d = cart.date;
    cart.commit();
    setSelectedDate(d);
    if (router.canGoBack()) router.back();
    router.navigate('/log');
  };

  const searching = query.trim().length >= 2;
  const list = searching ? results : recent.slice(0, 20);
  const emptyText = searching
    ? loading
      ? ''
      : errors.length
        ? `Search failed. ${errors.join(' · ')}`
        : 'No matches. Try fewer words, or create the food in Library.'
    : 'Foods you log show up here for quick re-logging.';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <CircleButton icon="close" accessibilityLabel="Close" testID="sheet-close" onPress={() => router.back()} size={48} />
        <Pressable testID="time-pill" onPress={() => setPanel(panel === 'time' ? 'none' : 'time')} style={styles.timePill}>
          <T style={styles.topText}>{hourLabel(cart.hour)}</T>
        </Pressable>
        <View style={styles.kcalPill} testID="cart-kcal">
          <T style={styles.topText} numberOfLines={1} adjustsFontSizeToFit>
            {formatKcal(loggedKcal + pending.calories)} / {plan ? formatKcal(plan.targets.calories) : '—'}
          </T>
        </View>
        <Pressable testID="cart-pill" onPress={() => setPanel(panel === 'cart' ? 'none' : 'cart')} style={styles.cartPill}>
          <Ionicons name="restaurant" size={24} color={cart.items.length ? colors.text : colors.textFaint} />
          {cart.items.length > 0 && <T style={styles.topText}>{cart.items.length}</T>}
        </Pressable>
        <CircleButton icon="arrow-down" accessibilityLabel="Close" onPress={() => router.back()} size={48} />
      </View>

      {panel === 'time' && (
        <View style={styles.panel}>
          <HourPicker
            hour={cart.hour}
            onChange={(h) => {
              cart.setHour(h);
              setPanel('none');
            }}
          />
        </View>
      )}
      {panel === 'cart' && (
        <View style={[styles.panel, { paddingHorizontal: space.lg, gap: space.sm }]} testID="cart-list">
          {cart.items.length === 0 && <T dim>Nothing added yet. Tap + next to a food.</T>}
          {cart.items.map((i) => (
            <View key={i.key} style={styles.cartRow}>
              <View style={{ flex: 1 }}>
                <T numberOfLines={1}>{i.name}</T>
                <MacroLine n={i.nutrients} amount={amountLabel(i.serving, i.quantity) || undefined} />
              </View>
              <CircleButton icon="remove" size={34} accessibilityLabel={`Remove ${i.name}`} onPress={() => cart.remove(i.key)} />
            </View>
          ))}
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.tabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  testID={`tab-${t.key}`}
                  onPress={() => setTab(t.key)}
                  style={[styles.tab, active && styles.tabActive]}>
                  <Ionicons name={t.icon} size={22} color={colors.text} />
                  <T style={styles.tabText}>{t.label}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ flex: 1 }}>
          {tab === 'search' && (
            <FlatList
              data={list}
              keyExtractor={(f) => f.id}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <View style={styles.listHead}>
                  <T style={styles.sectionTitle}>{searching ? 'Results' : `${hourLabel(cart.hour)} Picks`}</T>
                  {loading && <ActivityIndicator color={colors.textDim} />}
                </View>
              }
              renderItem={({ item, index }) => (
                <FoodResult testID={`result-${index}`} food={item} onOpen={() => open(item)} onAdd={() => quickAddFood(item)} />
              )}
              ListEmptyComponent={
                emptyText ? (
                  <T dim style={styles.empty} testID="search-empty">
                    {emptyText}
                  </T>
                ) : undefined
              }
              ListFooterComponent={
                searching && errors.length > 0 && results.length > 0 ? (
                  <T variant="caption" style={styles.empty}>
                    Some results missing: {errors.join(' · ')}
                  </T>
                ) : undefined
              }
            />
          )}
          {tab === 'scan' && <ScanPanel onFound={open} />}
          {tab === 'quick' && (
            <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
              <QuickAddForm submitLabel="Add" onSubmit={(name, n) => cart.addQuick(name, n)} />
            </ScrollView>
          )}
          {tab === 'ai' && (
            <View style={{ padding: space.xl, gap: space.md }}>
              <Ionicons name="sparkles" size={32} color={colors.text} />
              <T style={styles.sectionTitle}>Describe your meal</T>
              <T dim>
                Say or type what you ate, like "two eggs, toast with butter and a black coffee", and get the foods and portions to review
                before logging. Coming in v2.
              </T>
            </View>
          )}
          {tab === 'library' && (
            <FlatList
              data={mine}
              keyExtractor={(f) => f.id}
              ListHeaderComponent={
                <View style={{ gap: space.md }}>
                  <Pressable
                    testID="tool-create"
                    onPress={() => router.push('/custom-food')}
                    style={({ pressed }) => [styles.createRow, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="add-circle-outline" size={26} color={colors.text} />
                    <T style={{ fontSize: 17 }}>Create a food</T>
                  </Pressable>
                  <T style={[styles.sectionTitle, { paddingHorizontal: space.lg }]}>My Foods</T>
                </View>
              }
              renderItem={({ item, index }) => (
                <FoodResult testID={`mine-${index}`} food={item} onOpen={() => open(item)} onAdd={() => quickAddFood(item)} />
              )}
              ListEmptyComponent={
                <T dim style={styles.empty}>
                  Foods you create show up here.
                </T>
              }
            />
          )}
        </View>

        <View style={styles.bottomBar}>
          {tab === 'search' ? (
            <View style={styles.searchBox}>
              <Ionicons name="search" size={24} color={colors.text} />
              <TextInput
                testID="food-search"
                value={query}
                onChangeText={setQuery}
                placeholder="Search for a food"
                placeholderTextColor={colors.textDim}
                style={styles.searchInput}
                autoFocus={params.tab === 'search'}
                returnKeyType="search"
                autoCorrect={false}
              />
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            testID="log-foods"
            disabled={cart.items.length === 0}
            onPress={logFoods}
            style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.7 }]}>
            <T style={styles.logText}>Log Foods</T>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.sm },
  topText: { fontSize: 16, fontFamily: fonts.regular },
  timePill: {
    height: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
  },
  kcalPill: {
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.outline,
    justifyContent: 'center',
    flexShrink: 1,
  },
  cartPill: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  panel: { paddingVertical: space.md },
  cartRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sheet: { flex: 1, backgroundColor: colors.header, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: space.sm },
  handle: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: colors.outline, marginTop: space.sm },
  tabsWrap: { borderBottomWidth: 2, borderBottomColor: colors.outline, marginTop: space.md },
  tabs: { paddingHorizontal: space.sm },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    marginBottom: -2,
    borderBottomWidth: 4,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.text },
  tabText: { fontSize: 17 },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.sm,
  },
  sectionTitle: { fontSize: 19, fontFamily: fonts.medium },
  result: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  resultRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingRight: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },
  resultBody: { flex: 1, gap: 2, paddingVertical: space.md },
  resultName: { fontSize: 16, fontFamily: fonts.regular },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: space.xl, textAlign: 'center' },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, marginTop: space.md },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 54,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 2.5,
    borderColor: colors.text,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontFamily: fonts.regular,
    minWidth: 0,
    // Browsers draw a focus ring inside the already-outlined pill.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null),
  },
  logBtn: { height: 54, paddingHorizontal: space.xl, borderRadius: radius.pill, backgroundColor: colors.accent, justifyContent: 'center' },
  logText: { color: colors.onAccent, fontSize: 17, fontFamily: fonts.medium },
});
