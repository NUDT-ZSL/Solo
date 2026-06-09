import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Inspiration, ShapeData, Comment, VoteRequest, CommentRequest } from '../types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

let inspirations: Inspiration[] = [];

const getClientIp = (req: express.Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

app.get('/api/inspirations', (req, res) => {
  res.json(inspirations);
});

app.post('/api/inspirations', (req, res) => {
  const shape = req.body as ShapeData;

  if (!shape || !shape.type) {
    return res.status(400).json({ error: 'Invalid shape data' });
  }

  const inspiration: Inspiration = {
    id: uuidv4(),
    shape: {
      ...shape,
      id: uuidv4()
    },
    upVotes: 0,
    downVotes: 0,
    votedIps: {},
    comments: [],
    timestamp: Date.now()
  };

  inspirations.unshift(inspiration);
  res.json(inspiration);
});

app.post('/api/vote', (req, res) => {
  const { id, type } = req.body as VoteRequest;
  const ip = getClientIp(req);

  const inspiration = inspirations.find((i) => i.id === id);
  if (!inspiration) {
    return res.status(404).json({ error: 'Inspiration not found' });
  }

  if (inspiration.votedIps[ip]) {
    return res.json(inspirations);
  }

  inspiration.votedIps[ip] = type;
  if (type === 'up') {
    inspiration.upVotes += 1;
  } else if (type === 'down') {
    inspiration.downVotes += 1;
  }

  res.json(inspirations);
});

app.post('/api/comment', (req, res) => {
  const { id, content } = req.body as CommentRequest;

  const inspiration = inspirations.find((i) => i.id === id);
  if (!inspiration) {
    return res.status(404).json({ error: 'Inspiration not found' });
  }

  if (!content || content.trim().length === 0 || content.length > 200) {
    return res.status(400).json({ error: 'Invalid comment content' });
  }

  const comment: Comment = {
    id: uuidv4(),
    content: content.trim(),
    timestamp: Date.now()
  };

  inspiration.comments.push(comment);
  res.json(inspirations);
});

app.listen(PORT, () => {
  console.log(`[server]: Server is running at http://localhost:${PORT}`);
});
