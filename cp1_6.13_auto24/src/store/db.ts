import { openDB, IDBPDatabase } from 'idb';
import { CodeSnippet } from '../types';

const DB_NAME = 'codeflow-db';
const DB_VERSION = 1;
const STORE_NAME = 'snippets';

let dbPromise: Promise<IDBPDatabase> | null = null;

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

export async function getAllSnippets(): Promise<CodeSnippet[]> {
  const db = await getDB();
  const snippets = await db.getAll(STORE_NAME);
  return snippets.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSnippetById(id: string): Promise<CodeSnippet | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function addSnippet(snippet: CodeSnippet): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, snippet);
}

export async function updateSnippet(snippet: CodeSnippet): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, snippet);
}

export async function deleteSnippet(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function searchSnippets(query: string, language?: string): Promise<CodeSnippet[]> {
  const all = await getAllSnippets();
  const q = query.toLowerCase().trim();
  return all.filter((s) => {
    const langMatch = !language || language === 'All' || s.language === language;
    if (!langMatch) return false;
    if (!q) return true;
    const titleMatch = s.title.toLowerCase().includes(q);
    const tagMatch = s.tags.some((t) => t.toLowerCase().includes(q));
    const codeMatch = s.code.toLowerCase().includes(q);
    return titleMatch || tagMatch || codeMatch;
  });
}
