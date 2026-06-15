import { v4 as uuidv4 } from 'uuid';
import * as db from './db.js';

export function setupNoteRoutes(app: any) {
  app.get('/api/notes', (req: any, res: any) => {
    try {
      const notes = db.all<any>('SELECT * FROM notes ORDER BY updatedAt DESC');
      res.json(notes);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  });

  app.get('/api/notes/:nodeId', (req: any, res: any) => {
    try {
      const note = db.get<any>('SELECT * FROM notes WHERE nodeId=?', [req.params.nodeId]);
      if (!note) {
        return res.json(null);
      }
      const versions = db.all<any>('SELECT * FROM note_versions WHERE noteId=? ORDER BY createdAt DESC LIMIT 5', [note.id]);
      res.json({ ...note, versions });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch note' });
    }
  });

  app.post('/api/notes', (req: any, res: any) => {
    try {
      const { nodeId, title, content } = req.body;
      const now = Date.now();
      const existing = db.get<any>('SELECT * FROM notes WHERE nodeId=?', [nodeId]);

      if (existing) {
        const versionId = uuidv4();
        db.run('INSERT INTO note_versions (id, noteId, content, createdAt) VALUES (?, ?, ?, ?)',
          [versionId, existing.id, existing.content, now]);

        const allVersions = db.all<any>('SELECT id FROM note_versions WHERE noteId=? ORDER BY createdAt DESC', [existing.id]);
        if (allVersions.length > 5) {
          const keepIds = allVersions.slice(0, 5).map((v: any) => v.id);
          const deleteIds = allVersions.slice(5).map((v: any) => v.id);
          deleteIds.forEach((did: string) => {
            db.run('DELETE FROM note_versions WHERE id=?', [did]);
          });
        }

        db.run('UPDATE notes SET title=?, content=?, updatedAt=? WHERE nodeId=?',
          [title || existing.title, content ?? existing.content, now, nodeId]);

        const updated = db.get<any>('SELECT * FROM notes WHERE nodeId=?', [nodeId]);
        const versions = db.all<any>('SELECT * FROM note_versions WHERE noteId=? ORDER BY createdAt DESC LIMIT 5', [updated.id]);
        res.json({ ...updated, versions });
      } else {
        const noteId = uuidv4();
        db.run('INSERT INTO notes (id, nodeId, title, content, updatedAt) VALUES (?, ?, ?, ?, ?)',
          [noteId, nodeId, title || '', content || '', now]);

        const versionId = uuidv4();
        db.run('INSERT INTO note_versions (id, noteId, content, createdAt) VALUES (?, ?, ?, ?)',
          [versionId, noteId, content || '', now]);

        const note = db.get<any>('SELECT * FROM notes WHERE nodeId=?', [nodeId]);
        const versions = db.all<any>('SELECT * FROM note_versions WHERE noteId=? ORDER BY createdAt DESC LIMIT 5', [noteId]);
        res.json({ ...note, versions });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to save note' });
    }
  });

  app.get('/api/notes/:nodeId/versions', (req: any, res: any) => {
    try {
      const note = db.get<any>('SELECT * FROM notes WHERE nodeId=?', [req.params.nodeId]);
      if (!note) return res.json([]);
      const versions = db.all<any>('SELECT * FROM note_versions WHERE noteId=? ORDER BY createdAt DESC LIMIT 5', [note.id]);
      res.json(versions);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch versions' });
    }
  });

  app.post('/api/notes/:nodeId/restore/:versionId', (req: any, res: any) => {
    try {
      const note = db.get<any>('SELECT * FROM notes WHERE nodeId=?', [req.params.nodeId]);
      if (!note) return res.status(404).json({ error: 'Note not found' });

      const version = db.get<any>('SELECT * FROM note_versions WHERE id=? AND noteId=?', [req.params.versionId, note.id]);
      if (!version) return res.status(404).json({ error: 'Version not found' });

      const now = Date.now();
      const versionId = uuidv4();
      db.run('INSERT INTO note_versions (id, noteId, content, createdAt) VALUES (?, ?, ?, ?)',
        [versionId, note.id, note.content, now]);

      const allVersions = db.all<any>('SELECT id FROM note_versions WHERE noteId=? ORDER BY createdAt DESC', [note.id]);
      if (allVersions.length > 5) {
        const keepIds = allVersions.slice(0, 5).map((v: any) => v.id);
        const deleteIds = allVersions.slice(5).map((v: any) => v.id);
        deleteIds.forEach((did: string) => {
          db.run('DELETE FROM note_versions WHERE id=?', [did]);
        });
      }

      db.run('UPDATE notes SET content=?, updatedAt=? WHERE id=?', [version.content, now, note.id]);

      const updated = db.get<any>('SELECT * FROM notes WHERE nodeId=?', [req.params.nodeId]);
      const versions = db.all<any>('SELECT * FROM note_versions WHERE noteId=? ORDER BY createdAt DESC LIMIT 5', [note.id]);
      res.json({ ...updated, versions });
    } catch (err) {
      res.status(500).json({ error: 'Failed to restore version' });
    }
  });

  app.get('/api/search', (req: any, res: any) => {
    try {
      const q = (req.query.q as string) || '';
      if (!q.trim()) return res.json({ nodes: [], notes: [] });

      const nodeResults = db.all<any>(
        'SELECT * FROM nodes WHERE text LIKE ?',
        [`%${q}%`]
      );
      const noteResults = db.all<any>(
        'SELECT * FROM notes WHERE title LIKE ? OR content LIKE ?',
        [`%${q}%`, `%${q}%`]
      );
      res.json({ nodes: nodeResults, notes: noteResults });
    } catch (err) {
      res.status(500).json({ error: 'Search failed' });
    }
  });
}
