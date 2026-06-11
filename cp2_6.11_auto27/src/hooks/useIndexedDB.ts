import { useState, useEffect, useCallback, useRef } from 'react';
import type { ScentEntry } from '../server';

const DB_NAME = 'ScentDiaryDB';
const STORE_NAME = 'entries';
const DB_VERSION = 1;
const MAX_ENTRIES = 30;

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

interface ScentEntryWithSync extends ScentEntry {
  synced: number;
}

interface UseIndexedDBReturn {
  saveOffline: (entry: ScentEntry) => Promise<void>;
  loadOffline: () => Promise<ScentEntry[]>;
  deleteOffline: (id: string) => Promise<void>;
  updateOffline: (entry: ScentEntry) => Promise<void>;
  syncStatus: SyncStatus;
  syncWithServer: () => Promise<void>;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
};

const loadAllEntries = async (): Promise<ScentEntryWithSync[]> => {
  const startTime = performance.now();
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const duration = performance.now() - startTime;
      console.log(`IndexedDB 读取耗时: ${duration.toFixed(2)}ms`);
      resolve(request.result as ScentEntryWithSync[]);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
};

const deleteEntryById = async (id: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
};

export const useIndexedDB = (): UseIndexedDBReturn => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    navigator.onLine ? 'idle' : 'offline'
  );
  const syncWithServerRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const saveEntryWithSync = useCallback(async (entry: ScentEntryWithSync): Promise<void> => {
    const startTime = performance.now();
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = async () => {
        const allEntries = await loadAllEntries();
        if (allEntries.length > MAX_ENTRIES) {
          const sorted = allEntries.sort((a, b) => b.createdAt - a.createdAt);
          const toDelete = sorted.slice(MAX_ENTRIES);
          for (const e of toDelete) {
            await deleteEntryById(e.id);
          }
        }
        const duration = performance.now() - startTime;
        console.log(`IndexedDB 写入耗时: ${duration.toFixed(2)}ms`);
        resolve();
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }, []);

  const saveOffline = useCallback(async (entry: ScentEntry): Promise<void> => {
    const entryWithSync: ScentEntryWithSync = { ...entry, synced: navigator.onLine ? 1 : 0 };
    await saveEntryWithSync(entryWithSync);
  }, [saveEntryWithSync]);

  const loadOffline = useCallback(async (): Promise<ScentEntry[]> => {
    const entries = await loadAllEntries();
    return entries.map(({ synced, ...rest }) => rest);
  }, []);

  const deleteOffline = useCallback(async (id: string): Promise<void> => {
    return deleteEntryById(id);
  }, []);

  const updateOffline = useCallback(async (entry: ScentEntry): Promise<void> => {
    const entryWithSync: ScentEntryWithSync = { ...entry, synced: navigator.onLine ? 1 : 0 };
    await saveEntryWithSync(entryWithSync);
  }, [saveEntryWithSync]);

  const syncWithServer = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    try {
      const allEntries = await loadAllEntries();
      const unsynced = allEntries.filter((e) => e.synced === 0);

      for (const entry of unsynced) {
        try {
          const response = await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          });
          if (response.ok) {
            await saveEntryWithSync({ ...entry, synced: 1 });
          }
        } catch {
          continue;
        }
      }

      const serverResponse = await fetch('/api/entries');
      if (serverResponse.ok) {
        const serverEntries: ScentEntry[] = await serverResponse.json();
        for (const entry of serverEntries) {
          const entryWithSync: ScentEntryWithSync = { ...entry, synced: 1 };
          await saveEntryWithSync(entryWithSync);
        }
      }

      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [saveEntryWithSync]);

  useEffect(() => {
    syncWithServerRef.current = syncWithServer;
  }, [syncWithServer]);

  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('idle');
      syncWithServerRef.current();
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    saveOffline,
    loadOffline,
    deleteOffline,
    updateOffline,
    syncStatus,
    syncWithServer,
  };
};
