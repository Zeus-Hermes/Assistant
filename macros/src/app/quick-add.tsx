import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { QuickAddForm } from '@/components/QuickAddForm';
import { Button, T } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { useStore } from '@/store/useStore';
import { space } from '@/theme';

/** Edits an existing quick-add entry. New quick adds go through the add-food sheet. */
export default function EditQuickAdd() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const entry = useStore((s) => s.entries.find((e) => e.id === entryId));
  const updateEntry = useStore((s) => s.updateEntry);
  const deleteEntry = useStore((s) => s.deleteEntry);

  if (!entry) {
    return (
      <T dim style={{ padding: space.xl }}>
        This entry no longer exists.
      </T>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <QuickAddForm
          initialName={entry.name === 'Quick add' ? '' : entry.name}
          initial={entry.nutrients}
          submitLabel="Save"
          onSubmit={(name, nutrients) => {
            updateEntry(entry.id, { name: name.trim() || 'Quick add', nutrients });
            router.back();
          }}
        />
        <Button
          title="Delete entry"
          variant="danger"
          onPress={async () => {
            if (await confirm('Delete entry?', entry.name, 'Delete', true)) {
              deleteEntry(entry.id);
              router.back();
            }
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
});
