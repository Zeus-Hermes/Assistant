import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FoodRow } from '@/components/FoodRow';
import { Segmented, T } from '@/components/ui';
import { searchFoods } from '@/lib/foodApi';
import { putFood } from '@/lib/foodCache';
import { today } from '@/lib/dates';
import { MEAL_LABEL, MEALS, type Food, type Meal } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { colors, radius, space } from '@/theme';

type Tab = 'search' | 'recent' | 'mine';

const DEBOUNCE_MS = 450;

export default function AddFood() {
  const params = useLocalSearchParams<{ date?: string; meal?: Meal }>();
  const date = params.date ?? today();
  const [meal, setMeal] = useState<Meal>(params.meal && MEALS.includes(params.meal) ? params.meal : 'snacks');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const [results, setResults] = useState<Food[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const recent = useStore((s) => s.recentFoods);
  const mine = useStore((s) => s.customFoods);
  const usdaApiKey = useStore((s) => s.usdaApiKey);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setErrors([]);
      setLoading(false);
      return;
    }
    setTab('search');
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

  const list = useMemo(() => (tab === 'search' ? results : tab === 'recent' ? recent : mine), [tab, results, recent, mine]);

  const open = (food: Food) => {
    putFood(food);
    router.push({ pathname: '/food-detail', params: { foodId: food.id, date, meal } });
  };

  const empty =
    tab === 'search'
      ? query.trim().length < 2
        ? 'Type at least 2 letters to search Open Food Facts and USDA.'
        : loading
          ? ''
          : errors.length
            ? `Search failed: ${errors.join(' · ')}`
            : 'No matches. Try fewer words, or create a custom food.'
      : tab === 'recent'
        ? 'Foods you log show up here.'
        : 'Foods you create show up here.';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textDim} />
          <TextInput
            testID="food-search"
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
          />
          {loading && <ActivityIndicator size="small" color={colors.textDim} />}
        </View>
        <View style={styles.tools}>
          <Tool
            testID="tool-scan"
            icon="barcode-outline"
            label="Scan"
            onPress={() => router.push({ pathname: '/scan', params: { date, meal } })}
          />
          <Tool
            testID="tool-quick-add"
            icon="flash-outline"
            label="Quick add"
            onPress={() => router.push({ pathname: '/quick-add', params: { date, meal } })}
          />
          <Tool
            testID="tool-create"
            icon="create-outline"
            label="Create food"
            onPress={() => router.push({ pathname: '/custom-food', params: { date, meal } })}
          />
        </View>
        <Segmented options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))} value={meal} onChange={setMeal} testID="meal-picker" />
        <Segmented
          options={[
            { value: 'search', label: 'Search' },
            { value: 'recent', label: 'Recent' },
            { value: 'mine', label: 'My Foods' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'search' && errors.length > 0 && results.length > 0 && (
          <T variant="caption" style={{ color: colors.fat }}>
            Some results missing: {errors.join(' · ')}
          </T>
        )}
      </View>
      <FlatList
        data={list}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => <FoodRow testID={`result-${index}`} food={item} onPress={() => open(item)} />}
        ListEmptyComponent={
          empty ? (
            <T dim style={{ padding: space.xl, textAlign: 'center' }} testID="search-empty">
              {empty}
            </T>
          ) : undefined
        }
      />
    </View>
  );
}

function Tool({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.tool, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <T variant="caption" style={{ color: colors.text }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { padding: space.lg, gap: space.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12, minWidth: 0 },
  tools: { flexDirection: 'row', gap: space.sm },
  tool: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
});
