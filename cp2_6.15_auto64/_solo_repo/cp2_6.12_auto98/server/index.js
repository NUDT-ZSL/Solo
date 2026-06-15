import express from 'express';
import cors from 'cors';
import { initDatabase } from './database.js';
import { createRoomsRouter } from './routes/rooms.js';
import { createStoriesRouter } from './routes/stories.js';
import { createAiRouter } from './routes/ai.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = await initDatabase();

app.use('/api/rooms', createRoomsRouter(db));
app.use('/api/stories', createStoriesRouter(db));
app.use('/api/ai', createAiRouter(db));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
