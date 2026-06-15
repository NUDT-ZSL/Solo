import { useState, useCallback, useEffect, useRef } from 'react';
import type { ScentEntry } from '../types';

const DB_NAME = 'scent-diary-db';
const DB_VERSION = 1;
const STORE_NAME = 'entries';
const MAX_ENTRIES = 30;

interface UseIndexedDBResult {
  saveOffline: (entry: ScentEntry) => Promise<void>;
  loadOffline: () => Promise<ScentEntry[]>;
  deleteOffline: (id: string) => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncToServer: () => Promise<void>;
  isOnline: boolean;
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
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
};

export const useIndexedDB = (): UseIndexedDBResult => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const dbRef = useRef<IDBDatabase | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        dbRef.current = await openDB();
      } catch (err) {
        console.error('IndexedDB初始化失败:', err);
      }
    };
    initDB();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (dbRef.current) {
        dbRef.current.close();
      }
    };
  }, []);

  const saveOffline = useCallback(async (entry: ScentEntry): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!dbRef.current) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = dbRef.current.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const entryWithSync = { ...entry, synced: false };

      const request = store.put(entryWithSync);

      request.onsuccess = () => {
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          if (countRequest.result > MAX_ENTRIES) {
            const index = store.index('date');
            const cursorRequest = index.openCursor(null, 'next');
            let deleteCount = countRequest.result - MAX_ENTRIES;

            cursorRequest.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor && deleteCount > 0) {
                cursor.delete();
                deleteCount--;
                cursor.continue();
              }
            };
          }
          resolve();
        };
      };

      request.onerror = () => reject(request.error);
    });
  }, []);

  const loadOffline = useCallback(async (): Promise<ScentEntry[]> => {
    return new Promise((resolve, reject) => {
      if (!dbRef.current) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = dbRef.current.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as ScentEntry[];
        entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(entries);
      };

      request.onerror = () => reject(request.error);
    });
  }, []);

  const deleteOffline = useCallback(async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!dbRef.current) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = dbRef.current.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }, []);

  const syncToServer = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) {
      setSyncStatus('error');
      return;
    }

    setSyncStatus('syncing');

    try {
      const entries = await loadOffline();
      const unsynced = entries.filter(e => !e.synced);

      for (const entry of unsynced) {
        try {
          const response = await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          });

          if (response.ok) {
            await saveOffline({ ...entry, synced: true });
          }
        } catch (err) {
          console.error('同步条目失败:', entry.id, err);
        }
      }

      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error('同步失败:', err);
      setSyncStatus('error');
    }
  }, [loadOffline, saveOffline]);

  useEffect(() => {
    if (isOnline && syncStatus === 'idle') {
      const timer = setTimeout(() => {
        syncToServer();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncStatus, syncToServer]);

  return {
    saveOffline,
    loadOffline,
    deleteOffline,
    syncStatus,
    syncToServer,
    isOnline,
  };
};
