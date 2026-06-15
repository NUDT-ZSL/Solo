import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'db.json');

interface DatabaseSchema {
  plants: Array<{
    id: string;
    name: string;
    scientific_name: string;
    image: string;
    description: string;
    light: string;
    water: string;
    temperature: string;
    soil: string;
    location: string;
    added_at: string;
  }>;
  care_events: Array<{
    id: string;
    plant_id: string;
    type: string;
    date: string;
    note: string | null;
  }>;
  growth_records: Array<{
    id: string;
    plant_id: string;
    date: string;
    image: string;
    note: string;
  }>;
}

const defaultData: DatabaseSchema = {
  plants: [],
  care_events: [],
  growth_records: [],
};

const adapter = new JSONFile<DatabaseSchema>(dbPath);
export const db = new Low<DatabaseSchema>(adapter, defaultData);

function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = snakeToCamel(obj[key]);
    }
    return result;
  }
  return obj;
}

export async function initDatabase(): Promise<void> {
  await db.read();
  
  if (!db.data) {
    db.data = { ...defaultData };
  }
  if (!db.data.plants) db.data.plants = [];
  if (!db.data.care_events) db.data.care_events = [];
  if (!db.data.growth_records) db.data.growth_records = [];
  await db.write();
  console.log('Database tables initialized');
}

export async function runQuery(sql: string, params: any[] = []): Promise<any> {
  sql = sql.trim();
  
  if (sql.startsWith('INSERT')) {
    const tableMatch = sql.match(/INTO\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : '';
    
    if (table === 'plants') {
      const plant = {
        id: params[0],
        name: params[1],
        scientific_name: params[2],
        image: params[3],
        description: params[4],
        light: params[5],
        water: params[6],
        temperature: params[7],
        soil: params[8],
        location: params[9],
        added_at: new Date().toISOString(),
      };
      db.data!.plants.push(plant);
    } else if (table === 'care_events') {
      const event = {
        id: params[0],
        plant_id: params[1],
        type: params[2],
        date: params[3],
        note: params[4] || null,
      };
      db.data!.care_events.push(event);
    } else if (table === 'growth_records') {
      const record = {
        id: params[0],
        plant_id: params[1],
        date: params[2],
        image: params[3],
        note: params[4],
      };
      db.data!.growth_records.push(record);
    }
    await db.write();
    return { id: params[0], changes: 1 };
  }
  
  if (sql.startsWith('UPDATE')) {
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : '';
    const idMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
    const id = idMatch ? params[params.length - 1] : '';
    
    if (table === 'plants' && id) {
      const index = db.data!.plants.findIndex(p => p.id === id);
      if (index !== -1) {
        db.data!.plants[index] = {
          ...db.data!.plants[index],
          name: params[0],
          scientific_name: params[1],
          image: params[2],
          description: params[3],
          light: params[4],
          water: params[5],
          temperature: params[6],
          soil: params[7],
          location: params[8],
        };
        await db.write();
        return { changes: 1 };
      }
    } else if (table === 'care_events' && id) {
      const index = db.data!.care_events.findIndex(e => e.id === id);
      if (index !== -1) {
        db.data!.care_events[index] = {
          ...db.data!.care_events[index],
          type: params[0],
          date: params[1],
          note: params[2] || null,
        };
        await db.write();
        return { changes: 1 };
      }
    }
    return { changes: 0 };
  }
  
  if (sql.startsWith('DELETE')) {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : '';
    const idMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
    const id = params[0];
    
    if (table === 'plants' && idMatch) {
      const initialLen = db.data!.plants.length;
      db.data!.plants = db.data!.plants.filter(p => p.id !== id);
      db.data!.care_events = db.data!.care_events.filter(e => e.plant_id !== id);
      db.data!.growth_records = db.data!.growth_records.filter(r => r.plant_id !== id);
      await db.write();
      return { changes: initialLen - db.data!.plants.length };
    } else if (table === 'care_events' && idMatch) {
      const initialLen = db.data!.care_events.length;
      db.data!.care_events = db.data!.care_events.filter(e => e.id !== id);
      await db.write();
      return { changes: initialLen - db.data!.care_events.length };
    } else if (table === 'growth_records' && idMatch) {
      const initialLen = db.data!.growth_records.length;
      db.data!.growth_records = db.data!.growth_records.filter(r => r.id !== id);
      await db.write();
      return { changes: initialLen - db.data!.growth_records.length };
    }
    return { changes: 0 };
  }
  
  return { changes: 0 };
}

export function getQuery<T>(sql: string, params: any[] = []): T | undefined {
  sql = sql.trim();
  const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
  if (!selectMatch) return undefined;
  
  const table = selectMatch[2];
  const whereIdMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
  const wherePlantIdMatch = sql.match(/WHERE\s+plant_id\s*=\s*\?/i);
  const id = params[0];
  
  if (table === 'plants' && whereIdMatch) {
    const plant = db.data!.plants.find(p => p.id === id);
    return plant ? snakeToCamel(plant) as T : undefined;
  } else if (table === 'care_events' && whereIdMatch) {
    const event = db.data!.care_events.find(e => e.id === id);
    return event ? snakeToCamel(event) as T : undefined;
  } else if (table === 'growth_records' && whereIdMatch) {
    const record = db.data!.growth_records.find(r => r.id === id);
    return record ? snakeToCamel(record) as T : undefined;
  } else if (table === 'plants' && wherePlantIdMatch) {
    const plant = db.data!.plants.find(p => p.id === id);
    return plant ? snakeToCamel(plant) as T : undefined;
  }
  
  return undefined;
}

export function allQuery<T>(sql: string, params: any[] = []): T[] {
  sql = sql.trim();
  const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
  if (!selectMatch) return [];
  
  const table = selectMatch[2];
  const wherePlantIdMatch = sql.match(/WHERE\s+plant_id\s*=\s*\?/i);
  const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s+(DESC|ASC)/i);
  const plantId = params[0];
  
  let results: any[] = [];
  
  if (table === 'plants') {
    results = [...db.data!.plants];
  } else if (table === 'care_events') {
    results = [...db.data!.care_events];
    if (wherePlantIdMatch && plantId) {
      results = results.filter(e => e.plant_id === plantId);
    }
  } else if (table === 'growth_records') {
    results = [...db.data!.growth_records];
    if (wherePlantIdMatch && plantId) {
      results = results.filter(r => r.plant_id === plantId);
    }
  }
  
  if (orderMatch) {
    const orderField = orderMatch[1];
    const orderDir = orderMatch[2].toUpperCase();
    results.sort((a, b) => {
      const aVal = a[orderField];
      const bVal = b[orderField];
      if (aVal < bVal) return orderDir === 'DESC' ? 1 : -1;
      if (aVal > bVal) return orderDir === 'DESC' ? -1 : 1;
      return 0;
    });
  }
  
  if (sql.includes('LIMIT')) {
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1]);
      results = results.slice(0, limit);
    }
  }
  
  return snakeToCamel(results) as T[];
}

export default db;
