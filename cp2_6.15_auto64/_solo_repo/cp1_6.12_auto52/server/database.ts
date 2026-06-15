import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'memories.db'));

export interface Memory {
  id: string;
  title: string;
  description: string;
  image_url: string;
  mood: 'happy' | 'sad' | 'surprised' | 'calm' | 'nostalgic';
  latitude: number;
  longitude: number;
  created_at: string;
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      mood TEXT NOT NULL CHECK (mood IN ('happy', 'sad', 'surprised', 'calm', 'nostalgic')),
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
    CREATE INDEX IF NOT EXISTS idx_memories_mood ON memories(mood);
  `);

  const countRow = db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number };
  
  if (countRow.count === 0) {
    const insert = db.prepare(`
      INSERT INTO memories (id, title, description, image_url, mood, latitude, longitude, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleData: Omit<Memory, 'id' | 'created_at'> & { id: string; created_at: string }[] = [
      {
        id: '1',
        title: '巴黎铁塔的日落',
        description: '那天在巴黎埃菲尔铁塔下看到了最美的日落，整个天空都被染成了金色。',
        image_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400',
        mood: 'happy',
        latitude: 48.8584,
        longitude: 2.2945,
        created_at: '2024-06-15T18:30:00Z'
      },
      {
        id: '2',
        title: '东京的初雪',
        description: '2023年冬天在东京看到的第一场雪，浅草寺在雪中显得格外宁静。',
        image_url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400',
        mood: 'calm',
        latitude: 35.7148,
        longitude: 139.7967,
        created_at: '2023-12-20T09:15:00Z'
      },
      {
        id: '3',
        title: '丽江古城的邂逅',
        description: '在丽江古城的小桥流水旁，遇到了多年未见的老朋友。',
        image_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400',
        mood: 'surprised',
        latitude: 26.8721,
        longitude: 100.2313,
        created_at: '2024-03-08T14:20:00Z'
      },
      {
        id: '4',
        title: '故乡的老槐树',
        description: '回到故乡，看到村口那棵老槐树，想起了童年的夏天。',
        image_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
        mood: 'nostalgic',
        latitude: 34.0522,
        longitude: 118.2437,
        created_at: '2024-01-12T11:00:00Z'
      },
      {
        id: '5',
        title: '雨天的咖啡馆',
        description: '一个人在咖啡馆看书，窗外下着雨，心情有些低落。',
        image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
        mood: 'sad',
        latitude: 31.2304,
        longitude: 121.4737,
        created_at: '2024-04-22T16:45:00Z'
      },
      {
        id: '6',
        title: '马尔代夫的婚礼',
        description: '最好的朋友在马尔代夫举办了婚礼，那是我见过最美的海边仪式。',
        image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
        mood: 'happy',
        latitude: 3.2028,
        longitude: 73.2207,
        created_at: '2024-05-20T10:30:00Z'
      }
    ];

    const insertMany = db.transaction((memories) => {
      for (const m of memories) {
        insert.run(m.id, m.title, m.description, m.image_url, m.mood, m.latitude, m.longitude, m.created_at);
      }
    });

    insertMany(sampleData);
  }
}

export function getAllMemories(): Memory[] {
  return db.prepare('SELECT * FROM memories ORDER BY created_at DESC').all() as Memory[];
}

export function getMemoriesByYear(year: number): Memory[] {
  return db.prepare(`
    SELECT * FROM memories 
    WHERE strftime('%Y', created_at) = ?
    ORDER BY created_at DESC
  `).all(year.toString()) as Memory[];
}

export function addMemory(memory: Omit<Memory, 'id' | 'created_at'>): Memory {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO memories (id, title, description, image_url, mood, latitude, longitude, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, memory.title, memory.description, memory.image_url, memory.mood, memory.latitude, memory.longitude, now);

  return { ...memory, id, created_at: now };
}

export function updateMemory(id: string, memory: Partial<Omit<Memory, 'id' | 'created_at'>>): void {
  const fields = Object.keys(memory).map(key => `${key} = ?`).join(', ');
  const values = Object.values(memory);
  values.push(id);
  
  db.prepare(`UPDATE memories SET ${fields} WHERE id = ?`).run(...values);
}

export function deleteMemory(id: string): void {
  db.prepare('DELETE FROM memories WHERE id = ?').run(id);
}
