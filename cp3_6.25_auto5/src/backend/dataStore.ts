import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

export function readSync<T>(collection: string): T[] {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function writeSync<T>(collection: string, data: T[]): void {
  const filePath = getFilePath(collection);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readAsync<T>(collection: string): Promise<T[]> {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export async function writeAsync<T>(collection: string, data: T[]): Promise<void> {
  const filePath = getFilePath(collection);
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
