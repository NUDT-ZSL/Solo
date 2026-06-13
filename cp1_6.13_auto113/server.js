import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const db = Datastore.create(join(__dirname, 'data', 'bookmarks.db'));

async function initDefaultData() {
  const count = await db.count({});
  if (count === 0) {
    const rootId = uuidv4();
    await db.insert({
      _id: rootId,
      title: '我的书签',
      url: '',
      parentId: null,
      x: 500,
      y: 300,
      isRoot: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('Initialized default root bookmark');
  }
}

function buildTree(nodes) {
  const nodeMap = new Map();
  const roots = [];

  nodes.forEach(node => {
    nodeMap.set(node._id, { ...node, children: [] });
  });

  nodes.forEach(node => {
    const treeNode = nodeMap.get(node._id);
    if (node.parentId === null || node.parentId === undefined) {
      roots.push(treeNode);
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    }
  });

  return roots;
}

function getAllDescendants(nodeId, allNodes) {
  const descendants = [];
  const children = allNodes.filter(n => n.parentId === nodeId);
  children.forEach(child => {
    descendants.push(child._id);
    descendants.push(...getAllDescendants(child._id, allNodes));
  });
  return descendants;
}

function generateMarkdown(nodes, depth = 2) {
  let md = '';
  const prefix = '#'.repeat(Math.min(depth, 6));

  nodes.forEach(node => {
    if (node.url && node.url.trim()) {
      md += `${prefix} [${node.title}](${node.url})\n\n`;
    } else {
      md += `${prefix} ${node.title}\n\n`;
    }
    if (node.children && node.children.length > 0) {
      md += generateMarkdown(node.children, depth + 1);
    }
  });

  return md;
}

app.get('/api/bookmarks', async (req, res) => {
  try {
    const bookmarks = await db.find({});
    const tree = buildTree(bookmarks);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookmarks/flat', async (req, res) => {
  try {
    const bookmarks = await db.find({});
    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookmarks', async (req, res) => {
  try {
    const { title, url, parentId, x, y } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newBookmark = {
      _id: uuidv4(),
      title,
      url: url || '',
      parentId: parentId || null,
      x: x || 0,
      y: y || 0,
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.insert(newBookmark);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bookmarks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url, parentId, x, y } = req.body;

    const existing = await db.findOne({ _id: id });
    if (!existing) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    const updates = {
      updatedAt: new Date().toISOString(),
    };
    if (title !== undefined) updates.title = title;
    if (url !== undefined) updates.url = url;
    if (parentId !== undefined) updates.parentId = parentId;
    if (x !== undefined) updates.x = x;
    if (y !== undefined) updates.y = y;

    const result = await db.update({ _id: id }, { $set: updates }, { returnUpdatedDocs: true });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bookmarks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const node = await db.findOne({ _id: id });
    if (!node) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    if (node.isRoot) {
      return res.status(400).json({ error: 'Cannot delete root node' });
    }

    const allNodes = await db.find({});
    const descendantIds = getAllDescendants(id, allNodes);

    await db.update(
      { parentId: id },
      { $set: { parentId: node.parentId, updatedAt: new Date().toISOString() } },
      { multi: true }
    );

    await db.remove({ _id: id }, {});

    res.json({ message: 'Bookmark deleted successfully', deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export', async (req, res) => {
  try {
    const bookmarks = await db.find({});
    const tree = buildTree(bookmarks);
    const markdown = generateMarkdown(tree);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(markdown);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

initDefaultData().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
