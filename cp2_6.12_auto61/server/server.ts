import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import snippetsRouter from './routes/snippets.js';
import commentsRouter from './routes/comments.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

app.use('/api/snippets', snippetsRouter);
app.use('/api/snippets/:snippetId/comments', commentsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
