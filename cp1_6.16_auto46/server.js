import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const presetComets = [
  {
    id: 'halley',
    name: '哈雷彗星',
    semiMajorAxis: 17.83,
    eccentricity: 0.967,
    inclination: 162.3,
    perihelionEpoch: 2061.0,
    perihelionLongitude: 111.33,
    color: '#85C1E9'
  },
  {
    id: 'hale-bopp',
    name: '海尔-波普彗星',
    semiMajorAxis: 186.0,
    eccentricity: 0.995,
    inclination: 89.4,
    perihelionEpoch: 1997.0,
    perihelionLongitude: 282.5,
    color: '#F1948A'
  },
  {
    id: 'hyakutake',
    name: '百武彗星',
    semiMajorAxis: 2500.0,
    eccentricity: 0.9998,
    inclination: 124.9,
    perihelionEpoch: 1996.0,
    perihelionLongitude: 188.0,
    color: '#82E0AA'
  },
  {
    id: 'enchcke',
    name: '恩克彗星',
    semiMajorAxis: 2.21,
    eccentricity: 0.847,
    inclination: 11.8,
    perihelionEpoch: 2023.0,
    perihelionLongitude: 184.5,
    color: '#BB8FCE'
  }
];

let customComets = [];

app.get('/api/comets', (req, res) => {
  res.json([...presetComets, ...customComets]);
});

app.post('/api/custom', (req, res) => {
  const { name, semiMajorAxis, eccentricity, inclination, perihelionLongitude } = req.body;

  if (!name || !semiMajorAxis || !eccentricity || inclination === undefined || perihelionLongitude === undefined) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  if (semiMajorAxis < 0.5 || semiMajorAxis > 5) {
    return res.status(400).json({ error: '半长轴必须在0.5-5 AU之间' });
  }

  if (eccentricity < 0.1 || eccentricity > 0.9) {
    return res.status(400).json({ error: '离心率必须在0.1-0.9之间' });
  }

  if (inclination < 0 || inclination > 90) {
    return res.status(400).json({ error: '倾角必须在0-90度之间' });
  }

  if (perihelionLongitude < 0 || perihelionLongitude > 360) {
    return res.status(400).json({ error: '近日点经度必须在0-360度之间' });
  }

  const newComet = {
    id: uuidv4(),
    name,
    semiMajorAxis: Number(semiMajorAxis),
    eccentricity: Number(eccentricity),
    inclination: Number(inclination),
    perihelionEpoch: 2025.0,
    perihelionLongitude: Number(perihelionLongitude),
    color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
    isCustom: true
  };

  customComets.push(newComet);
  res.status(201).json(newComet);
});

app.listen(PORT, () => {
  console.log(`彗星数据服务运行在 http://localhost:${PORT}`);
});
