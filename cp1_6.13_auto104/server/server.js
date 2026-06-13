import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const patternsDB = Datastore.create(path.join(__dirname, 'data', 'patterns.db'));
const appointmentsDB = Datastore.create(path.join(__dirname, 'data', 'appointments.db'));

patternsDB.load().then(() => {
  console.log('Patterns DB loaded');
  insertSamplePatterns();
});

appointmentsDB.load().then(() => {
  console.log('Appointments DB loaded');
});

async function insertSamplePatterns() {
  const count = await patternsDB.count({});
  if (count === 0) {
    const samplePatterns = [
      {
        _id: uuidv4(),
        name: '玫瑰花纹身',
        category: '花卉',
        size: { width: 500, height: 500 },
        image: generatePlaceholderImage('Rose', '#e11d48'),
        createdAt: new Date().toISOString(),
      },
      {
        _id: uuidv4(),
        name: '几何图腾',
        category: '几何',
        size: { width: 500, height: 500 },
        image: generatePlaceholderImage('Geometry', '#6366f1'),
        createdAt: new Date().toISOString(),
      },
      {
        _id: uuidv4(),
        name: '水墨山水',
        category: '东方',
        size: { width: 500, height: 500 },
        image: generatePlaceholderImage('Ink Art', '#1e293b'),
        createdAt: new Date().toISOString(),
      },
      {
        _id: uuidv4(),
        name: '部落图腾',
        category: '部落',
        size: { width: 500, height: 500 },
        image: generatePlaceholderImage('Tribal', '#78350f'),
        createdAt: new Date().toISOString(),
      },
      {
        _id: uuidv4(),
        name: '星空图案',
        category: '宇宙',
        size: { width: 500, height: 500 },
        image: generatePlaceholderImage('Galaxy', '#1e3a8a'),
        createdAt: new Date().toISOString(),
      },
      {
        _id: uuidv4(),
        name: '蛇形纹身',
        category: '动物',
        size: { width: 500, height: 500 },
        image: generatePlaceholderImage('Snake', '#15803d'),
        createdAt: new Date().toISOString(),
      },
    ];
    await patternsDB.insert(samplePatterns);
    console.log('Sample patterns inserted');
  }
}

function generatePlaceholderImage(text, bgColor) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
      <rect width="500" height="500" fill="${bgColor}"/>
      <text x="250" y="250" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
      <circle cx="250" cy="250" r="150" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
      <line x1="100" y1="100" x2="400" y2="400" stroke="white" stroke-width="1" opacity="0.3"/>
      <line x1="400" y1="100" x2="100" y2="400" stroke="white" stroke-width="1" opacity="0.3"/>
    </svg>
  `;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

app.get('/api/patterns', async (req, res) => {
  try {
    const patterns = await patternsDB.find({}).sort({ createdAt: -1 });
    res.json({ patterns });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

app.post('/api/patterns', async (req, res) => {
  try {
    const { name, category, image } = req.body;
    if (!name || !image) {
      return res.status(400).json({ error: 'Name and image are required' });
    }
    const pattern = {
      _id: uuidv4(),
      name,
      category: category || '未分类',
      size: { width: 500, height: 500 },
      image,
      createdAt: new Date().toISOString(),
    };
    const newPattern = await patternsDB.insert(pattern);
    res.json({ pattern: newPattern });
  } catch (error) {
    console.error('Error creating pattern:', error);
    res.status(500).json({ error: 'Failed to create pattern' });
  }
});

app.put('/api/patterns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category } = req.body;
    const existing = await patternsDB.findOne({ _id: id });
    if (!existing) {
      return res.status(404).json({ error: 'Pattern not found' });
    }
    const updated = await patternsDB.update(
      { _id: id },
      { $set: { name: name || existing.name, category: category || existing.category } },
      { returnUpdatedDocs: true }
    );
    res.json({ pattern: updated });
  } catch (error) {
    console.error('Error updating pattern:', error);
    res.status(500).json({ error: 'Failed to update pattern' });
  }
});

app.delete('/api/patterns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numRemoved = await patternsDB.remove({ _id: id }, {});
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Pattern not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pattern:', error);
    res.status(500).json({ error: 'Failed to delete pattern' });
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await appointmentsDB.find({}).sort({ datetime: 1 });
    res.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { name, phone, datetime } = req.body;
    if (!name || !phone || !datetime) {
      return res.status(400).json({ error: 'Name, phone, and datetime are required' });
    }
    const appointment = {
      _id: uuidv4(),
      name,
      phone,
      datetime,
      createdAt: new Date().toISOString(),
    };
    const newAppointment = await appointmentsDB.insert(appointment);
    res.json({ appointment: newAppointment });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numRemoved = await appointmentsDB.remove({ _id: id }, {});
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
