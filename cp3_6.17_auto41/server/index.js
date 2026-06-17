const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const app = express();
const PORT = 3001;

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');

let usersCache = null;
let recipesCache = null;

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
}

function readUsers() {
  if (usersCache) return usersCache;
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  usersCache = JSON.parse(data);
  return usersCache;
}

function writeUsers(users) {
  usersCache = users;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readRecipes() {
  if (recipesCache) return recipesCache;
  const data = fs.readFileSync(RECIPES_FILE, 'utf-8');
  recipesCache = JSON.parse(data);
  return recipesCache;
}

function writeRecipes(recipes) {
  recipesCache = recipes;
  fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
}

function getNextMainVersion(versions) {
  const mainVersions = versions
    .filter(v => !v.version.includes('.'))
    .map(v => parseInt(v.version.slice(1)))
    .filter(n => !isNaN(n));
  const max = mainVersions.length > 0 ? Math.max(...mainVersions) : 0;
  return `v${max + 1}`;
}

function getNextBranchVersion(versions, parentVersion, branchName) {
  const branchVersions = versions
    .filter(v => v.branch === branchName)
    .map(v => {
      const parts = v.version.split('.');
      return parseInt(parts[parts.length - 1].slice(1)) || 0;
    })
    .filter(n => !isNaN(n));
  const max = branchVersions.length > 0 ? Math.max(...branchVersions) : 0;
  return `${parentVersion}.${max + 1}`;
}

function findLatestVersionOnBranch(versions, branch) {
  const branchVersions = versions.filter(v => v.branch === branch);
  if (branchVersions.length === 0) return null;
  return branchVersions.reduce((latest, v) => 
    dayjs(v.createdAt).isAfter(dayjs(latest.createdAt)) ? v : latest
  );
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const newUser = {
    id: uuidv4(),
    username,
    password,
    createdAt: dayjs().toISOString()
  };

  users.push(newUser);
  writeUsers(users);

  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ user: userWithoutPassword, token: newUser.id });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword, token: user.id });
});

app.get('/api/recipes', (req, res) => {
  const recipes = readRecipes();
  const simplified = recipes.map(r => ({
    id: r.id,
    name: r.name,
    authorId: r.authorId,
    author: r.author,
    createdAt: r.createdAt,
    mainBranch: r.mainBranch,
    versionCount: r.versions.length
  }));
  res.json(simplified);
});

app.get('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const recipes = readRecipes();
  const recipe = recipes.find(r => r.id === id);

  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' });
  }

  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const { name, ingredients, steps, note = '', message = 'Initial version', authorId, author } = req.body;
  const recipes = readRecipes();

  const recipeId = uuidv4();
  const versionId = uuidv4();

  const initialVersion = {
    id: versionId,
    version: 'v1',
    parentIds: [],
    recipeId,
    author,
    authorId,
    ingredients,
    steps,
    note,
    createdAt: dayjs().toISOString(),
    branch: 'main',
    message
  };

  const newRecipe = {
    id: recipeId,
    name,
    authorId,
    author,
    createdAt: dayjs().toISOString(),
    versions: [initialVersion],
    mainBranch: 'main'
  };

  recipes.push(newRecipe);
  writeRecipes(recipes);

  res.status(201).json(newRecipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const recipes = readRecipes();
  const recipeIndex = recipes.findIndex(r => r.id === id);

  if (recipeIndex === -1) {
    return res.status(404).json({ error: 'Recipe not found' });
  }

  if (name !== undefined) {
    recipes[recipeIndex].name = name;
  }

  writeRecipes(recipes);
  res.json(recipes[recipeIndex]);
});

app.get('/api/recipes/:id/versions', (req, res) => {
  const { id } = req.params;
  const recipes = readRecipes();
  const recipe = recipes.find(r => r.id === id);

  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' });
  }

  res.json(recipe.versions);
});

app.post('/api/recipes/:id/versions', (req, res) => {
  const { id } = req.params;
  const { ingredients, steps, note = '', message, parentId, authorId, author } = req.body;
  const recipes = readRecipes();
  const recipeIndex = recipes.findIndex(r => r.id === id);

  if (recipeIndex === -1) {
    return res.status(404).json({ error: 'Recipe not found' });
  }

  const recipe = recipes[recipeIndex];
  const parentVersion = recipe.versions.find(v => v.id === parentId);

  if (!parentVersion) {
    return res.status(400).json({ error: 'Parent version not found' });
  }

  let newVersionStr;
  let branch;

  if (parentVersion.branch === 'main') {
    newVersionStr = getNextMainVersion(recipe.versions);
    branch = 'main';
  } else {
    newVersionStr = getNextBranchVersion(recipe.versions, parentVersion.version, parentVersion.branch);
    branch = parentVersion.branch;
  }

  const newVersion = {
    id: uuidv4(),
    version: newVersionStr,
    parentIds: [parentId],
    recipeId: id,
    author,
    authorId,
    ingredients,
    steps,
    note,
    createdAt: dayjs().toISOString(),
    branch,
    message
  };

  recipe.versions.push(newVersion);
  writeRecipes(recipes);

  res.status(201).json(newVersion);
});

app.post('/api/recipes/:id/branch', (req, res) => {
  const { id } = req.params;
  const { branchName, fromVersionId, authorId, author } = req.body;
  const recipes = readRecipes();
  const recipeIndex = recipes.findIndex(r => r.id === id);

  if (recipeIndex === -1) {
    return res.status(404).json({ error: 'Recipe not found' });
  }

  const recipe = recipes[recipeIndex];
  const fromVersion = recipe.versions.find(v => v.id === fromVersionId);

  if (!fromVersion) {
    return res.status(400).json({ error: 'Source version not found' });
  }

  const existingBranch = recipe.versions.find(v => v.branch === branchName);
  if (existingBranch) {
    return res.status(400).json({ error: 'Branch already exists' });
  }

  const newVersionStr = `${fromVersion.version}.1`;

  const newVersion = {
    id: uuidv4(),
    version: newVersionStr,
    parentIds: [fromVersionId],
    recipeId: id,
    author,
    authorId,
    ingredients: [...fromVersion.ingredients],
    steps: [...fromVersion.steps],
    note: fromVersion.note,
    createdAt: dayjs().toISOString(),
    branch: branchName,
    message: `Branch ${branchName} created from ${fromVersion.version}`
  };

  recipe.versions.push(newVersion);
  writeRecipes(recipes);

  res.status(201).json(newVersion);
});

app.post('/api/recipes/:id/merge', (req, res) => {
  const { id } = req.params;
  const { sourceVersionId, targetBranch, message, authorId, author } = req.body;
  const recipes = readRecipes();
  const recipeIndex = recipes.findIndex(r => r.id === id);

  if (recipeIndex === -1) {
    return res.status(404).json({ error: 'Recipe not found' });
  }

  const recipe = recipes[recipeIndex];
  const sourceVersion = recipe.versions.find(v => v.id === sourceVersionId);

  if (!sourceVersion) {
    return res.status(400).json({ error: 'Source version not found' });
  }

  const targetLatest = findLatestVersionOnBranch(recipe.versions, targetBranch);
  if (!targetLatest) {
    return res.status(400).json({ error: 'Target branch not found' });
  }

  const newVersionStr = getNextMainVersion(recipe.versions);

  const mergedVersion = {
    id: uuidv4(),
    version: newVersionStr,
    parentIds: [targetLatest.id, sourceVersionId],
    recipeId: id,
    author,
    authorId,
    ingredients: [...sourceVersion.ingredients],
    steps: [...sourceVersion.steps],
    note: sourceVersion.note,
    createdAt: dayjs().toISOString(),
    branch: targetBranch,
    message: message || `Merge ${sourceVersion.branch} into ${targetBranch}`
  };

  recipe.versions.push(mergedVersion);
  writeRecipes(recipes);

  res.status(201).json(mergedVersion);
});

ensureDataDir();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
