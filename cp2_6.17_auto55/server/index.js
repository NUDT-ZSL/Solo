import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { diffJson } from 'diff';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

const DATA_DIR = join(__dirname, 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const RECIPES_FILE = join(DATA_DIR, 'recipes.json');
const VERSIONS_FILE = join(DATA_DIR, 'versions.json');

app.use(cors());
app.use(express.json());

const readJSON = (filePath) => {
  try {
    const data = readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeJSON = (filePath, data) => {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const findUserByUsername = (username) => {
  const users = readJSON(USERS_FILE);
  return users.find(u => u.username === username);
};

const findRecipeById = (id) => {
  const recipes = readJSON(RECIPES_FILE);
  return recipes.find(r => r.id === id);
};

const findVersionById = (id) => {
  const versions = readJSON(VERSIONS_FILE);
  return versions.find(v => v.id === id);
};

const createVersion = (recipeId, content, userId, parentId = null, branchName = 'main') => {
  const versions = readJSON(VERSIONS_FILE);
  const version = {
    id: uuidv4(),
    recipeId,
    content: JSON.stringify(content),
    userId,
    parentId,
    branchName,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    isMerged: false
  };
  versions.push(version);
  writeJSON(VERSIONS_FILE, versions);
  return version;
};

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  if (findUserByUsername(username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  const users = readJSON(USERS_FILE);
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  };
  users.push(user);
  writeJSON(USERS_FILE, users);

  res.status(201).json({
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = findUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  res.json({
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  });
});

app.get('/api/recipes', (req, res) => {
  const recipes = readJSON(RECIPES_FILE);
  res.json(recipes);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipe = findRecipeById(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const { title, description, ingredients, steps, userId } = req.body;

  if (!title || !userId) {
    return res.status(400).json({ error: '标题和用户ID不能为空' });
  }

  const recipes = readJSON(RECIPES_FILE);
  const recipeId = uuidv4();
  const recipe = {
    id: recipeId,
    title,
    description: description || '',
    ingredients: ingredients || [],
    steps: steps || [],
    userId,
    currentVersionId: null,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  };

  const version = createVersion(recipeId, recipe, userId);
  recipe.currentVersionId = version.id;

  recipes.push(recipe);
  writeJSON(RECIPES_FILE, recipes);

  res.status(201).json(recipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const { title, description, ingredients, steps, userId } = req.body;
  const recipeId = req.params.id;

  const recipes = readJSON(RECIPES_FILE);
  const index = recipes.findIndex(r => r.id === recipeId);

  if (index === -1) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  if (!userId) {
    return res.status(400).json({ error: '用户ID不能为空' });
  }

  const oldRecipe = recipes[index];
  const updatedRecipe = {
    ...oldRecipe,
    title: title || oldRecipe.title,
    description: description !== undefined ? description : oldRecipe.description,
    ingredients: ingredients || oldRecipe.ingredients,
    steps: steps || oldRecipe.steps,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  };

  const version = createVersion(recipeId, updatedRecipe, userId, oldRecipe.currentVersionId);
  updatedRecipe.currentVersionId = version.id;

  recipes[index] = updatedRecipe;
  writeJSON(RECIPES_FILE, recipes);

  res.json(updatedRecipe);
});

app.get('/api/recipes/:id/versions', (req, res) => {
  const recipeId = req.params.id;
  const recipe = findRecipeById(recipeId);

  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  const versions = readJSON(VERSIONS_FILE);
  const recipeVersions = versions
    .filter(v => v.recipeId === recipeId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(recipeVersions);
});

app.get('/api/versions/:id', (req, res) => {
  const version = findVersionById(req.params.id);
  if (!version) {
    return res.status(404).json({ error: '版本不存在' });
  }
  res.json({
    ...version,
    content: JSON.parse(version.content)
  });
});

app.post('/api/versions/:id/branch', (req, res) => {
  const parentVersion = findVersionById(req.params.id);
  if (!parentVersion) {
    return res.status(404).json({ error: '父版本不存在' });
  }

  const { branchName, userId } = req.body;
  if (!branchName || !userId) {
    return res.status(400).json({ error: '分支名称和用户ID不能为空' });
  }

  const versions = readJSON(VERSIONS_FILE);
  const existingBranch = versions.find(
    v => v.recipeId === parentVersion.recipeId && v.branchName === branchName
  );
  if (existingBranch) {
    return res.status(400).json({ error: '分支名称已存在' });
  }

  const content = JSON.parse(parentVersion.content);
  const newVersion = createVersion(
    parentVersion.recipeId,
    content,
    userId,
    parentVersion.id,
    branchName
  );

  res.status(201).json(newVersion);
});

app.post('/api/versions/:id/merge', (req, res) => {
  const sourceVersion = findVersionById(req.params.id);
  if (!sourceVersion) {
    return res.status(404).json({ error: '源版本不存在' });
  }

  const { targetBranch, userId } = req.body;
  if (!targetBranch || !userId) {
    return res.status(400).json({ error: '目标分支和用户ID不能为空' });
  }

  if (sourceVersion.branchName === targetBranch) {
    return res.status(400).json({ error: '不能合并到同一分支' });
  }

  const versions = readJSON(VERSIONS_FILE);
  const targetVersions = versions
    .filter(v => v.recipeId === sourceVersion.recipeId && v.branchName === targetBranch)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (targetVersions.length === 0) {
    return res.status(404).json({ error: '目标分支不存在' });
  }

  const targetVersion = targetVersions[0];
  const sourceContent = JSON.parse(sourceVersion.content);

  const mergedVersion = createVersion(
    sourceVersion.recipeId,
    sourceContent,
    userId,
    targetVersion.id,
    targetBranch
  );

  const sourceIndex = versions.findIndex(v => v.id === sourceVersion.id);
  versions[sourceIndex].isMerged = true;
  writeJSON(VERSIONS_FILE, versions);

  const recipes = readJSON(RECIPES_FILE);
  const recipeIndex = recipes.findIndex(r => r.id === sourceVersion.recipeId);
  if (recipeIndex !== -1 && targetBranch === 'main') {
    recipes[recipeIndex] = {
      ...JSON.parse(mergedVersion.content),
      currentVersionId: mergedVersion.id,
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
    };
    writeJSON(RECIPES_FILE, recipes);
  }

  res.status(201).json({
    mergedVersion,
    sourceVersion: versions[sourceIndex]
  });
});

app.get('/api/versions/diff', (req, res) => {
  const { v1, v2 } = req.query;

  if (!v1 || !v2) {
    return res.status(400).json({ error: '需要提供v1和v2参数' });
  }

  const version1 = findVersionById(v1);
  const version2 = findVersionById(v2);

  if (!version1 || !version2) {
    return res.status(404).json({ error: '版本不存在' });
  }

  if (version1.recipeId !== version2.recipeId) {
    return res.status(400).json({ error: '两个版本不属于同一个食谱' });
  }

  const content1 = JSON.stringify(JSON.parse(version1.content), null, 2);
  const content2 = JSON.stringify(JSON.parse(version2.content), null, 2);

  const differences = diffJson(content1, content2);

  res.json({
    v1,
    v2,
    recipeId: version1.recipeId,
    changes: differences.map(d => ({
      value: d.value,
      added: d.added || false,
      removed: d.removed || false,
      count: d.count
    }))
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
