import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data', 'networks');

export async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

export async function writeFile(filePath: string, data: string): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(filePath, data, 'utf-8');
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}

export async function listFiles(): Promise<string[]> {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  return files.filter(f => f.endsWith('.json'));
}

export function getFilePath(id: string): string {
  return path.join(DATA_DIR, `${id}.json`);
}

export function getDataDir(): string {
  return DATA_DIR;
}
