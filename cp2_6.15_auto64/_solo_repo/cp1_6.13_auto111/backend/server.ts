import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const stationsDB = Datastore.create({
  filename: path.join(__dirname, '..', 'data', 'stations.db'),
  autoload: true,
});

const timeseriesDB = Datastore.create({
  filename: path.join(__dirname, '..', 'data', 'timeseries.db'),
  autoload: true,
});

const weatherDB = Datastore.create({
  filename: path.join(__dirname, '..', 'data', 'weather.db'),
  autoload: true,
});

const STATION_NAMES = [
  '中关村监测站',
  '朝阳区监测站',
  '海淀区监测站',
  '丰台区监测站',
  '东城区监测站',
  '西城区监测站',
  '通州区监测站',
  '昌平区监测站',
];

const MAP_SIZE = 300;
const STATION_COUNT = 8;

function randomConcentration(base: number, variance: number): number {
  const val = base + (Math.random() - 0.5) * variance * 2;
  return Math.max(0, Math.min(300, Math.round(val)));
}

async function initializeData() {
  const stationCount = await stationsDB.count({});
  if (stationCount > 0) return;

  console.log('正在初始化模拟数据...');

  const stations: any[] = [];
  for (let i = 0; i < STATION_COUNT; i++) {
    const station = {
      id: uuidv4(),
      name: STATION_NAMES[i],
      x: Math.round(30 + (i % 4) * 75 + (Math.random() - 0.5) * 20),
      y: Math.round(50 + Math.floor(i / 4) * 150 + (Math.random() - 0.5) * 30),
    };
    stations.push(station);
    await stationsDB.insert(station);
  }

  for (const station of stations) {
    const timeseries: any[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourFactor = Math.sin((hour - 6) * Math.PI / 12) * 0.3 + 0.7;
      const entry = {
        id: uuidv4(),
        stationId: station.id,
        hour,
        PM25: randomConcentration(80 * hourFactor, 40),
        PM10: randomConcentration(120 * hourFactor, 50),
        O3: randomConcentration(60 + hour * 3, 30),
        NO2: randomConcentration(70 * hourFactor, 25),
      };
      timeseries.push(entry);
      await timeseriesDB.insert(entry);
    }

    for (let hour = 0; hour < 24; hour++) {
      const weather = {
        id: uuidv4(),
        stationId: station.id,
        hour,
        windDirection: Math.round((hour * 15 + Math.random() * 30) % 360),
        windSpeed: Math.round((2 + Math.random() * 4) * 10) / 10,
      };
      await weatherDB.insert(weather);
    }
  }

  console.log('模拟数据初始化完成');
}

app.get('/api/stations', async (req, res) => {
  try {
    const hour = parseInt(req.query.hour as string) || 12;
    const stations = await stationsDB.find({});
    const result = [];

    for (const station of stations) {
      const ts = await timeseriesDB.findOne({ stationId: station.id, hour });
      result.push({
        ...station,
        concentrations: ts
          ? {
              PM25: ts.PM25,
              PM10: ts.PM10,
              O3: ts.O3,
              NO2: ts.NO2,
            }
          : { PM25: 0, PM10: 0, O3: 0, NO2: 0 },
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取站点数据失败' });
  }
});

app.get('/api/timeseries', async (req, res) => {
  try {
    const { stationId } = req.query;
    if (!stationId) {
      return res.status(400).json({ error: '缺少stationId参数' });
    }

    const data = await timeseriesDB
      .find({ stationId: stationId as string })
      .sort({ hour: 1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '获取时间序列数据失败' });
  }
});

app.get('/api/weather', async (req, res) => {
  try {
    const { stationId, hour } = req.query;
    if (!stationId) {
      return res.status(400).json({ error: '缺少stationId参数' });
    }

    const query: any = { stationId: stationId as string };
    if (hour !== undefined) {
      query.hour = parseInt(hour as string);
    }

    const data = await weatherDB.find(query).sort({ hour: 1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '获取气象数据失败' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

initializeData().then(() => {
  app.listen(PORT, () => {
    console.log(`AeroScope API server running on http://localhost:${PORT}`);
  });
});

export default app;
