import express, { Request, Response } from 'express';
import cors from 'cors';
import gameDb from './database';

const PORT = 3001;
const DEFAULT_SAVE_ID = 'default';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/load', (req: Request, res: Response) => {
  try {
    const saveId = (req.query.saveId as string) || DEFAULT_SAVE_ID;
    const save = gameDb.loadGame(saveId);

    if (!save) {
      return res.status(404).json({ error: 'Save not found' });
    }

    res.json({
      id: save.id,
      gridData: save.grid_data,
      stats: save.stats,
      createdAt: save.created_at,
      updatedAt: save.updated_at,
    });
  } catch (error) {
    console.error('Error loading game:', error);
    res.status(500).json({ error: 'Failed to load game' });
  }
});

app.post('/api/save', (req: Request, res: Response) => {
  try {
    const { saveId, gridData, stats } = req.body;
    const inputSaveId = saveId || DEFAULT_SAVE_ID;

    if (!gridData || !stats) {
      return res.status(400).json({ error: 'gridData and stats are required' });
    }

    const resultSaveId = gameDb.saveGame(inputSaveId, JSON.stringify(gridData), JSON.stringify(stats));

    res.json({ success: true, saveId: resultSaveId });
  } catch (error) {
    console.error('Error saving game:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

app.post('/api/events', (req: Request, res: Response) => {
  try {
    const { saveId, eventType, eventData } = req.body;
    const finalSaveId = saveId || DEFAULT_SAVE_ID;

    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }

    const eventId = gameDb.logEvent(
      finalSaveId,
      eventType,
      JSON.stringify(eventData || {})
    );

    res.json({ success: true, eventId });
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

app.get('/api/events', (req: Request, res: Response) => {
  try {
    const saveId = (req.query.saveId as string) || DEFAULT_SAVE_ID;
    const events = gameDb.getEvents(saveId);

    const formattedEvents = events.map((event) => ({
      id: event.id,
      saveId: event.save_id,
      eventType: event.event_type,
      eventData: JSON.parse(event.event_data),
      createdAt: event.created_at,
    }));

    res.json({ events: formattedEvents });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

try {
  gameDb.initDb();
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
