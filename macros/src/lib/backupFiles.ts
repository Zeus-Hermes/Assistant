import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { PersistedData } from '@/store/useStore';

import { parseBackup, serializeBackup } from './backup';
import { today } from './dates';

/** Writes a backup and opens the share sheet (Files, AirDrop, Drive…). On web, downloads it. */
export async function exportBackup(data: PersistedData): Promise<void> {
  const text = serializeBackup(data);
  const name = `macros-backup-${today()}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save backup' });
}

/** Lets the user pick a backup file; resolves to null if they cancel. Throws on invalid files. */
export async function pickBackup(): Promise<PersistedData | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const text =
    Platform.OS === 'web'
      ? await (asset.file ? asset.file.text() : fetch(asset.uri).then((r) => r.text()))
      : await new File(asset.uri).text();
  return parseBackup(text);
}
