import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { diffArrays, diffChars } from 'diff';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'versions.json');

function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function generateVersionNumber(versions, recipeId, branch, parentVersionNumber = null) {
  const recipeVersions = versions.filter(v => v.recipeId === recipeId);
  
  if (branch === 'main') {
    const mainVersions = recipeVersions.filter(v => v.branch === 'main');
    return `v${mainVersions.length + 1}`;
  } else {
    const branchVersions = recipeVersions.filter(v => v.branch === branch);
    if (branchVersions.length === 0 && parentVersionNumber) {
      return `${parentVersionNumber}.1`;
    }
    const baseVersion = parentVersionNumber || 'v1';
    const count = branchVersions.length + 1;
    return `${baseVersion}.${count}`;
  }
}

function getLatestMainVersion(versions, recipeId) {
  const mainVersions = versions
    .filter(v => v.recipeId === recipeId && v.branch === 'main')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return mainVersions[0] || null;
}

function computeDiff(v1, v2) {
  const ingredientsDiff = diffArrays(v1.ingredients, v2.ingredients, {
    comparator: (a, b) => a.name === b.name && a.quantity === b.quantity && a.unit === b.unit
  }).map((change, idx) => ({
    type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
    oldValue: change.value,
    newValue: change.value,
    index: idx
  }));

  const stepsDiff = diffArrays(v1.steps, v2.steps, {
    comparator: (a, b) => a.order === b.order && a.description === b.description
  }).map((change, idx) => ({
    type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
    oldValue: change.value,
    newValue: change.value,
    index: idx
  }));

  const nameDiff = diffChars(v1.name, v2.name);
  const nameChange = nameDiff.some(d => d.added || d.removed)
    ? { type: 'modified', oldValue: v1.name, newValue: v2.name }
    : { type: 'unchanged', oldValue: v1.name, newValue: v2.name };

  const notesDiff = diffChars(v1.notes, v2.notes);
  const notesChange = notesDiff.some(d => d.added || d.removed)
    ? { type: 'modified', oldValue: v1.notes, newValue: v2.notes }
    : { type: 'unchanged', oldValue: v1.notes, newValue: v2.notes };

  return {
    ingredients: ingredientsDiff,
    steps: stepsDiff,
    name: nameChange,
    notes: notesChange
  };
}

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ success: false, message: '用户名已存在' });
  }

  const newUser = {
    id: uuidv4(),
    username,
    password,
    createdAt: dayjs().toISOString()
  };

  users.push(newUser);
  writeJSON(USERS_FILE, users);

  res.json({ success: true, user: { id: newUser.id, username: newUser.username, createdAt: newUser.createdAt } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }

  res.json({
    success: true,
    user: { id: user.id, username: user.username, createdAt: user.createdAt },
    token: uuidv4()
  });
});

app.get('/api/recipes', (req, res) => {
  const { authorId } = req.query;
  const recipes = readJSON(RECIPES_FILE);
  const users = readJSON(USERS_FILE);
  
  let filteredRecipes = recipes;
  if (authorId) {
    filteredRecipes = recipes.filter(r => r.authorId === authorId);
  }

  const recipesWithAuthor = filteredRecipes.map(r => ({
    ...r,
    authorName: users.find(u => u.id === r.authorId)?.username || '未知'
  }));

  res.json({ recipes: recipesWithAuthor });
});

app.post('/api/recipes', (req, res) => {
  const { name, ingredients, steps, notes, authorId } = req.body;
  const recipes = readJSON(RECIPES_FILE);
  const versions = readJSON(VERSIONS_FILE);
  const users = readJSON(USERS_FILE);

  const recipeId = uuidv4();
  const now = dayjs().toISOString();

  const newRecipe = {
    id: recipeId,
    name,
    authorId,
    createdAt: now,
    updatedAt: now,
    currentBranch: 'main'
  };

  const newVersion = {
    id: uuidv4(),
    recipeId,
    versionNumber: 'v1',
    branch: 'main',
    name,
    ingredients,
    steps,
    notes,
    authorId,
    commitMessage: '初始版本',
    createdAt: now,
    parentIds: []
  };

  recipes.push(newRecipe);
  versions.push(newVersion);

  writeJSON(RECIPES_FILE, recipes);
  writeJSON(VERSIONS_FILE, versions);

  const authorName = users.find(u => u.id === authorId)?.username || '未知';

  res.json({
    success: true,
    recipe: { ...newRecipe, authorName },
    version: { ...newVersion, authorName }
  });
});

app.get('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const recipes = readJSON(RECIPES_FILE);
  const versions = readJSON(VERSIONS_FILE);
  const users = readJSON(USERS_FILE);

  const recipe = recipes.find(r => r.id === id);
  if (!recipe) {
    return res.status(404).json({ success: false, message: '食谱不存在' });
  }

  const recipeVersions = versions.filter(v => v.recipeId === id);
  const currentVersion = recipeVersions
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const authorName = users.find(u => u.id === recipe.authorId)?.username || '未知';

  res.json({
    recipe: { ...recipe, authorName },
    currentVersion: { ...currentVersion, authorName }
  });
});

app.put('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const { name, ingredients, steps, notes, commitMessage, branch, authorId } = req.body;
  const recipes = readJSON(RECIPES_FILE);
  const versions = readJSON(VERSIONS_FILE);
  const users = readJSON(USERS_FILE);

  const recipeIndex = recipes.findIndex(r => r.id === id);
  if (recipeIndex === -1) {
    return res.status(404).json({ success: false, message: '食谱不存在' });
  }

  const now = dayjs().toISOString();
  const branchVersions = versions.filter(v => v.recipeId === id && v.branch === branch);
  const parentVersion = branchVersions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  
  const versionNumber = generateVersionNumber(versions, id, branch, parentVersion?.versionNumber);

  const newVersion = {
    id: uuidv4(),
    recipeId: id,
    versionNumber,
    branch: branch || 'main',
    name,
    ingredients,
    steps,
    notes,
    authorId,
    commitMessage: commitMessage || '更新食谱',
    createdAt: now,
    parentIds: parentVersion ? [parentVersion.id] : []
  };

  recipes[recipeIndex] = {
    ...recipes[recipeIndex],
    name,
    updatedAt: now,
    currentBranch: branch || 'main'
  };

  versions.push(newVersion);
  writeJSON(RECIPES_FILE, recipes);
  writeJSON(VERSIONS_FILE, versions);

  const authorName = users.find(u => u.id === authorId)?.username || '未知';

  res.json({
    success: true,
    recipe: { ...recipes[recipeIndex], authorName },
    newVersion: { ...newVersion, authorName }
  });
});

app.get('/api/recipes/:id/versions', (req, res) => {
  const { id } = req.params;
  const versions = readJSON(VERSIONS_FILE);
  const users = readJSON(USERS_FILE);

  const recipeVersions = versions
    .filter(v => v.recipeId === id)
    .map(v => ({
      ...v,
      authorName: users.find(u => u.id === v.authorId)?.username || '未知'
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  res.json({ versions: recipeVersions });
});

app.get('/api/recipes/:id/versions/:versionId', (req, res) => {
  const { versionId } = req.params;
  const versions = readJSON(VERSIONS_FILE);
  const users = readJSON(USERS_FILE);

  const version = versions.find(v => v.id === versionId);
  if (!version) {
    return res.status(404).json({ success: false, message: '版本不存在' });
  }

  const authorName = users.find(u => u.id === version.authorId)?.username || '未知';
  res.json({ version: { ...version, authorName } });
});

app.post('/api/recipes/:id/versions/:versionId/branch', (req, res) => {
  const { id, versionId } = req.params;
  const { branchName, commitMessage, authorId } = req.body;
  const versions = readJSON(VERSIONS_FILE);
  const users = readJSON(USERS_FILE);

  const parentVersion = versions.find(v => v.id === versionId);
  if (!parentVersion) {
    return res.status(404).json({ success: false, message: '父版本不存在' });
  }

  const now = dayjs().toISOString();
  const baseVersionNum = parentVersion.versionNumber;
  const branchVersions = versions.filter(v => v.recipeId === id && v.branch === branchName);
  const versionNumber = `${baseVersionNum}.${branchVersions.length + 1}`;

  const newVersion = {
    id: uuidv4(),
    recipeId: id,
    versionNumber,
    branch: branchName,
    name: parentVersion.name,
    ingredients: [...parentVersion.ingredients],
    steps: [...parentVersion.steps],
    notes: parentVersion.notes,
    authorId,
    commitMessage: commitMessage || `从 ${baseVersionNum} 创建分支 ${branchName}`,
    createdAt: now,
    parentIds: [versionId]
  };

  versions.push(newVersion);
  writeJSON(VERSIONS_FILE, versions);

  const authorName = users.find(u => u.id === authorId)?.username || '未知';
  res.json({
    success: true,
    newVersion: { ...newVersion, authorName }
  });
});

app.post('/api/recipes/:id/versions/merge', (req, res) => {
  const { id } = req.params;
  const { sourceVersionId, targetBranch, commitMessage, authorId } = req.body;
  const recipes = readJSON(RECIPES_FILE);
  const versions = readJSON(VERSIONS_FILE);
  const users = readJSON(USERS_FILE);

  const sourceVersion = versions.find(v => v.id === sourceVersionId);
  if (!sourceVersion) {
    return res.status(404).json({ success: false, message: '源版本不存在' });
  }

  const now = dayjs().toISOString();
  const latestMain = getLatestMainVersion(versions, id);
  const versionNumber = generateVersionNumber(versions, id, 'main');

  const mergedVersion = {
    id: uuidv4(),
    recipeId: id,
    versionNumber,
    branch: targetBranch || 'main',
    name: sourceVersion.name,
    ingredients: sourceVersion.ingredients,
    steps: sourceVersion.steps,
    notes: sourceVersion.notes,
    authorId,
    commitMessage: commitMessage || `合并分支 ${sourceVersion.branch} 到 ${targetBranch || 'main'}`,
    createdAt: now,
    parentIds: latestMain ? [latestMain.id, sourceVersionId] : [sourceVersionId],
    mergeSource: sourceVersion.branch
  };

  const recipeIndex = recipes.findIndex(r => r.id === id);
  if (recipeIndex !== -1) {
    recipes[recipeIndex] = {
      ...recipes[recipeIndex],
      name: sourceVersion.name,
      updatedAt: now
    };
    writeJSON(RECIPES_FILE, recipes);
  }

  versions.push(mergedVersion);
  writeJSON(VERSIONS_FILE, versions);

  const authorName = users.find(u => u.id === authorId)?.username || '未知';
  res.json({
    success: true,
    mergedVersion: { ...mergedVersion, authorName }
  });
});

app.get('/api/recipes/:id/versions/diff', (req, res) => {
  const { id } = req.params;
  const { versionId1, versionId2 } = req.query;
  const versions = readJSON(VERSIONS_FILE);

  const v1 = versions.find(v => v.id === versionId1);
  const v2 = versions.find(v => v.id === versionId2);

  if (!v1 || !v2) {
    return res.status(404).json({ success: false, message: '版本不存在' });
  }

  const diff = computeDiff(v1, v2);
  res.json({ diff });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
