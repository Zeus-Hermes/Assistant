import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import type { Nutrients, Targets } from '@/lib/types';
import { colors, fonts, space } from '@/theme';

import { T } from './ui';

type Key = 'calories' | 'protein' | 'fat' | 'carbs';
const KEYS: Key[] = ['calories', 'protein', 'fat', 'carbs'];
const LETTER: Record<Key, string> = { calories: '', protein: 'P', fat: 'F', carbs: 'C' };

function Item({ k, value, target, remaining }: { k: Key; value: number; target: number; remaining: boolean }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const shown = remaining ? Math.round(target - value) : Math.round(value);
  return (
    <View style={[styles.item, k === 'calories' && { flex: 1.45 }]} testID={`macro-${k}${remaining ? '-left' : ''}`}>
      <View style={styles.itemHead}>
        {k === 'calories' ? <Ionicons name="flame" size={15} color={colors.text} /> : <T style={styles.letter}>{LETTER[k]}</T>}
        <T style={styles.value} numberOfLines={1}>
          {remaining ? `${shown} left` : `${shown} / ${Math.round(target)}`}
        </T>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(remaining ? 1 - pct : pct) * 100}%` }]} />
      </View>
    </View>
  );
}

/** Calories and macros for the day; swipe for what's left. */
export function MacroPager({ totals, targets }: { totals: Nutrients; targets: Targets }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width) setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          onScroll={onScroll}
          scrollEventThrottle={64}>
          {[false, true].map((remaining) => (
            <View key={String(remaining)} style={[styles.page, { width }]}>
              {KEYS.map((k) => (
                <Item key={k} k={k} value={totals[k]} target={targets[k]} remaining={remaining} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.dots}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.dot, i === page && { backgroundColor: colors.text }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
  item: { flex: 1, gap: 6 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  letter: { fontFamily: fonts.bold, fontSize: 14 },
  value: { fontSize: 14, fontFamily: fonts.regular, flexShrink: 1 },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.outline, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.text, borderRadius: 3 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: space.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textFaint },
});
