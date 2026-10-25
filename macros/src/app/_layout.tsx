import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useHydrated } from '@/hooks/useHydrated';
import { colors } from '@/theme';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.accent },
};

export default function RootLayout() {
  const hydrated = useHydrated();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        {hydrated ? (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="add-food" options={{ title: 'Add Food', presentation: 'modal' }} />
            <Stack.Screen name="food-detail" options={{ title: 'Food', presentation: 'modal' }} />
            <Stack.Screen name="quick-add" options={{ title: 'Quick Add', presentation: 'modal' }} />
            <Stack.Screen name="custom-food" options={{ title: 'Create Food', presentation: 'modal' }} />
            <Stack.Screen name="scan" options={{ title: 'Scan Barcode', presentation: 'modal' }} />
            <Stack.Screen name="weigh-in" options={{ title: 'Weigh-in', presentation: 'modal' }} />
          </Stack>
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
