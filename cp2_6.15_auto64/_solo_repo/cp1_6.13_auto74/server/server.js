import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const dbDir = join(__dirname, 'data');
const animalsDB = Datastore.create({ filename: join(dbDir, 'animals.db'), autoload: true });
const applicationsDB = Datastore.create({ filename: join(dbDir, 'applications.db'), autoload: true });
const volunteersDB = Datastore.create({ filename: join(dbDir, 'volunteers.db'), autoload: true });
const schedulesDB = Datastore.create({ filename: join(dbDir, 'schedules.db'), autoload: true });

app.get('/api/animals', async (req, res) => {
  try {
    const animals = await animalsDB.find({}).sort({ createdAt: -1 });
    res.json(animals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/animals', async (req, res) => {
  try {
    const { name, species, breed, age, gender, vaccinated, personality, photo, thumbnail } = req.body;
    const animal = {
      _id: uuidv4(),
      name,
      species,
      breed,
      age: Number(age),
      gender,
      vaccinated: vaccinated === 'true' || vaccinated === true,
      personality,
      photo: photo || null,
      thumbnail: thumbnail || null,
      createdAt: new Date().toISOString()
    };
    const newAnimal = await animalsDB.insert(animal);
    res.json(newAnimal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/animals/:id', async (req, res) => {
  try {
    await animalsDB.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    const applications = await applicationsDB.find({}).sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    const { animalId, animalName, applicantName, phone, address, experience } = req.body;
    const application = {
      _id: uuidv4(),
      animalId,
      animalName,
      applicantName,
      phone,
      address,
      experience,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    const newApp = await applicationsDB.insert(application);
    res.json(newApp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/applications/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await applicationsDB.update(
      { _id: req.params.id },
      { $set: { status } },
      { returnUpdatedDocs: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/volunteers', async (req, res) => {
  try {
    const volunteers = await volunteersDB.find({}).sort({ createdAt: -1 });
    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/volunteers', async (req, res) => {
  try {
    const { name, phone, availableSlots } = req.body;
    const volunteer = {
      _id: uuidv4(),
      name,
      phone,
      availableSlots: availableSlots || [],
      createdAt: new Date().toISOString()
    };
    const newVolunteer = await volunteersDB.insert(volunteer);
    res.json(newVolunteer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await schedulesDB.find({});
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules', async (req, res) => {
  try {
    const { volunteerId, volunteerName, day, timeSlot } = req.body;
    const existing = await schedulesDB.findOne({ day, timeSlot });
    const schedule = {
      _id: uuidv4(),
      volunteerId,
      volunteerName,
      day,
      timeSlot,
      createdAt: new Date().toISOString()
    };
    const newSchedule = await schedulesDB.insert(schedule);
    res.json({ ...newSchedule, conflict: !!existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    await schedulesDB.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
