import { ScrollView, StyleSheet } from 'react-native';

import { Button, Card, T } from '@/components/ui';
import { exportBackup, pickBackup } from '@/lib/backupFiles';
import { confirm, notify } from '@/lib/confirm';
import { pickData, useStore } from '@/store/useStore';
import { space } from '@/theme';

export default function DataSettings() {
  const entries = useStore((s) => s.entries.length);
  const weighIns = useStore((s) => s.weighIns.length);
  const customFoods = useStore((s) => s.customFoods.length);
  const replaceAll = useStore((s) => s.replaceAll);
  const reset = useStore((s) => s.reset);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <T dim testID="data-counts">
          Everything is stored only on this device: {entries} log entries, {weighIns} weigh-ins, {customFoods} custom foods. Export a backup
          regularly.
        </T>
        <Button
          testID="export"
          title="Export backup"
          onPress={async () => {
            try {
              await exportBackup(pickData(useStore.getState()));
            } catch (e) {
              notify('Export failed', (e as Error).message);
            }
          }}
        />
        <Button
          title="Import backup"
          variant="secondary"
          onPress={async () => {
            try {
              const data = await pickBackup();
              if (!data) return;
              if (
                await confirm(
                  'Replace all data?',
                  `This replaces everything on this device with the backup (${data.entries.length} entries).`,
                  'Replace',
                  true,
                )
              ) {
                replaceAll(data);
                notify('Backup restored');
              }
            } catch (e) {
              notify('Import failed', (e as Error).message);
            }
          }}
        />
        <Button
          title="Erase all data"
          variant="danger"
          onPress={async () => {
            if (await confirm('Erase everything?', 'This deletes your log, weigh-ins and settings from this device.', 'Erase', true))
              reset();
          }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
});
