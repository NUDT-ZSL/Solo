import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import store from '../store.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(store.courses);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const course = store.courses.find(c => c.id === id);
  if (course) {
    res.json(course);
  } else {
    res.status(404).json({ error: 'Course not found' });
  }
});

router.post('/', (req, res) => {
  const { name, teacher } = req.body;
  const course = {
    id: uuidv4(),
    name,
    teacher,
    unreadComments: 0,
    createdAt: new Date().toISOString(),
  };
  store.courses.push(course);
  res.json(course);
});

router.get('/:courseId/chapters', (req, res) => {
  const { courseId } = req.params;
  const chapters = store.chapters
    .filter(c => c.courseId === courseId)
    .sort((a, b) => a.order - b.order);
  res.json(chapters);
});

export default router;
