import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

const TIME_SCALE = 3600; // 1秒 = 1小时（模拟时间）
const GROWTH_DURATION_HOURS = 48; // 48小时（2天）达到100%，整体3-5天成熟
const DB_PATH = path.join(__dirname, 'garden.db');

let db: any;

async function initDatabase() {
  const SQL = await initSqlJs();

  let dbData: Uint8Array | null = null;
  if (fs.existsSync(DB_PATH)) {
    dbData = fs.readFileSync(DB_PATH);
  }

  db = dbData ? new SQL.Database(dbData) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS gardens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      userId TEXT NOT NULL,
      isPublic INTEGER DEFAULT 1,
      likes INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gardenId INTEGER NOT NULL,
      plantType TEXT NOT NULL,
      gridIndex INTEGER NOT NULL,
      growthProgress INTEGER DEFAULT 0,
      health INTEGER DEFAULT 100,
      stage INTEGER DEFAULT 0,
      plantedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastWateredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastFertilizedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastGrowthCheck DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gardenId) REFERENCES gardens(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gardenId INTEGER NOT NULL,
      userName TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gardenId) REFERENCES gardens(id)
    );
  `);

  const result = db.exec('SELECT COUNT(*) as count FROM gardens');
  const gardenCount = result[0]?.values[0]?.[0] || 0;

  if (gardenCount === 0) {
    const plantTypes = ['sunflower', 'moonflower', 'startree', 'rose', 'cactus', 'tulip', 'orchid', 'bamboo', 'lavender', 'cherry'];
    const sampleGardens = [
      { name: '阳光花园', userId: 'user_001' },
      { name: '月光秘境', userId: 'user_002' },
      { name: '星辰之园', userId: 'user_003' },
      { name: '彩虹苗圃', userId: 'user_004' },
      { name: '绿野仙踪', userId: 'user_005' },
    ];

    sampleGardens.forEach((garden) => {
      const gardenLikes = Math.floor(Math.random() * 100);
      db.run(
        'INSERT INTO gardens (name, userId, isPublic, likes) VALUES (?, ?, 1, ?)',
        [garden.name, garden.userId, gardenLikes]
      );
      const gardenId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;

      const plantCount = 5 + Math.floor(Math.random() * 15);
      const usedIndices = new Set<number>();

      for (let i = 0; i < plantCount; i++) {
        let gridIndex;
        do {
          gridIndex = Math.floor(Math.random() * 81);
        } while (usedIndices.has(gridIndex));
        usedIndices.add(gridIndex);

        const plantType = plantTypes[Math.floor(Math.random() * plantTypes.length)];
        const growthProgress = Math.floor(Math.random() * 100);
        const stage = growthProgress < 33 ? 0 : growthProgress < 66 ? 1 : 2;

        db.run(
          `INSERT INTO plants (gardenId, plantType, gridIndex, growthProgress, health, stage, lastGrowthCheck)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [gardenId, plantType, gridIndex, growthProgress, 50 + Math.floor(Math.random() * 50), stage]
        );
      }

      const sampleMessages = [
        { userName: '园艺爱好者', content: '这个花园真漂亮！' },
        { userName: '植物达人', content: '稀有品种好多啊~' },
        { userName: '小花匠', content: '学习了，我的花园也要这样弄！' },
      ];
      sampleMessages.forEach((msg) => {
        db.run(
          'INSERT INTO messages (gardenId, userName, content) VALUES (?, ?, ?)',
          [gardenId, msg.userName, msg.content]
        );
      });
    });

    saveDatabase();
  }
}

function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

function calculateSimulatedHoursElapsed(lastCheckTime: string): number {
  const lastCheck = new Date(lastCheckTime).getTime();
  const now = Date.now();
  const realSecondsElapsed = (now - lastCheck) / 1000;
  return realSecondsElapsed * TIME_SCALE / 3600;
}

function updatePlantGrowth(plant: any): any {
  if (plant.growthProgress >= 100) return plant;

  const hoursElapsed = calculateSimulatedHoursElapsed(plant.lastGrowthCheck);
  if (hoursElapsed <= 0) return plant;

  const growthPerHour = 100 / GROWTH_DURATION_HOURS;
  const newGrowth = Math.min(100, plant.growthProgress + hoursElapsed * growthPerHour);
  const newStage = newGrowth < 33 ? 0 : newGrowth < 66 ? 1 : 2;

  const hoursSinceWatered = calculateSimulatedHoursElapsed(plant.lastWateredAt);
  const healthDecay = Math.max(0, Math.floor(hoursSinceWatered / 24) * 5);
  const newHealth = Math.max(0, plant.health - healthDecay);

  if (Math.floor(newGrowth) !== plant.growthProgress || newStage !== plant.stage || newHealth !== plant.health) {
    db.run(
      `UPDATE plants 
       SET growthProgress = ?, stage = ?, health = ?, lastGrowthCheck = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [Math.floor(newGrowth), newStage, newHealth, plant.id]
    );
    saveDatabase();
    return { ...plant, growthProgress: Math.floor(newGrowth), stage: newStage, health: newHealth };
  }

  db.run('UPDATE plants SET lastGrowthCheck = CURRENT_TIMESTAMP WHERE id = ?', [plant.id]);
  return { ...plant, lastGrowthCheck: new Date().toISOString() };
}

function updateAllPlantGrowths() {
  const result = db.exec('SELECT * FROM plants WHERE growthProgress < 100');
  if (!result.length) return;
  const plants = result[0].values.map((row: any[]) => ({
    id: row[0],
    gardenId: row[1],
    plantType: row[2],
    gridIndex: row[3],
    growthProgress: row[4],
    health: row[5],
    stage: row[6],
    plantedAt: row[7],
    lastWateredAt: row[8],
    lastFertilizedAt: row[9],
    lastGrowthCheck: row[10],
  }));
  plants.forEach(updatePlantGrowth);
}

setInterval(updateAllPlantGrowths, 2000);

function getRows(sql: string, params: any[] = []): any[] {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, idx: number) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

function getRow(sql: string, params: any[] = []): any | null {
  const rows = getRows(sql, params);
  return rows[0] || null;
}

function run(sql: string, params: any[] = []) {
  db.run(sql, params);
  saveDatabase();
}

function getLastInsertId(): number {
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0]?.values[0]?.[0] as number;
}

function processPlant(plant: any): any {
  return updatePlantGrowth(plant);
}

app.get('/gardens', (req, res) => {
  updateAllPlantGrowths();
  const gardens = getRows('SELECT * FROM gardens WHERE isPublic = 1 ORDER BY likes DESC');
  const gardensWithPlants = gardens.map((g: any) => {
    const plants = getRows('SELECT * FROM plants WHERE gardenId = ?', [g.id]);
    return { ...g, plants: plants.map(processPlant) };
  });
  res.json(gardensWithPlants);
});

app.get('/gardens/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const garden = getRow('SELECT * FROM gardens WHERE id = ?', [id]);
  if (!garden) return res.status(404).json({ error: 'Garden not found' });

  const plants = getRows('SELECT * FROM plants WHERE gardenId = ?', [id]);
  const processedPlants = plants.map(processPlant);
  res.json({ ...garden, plants: processedPlants });
});

app.post('/gardens', (req, res) => {
  const { name, userId } = req.body;
  run('INSERT INTO gardens (name, userId) VALUES (?, ?)', [name || '我的植物园', userId || 'user_local']);
  const id = getLastInsertId();
  const newGarden = {
    id,
    name: name || '我的植物园',
    userId: userId || 'user_local',
    isPublic: 1,
    likes: 0,
    createdAt: new Date().toISOString(),
    plants: [],
  };
  res.json(newGarden);
});

app.get('/gardens/:id/plants', (req, res) => {
  const id = parseInt(req.params.id);
  const plants = getRows('SELECT * FROM plants WHERE gardenId = ?', [id]);
  res.json(plants.map(processPlant));
});

app.post('/gardens/:id/plants', (req, res) => {
  const gardenId = parseInt(req.params.id);
  const { plantType, gridIndex } = req.body;
  run(
    `INSERT INTO plants (gardenId, plantType, gridIndex, lastGrowthCheck)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [gardenId, plantType, gridIndex]
  );
  const id = getLastInsertId();
  const plant = getRow('SELECT * FROM plants WHERE id = ?', [id]);
  res.json(plant);
});

app.put('/plants/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { growthProgress, health, stage } = req.body;
  run(
    `UPDATE plants 
     SET growthProgress = ?, health = ?, stage = ?, lastGrowthCheck = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [growthProgress, health, stage, id]
  );
  const plant = getRow('SELECT * FROM plants WHERE id = ?', [id]);
  res.json(plant);
});

app.post('/plants/:id/water', (req, res) => {
  const id = parseInt(req.params.id);
  let plant = getRow('SELECT * FROM plants WHERE id = ?', [id]);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });

  plant = updatePlantGrowth(plant);
  const newHealth = Math.min(100, plant.health + 20);
  run(
    'UPDATE plants SET health = ?, lastWateredAt = CURRENT_TIMESTAMP, lastGrowthCheck = CURRENT_TIMESTAMP WHERE id = ?',
    [newHealth, id]
  );

  plant = getRow('SELECT * FROM plants WHERE id = ?', [id]);
  res.json(plant);
});

app.post('/plants/:id/fertilize', (req, res) => {
  const id = parseInt(req.params.id);
  let plant = getRow('SELECT * FROM plants WHERE id = ?', [id]);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });

  plant = updatePlantGrowth(plant);
  const newGrowth = Math.min(100, plant.growthProgress + 10);
  const newStage = newGrowth < 33 ? 0 : newGrowth < 66 ? 1 : 2;
  run(
    `UPDATE plants 
     SET growthProgress = ?, stage = ?, lastFertilizedAt = CURRENT_TIMESTAMP, lastGrowthCheck = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [newGrowth, newStage, id]
  );

  plant = getRow('SELECT * FROM plants WHERE id = ?', [id]);
  res.json(plant);
});

app.delete('/plants/:id', (req, res) => {
  const id = parseInt(req.params.id);
  run('DELETE FROM plants WHERE id = ?', [id]);
  res.json({ success: true, id });
});

app.post('/gardens/:id/like', (req, res) => {
  const id = parseInt(req.params.id);
  run('UPDATE gardens SET likes = likes + 1 WHERE id = ?', [id]);
  const result = getRow('SELECT likes FROM gardens WHERE id = ?', [id]);
  res.json(result);
});

app.get('/gardens/:id/messages', (req, res) => {
  const id = parseInt(req.params.id);
  const messages = getRows('SELECT * FROM messages WHERE gardenId = ? ORDER BY createdAt ASC', [id]);
  res.json(messages);
});

app.post('/gardens/:id/messages', (req, res) => {
  const gardenId = parseInt(req.params.id);
  const { userName, content } = req.body;
  run(
    'INSERT INTO messages (gardenId, userName, content) VALUES (?, ?, ?)',
    [gardenId, userName || '访客', content]
  );
  const id = getLastInsertId();
  const message = getRow('SELECT * FROM messages WHERE id = ?', [id]);
  res.json(message);
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Garden server running on http://localhost:${PORT}, time scale: 1s = ${TIME_SCALE/3600}h simulated`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
