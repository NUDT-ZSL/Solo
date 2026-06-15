import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'plants.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      species TEXT NOT NULL CHECK(species IN ('绿萝', '仙人掌', '虎皮兰', '多肉', '龟背竹')),
      plant_date TEXT NOT NULL,
      location TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
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
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_plant_logs_plant_id ON plant_logs(plant_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_plant_logs_date ON plant_logs(date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_plant_logs_plant_date ON plant_logs(plant_id, date)');
});

const SPECIES_CONFIG = {
  '绿萝': { waterInterval: 3, fertilizeInterval: 30, idealLight: 6, name: '绿萝' },
  '仙人掌': { waterInterval: 14, fertilizeInterval: 60, idealLight: 8, name: '仙人掌' },
  '虎皮兰': { waterInterval: 7, fertilizeInterval: 45, idealLight: 4, name: '虎皮兰' },
  '多肉': { waterInterval: 10, fertilizeInterval: 60, idealLight: 6, name: '多肉' },
  '龟背竹': { waterInterval: 5, fertilizeInterval: 30, idealLight: 4, name: '龟背竹' }
};

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

const getDaysDiff = (dateStr1, dateStr2) => {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

app.get('/api/plants', (req, res) => {
  db.all('SELECT * FROM plants ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.json({ success: false, error: err.message });
      return;
    }
    const plants = rows.map(row => ({
      id: row.id,
      name: row.name,
      species: row.species,
      plantDate: row.plant_date,
      location: row.location,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    res.json({ success: true, data: plants });
  });
});

app.get('/api/plants/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM plants WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.json({ success: false, error: err.message });
      return;
    }
    if (!row) {
      res.json({ success: false, error: 'Plant not found' });
      return;
    }
    const plant = {
      id: row.id,
      name: row.name,
      species: row.species,
      plantDate: row.plant_date,
      location: row.location,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    res.json({ success: true, data: plant });
  });
});

app.post('/api/plants', (req, res) => {
  const { name, species, plantDate, location } = req.body;
  const validSpecies = ['绿萝', '仙人掌', '虎皮兰', '多肉', '龟背竹'];
  if (!validSpecies.includes(species)) {
    res.json({ success: false, error: 'Invalid species' });
    return;
  }
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO plants (name, species, plant_date, location, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [name, species, plantDate, location, now, now],
    function (err) {
      if (err) {
        res.json({ success: false, error: err.message });
        return;
      }
      db.get('SELECT * FROM plants WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          res.json({ success: false, error: err.message });
          return;
        }
        const plant = {
          id: row.id,
          name: row.name,
          species: row.species,
          plantDate: row.plant_date,
          location: row.location,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
        res.json({ success: true, data: plant });
      });
    }
  );
});

app.put('/api/plants/:id', (req, res) => {
  const { id } = req.params;
  const { name, species, plantDate, location } = req.body;
  const validSpecies = ['绿萝', '仙人掌', '虎皮兰', '多肉', '龟背竹'];
  if (!validSpecies.includes(species)) {
    res.json({ success: false, error: 'Invalid species' });
    return;
  }
  const now = new Date().toISOString();
  db.run(
    'UPDATE plants SET name = ?, species = ?, plant_date = ?, location = ?, updated_at = ? WHERE id = ?',
    [name, species, plantDate, location, now, id],
    function (err) {
      if (err) {
        res.json({ success: false, error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.json({ success: false, error: 'Plant not found' });
        return;
      }
      db.get('SELECT * FROM plants WHERE id = ?', [id], (err, row) => {
        if (err) {
          res.json({ success: false, error: err.message });
          return;
        }
        const plant = {
          id: row.id,
          name: row.name,
          species: row.species,
          plantDate: row.plant_date,
          location: row.location,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
        res.json({ success: true, data: plant });
      });
    }
  );
});

app.delete('/api/plants/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM plant_logs WHERE plant_id = ?', [id], (err) => {
    if (err) {
      res.json({ success: false, error: err.message });
      return;
    }
    db.run('DELETE FROM plants WHERE id = ?', [id], function (err) {
      if (err) {
        res.json({ success: false, error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.json({ success: false, error: 'Plant not found' });
        return;
      }
      res.json({ success: true, data: { deleted: true } });
    });
  });
});

app.get('/api/plants/:id/logs', (req, res) => {
  const { id } = req.params;
  const { days = 30 } = req.query;
  const limit = parseInt(days);
  
  db.all(
    'SELECT * FROM plant_logs WHERE plant_id = ? ORDER BY date DESC LIMIT ?',
    [id, limit],
    (err, rows) => {
      if (err) {
        res.json({ success: false, error: err.message });
        return;
      }
      const logs = rows.map(row => ({
        id: row.id,
        plantId: row.plant_id,
        date: row.date,
        watered: row.watered === 1,
        fertilized: row.fertilized === 1,
        lightHours: row.light_hours,
        notes: row.notes,
        createdAt: row.created_at
      }));
      res.json({ success: true, data: logs });
    }
  );
});

app.post('/api/plants/:id/logs', (req, res) => {
  const { id } = req.params;
  const { date, watered, fertilized, lightHours, notes } = req.body;
  
  db.get('SELECT id FROM plants WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.json({ success: false, error: err.message });
      return;
    }
    if (!row) {
      res.json({ success: false, error: 'Plant not found' });
      return;
    }
    
    db.get(
      'SELECT id FROM plant_logs WHERE plant_id = ? AND date = ?',
      [id, date],
      (err, existingLog) => {
        if (err) {
          res.json({ success: false, error: err.message });
          return;
        }
        
        if (existingLog) {
          db.run(
            'UPDATE plant_logs SET watered = ?, fertilized = ?, light_hours = ?, notes = ?, created_at = ? WHERE id = ?',
            [watered ? 1 : 0, fertilized ? 1 : 0, lightHours, notes, new Date().toISOString(), existingLog.id],
            function (err) {
              if (err) {
                res.json({ success: false, error: err.message });
                return;
              }
              db.get('SELECT * FROM plant_logs WHERE id = ?', [existingLog.id], (err, row) => {
                if (err) {
                  res.json({ success: false, error: err.message });
                  return;
                }
                const log = {
                  id: row.id,
                  plantId: row.plant_id,
                  date: row.date,
                  watered: row.watered === 1,
                  fertilized: row.fertilized === 1,
                  lightHours: row.light_hours,
                  notes: row.notes,
                  createdAt: row.created_at
                };
                res.json({ success: true, data: log });
              });
            }
          );
        } else {
          db.run(
            'INSERT INTO plant_logs (plant_id, date, watered, fertilized, light_hours, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [id, date, watered ? 1 : 0, fertilized ? 1 : 0, lightHours, notes],
            function (err) {
              if (err) {
                res.json({ success: false, error: err.message });
                return;
              }
              db.get('SELECT * FROM plant_logs WHERE id = ?', [this.lastID], (err, row) => {
                if (err) {
                  res.json({ success: false, error: err.message });
                  return;
                }
                const log = {
                  id: row.id,
                  plantId: row.plant_id,
                  date: row.date,
                  watered: row.watered === 1,
                  fertilized: row.fertilized === 1,
                  lightHours: row.light_hours,
                  notes: row.notes,
                  createdAt: row.created_at
                };
                res.json({ success: true, data: log });
              });
            }
          );
        }
      }
    );
  });
});

app.get('/api/plants/:id/schedule', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM plants WHERE id = ?', [id], (err, plant) => {
    if (err) {
      res.json({ success: false, error: err.message });
      return;
    }
    if (!plant) {
      res.json({ success: false, error: 'Plant not found' });
      return;
    }
    
    const config = SPECIES_CONFIG[plant.species];
    const today = new Date();
    const schedule = [];
    
    db.all(
      'SELECT date, watered, fertilized FROM plant_logs WHERE plant_id = ? ORDER BY date DESC',
      [id],
      (err, logs) => {
        if (err) {
          res.json({ success: false, error: err.message });
          return;
        }
        
        const logsByDate = {};
        logs.forEach(log => {
          logsByDate[log.date] = log;
        });
        
        let lastWaterDate = null;
        let lastFertilizeDate = null;
        
        for (const log of logs) {
          if (log.watered === 1 && !lastWaterDate) {
            lastWaterDate = log.date;
          }
          if (log.fertilized === 1 && !lastFertilizeDate) {
            lastFertilizeDate = log.date;
          }
          if (lastWaterDate && lastFertilizeDate) break;
        }
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = formatDate(date);
          const dayOfWeek = date.getDay();
          
          const tasks = [];
          const logForDate = logsByDate[dateStr];
          
          let nextWaterDate;
          if (lastWaterDate) {
            nextWaterDate = new Date(lastWaterDate);
            nextWaterDate.setDate(nextWaterDate.getDate() + config.waterInterval);
          } else {
            nextWaterDate = new Date(plant.plant_date);
            nextWaterDate.setDate(nextWaterDate.getDate() + config.waterInterval);
          }
          
          let nextFertilizeDate;
          if (lastFertilizeDate) {
            nextFertilizeDate = new Date(lastFertilizeDate);
            nextFertilizeDate.setDate(nextFertilizeDate.getDate() + config.fertilizeInterval);
          } else {
            nextFertilizeDate = new Date(plant.plant_date);
            nextFertilizeDate.setDate(nextFertilizeDate.getDate() + config.fertilizeInterval);
          }
          
          if (date >= nextWaterDate || formatDate(date) === formatDate(nextWaterDate)) {
            tasks.push({
              type: 'water',
              completed: logForDate ? logForDate.watered === 1 : false
            });
          }
          
          if (date >= nextFertilizeDate || formatDate(date) === formatDate(nextFertilizeDate)) {
            tasks.push({
              type: 'fertilize',
              completed: logForDate ? logForDate.fertilized === 1 : false
            });
          }
          
          if (tasks.length > 0 || dayOfWeek === 0 || dayOfWeek === 6) {
            schedule.push({
              date: dateStr,
              plantId: plant.id,
              plantName: plant.name,
              tasks
            });
          }
        }
        
        res.json({ success: true, data: schedule });
      }
    );
  });
});

app.get('/api/plants/:id/advice', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM plants WHERE id = ?', [id], (err, plant) => {
    if (err) {
      res.json({ success: false, error: err.message });
      return;
    }
    if (!plant) {
      res.json({ success: false, error: 'Plant not found' });
      return;
    }
    
    const config = SPECIES_CONFIG[plant.species];
    
    db.all(
      'SELECT * FROM plant_logs WHERE plant_id = ? ORDER BY date DESC LIMIT 7',
      [id],
      (err, logs) => {
        if (err) {
          res.json({ success: false, error: err.message });
          return;
        }
        
        const advices = [];
        
        const waterCount = logs.filter(l => l.watered === 1).length;
        const avgLight = logs.length > 0 
          ? logs.reduce((sum, l) => sum + l.light_hours, 0) / logs.length 
          : 0;
        
        if (waterCount > 4) {
          advices.push(`${config.name}：当前浇水频率偏高，建议减少浇水`);
        } else if (waterCount < 1 && logs.length >= 3) {
          advices.push(`${config.name}：近期浇水不足，请及时补充水分`);
        } else if (waterCount >= 2 && waterCount <= 4) {
          advices.push(`${config.name}：浇水频率适中，继续保持`);
        } else {
          advices.push(`${config.name}：建议保持每${config.waterInterval}天浇水一次`);
        }
        
        if (avgLight > config.idealLight + 2) {
          advices.push(`${config.name}：光照过强，建议适当遮阴`);
        } else if (avgLight < config.idealLight - 2) {
          advices.push(`${config.name}：光照不足，建议移至光线更好的位置`);
        } else {
          advices.push(`${config.name}：光照充足，无需调整`);
        }
        
        const fertilizedRecently = logs.some(l => l.fertilized === 1);
        if (!fertilizedRecently && logs.length >= 7) {
          advices.push(`${config.name}：建议每${config.fertilizeInterval}天施肥一次`);
        }
        
        res.json({
          success: true,
          data: {
            plantId: plant.id,
            advice: advices.join('；'),
            lastUpdated: new Date().toISOString()
          }
        });
      }
    );
  });
});

app.get('/api/schedule', (req, res) => {
  db.all('SELECT * FROM plants', [], (err, plants) => {
    if (err) {
      res.json({ success: false, error: err.message });
      return;
    }
    
    const allSchedules = [];
    let processed = 0;
    
    if (plants.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }
    
    plants.forEach(plant => {
      db.all(
        'SELECT date, watered, fertilized FROM plant_logs WHERE plant_id = ? ORDER BY date DESC',
        [plant.id],
        (err, logs) => {
          if (err) {
            processed++;
            return;
          }
          
          const config = SPECIES_CONFIG[plant.species];
          const today = new Date();
          const logsByDate = {};
          logs.forEach(log => {
            logsByDate[log.date] = log;
          });
          
          let lastWaterDate = null;
          let lastFertilizeDate = null;
          
          for (const log of logs) {
            if (log.watered === 1 && !lastWaterDate) lastWaterDate = log.date;
            if (log.fertilized === 1 && !lastFertilizeDate) lastFertilizeDate = log.date;
            if (lastWaterDate && lastFertilizeDate) break;
          }
          
          const plantSchedule = [];
          
          for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = formatDate(date);
            
            const tasks = [];
            const logForDate = logsByDate[dateStr];
            
            let nextWaterDate;
            if (lastWaterDate) {
              nextWaterDate = new Date(lastWaterDate);
              nextWaterDate.setDate(nextWaterDate.getDate() + config.waterInterval);
            } else {
              nextWaterDate = new Date(plant.plant_date);
              nextWaterDate.setDate(nextWaterDate.getDate() + config.waterInterval);
            }
            
            let nextFertilizeDate;
            if (lastFertilizeDate) {
              nextFertilizeDate = new Date(lastFertilizeDate);
              nextFertilizeDate.setDate(nextFertilizeDate.getDate() + config.fertilizeInterval);
            } else {
              nextFertilizeDate = new Date(plant.plant_date);
              nextFertilizeDate.setDate(nextFertilizeDate.getDate() + config.fertilizeInterval);
            }
            
            const dateOnly = new Date(dateStr);
            const waterOnly = new Date(formatDate(nextWaterDate));
            const fertilizeOnly = new Date(formatDate(nextFertilizeDate));
            
            if (dateOnly >= waterOnly) {
              tasks.push({
                type: 'water',
                completed: logForDate ? logForDate.watered === 1 : false
              });
            }
            
            if (dateOnly >= fertilizeOnly) {
              tasks.push({
                type: 'fertilize',
                completed: logForDate ? logForDate.fertilized === 1 : false
              });
            }
            
            if (tasks.length > 0) {
              plantSchedule.push({
                date: dateStr,
                plantId: plant.id,
                plantName: plant.name,
                tasks
              });
            }
          }
          
          allSchedules.push(...plantSchedule);
          processed++;
          
          if (processed === plants.length) {
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
              new Date(a.date) - new Date(b.date)
            );
            
            res.json({ success: true, data: result });
          }
        }
      );
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
