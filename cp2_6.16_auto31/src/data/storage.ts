import type { Annotation } from './store';

const DB_NAME = 'seabed-archaeology-db';
const DB_VERSION = 1;
const STORE_NAME = 'annotations';

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export async function addAnnotation(annotation: Annotation): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(annotation);

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function getAllAnnotations(): Promise<Annotation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result as Annotation[]);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function deleteAnnotation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export function saveScreenshot(dataUrl: string, id: string): void {
  try {
    const screenshots = JSON.parse(localStorage.getItem('screenshots') || '[]');
    screenshots.push({ id, dataUrl, timestamp: Date.now() });
    localStorage.setItem('screenshots', JSON.stringify(screenshots));
  } catch (e) {
    console.error('Failed to save screenshot:', e);
  }
}

export function getScreenshots(): Array<{ id: string; dataUrl: string; timestamp: number }> {
  try {
    return JSON.parse(localStorage.getItem('screenshots') || '[]');
  } catch (e) {
    return [];
  }
}
