import { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import type { ScrollViewInstance } from 'react-native';

import { hourLabel } from '@/lib/types';
import { space } from '@/theme';

import { Chip } from './ui';

const CHIP_WIDTH = 82;

/** Horizontal row of hour chips for placing food on the timeline. */
export function HourPicker({ hour, onChange }: { hour: number; onChange: (h: number) => void }) {
  const ref = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    ref.current?.scrollTo({ x: Math.max(0, (hour - 2) * CHIP_WIDTH), animated: false });
    // Only position on mount; the user scrolls freely after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
      {Array.from({ length: 24 }, (_, h) => (
        <Chip key={h} label={hourLabel(h)} active={h === hour} onPress={() => onChange(h)} />
      ))}
    </ScrollView>
  );
}
