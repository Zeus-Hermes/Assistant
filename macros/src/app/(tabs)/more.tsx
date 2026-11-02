import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListGroup, ListRow, SectionHeader } from '@/components/ui';
import { space } from '@/theme';

export default function More() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="General" style={{ marginTop: space.xl }} />
        <ListGroup>
          <ListRow testID="more-profile" icon="happy-outline" label="Profile" onPress={() => router.push('/settings/profile')} />
          <ListRow testID="more-units" icon="resize-outline" label="Units" onPress={() => router.push('/settings/units')} />
          <ListRow testID="more-data" icon="sync-outline" label="Data & Backup" onPress={() => router.push('/settings/data')} last />
        </ListGroup>

        <SectionHeader title="Feature Settings" />
        <ListGroup>
          <ListRow testID="more-goal" icon="radio-button-on-outline" label="Goal & Program" onPress={() => router.push('/settings/goal')} />
          <ListRow testID="more-database" icon="nutrition" label="Food Database" onPress={() => router.push('/settings/database')} />
          <ListRow icon="scale-outline" label="Weight Trend" onPress={() => router.push('/insights/weight')} />
          <ListRow icon="flash" label="Expenditure" onPress={() => router.push('/settings/expenditure')} last />
        </ListGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
});
