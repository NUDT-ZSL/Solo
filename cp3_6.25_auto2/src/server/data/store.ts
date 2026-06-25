import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TeaScores {
  aroma: number;
  taste: number;
  color: number;
  leaf: number;
  aftertaste: number;
}

export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface Tea {
  id: string;
  userId: string;
  name: string;
  origin: string;
  year: number;
  imageUrl: string;
  isFavorite: boolean;
  createdAt: string;
}

export interface TastingRecord {
  id: string;
  userId: string;
  teaId: string;
  scores: TeaScores;
  totalScore: number;
  notes: string;
  createdAt: string;
}

export interface Store {
  users: User[];
  teas: Tea[];
  tastings: TastingRecord[];
}

const STORE_PATH = path.resolve(__dirname, '../../../store.json');

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
};

const getEmptyStore = (): Store => ({
  users: [],
  teas: [],
  tastings: [],
});

export const readStore = async (): Promise<Store> => {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      const empty = getEmptyStore();
      await writeStore(empty);
      return empty;
    }
    const data = await fs.promises.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(data) as Store;
  } catch (err) {
    const empty = getEmptyStore();
    await writeStore(empty);
    return empty;
  }
};

export const writeStore = async (data: Store): Promise<void> => {
  await fs.promises.writeFile(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

export const createUser = async (username: string, password: string): Promise<User> => {
  const store = await readStore();
  const user: User = {
    id: generateId(),
    username,
    password,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  await writeStore(store);
  return user;
};

export const findUser = async (username: string): Promise<User | undefined> => {
  const store = await readStore();
  return store.users.find((u) => u.username === username);
};

export const createTea = async (teaData: Omit<Tea, 'id' | 'createdAt'>): Promise<Tea> => {
  const store = await readStore();
  const tea: Tea = {
    ...teaData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  store.teas.push(tea);
  await writeStore(store);
  return tea;
};

export const getTeasByUser = async (userId: string): Promise<Tea[]> => {
  const store = await readStore();
  return store.teas.filter((t) => t.userId === userId);
};

export const updateTea = async (id: string, data: Partial<Omit<Tea, 'id' | 'userId' | 'createdAt'>>): Promise<Tea | null> => {
  const store = await readStore();
  const index = store.teas.findIndex((t) => t.id === id);
  if (index === -1) return null;
  store.teas[index] = { ...store.teas[index], ...data };
  await writeStore(store);
  return store.teas[index];
};

export const deleteTea = async (id: string): Promise<boolean> => {
  const store = await readStore();
  const index = store.teas.findIndex((t) => t.id === id);
  if (index === -1) return false;
  store.teas.splice(index, 1);
  store.tastings = store.tastings.filter((r) => r.teaId !== id);
  await writeStore(store);
  return true;
};

const calculateTotalScore = (scores: TeaScores): number => {
  const avg = (scores.aroma + scores.taste + scores.color + scores.leaf + scores.aftertaste) / 5;
  return Math.round(avg * 10 * 10) / 10;
};

export const createTasting = async (recordData: Omit<TastingRecord, 'id' | 'createdAt' | 'totalScore'>): Promise<TastingRecord> => {
  const store = await readStore();
  const totalScore = calculateTotalScore(recordData.scores);
  const record: TastingRecord = {
    ...recordData,
    id: generateId(),
    totalScore,
    createdAt: new Date().toISOString(),
  };
  store.tastings.push(record);
  await writeStore(store);
  return record;
};

export const getTastingsByTea = async (teaId: string): Promise<TastingRecord[]> => {
  const store = await readStore();
  return store.tastings
    .filter((r) => r.teaId === teaId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getTastingsByUser = async (userId: string): Promise<TastingRecord[]> => {
  const store = await readStore();
  return store.tastings
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const toggleFavorite = async (teaId: string): Promise<boolean> => {
  const store = await readStore();
  const tea = store.teas.find((t) => t.id === teaId);
  if (!tea) return false;
  tea.isFavorite = !tea.isFavorite;
  await writeStore(store);
  return tea.isFavorite;
};
