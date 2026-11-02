import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';

import { TabBar } from '@/components/TabBar';
import { useStore } from '@/store/useStore';
import { colors } from '@/theme';

export default function TabsLayout() {
  const profile = useStore((s) => s.profile);
  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="log" options={{ title: 'Food Log' }} />
      <Tabs.Screen name="strategy" options={{ title: 'Strategy' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
