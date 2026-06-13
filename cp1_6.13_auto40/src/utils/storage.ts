import { openDB, IDBPDatabase } from 'idb';
import type { EffectInstance } from '../core/AudioEngine';

const DB_NAME = 'soundcanvas-db';
const DB_VERSION = 1;

export interface SavedAudio {
  key: string;
  name: string;
  arrayBuffer: ArrayBuffer;
  savedAt: number;
}

export interface SavedEffects {
  key: string;
  effects: EffectInstance[];
  savedAt: number;
}

interface SoundCanvasDB {
  audioFiles: {
    key: string;
    value: SavedAudio;
    indexes: { 'by-savedAt': number };
  };
  effects: {
    key: string;
    value: SavedEffects;
  };
}

let dbPromise: Promise<IDBPDatabase<SoundCanvasDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SoundCanvasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SoundCanvasDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('audioFiles')) {
          const audioStore = db.createObjectStore('audioFiles', { keyPath: 'key' });
          audioStore.createIndex('by-savedAt', 'savedAt');
        }
        if (!db.objectStoreNames.contains('effects')) {
          db.createObjectStore('effects', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveAudio(name: string, arrayBuffer: ArrayBuffer): Promise<void> {
  const db = await getDB();
  const data: SavedAudio = {
    key: 'current-audio',
    name,
    arrayBuffer,
    savedAt: Date.now(),
  };
  await db.put('audioFiles', data);
}

export async function getSavedAudio(): Promise<SavedAudio | null> {
  try {
    const db = await getDB();
    const result = await db.get('audioFiles', 'current-audio');
    return result || null;
  } catch (e) {
    console.warn('Failed to load saved audio:', e);
    return null;
  }
}

export async function clearSavedAudio(): Promise<void> {
  const db = await getDB();
  await db.delete('audioFiles', 'current-audio');
}

export async function saveEffects(effects: EffectInstance[]): Promise<void> {
  const db = await getDB();
  const data: SavedEffects = {
    key: 'current-effects',
    effects,
    savedAt: Date.now(),
  };
  await db.put('effects', data);
}

export async function getSavedEffects(): Promise<EffectInstance[]> {
  try {
    const db = await getDB();
    const result = await db.get('effects', 'current-effects');
    return result?.effects || [];
  } catch (e) {
    console.warn('Failed to load saved effects:', e);
    return [];
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['audioFiles', 'effects'], 'readwrite');
  await Promise.all([tx.store.clear(), tx.objectStore('effects').clear()]);
  await tx.done;
}

export default {
  saveAudio,
  getSavedAudio,
  clearSavedAudio,
  saveEffects,
  getSavedEffects,
  clearAllData,
};
