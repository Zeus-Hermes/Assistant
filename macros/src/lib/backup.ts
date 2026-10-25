import type { PersistedData } from '@/store/useStore';

export const BACKUP_FORMAT = 'macros-backup';
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: PersistedData;
}

export function serializeBackup(data: PersistedData, now = new Date()): string {
  const backup: Backup = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
  return JSON.stringify(backup, null, 2);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Parses and validates a backup file; throws with a readable message on bad input. */
export function parseBackup(text: string): PersistedData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT || !isObj(raw.data)) {
    throw new Error('That file is not a Macros backup.');
  }
  if (!isNum(raw.version) || raw.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app.');
  }
  const d = raw.data;
  const arr = (k: string) => {
    const v = d[k] ?? [];
    if (!Array.isArray(v)) throw new Error(`Backup field "${k}" is malformed.`);
    return v;
  };
  const entries = arr('entries');
  for (const e of entries) {
    if (!isObj(e) || !isDate(e.date) || !isObj(e.nutrients) || !isNum((e.nutrients as Record<string, unknown>).calories)) {
      throw new Error('Backup contains a malformed food log entry.');
    }
  }
  const weighIns = arr('weighIns');
  for (const w of weighIns) {
    if (!isObj(w) || !isDate(w.date) || !isNum(w.kg)) throw new Error('Backup contains a malformed weigh-in.');
  }
  if (!isObj(d.goal)) throw new Error('Backup is missing goal settings.');
  return {
    profile: (isObj(d.profile) ? d.profile : null) as PersistedData['profile'],
    goal: d.goal as unknown as PersistedData['goal'],
    entries: entries as PersistedData['entries'],
    weighIns: weighIns as PersistedData['weighIns'],
    customFoods: arr('customFoods') as PersistedData['customFoods'],
    recentFoods: arr('recentFoods') as PersistedData['recentFoods'],
    usdaApiKey: typeof d.usdaApiKey === 'string' ? d.usdaApiKey : '',
  };
}
