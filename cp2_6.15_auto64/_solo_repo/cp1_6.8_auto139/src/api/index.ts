import { Poem, EchoComment, User } from '../PoemEngine';

const API_BASE = 'http://localhost:8000/api';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const HEADERS = { 'Content-Type': 'application/json' };

export async function registerUser(username: string, password: string): Promise<User> {
  const users = readStorage<User[]>('poem_users', []);
  const existing = users.find(u => u.username === username);
  if (existing) {
    throw new Error('Username already exists');
  }
  const user: User = { id: generateId(), username, password };
  users.push(user);
  writeStorage('poem_users', users);
  return user;
}

export async function loginUser(username: string, password: string): Promise<User> {
  const users = readStorage<User[]>('poem_users', []);
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    throw new Error('Invalid username or password');
  }
  writeStorage('poem_session', user);
  return user;
}

export function getCurrentUser(): User | null {
  return readStorage<User | null>('poem_session', null);
}

export function logoutUser(): void {
  localStorage.removeItem('poem_session');
}

export async function fetchPoems(): Promise<Poem[]> {
  try {
    const res = await fetch(`${API_BASE}/poems`);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch {
    return readStorage<Poem[]>('poem_poems', []);
  }
}

export async function fetchPoemById(id: string): Promise<Poem | null> {
  try {
    const res = await fetch(`${API_BASE}/poems/${id}`);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch {
    const poems = readStorage<Poem[]>('poem_poems', []);
    return poems.find(p => p.id === id) ?? null;
  }
}

export async function createPoem(poem: Omit<Poem, 'id' | 'createdAt'>): Promise<Poem> {
  const newPoem: Poem = { ...poem, id: generateId(), createdAt: new Date().toISOString() };
  try {
    const res = await fetch(`${API_BASE}/poems`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(poem),
    });
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch {
    const poems = readStorage<Poem[]>('poem_poems', []);
    poems.push(newPoem);
    writeStorage('poem_poems', poems);
    return newPoem;
  }
}

export async function deletePoem(id: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/poems/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(res.statusText);
  } catch {
    const poems = readStorage<Poem[]>('poem_poems', []);
    writeStorage('poem_poems', poems.filter(p => p.id !== id));
  }
}

export async function fetchEchoes(poemId: string): Promise<EchoComment[]> {
  try {
    const res = await fetch(`${API_BASE}/poems/${poemId}/echoes`);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch {
    const echoes = readStorage<EchoComment[]>('poem_echoes', []);
    return echoes.filter(e => e.poemId === poemId);
  }
}

export async function createEcho(
  poemId: string,
  echo: Omit<EchoComment, 'id' | 'poemId' | 'createdAt'>
): Promise<EchoComment> {
  const newEcho: EchoComment = { ...echo, id: generateId(), poemId, createdAt: new Date().toISOString() };
  try {
    const res = await fetch(`${API_BASE}/poems/${poemId}/echoes`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(echo),
    });
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch {
    const echoes = readStorage<EchoComment[]>('poem_echoes', []);
    echoes.push(newEcho);
    writeStorage('poem_echoes', echoes);
    return newEcho;
  }
}
