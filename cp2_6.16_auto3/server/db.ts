import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'history.json');

export interface HistoryRecord {
  id: number;
  melody: string;
  chords: string;
  melody_text: string;
  created_at: string;
}

interface DataFile {
  nextId: number;
  records: HistoryRecord[];
}

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial: DataFile = { nextId: 1, records: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

function readData(): DataFile {
  ensureFile();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw) as DataFile;
  } catch {
    const initial: DataFile = { nextId: 1, records: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

function writeData(data: DataFile) {
  ensureFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function insertHistory(
  melody: string,
  chords: string,
  melodyText: string,
): number {
  const data = readData();
  const id = data.nextId++;
  const record: HistoryRecord = {
    id,
    melody,
    chords,
    melody_text: melodyText,
    created_at: new Date().toISOString(),
  };
  data.records.unshift(record);
  writeData(data);
  return id;
}

export function getAllHistory(): HistoryRecord[] {
  const data = readData();
  return [...data.records].sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  );
}

export function deleteHistory(id: number): void {
  const data = readData();
  data.records = data.records.filter((r) => r.id !== id);
  writeData(data);
}
