import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import notesRouter from './routes/notes.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/notes', notesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NoteNest API is running' });
});

app.listen(PORT, () => {
  console.log(`NoteNest server is running on http://localhost:${PORT}`);
});
