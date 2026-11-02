import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Unbounded_900Black } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useHydrated } from '@/hooks/useHydrated';
import { colors, fonts } from '@/theme';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.accent },
};

const modal = { presentation: 'modal' as const };
const sheet = { presentation: 'transparentModal' as const, headerShown: false, animation: 'fade' as const };

export default function RootLayout() {
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Unbounded_900Black,
  });
  // A font failure should not lock the user out; system fonts are an acceptable fallback.
  const ready = hydrated && (fontsLoaded || fontError != null);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        {ready ? (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: fonts.semibold },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="add-food" options={{ ...modal, headerShown: false }} />
            <Stack.Screen name="shortcuts" options={sheet} />
            <Stack.Screen name="food-detail" options={{ ...modal, title: 'Food' }} />
            <Stack.Screen name="quick-add" options={{ ...modal, title: 'Quick Add' }} />
            <Stack.Screen name="custom-food" options={{ ...modal, title: 'Create Food' }} />
            <Stack.Screen name="weigh-in" options={{ ...modal, title: 'Weight' }} />
            <Stack.Screen name="insights/weight" options={{ title: 'Weight Trend' }} />
            <Stack.Screen name="insights/expenditure" options={{ title: 'Expenditure' }} />
            <Stack.Screen name="settings/goal" options={{ title: 'Goal & Program' }} />
            <Stack.Screen name="settings/profile" options={{ title: 'Profile' }} />
            <Stack.Screen name="settings/units" options={{ title: 'Units' }} />
            <Stack.Screen name="settings/expenditure" options={{ title: 'Expenditure' }} />
            <Stack.Screen name="settings/database" options={{ title: 'Food Database' }} />
            <Stack.Screen name="settings/data" options={{ title: 'Data & Backup' }} />
          </Stack>
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
            <ActivityIndicator color={colors.text} />
          </View>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
