import express, { Request, Response } from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = Datastore.create({
  filename: path.join(dataDir, 'snippets.db'),
  autoload: true,
});

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Snippet {
  _id?: string;
  id: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

interface SnippetQuery {
  language?: string;
  tags?: { $in: string[] };
  $or?: Array<{ title: RegExp } | { code: RegExp }>;
}

app.get('/api/snippets', async (req: Request, res: Response) => {
  try {
    const { lang, tags, keyword, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query: SnippetQuery = {};

    if (lang) {
      query.language = lang as string;
    }

    if (tags && typeof tags === 'string' && tags.trim()) {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        query.tags = { $in: tagList };
      }
    }

    if (keyword && typeof keyword === 'string' && keyword.trim()) {
      const regex = new RegExp(keyword, 'i');
      query.$or = [{ title: regex }, { code: regex }];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortQuery: Record<string, number> = {};
    sortQuery[sortBy as string] = sortOrder;

    const snippets = await db.find(query).sort(sortQuery);
    const cleanSnippets = snippets.map(({ _id, ...rest }) => rest);

    res.json(cleanSnippets);
  } catch (error) {
    console.error('Error fetching snippets:', error);
    res.status(500).json({ error: 'Failed to fetch snippets' });
  }
});

app.get('/api/snippets/:id', async (req: Request, res: Response) => {
  try {
    const snippet = await db.findOne({ id: req.params.id });
    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }
    const { _id, ...cleanSnippet } = snippet;
    res.json(cleanSnippet);
  } catch (error) {
    console.error('Error fetching snippet:', error);
    res.status(500).json({ error: 'Failed to fetch snippet' });
  }
});

app.post('/api/snippets', async (req: Request, res: Response) => {
  try {
    const { title, code, language, tags } = req.body;

    if (!title || !code || !language) {
      return res.status(400).json({ error: 'Title, code, and language are required' });
    }

    const now = new Date().toISOString();
    const newSnippet: Snippet = {
      id: uuidv4(),
      title,
      code,
      language,
      tags: tags || [],
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
    };

    const inserted = await db.insert(newSnippet);
    const { _id, ...cleanSnippet } = inserted;
    res.status(201).json(cleanSnippet);
  } catch (error) {
    console.error('Error creating snippet:', error);
    res.status(500).json({ error: 'Failed to create snippet' });
  }
});

app.put('/api/snippets/:id', async (req: Request, res: Response) => {
  try {
    const { title, code, language, tags } = req.body;

    const existing = await db.findOne({ id: req.params.id });
    if (!existing) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    const updatedData = {
      title: title ?? existing.title,
      code: code ?? existing.code,
      language: language ?? existing.language,
      tags: tags ?? existing.tags,
      updatedAt: new Date().toISOString(),
    };

    const updated = await db.update({ id: req.params.id }, { $set: updatedData }, { returnUpdatedDocs: true });
    if (!updated || !updated.affectedDocuments) {
      return res.status(500).json({ error: 'Failed to update snippet' });
    }

    const result = Array.isArray(updated.affectedDocuments) ? updated.affectedDocuments[0] : updated.affectedDocuments;
    const { _id, ...cleanSnippet } = result as Snippet;
    res.json(cleanSnippet);
  } catch (error) {
    console.error('Error updating snippet:', error);
    res.status(500).json({ error: 'Failed to update snippet' });
  }
});

app.delete('/api/snippets/:id', async (req: Request, res: Response) => {
  try {
    const numRemoved = await db.remove({ id: req.params.id }, {});
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Snippet not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting snippet:', error);
    res.status(500).json({ error: 'Failed to delete snippet' });
  }
});

app.post('/api/snippets/:id/favorite', async (req: Request, res: Response) => {
  try {
    const existing = await db.findOne({ id: req.params.id });
    if (!existing) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    const updated = await db.update(
      { id: req.params.id },
      { $set: { isFavorite: !existing.isFavorite, updatedAt: new Date().toISOString() } },
      { returnUpdatedDocs: true }
    );

    if (!updated || !updated.affectedDocuments) {
      return res.status(500).json({ error: 'Failed to toggle favorite' });
    }

    const result = Array.isArray(updated.affectedDocuments) ? updated.affectedDocuments[0] : updated.affectedDocuments;
    const { _id, ...cleanSnippet } = result as Snippet;
    res.json(cleanSnippet);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

app.listen(PORT, () => {
  console.log(`CodeSnippetVault backend server running on http://localhost:${PORT}`);
});
