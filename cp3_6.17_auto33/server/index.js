import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');

function readData(file) {
  const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
  return JSON.parse(raw);
}

function writeData(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
}

const app = express();
app.use(cors());
app.use(express.json());

function auth(req, res, next) {
  const userId = req.headers.authorization;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = userId;
  next();
}

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const users = readData('users.json');
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = { id: uuidv4(), username, password };
    users.push(user);
    writeData('users.json', users);

    res.json({ token: user.id, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const users = readData('users.json');
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    res.json({ token: user.id, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes', auth, (req, res) => {
  try {
    const recipes = readData('recipes.json');
    const filtered = req.query.userId
      ? recipes.filter(r => r.createdBy === req.query.userId)
      : recipes;
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recipes', auth, (req, res) => {
  try {
    const { name, ingredients, steps, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Recipe name required' });

    const recipes = readData('recipes.json');
    const versions = readData('versions.json');
    const users = readData('users.json');
    const user = users.find(u => u.id === req.userId);
    const authorName = user ? user.username : 'Unknown';

    const recipe = {
      id: uuidv4(),
      name,
      createdBy: req.userId,
      createdAt: dayjs().toISOString(),
    };

    const version = {
      id: uuidv4(),
      recipeId: recipe.id,
      versionLabel: 'v1',
      branchName: 'main',
      parentIds: [],
      ingredients: ingredients || [],
      steps: steps || [],
      notes: notes || '',
      authorId: req.userId,
      authorName,
      timestamp: dayjs().toISOString(),
      commitMessage: 'Initial version',
      isMerge: false,
    };

    recipes.push(recipe);
    versions.push(version);
    writeData('recipes.json', recipes);
    writeData('versions.json', versions);

    res.json({ recipe, version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/:id', auth, (req, res) => {
  try {
    const recipes = readData('recipes.json');
    const recipe = recipes.find(r => r.id === req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/:id/versions', auth, (req, res) => {
  try {
    const versions = readData('versions.json');
    const recipeVersions = versions
      .filter(v => v.recipeId === req.params.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    res.json(recipeVersions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recipes/:id/versions', auth, (req, res) => {
  try {
    const { ingredients, steps, notes, commitMessage, branchName } = req.body;
    if (!commitMessage) return res.status(400).json({ error: 'Commit message required' });

    const branch = branchName || 'main';
    const recipes = readData('recipes.json');
    const recipe = recipes.find(r => r.id === req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const versions = readData('versions.json');
    const recipeVersions = versions.filter(v => v.recipeId === req.params.id);

    const branchVersions = recipeVersions.filter(v => v.branchName === branch);
    if (branchVersions.length === 0 && branch !== 'main') {
      return res.status(400).json({ error: 'Branch not found' });
    }

    const users = readData('users.json');
    const user = users.find(u => u.id === req.userId);
    const authorName = user ? user.username : 'Unknown';

    let versionLabel;
    if (branch === 'main') {
      const mainVersions = recipeVersions.filter(v => v.branchName === 'main');
      const maxNum = mainVersions.reduce((max, v) => {
        const match = v.versionLabel.match(/^v(\d+)$/);
        if (match) return Math.max(max, parseInt(match[1]));
        return max;
      }, 0);
      versionLabel = `v${maxNum + 1}`;
    } else {
      const branchLabel = branchVersions[0].versionLabel.replace(/\.\d+$/, '');
      const existingSubVersions = branchVersions.filter(v =>
        v.versionLabel.startsWith(branchLabel + '.')
      );
      const maxSub = existingSubVersions.reduce((max, v) => {
        const match = v.versionLabel.match(/\.(\d+)$/);
        if (match) return Math.max(max, parseInt(match[1]));
        return max;
      }, 0);
      versionLabel = `${branchLabel}.${maxSub + 1}`;
    }

    const latestOnBranch = branchVersions.length > 0
      ? branchVersions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
      : null;

    const newVersion = {
      id: uuidv4(),
      recipeId: req.params.id,
      versionLabel,
      branchName: branch,
      parentIds: latestOnBranch ? [latestOnBranch.id] : [],
      ingredients: ingredients || [],
      steps: steps || [],
      notes: notes || '',
      authorId: req.userId,
      authorName,
      timestamp: dayjs().toISOString(),
      commitMessage,
      isMerge: false,
    };

    versions.push(newVersion);
    writeData('versions.json', versions);

    res.json(newVersion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recipes/:id/branch', auth, (req, res) => {
  try {
    const { fromVersionId, branchName } = req.body;
    if (!fromVersionId || !branchName) return res.status(400).json({ error: 'fromVersionId and branchName required' });

    const recipes = readData('recipes.json');
    const recipe = recipes.find(r => r.id === req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const versions = readData('versions.json');
    const source = versions.find(v => v.id === fromVersionId && v.recipeId === req.params.id);
    if (!source) return res.status(404).json({ error: 'Source version not found' });

    const recipeVersions = versions.filter(v => v.recipeId === req.params.id);
    const existingOnBranch = recipeVersions.filter(v => v.branchName === branchName);

    const baseLabel = source.versionLabel;
    let versionLabel;
    if (existingOnBranch.length === 0) {
      versionLabel = `${baseLabel}.1`;
    } else {
      const prefix = baseLabel;
      const siblingLabels = existingOnBranch.filter(v => v.versionLabel.startsWith(prefix + '.'));
      const maxSub = siblingLabels.reduce((max, v) => {
        const match = v.versionLabel.match(/\.(\d+)$/);
        if (match) return Math.max(max, parseInt(match[1]));
        return max;
      }, 0);
      versionLabel = `${prefix}.${maxSub + 1}`;
    }

    const users = readData('users.json');
    const user = users.find(u => u.id === req.userId);
    const authorName = user ? user.username : 'Unknown';

    const newVersion = {
      id: uuidv4(),
      recipeId: req.params.id,
      versionLabel,
      branchName,
      parentIds: [fromVersionId],
      ingredients: [...source.ingredients],
      steps: [...source.steps],
      notes: source.notes,
      authorId: req.userId,
      authorName,
      timestamp: dayjs().toISOString(),
      commitMessage: `Branch from ${source.versionLabel}`,
      isMerge: false,
    };

    versions.push(newVersion);
    writeData('versions.json', versions);

    res.json(newVersion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recipes/:id/merge', auth, (req, res) => {
  try {
    const { sourceBranchName, commitMessage } = req.body;
    if (!sourceBranchName || !commitMessage) return res.status(400).json({ error: 'sourceBranchName and commitMessage required' });

    const recipes = readData('recipes.json');
    const recipe = recipes.find(r => r.id === req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const versions = readData('versions.json');
    const recipeVersions = versions.filter(v => v.recipeId === req.params.id);

    const sourceBranchVersions = recipeVersions
      .filter(v => v.branchName === sourceBranchName)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (sourceBranchVersions.length === 0) return res.status(404).json({ error: 'Source branch not found' });

    const mainVersions = recipeVersions.filter(v => v.branchName === 'main');
    const maxMainNum = mainVersions.reduce((max, v) => {
      const match = v.versionLabel.match(/^v(\d+)$/);
      if (match) return Math.max(max, parseInt(match[1]));
      return max;
    }, 0);
    const newLabel = `v${maxMainNum + 1}`;

    const latestMain = mainVersions.length > 0
      ? mainVersions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
      : null;

    const source = sourceBranchVersions[0];

    const users = readData('users.json');
    const user = users.find(u => u.id === req.userId);
    const authorName = user ? user.username : 'Unknown';

    const mergeVersion = {
      id: uuidv4(),
      recipeId: req.params.id,
      versionLabel: newLabel,
      branchName: 'main',
      parentIds: [latestMain ? latestMain.id : source.id, source.id].filter(Boolean),
      ingredients: [...source.ingredients],
      steps: [...source.steps],
      notes: source.notes,
      authorId: req.userId,
      authorName,
      timestamp: dayjs().toISOString(),
      commitMessage,
      isMerge: true,
    };

    versions.push(mergeVersion);
    writeData('versions.json', versions);

    res.json(mergeVersion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/:id/diff', auth, (req, res) => {
  try {
    const v1Id = req.query.v1;
    const v2Id = req.query.v2;
    if (!v1Id || !v2Id) return res.status(400).json({ error: 'v1 and v2 query params required' });

    const versions = readData('versions.json');
    const ver1 = versions.find(v => v.id === v1Id && v.recipeId === req.params.id);
    const ver2 = versions.find(v => v.id === v2Id && v.recipeId === req.params.id);
    if (!ver1 || !ver2) return res.status(404).json({ error: 'Version not found' });

    function diffIngredients(oldList, newList) {
      const oldMap = new Map(oldList.map(i => [i.name, i]));
      const newMap = new Map(newList.map(i => [i.name, i]));

      const added = [];
      const removed = [];
      const modified = [];

      for (const [name, ing] of newMap) {
        if (!oldMap.has(name)) {
          added.push(ing);
        } else {
          const old = oldMap.get(name);
          if (old.amount !== ing.amount || old.unit !== ing.unit) {
            modified.push({ old, new: ing });
          }
        }
      }

      for (const [name, ing] of oldMap) {
        if (!newMap.has(name)) {
          removed.push(ing);
        }
      }

      return { added, removed, modified };
    }

    function diffSteps(oldList, newList) {
      const oldMap = new Map(oldList.map(s => [s.stepNumber, s]));
      const newMap = new Map(newList.map(s => [s.stepNumber, s]));

      const added = [];
      const removed = [];
      const modified = [];

      for (const [num, step] of newMap) {
        if (!oldMap.has(num)) {
          added.push(step);
        } else {
          const old = oldMap.get(num);
          if (old.description !== step.description) {
            modified.push({ old, new: step });
          }
        }
      }

      for (const [num, step] of oldMap) {
        if (!newMap.has(num)) {
          removed.push(step);
        }
      }

      return { added, removed, modified };
    }

    const result = {
      ingredients: diffIngredients(ver1.ingredients, ver2.ingredients),
      steps: diffSteps(ver1.steps, ver2.steps),
      notes: { old: ver1.notes, new: ver2.notes },
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
