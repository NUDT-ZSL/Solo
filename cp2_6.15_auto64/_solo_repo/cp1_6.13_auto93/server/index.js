import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { events, songs } from './db.js';

const app = express();
app.use(express.json());

app.get('/api/events', async (req, res) => {
  try {
    const allEvents = await events.find({}).sort({ datetime: 1 });
    res.json(allEvents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, datetime, location, type, notes } = req.body;
    if (!title || title.length > 40) {
      res.status(400).json({ error: 'Title is required and must be 40 chars or less' });
      return;
    }
    if (notes && notes.length > 200) {
      res.status(400).json({ error: 'Notes must be 200 chars or less' });
      return;
    }
    const newEvent = {
      _id: uuidv4(),
      title,
      datetime,
      location: location || '',
      type: type || 'rehearsal',
      notes: notes || '',
      createdAt: new Date().toISOString(),
    };
    await events.insert(newEvent);
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, datetime, location, type, notes } = req.body;
    if (title !== undefined && (!title || title.length > 40)) {
      res.status(400).json({ error: 'Title must be 1-40 chars' });
      return;
    }
    if (notes && notes.length > 200) {
      res.status(400).json({ error: 'Notes must be 200 chars or less' });
      return;
    }
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (datetime !== undefined) updateData.datetime = datetime;
    if (location !== undefined) updateData.location = location;
    if (type !== undefined) updateData.type = type;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updatedAt = new Date().toISOString();

    const updated = await events.update({ _id: id }, { $set: updateData }, {});
    if (updated === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const doc = await events.findOne({ _id: id });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await events.remove({ _id: id }, {});
    if (removed === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

app.get('/api/songs', async (req, res) => {
  try {
    const allSongs = await songs.find({}).sort({ order: 1 });
    res.json(allSongs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

app.put('/api/songs', async (req, res) => {
  try {
    const songList = req.body;
    if (!Array.isArray(songList)) {
      res.status(400).json({ error: 'Expected an array of songs' });
      return;
    }
    for (const song of songList) {
      const updateData = {};
      if (song.bpm !== undefined) updateData.bpm = song.bpm;
      if (song.key !== undefined) updateData.key = song.key;
      if (song.progress !== undefined) updateData.progress = song.progress;
      if (song.order !== undefined) updateData.order = song.order;
      if (song.practiced !== undefined) updateData.practiced = song.practiced;
      updateData.updatedAt = new Date().toISOString();
      await songs.update({ _id: song._id }, { $set: updateData });
    }
    const allSongs = await songs.find({}).sort({ order: 1 });
    res.json(allSongs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update songs' });
  }
});

app.put('/api/songs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { bpm, key, progress, order, practiced } = req.body;
    const updateData = {};
    if (bpm !== undefined) updateData.bpm = bpm;
    if (key !== undefined) updateData.key = key;
    if (progress !== undefined) updateData.progress = progress;
    if (order !== undefined) updateData.order = order;
    if (practiced !== undefined) updateData.practiced = practiced;
    updateData.updatedAt = new Date().toISOString();

    const updated = await songs.update({ _id: id }, { $set: updateData }, {});
    if (updated === 0) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }
    const doc = await songs.findOne({ _id: id });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update song' });
  }
});

const seedSongs = async () => {
  const count = await songs.count({});
  if (count === 0) {
    const defaultSongs = [
      { _id: uuidv4(), name: '午夜狂想曲', bpm: 120, key: 'C大调', progress: 75, order: 0, practiced: false },
      { _id: uuidv4(), name: '星光漫步', bpm: 90, key: 'A小调', progress: 45, order: 1, practiced: false },
      { _id: uuidv4(), name: '破晓之歌', bpm: 140, key: 'G大调', progress: 90, order: 2, practiced: true },
      { _id: uuidv4(), name: '深海回声', bpm: 110, key: 'E小调', progress: 30, order: 3, practiced: false },
      { _id: uuidv4(), name: '烈焰节拍', bpm: 160, key: 'D大调', progress: 60, order: 4, practiced: false },
      { _id: uuidv4(), name: '风中旋律', bpm: 85, key: 'F大调', progress: 20, order: 5, practiced: false },
    ];
    await songs.insert(defaultSongs);
    console.log('Seeded default songs');
  }
};

const seedEvents = async () => {
  const count = await events.count({});
  if (count === 0) {
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 16);
    const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const defaultEvents = [
      { _id: uuidv4(), title: '排练-新曲磨合', datetime: fmt(addDays(today, 0)), location: '地下排练室', type: 'rehearsal', notes: '重点练习烈焰节拍', createdAt: new Date().toISOString() },
      { _id: uuidv4(), title: 'Live House 演出', datetime: fmt(addDays(today, 2)), location: '市中心Live House', type: 'gig', notes: '需提前1小时到场调音', createdAt: new Date().toISOString() },
      { _id: uuidv4(), title: '排练-和声编排', datetime: fmt(addDays(today, 4)), location: '排练室B', type: 'rehearsal', notes: '安排和声部分', createdAt: new Date().toISOString() },
      { _id: uuidv4(), title: '音乐节试音', datetime: fmt(addDays(today, 5)), location: '城市公园主舞台', type: 'gig', notes: '下午2点试音', createdAt: new Date().toISOString() },
    ];
    await events.insert(defaultEvents);
    console.log('Seeded default events');
  }
};

const PORT = 4000;
app.listen(PORT, async () => {
  await seedEvents();
  await seedSongs();
  console.log(`BeatSync server running on port ${PORT}`);
});
