import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import store from '../store.js';

const router = express.Router();

router.get('/:noteId/comments', (req, res) => {
  const { noteId } = req.params;
  const comments = store.comments
    .filter(c => c.noteId === noteId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(comments);
});

router.post('/', (req, res) => {
  const { noteId, userId, userName, content } = req.body;
  const comment = {
    id: uuidv4(),
    noteId,
    userId,
    userName,
    content,
    createdAt: new Date().toISOString(),
  };
  store.comments.push(comment);
  res.json(comment);
});

export default router;
