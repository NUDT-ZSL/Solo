import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface Pet {
  id: string;
  name: string;
  breed: string;
  birthDate: string;
  avatar: string;
}

type RecordType = 'vaccine' | 'deworm' | 'weight';

interface HealthRecord {
  id: string;
  petId: string;
  type: RecordType;
  date: string;
  description: string;
  weight?: number;
  temperature?: number;
  vaccineName?: string;
  dewormType?: string;
}

interface ShareLink {
  id: string;
  token: string;
  petId: string;
  hospitalEmail: string;
  createdAt: string;
  expiresAt: string;
  vetAdvice?: string;
}

interface DataStore {
  pets: Pet[];
  records: HealthRecord[];
  shares: ShareLink[];
}

function readData(): DataStore {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: DataStore): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function generateSampleData(): void {
  const data = readData();
  if (data.pets.length > 0) return;

  const pet1: Pet = {
    id: uuidv4(),
    name: '豆豆',
    breed: '金毛寻回犬',
    birthDate: '2022-03-15',
    avatar: ''
  };

  const pet2: Pet = {
    id: uuidv4(),
    name: '咪咪',
    breed: '英国短毛猫',
    birthDate: '2023-06-20',
    avatar: ''
  };

  data.pets.push(pet1, pet2);

  const records: HealthRecord[] = [
    {
      id: uuidv4(),
      petId: pet1.id,
      type: 'vaccine',
      date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      description: '狂犬疫苗接种',
      vaccineName: '狂犬疫苗'
    },
    {
      id: uuidv4(),
      petId: pet1.id,
      type: 'deworm',
      date: dayjs().subtract(20, 'day').format('YYYY-MM-DD'),
      description: '体内驱虫',
      dewormType: '体内驱虫'
    },
    {
      id: uuidv4(),
      petId: pet1.id,
      type: 'weight',
      date: dayjs().subtract(25, 'day').format('YYYY-MM-DD'),
      description: '体重测量',
      weight: 25.5,
      temperature: 38.5
    },
    {
      id: uuidv4(),
      petId: pet1.id,
      type: 'weight',
      date: dayjs().subtract(18, 'day').format('YYYY-MM-DD'),
      description: '体重测量',
      weight: 25.8,
      temperature: 38.3
    },
    {
      id: uuidv4(),
      petId: pet1.id,
      type: 'weight',
      date: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
      description: '体重测量',
      weight: 26.2,
      temperature: 38.6
    },
    {
      id: uuidv4(),
      petId: pet1.id,
      type: 'weight',
      date: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
      description: '体重测量',
      weight: 26.5,
      temperature: 38.4
    },
    {
      id: uuidv4(),
      petId: pet2.id,
      type: 'vaccine',
      date: dayjs().subtract(15, 'day').format('YYYY-MM-DD'),
      description: '猫三联疫苗',
      vaccineName: '猫三联疫苗'
    },
    {
      id: uuidv4(),
      petId: pet2.id,
      type: 'weight',
      date: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      description: '体重测量',
      weight: 4.2,
      temperature: 38.8
    }
  ];

  data.records.push(...records);
  writeData(data);
}

generateSampleData();

app.get('/api/pets', (req, res) => {
  const data = readData();
  res.json(data.pets);
});

app.post('/api/pets', (req, res) => {
  const data = readData();
  const newPet: Pet = {
    id: uuidv4(),
    name: req.body.name,
    breed: req.body.breed,
    birthDate: req.body.birthDate,
    avatar: req.body.avatar || ''
  };
  data.pets.push(newPet);
  writeData(data);
  res.json(newPet);
});

app.put('/api/pets/:id', (req, res) => {
  const data = readData();
  const index = data.pets.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Pet not found' });
    return;
  }
  data.pets[index] = { ...data.pets[index], ...req.body };
  writeData(data);
  res.json(data.pets[index]);
});

app.delete('/api/pets/:id', (req, res) => {
  const data = readData();
  data.pets = data.pets.filter(p => p.id !== req.params.id);
  data.records = data.records.filter(r => r.petId !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.get('/api/records/:petId', (req, res) => {
  const data = readData();
  const records = data.records
    .filter(r => r.petId === req.params.petId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(records);
});

app.post('/api/records', (req, res) => {
  const data = readData();
  const newRecord: HealthRecord = {
    id: uuidv4(),
    ...req.body
  };
  data.records.push(newRecord);
  writeData(data);
  res.json(newRecord);
});

app.post('/api/share', (req, res) => {
  const data = readData();
  const token = uuidv4();
  const shareLink: ShareLink = {
    id: uuidv4(),
    token,
    petId: req.body.petId,
    hospitalEmail: req.body.hospitalEmail,
    createdAt: dayjs().format(),
    expiresAt: dayjs().add(7, 'day').format()
  };
  data.shares.push(shareLink);
  writeData(data);
  res.json({
    token,
    shareUrl: `/share/${token}`,
    expiresAt: shareLink.expiresAt
  });
});

app.get('/api/share/:token', (req, res) => {
  const data = readData();
  const share = data.shares.find(s => s.token === req.params.token);
  if (!share) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }
  if (dayjs(share.expiresAt).isBefore(dayjs())) {
    res.status(403).json({ error: 'Share link has expired' });
    return;
  }
  const pet = data.pets.find(p => p.id === share.petId);
  const records = data.records
    .filter(r => r.petId === share.petId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({
    pet,
    records,
    vetAdvice: share.vetAdvice,
    expiresAt: share.expiresAt
  });
});

app.post('/api/share/:token/advice', (req, res) => {
  const data = readData();
  const share = data.shares.find(s => s.token === req.params.token);
  if (!share) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }
  if (dayjs(share.expiresAt).isBefore(dayjs())) {
    res.status(403).json({ error: 'Share link has expired' });
    return;
  }
  share.vetAdvice = req.body.advice;
  writeData(data);
  res.json({ success: true, advice: share.vetAdvice });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
