import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class JsonFileStore<T extends { id: string }> {
  private filePath: string;
  private itemsKey: string;
  private cache: { [key: string]: T[] } | null = null;
  private lastUpdated: number = 0;

  constructor(fileName: string, itemsKey: string) {
    this.filePath = path.join(__dirname, 'data', fileName);
    this.itemsKey = itemsKey;
  }

  private read(): T[] {
    if (this.cache) return this.cache[this.itemsKey];
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    const data = JSON.parse(raw);
    this.cache = data as { [key: string]: T[] };
    this.lastUpdated = data.lastUpdated ?? 0;
    return data[this.itemsKey];
  }

  private write(items: T[]): void {
    this.lastUpdated = Date.now();
    const data = {
      [this.itemsKey]: items,
      lastUpdated: this.lastUpdated,
    };
    this.cache = data as { [key: string]: T[] };
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  getAll(): T[] {
    return this.read();
  }

  getById(id: string): T | undefined {
    return this.read().find((item) => item.id === id);
  }

  create(item: T): T {
    const items = this.read();
    items.push(item);
    this.write(items);
    return item;
  }

  delete(id: string): boolean {
    const items = this.read();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    items.splice(index, 1);
    this.write(items);
    return true;
  }
}
