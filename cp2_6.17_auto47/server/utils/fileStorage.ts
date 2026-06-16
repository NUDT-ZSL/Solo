import fs from 'fs';
import path from 'path';

const dataDir = path.join(__dirname, '..', 'data');

function ensureDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function readData<T>(filename: string): T {
  ensureDir();
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    return [] as unknown as T;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export function writeData<T>(filename: string, data: T): void {
  ensureDir();
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
