import { isTownWorldState, migrateCoastalWorldState, migrateTownWorldState, type TownWorldState } from '@game/systems/town-world';
import { isFirstAidStage, type FirstAidStage } from '@game/systems/first-aid-mission';

export const TOWN_SAVE_KEY = 'cybershield.town.v1';
export const TOWN_BACKUP_KEY = 'cybershield.town.v1.backup';
export interface TownSave {
  readonly schemaVersion: 1;
  readonly layout?: 'coastal-island-v1' | 'coastal-island-v2' | 'coastal-island-v3' | 'coastal-island-v4' | 'coastal-island-v5';
  readonly buildId: 'cybershield-first-aid';
  readonly savedAt: number;
  readonly world: TownWorldState;
  readonly stage: FirstAidStage;
}
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type LoadResult = { data: TownSave | null; status: 'new' | 'restored' | 'recovered' | 'corrupt' | 'unavailable' };
function browserStorage(): SaveStorage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
export function parseTownSave(raw: string | null): TownSave | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const save = value as Record<string, unknown>;
    if (save.schemaVersion !== 1 || save.buildId !== 'cybershield-first-aid'
      || typeof save.savedAt !== 'number' || !Number.isFinite(save.savedAt) || save.savedAt < 0
      || !isFirstAidStage(save.stage)) return null;
    if(save.layout !== undefined && save.layout !== 'coastal-island-v1' && save.layout !== 'coastal-island-v2' && save.layout !== 'coastal-island-v3' && save.layout !== 'coastal-island-v4' && save.layout !== 'coastal-island-v5') return null;
    const world = save.layout === 'coastal-island-v5'
      ? (isTownWorldState(save.world)?save.world:null)
      : save.layout !== undefined ? migrateCoastalWorldState(save.world,save.layout as string) : migrateTownWorldState(save.world);
    if (!world) return null;
    return { schemaVersion: 1, layout: 'coastal-island-v5', buildId: 'cybershield-first-aid', savedAt: save.savedAt, world, stage: save.stage };
  } catch { return null; }
}

/** Separate namespace from the legacy 2D save; corrupt primary never replaces a valid backup. */
export class TownSaveStore {
  constructor(private readonly storage: SaveStorage | null = browserStorage()) {}
  load(): LoadResult {
    if (!this.storage) return { data: null, status: 'unavailable' };
    try {
      const raw = this.storage.getItem(TOWN_SAVE_KEY);
      const primary = parseTownSave(raw);
      if (primary) return { data: primary, status: 'restored' };
      const backupRaw = this.storage.getItem(TOWN_BACKUP_KEY);
      const backup = parseTownSave(backupRaw);
      if (backup) return { data: backup, status: 'recovered' };
      return { data: null, status: raw || backupRaw ? 'corrupt' : 'new' };
    } catch { return { data: null, status: 'unavailable' }; }
  }
  save(data: TownSave): boolean {
    if (!this.storage) return false;
    const serialized = JSON.stringify({...data,layout:'coastal-island-v5'});
    if (!parseTownSave(serialized)) return false;
    try {
      const previous = this.storage.getItem(TOWN_SAVE_KEY);
      if (parseTownSave(previous)) {
        try { this.storage.setItem(TOWN_BACKUP_KEY, previous!); } catch { /* Still try the primary if backup storage is full. */ }
      }
      this.storage.setItem(TOWN_SAVE_KEY, serialized);
      return true;
    } catch { return false; }
  }
}
