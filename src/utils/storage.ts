import type { SaveData } from '../types';

const SAVE_KEY = 'project_sentinel_savedata';
const BACKUP_KEY = 'project_sentinel_savedata_backup';
export const CURRENT_SCHEMA_VERSION = 1;

export class StorageService {
  /**
   * Saves game data with an automatic backup of the previous valid state.
   */
  public static saveGame(data: SaveData): boolean {
    try {
      const serialized = JSON.stringify(data);
      // Keep previous valid data in backup
      const existing = localStorage.getItem(SAVE_KEY);
      if (existing) {
        localStorage.setItem(BACKUP_KEY, existing);
      }
      localStorage.setItem(SAVE_KEY, serialized);
      return true;
    } catch (error) {
      console.error('[StorageService] Failed to save game state to localStorage:', error);
      return false;
    }
  }

  /**
   * Loads game data, falling back to backup if corrupted.
   */
  public static loadGame(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as SaveData;
      if (this.validateSaveData(parsed)) {
        return parsed;
      }
      console.warn('[StorageService] Primary save corrupted, attempting backup restoration...');
      return this.loadBackup();
    } catch (error) {
      console.error('[StorageService] Error parsing primary save:', error);
      return this.loadBackup();
    }
  }

  /**
   * Loads backup save data.
   */
  public static loadBackup(): SaveData | null {
    try {
      const rawBackup = localStorage.getItem(BACKUP_KEY);
      if (!rawBackup) return null;
      const parsedBackup = JSON.parse(rawBackup) as SaveData;
      return this.validateSaveData(parsedBackup) ? parsedBackup : null;
    } catch {
      return null;
    }
  }

  /**
   * Validates save schema version and critical fields.
   */
  public static validateSaveData(data: unknown): data is SaveData {
    if (typeof data !== 'object' || data === null) return false;
    const s = data as Partial<SaveData>;
    return (
      typeof s.schemaVersion === 'number' &&
      s.schemaVersion === CURRENT_SCHEMA_VERSION &&
      typeof s.buildId === 'string' &&
      typeof s.playerScene === 'string' &&
      typeof s.position === 'object' &&
      typeof s.position?.x === 'number' &&
      typeof s.position?.y === 'number' &&
      Array.isArray(s.inventory)
    );
  }
}
