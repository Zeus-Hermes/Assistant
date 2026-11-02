import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Field, T } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { space } from '@/theme';

export default function DatabaseSettings() {
  const usdaApiKey = useStore((s) => s.usdaApiKey);
  const setUsdaApiKey = useStore((s) => s.setUsdaApiKey);
  const [key, setKey] = useState(usdaApiKey);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <T dim>
          Search uses Open Food Facts (no key needed) and USDA FoodData Central. USDA's shared demo key allows only about 30 searches an
          hour, so get a free personal key.
        </T>
        <Field
          testID="usda-key"
          label="USDA API key"
          value={key}
          onChangeText={setKey}
          placeholder="Using DEMO_KEY"
          autoCapitalize="none"
          autoCorrect={false}
          onBlur={() => setUsdaApiKey(key)}
        />
        <View style={styles.row}>
          <Button style={styles.flex} title="Save key" onPress={() => setUsdaApiKey(key)} />
          <Button
            style={styles.flex}
            title="Get a key"
            variant="secondary"
            onPress={() => Linking.openURL('https://fdc.nal.usda.gov/api-key-signup')}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
