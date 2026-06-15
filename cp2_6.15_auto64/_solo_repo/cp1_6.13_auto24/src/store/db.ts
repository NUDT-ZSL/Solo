import { openDB, IDBPDatabase } from 'idb';
import { CodeSnippet } from '../types';

const DB_NAME = 'codeflow-db';
const DB_VERSION = 1;
const STORE_NAME = 'snippets';

let dbPromise: Promise<IDBPDatabase> | null = null;

interface CacheState {
  loaded: boolean;
  snippets: CodeSnippet[];
  byId: Map<string, CodeSnippet>;
}

const cache: CacheState = {
  loaded: false,
  snippets: [],
  byId: new Map(),
};

function rebuildCacheIndexes() {
  cache.byId = new Map(cache.snippets.map((s) => [s.id, s]));
  cache.snippets.sort((a, b) => b.createdAt - a.createdAt);
}

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('language', 'language', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

async function ensureCacheLoaded(): Promise<void> {
  if (cache.loaded) return;
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  cache.snippets = all;
  rebuildCacheIndexes();
  cache.loaded = true;
}

export function invalidateCache(): void {
  cache.loaded = false;
  cache.snippets = [];
  cache.byId.clear();
}

export async function getAllSnippets(): Promise<CodeSnippet[]> {
  await ensureCacheLoaded();
  return cache.snippets;
}

export async function getSnippetById(id: string): Promise<CodeSnippet | undefined> {
  await ensureCacheLoaded();
  return cache.byId.get(id);
}

export async function addSnippet(snippet: CodeSnippet): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, snippet);
  if (cache.loaded) {
    cache.snippets.push(snippet);
    cache.byId.set(snippet.id, snippet);
    rebuildCacheIndexes();
  }
}

export async function updateSnippet(snippet: CodeSnippet): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, snippet);
  if (cache.loaded) {
    const idx = cache.snippets.findIndex((s) => s.id === snippet.id);
    if (idx !== -1) {
      cache.snippets[idx] = snippet;
    } else {
      cache.snippets.push(snippet);
    }
    cache.byId.set(snippet.id, snippet);
    rebuildCacheIndexes();
  }
}

export async function deleteSnippet(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
  if (cache.loaded) {
    cache.snippets = cache.snippets.filter((s) => s.id !== id);
    cache.byId.delete(id);
    rebuildCacheIndexes();
  }
}

export async function searchSnippets(query: string, language?: string): Promise<CodeSnippet[]> {
  await ensureCacheLoaded();
  const q = query.toLowerCase().trim();
  return cache.snippets.filter((s) => {
    const langMatch = !language || language === 'All' || s.language === language;
    if (!langMatch) return false;
    if (!q) return true;
    const titleMatch = s.title.toLowerCase().includes(q);
    const tagMatch = s.tags.some((t) => t.toLowerCase().includes(q));
    const codeMatch = s.code.toLowerCase().includes(q);
    return titleMatch || tagMatch || codeMatch;
  });
}
