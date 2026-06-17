import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { diffChars } from 'diff';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'versions.json');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(RECIPES_FILE)) {
    fs.writeFileSync(RECIPES_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(VERSIONS_FILE)) {
    fs.writeFileSync(VERSIONS_FILE, JSON.stringify([], null, 2));
  }
}

function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function success(data) {
  return { success: true, data };
}

function error(message) {
  return { success: false, error: message };
}

ensureDataDir();

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);

  if (users.find((u) => u.username === username)) {
    return res.json(error('用户名已存在'));
  }

  const newUser = {
    id: uuidv4(),
    username,
    password,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeJSON(USERS_FILE, users);

  const { password: _, ...userWithoutPassword } = newUser;
  res.json(success(userWithoutPassword));
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.json(error('用户名或密码错误'));
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(success(userWithoutPassword));
});

// Recipe routes
app.get('/api/recipes', (req, res) => {
  const { userId } = req.query;
  const recipes = readJSON(RECIPES_FILE);
  const versions = readJSON(VERSIONS_FILE);

  let filtered = recipes;
  if (userId) {
    filtered = recipes.filter((r) => r.ownerId === userId);
  }

  const result = filtered.map((recipe) => {
    const recipeVersions = versions.filter((v) => v.recipeId === recipe.id);
    return { ...recipe, versions: recipeVersions };
  });

  res.json(success(result));
});

app.get('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const recipes = readJSON(RECIPES_FILE);
  const versions = readJSON(VERSIONS_FILE);

  const recipe = recipes.find((r) => r.id === id);
  if (!recipe) {
    return res.json(error('食谱不存在'));
  }

  const recipeVersions = versions.filter((v) => v.recipeId === id);
  res.json(success({ ...recipe, versions: recipeVersions }));
});

app.post('/api/recipes', (req, res) => {
  const { userId, name, content } = req.body;
  const recipes = readJSON(RECIPES_FILE);
  const versions = readJSON(VERSIONS_FILE);
  const users = readJSON(USERS_FILE);

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.json(error('用户不存在'));
  }

  const recipeId = uuidv4();
  const versionId = uuidv4();
  const now = new Date().toISOString();

  const newVersion = {
    id: versionId,
    recipeId,
    versionNumber: 'v1',
    branch: 'main',
    content,
    authorId: userId,
    authorName: user.username,
    message: '初始版本',
    timestamp: now,
    parentIds: [],
  };

  const newRecipe = {
    id: recipeId,
    name: content.name || name,
    ownerId: userId,
    createdAt: now,
    updatedAt: now,
    currentVersionId: versionId,
    currentBranch: 'main',
  };

  versions.push(newVersion);
  recipes.push(newRecipe);
  writeJSON(VERSIONS_FILE, versions);
  writeJSON(RECIPES_FILE, recipes);

  res.json(success({ ...newRecipe, versions: [newVersion] }));
});

// Version routes
app.get('/api/versions', (req, res) => {
  const { recipeId } = req.query;
  const versions = readJSON(VERSIONS_FILE);

  let filtered = versions;
  if (recipeId) {
    filtered = versions.filter((v) => v.recipeId === recipeId);
  }

  filtered.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  res.json(success(filtered));
});

app.get('/api/versions/:id', (req, res) => {
  const { id } = req.params;
  const versions = readJSON(VERSIONS_FILE);

  const version = versions.find((v) => v.id === id);
  if (!version) {
    return res.json(error('版本不存在'));
  }

  res.json(success(version));
});

function getNextVersionNumber(versions, branch) {
  const branchVersions = versions.filter((v) => v.branch === branch);
  
  if (branch === 'main') {
    const maxNum = branchVersions.reduce((max, v) => {
      const num = parseInt(v.versionNumber.slice(1), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    return `v${maxNum + 1}`;
  } else {
    const maxNum = branchVersions.reduce((max, v) => {
      const parts = v.versionNumber.split('.');
      if (parts.length >= 2) {
        const num = parseInt(parts[1], 10);
        return isNaN(num) ? max : Math.max(max, num);
      }
      return max;
    }, 0);
    const baseParts = branch.split('.');
    const base = baseParts[baseParts.length - 1] || '0';
    return `v${base}.${maxNum + 1}`;
  }
}

app.post('/api/versions', (req, res) => {
  const { recipeId, content, message, branch, parentIds } = req.body;
  const recipes = readJSON(RECIPES_FILE);
  const versions = readJSON(VERSIONS_FILE);
  const users = readJSON(USERS_FILE);

  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    return res.json(error('食谱不存在'));
  }

  const parentVersion = versions.find((v) => v.id === parentIds[0]);
  if (!parentVersion) {
    return res.json(error('父版本不存在'));
  }

  const user = users.find((u) => u.id === parentVersion.authorId);

  const versionId = uuidv4();
  const now = new Date().toISOString();
  
  const recipeVersions = versions.filter((v) => v.recipeId === recipeId);
  const versionNumber = getNextVersionNumber(recipeVersions, branch || 'main');

  const newVersion = {
    id: versionId,
    recipeId,
    versionNumber,
    branch: branch || 'main',
    content,
    authorId: parentVersion.authorId,
    authorName: user?.username || parentVersion.authorName,
    message: message || '更新版本',
    timestamp: now,
    parentIds: parentIds || [],
  };

  versions.push(newVersion);

  if (branch === 'main' || !branch) {
    recipe.currentVersionId = versionId;
    recipe.updatedAt = now;
  }
  recipe.name = content.name || recipe.name;

  writeJSON(VERSIONS_FILE, versions);
  writeJSON(RECIPES_FILE, recipes);

  res.json(success(newVersion));
});

app.post('/api/versions/:id/branch', (req, res) => {
  const { id } = req.params;
  const { recipeId, branchName } = req.body;
  const versions = readJSON(VERSIONS_FILE);
  const recipes = readJSON(RECIPES_FILE);

  const parentVersion = versions.find((v) => v.id === id);
  if (!parentVersion) {
    return res.json(error('父版本不存在'));
  }

  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    return res.json(error('食谱不存在'));
  }

  const branchId = uuidv4();
  const now = new Date().toISOString();
  const versionNumber = `v${parentVersion.versionNumber.slice(1)}.1`;

  const newBranchVersion = {
    id: branchId,
    recipeId,
    versionNumber,
    branch: branchName || `branch-${uuidv4().slice(0, 6)}`,
    content: { ...parentVersion.content },
    authorId: parentVersion.authorId,
    authorName: parentVersion.authorName,
    message: `从 ${parentVersion.versionNumber} 创建分支`,
    timestamp: now,
    parentIds: [id],
  };

  versions.push(newBranchVersion);
  writeJSON(VERSIONS_FILE, versions);

  res.json(success(newBranchVersion));
});

app.post('/api/versions/:id/merge', (req, res) => {
  const { id } = req.params;
  const { recipeId, targetBranch, message } = req.body;
  const versions = readJSON(VERSIONS_FILE);
  const recipes = readJSON(RECIPES_FILE);

  const sourceVersion = versions.find((v) => v.id === id);
  if (!sourceVersion) {
    return res.json(error('源版本不存在'));
  }

  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    return res.json(error('食谱不存在'));
  }

  const targetVersions = versions
    .filter((v) => v.recipeId === recipeId && v.branch === (targetBranch || 'main'))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const targetVersion = targetVersions[0];
  if (!targetVersion) {
    return res.json(error('目标分支不存在'));
  }

  const recipeVersions = versions.filter((v) => v.recipeId === recipeId);
  const mainVersions = recipeVersions.filter((v) => v.branch === (targetBranch || 'main'));
  const maxMainNum = mainVersions.reduce((max, v) => {
    const num = parseInt(v.versionNumber.slice(1), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  const versionNumber = `v${maxMainNum + 1}`;

  const mergeId = uuidv4();
  const now = new Date().toISOString();

  const mergedContent = {
    ...targetVersion.content,
    ...sourceVersion.content,
    ingredients: sourceVersion.content.ingredients,
    steps: sourceVersion.content.steps,
  };

  const mergeVersion = {
    id: mergeId,
    recipeId,
    versionNumber,
    branch: targetBranch || 'main',
    content: mergedContent,
    authorId: sourceVersion.authorId,
    authorName: sourceVersion.authorName,
    message: message || `合并分支 ${sourceVersion.branch}`,
    timestamp: now,
    parentIds: [targetVersion.id, sourceVersion.id],
    isMerge: true,
  };

  versions.push(mergeVersion);

  if (targetBranch === 'main' || !targetBranch) {
    recipe.currentVersionId = mergeId;
    recipe.updatedAt = now;
  }

  writeJSON(VERSIONS_FILE, versions);
  writeJSON(RECIPES_FILE, recipes);

  res.json(success(mergeVersion));
});

app.get('/api/versions/diff', (req, res) => {
  const { version1Id, version2Id } = req.query;
  const versions = readJSON(VERSIONS_FILE);

  const v1 = versions.find((v) => v.id === version1Id);
  const v2 = versions.find((v) => v.id === version2Id);

  if (!v1 || !v2) {
    return res.json(error('版本不存在'));
  }

  const nameDiff = diffChars(v1.content.name || '', v2.content.name || '').map((part) => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
    value: part.value,
  }));

  const notesDiff = diffChars(v1.content.notes || '', v2.content.notes || '').map((part) => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
    value: part.value,
  }));

  const ingredients1 = v1.content.ingredients || [];
  const ingredients2 = v2.content.ingredients || [];

  const ing1Names = new Set(ingredients1.map((i) => i.name));
  const ing2Names = new Set(ingredients2.map((i) => i.name));

  const addedIngredients = ingredients2.filter((i) => !ing1Names.has(i.name));
  const removedIngredients = ingredients1.filter((i) => !ing2Names.has(i.name));
  const modifiedIngredients = [];
  
  ingredients1.forEach((ing1) => {
    const ing2 = ingredients2.find((i) => i.name === ing1.name);
    if (ing2 && (ing1.amount !== ing2.amount || ing1.unit !== ing2.unit)) {
      modifiedIngredients.push({ old: ing1, new: ing2 });
    }
  });

  const steps1 = v1.content.steps || [];
  const steps2 = v2.content.steps || [];

  const stepChanges = {
    added: steps2.filter(
      (s, i) => !steps1[i] || steps1[i].description !== s.description
    ),
    removed: steps1.filter(
      (s, i) => !steps2[i] || steps2[i].description !== s.description
    ),
    modified: [],
  };

  res.json(
    success({
      name: nameDiff,
      ingredients: {
        added: addedIngredients,
        removed: removedIngredients,
        modified: modifiedIngredients,
      },
      steps: stepChanges,
      notes: notesDiff,
    })
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
