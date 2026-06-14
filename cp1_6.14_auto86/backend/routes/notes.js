import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import store from '../store.js';

const router = express.Router();

router.get('/:chapterId', (req, res) => {
  const { chapterId } = req.params;
  const note = store.notes.find(n => n.chapterId === chapterId);
  
  if (note) {
    res.json(note);
  } else {
    res.json({
      id: uuidv4(),
      chapterId,
      content: '',
      currentVersionId: null,
    });
  }
});

router.post('/', (req, res) => {
  const { chapterId, content } = req.body;

  let note = store.notes.find(n => n.chapterId === chapterId);
  const versionNumber = note
    ? store.noteVersions.filter(v => v.noteId === note.id).length + 1
    : 1;

  if (!note) {
    const noteId = uuidv4();
    note = {
      id: noteId,
      chapterId,
      content,
      currentVersionId: null,
    };
    store.notes.push(note);
  }

  const versionId = uuidv4();
  const version = {
    id: versionId,
    noteId: note.id,
    content,
    createdAt: new Date().toISOString(),
    versionNumber,
  };
  store.noteVersions.push(version);

  note.content = content;
  note.currentVersionId = versionId;

  res.json({ note, version });
});

router.get('/:noteId/versions', (req, res) => {
  const { noteId } = req.params;
  const versions = store.noteVersions
    .filter(v => v.noteId === noteId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(versions);
});

router.get('/versions/:versionId', (req, res) => {
  const { versionId } = req.params;
  const version = store.noteVersions.find(v => v.id === versionId);
  if (version) {
    res.json(version);
  } else {
    res.status(404).json({ error: 'Version not found' });
  }
});

export default router;
