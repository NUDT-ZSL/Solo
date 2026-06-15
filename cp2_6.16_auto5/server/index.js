import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let db;

const SQL = await initSqlJs({
  locateFile: file => `file:///${__dirname.replace(/\\/g, '/')}/../node_modules/sql.js/dist/${file}`
});

const dbPath = path.join(__dirname, 'plants.db');
let saveInterval;

const loadDatabase = () => {
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('Database loaded from', dbPath);
  } else {
    db = new SQL.Database();
    console.log('New database created');
  }
};

const saveDatabase = () => {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('Save database failed:', e.message);
  }
};

loadDatabase();
saveInterval = setInterval(saveDatabase, 1000);

process.on('SIGINT', () => {
  clearInterval(saveInterval);
  saveDatabase();
  process.exit();
});

db.run(`
  CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    species TEXT NOT NULL CHECK(species IN ('绿萝', '仙人掌', '虎皮兰', '多肉', '龟背竹')),
    plant_date TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS plant_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    watered INTEGER NOT NULL DEFAULT 0,
    fertilized INTEGER NOT NULL DEFAULT 0,
    light_hours REAL NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
  );
`);

db.run('DROP INDEX IF EXISTS idx_plant_logs_plant_id');
db.run('DROP INDEX IF EXISTS idx_plant_logs_date');
db.run('DROP INDEX IF EXISTS idx_plant_logs_plant_date');
db.run('CREATE INDEX IF NOT EXISTS idx_plant_logs_plant_id ON plant_logs(plant_id)');
db.run('CREATE INDEX IF NOT EXISTS idx_plant_logs_date ON plant_logs(date DESC)');
db.run('CREATE INDEX IF NOT EXISTS idx_plant_logs_plant_date ON plant_logs(plant_id, date DESC)');

try {
  const plan = db.exec(
    "EXPLAIN QUERY PLAN SELECT * FROM plant_logs WHERE plant_id = 1 ORDER BY date DESC LIMIT 7"
  );
  if (plan && plan[0] && plan[0].values && plan[0].values.length > 0) {
    const row = plan[0].values[0];
    console.log('Index verification - Query plan:', row);
    const planStr = JSON.stringify(row);
    const usesIndex = planStr.includes('idx_plant_logs_plant_date');
    console.log('Using composite index:', usesIndex ? 'YES' : 'NO');
  }
} catch (e) {
  console.log('EXPLAIN QUERY PLAN check skipped:', e.message);
}

const SPECIES_CONFIG = {
  '绿萝': { waterInterval: 3, fertilizeInterval: 30, idealLight: 6, name: '绿萝' },
  '仙人掌': { waterInterval: 14, fertilizeInterval: 60, idealLight: 8, name: '仙人掌' },
  '虎皮兰': { waterInterval: 7, fertilizeInterval: 45, idealLight: 4, name: '虎皮兰' },
  '多肉': { waterInterval: 10, fertilizeInterval: 60, idealLight: 6, name: '多肉' },
  '龟背竹': { waterInterval: 5, fertilizeInterval: 30, idealLight: 4, name: '龟背竹' }
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const rowToPlant = (row) => ({
  id: row[0],
  name: row[1],
  species: row[2],
  plantDate: row[3],
  location: row[4],
  createdAt: row[5],
  updatedAt: row[6]
});

const rowToLog = (row) => ({
  id: row[0],
  plantId: row[1],
  date: row[2],
  watered: row[3] === 1,
  fertilized: row[4] === 1,
  lightHours: row[5],
  notes: row[6],
  createdAt: row[7]
});

const safeQuery = (fn, res) => {
  try {
    fn();
    saveDatabase();
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

const queryRows = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows.map(r => [r.id, r.name, r.species, r.plant_date, r.location, r.created_at, r.updated_at]);
};

const queryLogRows = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows.map(r => [r.id, r.plant_id, r.date, r.watered, r.fertilized, r.light_hours, r.notes, r.created_at]);
};

const getOne = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

const runSql = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
};

const getLastInsertRowid = () => {
  const result = getOne("SELECT last_insert_rowid() as id");
  return result ? result.id : null;
};

const getChanges = () => {
  const result = getOne("SELECT changes() as cnt");
  return result ? result.cnt : 0;
};

app.get('/api/plants', (req, res) => {
  safeQuery(() => {
    const rows = queryRows('SELECT * FROM plants ORDER BY created_at DESC');
    res.json({ success: true, data: rows.map(rowToPlant) });
  }, res);
});

app.get('/api/plants/:id', (req, res) => {
  safeQuery(() => {
    const obj = getOne('SELECT * FROM plants WHERE id = ?', [req.params.id]);
    if (!obj) {
      res.json({ success: false, error: 'Plant not found' });
      return;
    }
    const row = [obj.id, obj.name, obj.species, obj.plant_date, obj.location, obj.created_at, obj.updated_at];
    res.json({ success: true, data: rowToPlant(row) });
  }, res);
});

app.post('/api/plants', (req, res) => {
  safeQuery(() => {
    const { name, species, plantDate, location } = req.body;
    const validSpecies = ['绿萝', '仙人掌', '虎皮兰', '多肉', '龟背竹'];
    if (!validSpecies.includes(species)) {
      res.json({ success: false, error: 'Invalid species' });
      return;
    }
    const now = new Date().toISOString();
    runSql(
      'INSERT INTO plants (name, species, plant_date, location, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name, species, plantDate, location, now, now]
    );
    const id = getLastInsertRowid();
    const obj = getOne('SELECT * FROM plants WHERE id = ?', [id]);
    const row = [obj.id, obj.name, obj.species, obj.plant_date, obj.location, obj.created_at, obj.updated_at];
    res.json({ success: true, data: rowToPlant(row) });
  }, res);
});

app.put('/api/plants/:id', (req, res) => {
  safeQuery(() => {
    const { id } = req.params;
    const { name, species, plantDate, location } = req.body;
    const validSpecies = ['绿萝', '仙人掌', '虎皮兰', '多肉', '龟背竹'];
    if (!validSpecies.includes(species)) {
      res.json({ success: false, error: 'Invalid species' });
      return;
    }
    const now = new Date().toISOString();
    runSql(
      'UPDATE plants SET name = ?, species = ?, plant_date = ?, location = ?, updated_at = ? WHERE id = ?',
      [name, species, plantDate, location, now, id]
    );
    const changes = getChanges();
    if (changes === 0) {
      res.json({ success: false, error: 'Plant not found' });
      return;
    }
    const obj = getOne('SELECT * FROM plants WHERE id = ?', [id]);
    const row = [obj.id, obj.name, obj.species, obj.plant_date, obj.location, obj.created_at, obj.updated_at];
    res.json({ success: true, data: rowToPlant(row) });
  }, res);
});

app.delete('/api/plants/:id', (req, res) => {
  safeQuery(() => {
    const { id } = req.params;
    runSql('DELETE FROM plant_logs WHERE plant_id = ?', [id]);
    runSql('DELETE FROM plants WHERE id = ?', [id]);
    const changes = getChanges();
    if (changes === 0) {
      res.json({ success: false, error: 'Plant not found' });
      return;
    }
    res.json({ success: true, data: { deleted: true } });
  }, res);
});

app.get('/api/plants/:id/logs', (req, res) => {
  safeQuery(() => {
    const { id } = req.params;
    const days = parseInt(req.query.days || '30');
    const rows = queryLogRows(
      'SELECT * FROM plant_logs WHERE plant_id = ? ORDER BY date DESC LIMIT ?',
      [id, days]
    );
    res.json({ success: true, data: rows.map(rowToLog) });
  }, res);
});

app.post('/api/plants/:id/logs', (req, res) => {
  safeQuery(() => {
    const { id } = req.params;
    const { date, watered, fertilized, lightHours, notes } = req.body;

    const plant = getOne('SELECT id FROM plants WHERE id = ?', [id]);
    if (!plant) {
      res.json({ success: false, error: 'Plant not found' });
      return;
    }

    const existing = getOne(
      'SELECT id FROM plant_logs WHERE plant_id = ? AND date = ?',
      [id, date]
    );

    let logId;
    const now = new Date().toISOString();

    if (existing) {
      runSql(
        'UPDATE plant_logs SET watered = ?, fertilized = ?, light_hours = ?, notes = ?, created_at = ? WHERE id = ?',
        [watered ? 1 : 0, fertilized ? 1 : 0, lightHours, notes, now, existing.id]
      );
      logId = existing.id;
    } else {
      runSql(
        'INSERT INTO plant_logs (plant_id, date, watered, fertilized, light_hours, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [id, date, watered ? 1 : 0, fertilized ? 1 : 0, lightHours, notes]
      );
      logId = getLastInsertRowid();
    }

    const obj = getOne('SELECT * FROM plant_logs WHERE id = ?', [logId]);
    const row = [obj.id, obj.plant_id, obj.date, obj.watered, obj.fertilized, obj.light_hours, obj.notes, obj.created_at];
    res.json({ success: true, data: rowToLog(row) });
  }, res);
});

const getPlantSchedule = (plant) => {
  const config = SPECIES_CONFIG[plant.species];
  const today = new Date();
  const schedule = [];

  const logs = queryLogRows(
    'SELECT date, watered, fertilized FROM plant_logs WHERE plant_id = ? ORDER BY date DESC',
    [plant.id]
  );

  const logsByDate = {};
  logs.forEach(log => {
    logsByDate[log[2]] = { watered: log[3], fertilized: log[4] };
  });

  let lastWaterDate = null;
  let lastFertilizeDate = null;

  for (const log of logs) {
    if (log[3] === 1 && !lastWaterDate) lastWaterDate = log[2];
    if (log[4] === 1 && !lastFertilizeDate) lastFertilizeDate = log[2];
    if (lastWaterDate && lastFertilizeDate) break;
  }

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = formatDate(date);

    const tasks = [];
    const logForDate = logsByDate[dateStr];

    let nextWaterDate;
    if (lastWaterDate) {
      nextWaterDate = new Date(lastWaterDate + 'T00:00:00');
      nextWaterDate.setDate(nextWaterDate.getDate() + config.waterInterval);
    } else {
      nextWaterDate = new Date(plant.plant_date + 'T00:00:00');
      nextWaterDate.setDate(nextWaterDate.getDate() + config.waterInterval);
    }

    let nextFertilizeDate;
    if (lastFertilizeDate) {
      nextFertilizeDate = new Date(lastFertilizeDate + 'T00:00:00');
      nextFertilizeDate.setDate(nextFertilizeDate.getDate() + config.fertilizeInterval);
    } else {
      nextFertilizeDate = new Date(plant.plant_date + 'T00:00:00');
      nextFertilizeDate.setDate(nextFertilizeDate.getDate() + config.fertilizeInterval);
    }

    const current = new Date(dateStr + 'T00:00:00');
    const waterOnly = new Date(formatDate(nextWaterDate) + 'T00:00:00');
    const fertilizeOnly = new Date(formatDate(nextFertilizeDate) + 'T00:00:00');

    if (current.getTime() >= waterOnly.getTime()) {
      tasks.push({
        type: 'water',
        completed: logForDate ? logForDate.watered === 1 : false
      });
    }

    if (current.getTime() >= fertilizeOnly.getTime()) {
      tasks.push({
        type: 'fertilize',
        completed: logForDate ? logForDate.fertilized === 1 : false
      });
    }

    if (tasks.length > 0) {
      schedule.push({
        date: dateStr,
        plantId: plant.id,
        plantName: plant.name,
        tasks
      });
    }
  }

  return schedule;
};

app.get('/api/plants/:id/schedule', (req, res) => {
  safeQuery(() => {
    const { id } = req.params;
    const obj = getOne('SELECT * FROM plants WHERE id = ?', [id]);
    if (!obj) {
      res.json({ success: false, error: 'Plant not found' });
      return;
    }
    const schedule = getPlantSchedule({
      id: obj.id,
      name: obj.name,
      species: obj.species,
      plant_date: obj.plant_date
    });
    res.json({ success: true, data: schedule });
  }, res);
});

app.get('/api/plants/:id/advice', (req, res) => {
  safeQuery(() => {
    const { id } = req.params;
    const obj = getOne('SELECT * FROM plants WHERE id = ?', [id]);
    if (!obj) {
      res.json({ success: false, error: 'Plant not found' });
      return;
    }
    const config = SPECIES_CONFIG[obj.species];

    const logs = queryLogRows(
      'SELECT * FROM plant_logs WHERE plant_id = ? ORDER BY date DESC LIMIT 7',
      [id]
    );

    const advices = [];
    const waterCount = logs.filter(l => l[3] === 1).length;
    const avgLight = logs.length > 0
      ? logs.reduce((sum, l) => sum + l[5], 0) / logs.length
      : 0;

    if (waterCount > 4) {
      advices.push(`${config.name}：当前浇水频率偏高，建议减少浇水`);
    } else if (waterCount < 1 && logs.length >= 3) {
      advices.push(`${config.name}：近期浇水不足，请及时补充水分`);
    } else if (waterCount >= 2 && waterCount <= 4) {
      advices.push(`${config.name}：浇水频率适中，继续保持`);
    } else {
      advices.push(`${config.name}：建议每${config.waterInterval}天浇水一次`);
    }

    if (avgLight > config.idealLight + 2) {
      advices.push(`${config.name}：光照过强，建议适当遮阴`);
    } else if (avgLight < config.idealLight - 2) {
      advices.push(`${config.name}：光照不足，建议移至光线更好的位置`);
    } else {
      advices.push(`${config.name}：光照充足，无需调整`);
    }

    const fertilizedRecently = logs.some(l => l[4] === 1);
    if (!fertilizedRecently && logs.length >= 7) {
      advices.push(`${config.name}：建议每${config.fertilizeInterval}天施肥一次`);
    }

    res.json({
      success: true,
      data: {
        plantId: obj.id,
        advice: advices.join('；'),
        lastUpdated: new Date().toISOString()
      }
    });
  }, res);
});

app.get('/api/schedule', (req, res) => {
  safeQuery(() => {
    const plants = queryRows('SELECT * FROM plants');
    const allSchedules = [];

    for (const row of plants) {
      const schedule = getPlantSchedule({
        id: row[0],
        name: row[1],
        species: row[2],
        plant_date: row[3]
      });
      allSchedules.push(...schedule);
    }

    const mergedSchedule = {};
    allSchedules.forEach(item => {
      if (!mergedSchedule[item.date]) {
        mergedSchedule[item.date] = {
          date: item.date,
          items: []
        };
      }
      mergedSchedule[item.date].items.push(item);
    });

    const result = Object.values(mergedSchedule).sort((a, b) =>
      new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00')
    );

    res.json({ success: true, data: result });
  }, res);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
