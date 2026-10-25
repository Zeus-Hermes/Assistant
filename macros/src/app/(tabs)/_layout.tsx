import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import type { ColorValue } from 'react-native';

import { useStore } from '@/store/useStore';
import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  const profile = useStore((s) => s.profile);
  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="log" options={{ title: 'Food Log', tabBarIcon: icon('restaurant-outline') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('trending-down-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
