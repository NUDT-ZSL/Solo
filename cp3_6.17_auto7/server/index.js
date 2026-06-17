import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { diffLines, diffArrays } from 'diff';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'versions.json');

const fileLocks = {
  users: false,
  recipes: false,
  versions: false
};

const pendingWrites = {
  users: [],
  recipes: [],
  versions: []
};

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const files = [
    { path: USERS_FILE, data: { users: [] } },
    { path: RECIPES_FILE, data: { recipes: [] } },
    { path: VERSIONS_FILE, data: { versions: [] } }
  ];
  files.forEach(file => {
    if (!fs.existsSync(file.path)) {
      fs.writeFileSync(file.path, JSON.stringify(file.data, null, 2), 'utf-8');
    }
  });
}

function readJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

async function writeJSON(filePath, data, lockKey) {
  return new Promise((resolve, reject) => {
    const doWrite = () => {
      fileLocks[lockKey] = true;
      try {
        const tmpPath = filePath + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
        fs.renameSync(tmpPath, filePath);
        fileLocks[lockKey] = false;
        resolve();
        if (pendingWrites[lockKey].length > 0) {
          const next = pendingWrites[lockKey].shift();
          next();
        }
      } catch (err) {
        fileLocks[lockKey] = false;
        reject(err);
        if (pendingWrites[lockKey].length > 0) {
          const next = pendingWrites[lockKey].shift();
          next();
        }
      }
    };
    if (fileLocks[lockKey]) {
      pendingWrites[lockKey].push(doWrite);
    } else {
      doWrite();
    }
  });
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getNextMainVersion(versions, recipeId) {
  const recipeVersions = versions.filter(v => v.recipeId === recipeId && !v.versionNumber.includes('.'));
  const maxNum = recipeVersions.reduce((max, v) => {
    const num = parseInt(v.versionNumber.replace('v', ''), 10);
    return num > max ? num : max;
  }, 0);
  return `v${maxNum + 1}`;
}

function getNextBranchVersion(versions, recipeId, parentVersionNumber) {
  const prefix = parentVersionNumber;
  const recipeVersions = versions.filter(v => 
    v.recipeId === recipeId && v.versionNumber.startsWith(prefix + '.')
  );
  const subVersions = recipeVersions.map(v => {
    const parts = v.versionNumber.split('.');
    return parseInt(parts[parts.length - 1], 10);
  });
  const maxNum = subVersions.length > 0 ? Math.max(...subVersions) : 0;
  return `${prefix}.${maxNum + 1}`;
}

ensureDataFiles();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    const usersData = readJSON(USERS_FILE);
    if (usersData.users.find(u => u.username === username)) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    const user = {
      id: uuidv4(),
      username,
      passwordHash: hashPassword(password),
      createdAt: dayjs().toISOString()
    };
    usersData.users.push(user);
    await writeJSON(USERS_FILE, usersData, 'users');
    res.json({
      id: user.id,
      username: user.username,
      token: user.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    const usersData = readJSON(USERS_FILE);
    const user = usersData.users.find(u => u.username === username);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    res.json({
      id: user.id,
      username: user.username,
      token: user.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes', (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const recipesData = readJSON(RECIPES_FILE);
    const userRecipes = recipesData.recipes.filter(r => r.userId === userId);
    res.json(userRecipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/:id', (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const recipesData = readJSON(RECIPES_FILE);
    const recipe = recipesData.recipes.find(r => r.id === req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    if (recipe.userId !== userId) {
      return res.status(403).json({ error: '无权访问' });
    }
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recipes', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const { name, ingredients = [], steps = [], notes = '' } = req.body;
    if (!name) {
      return res.status(400).json({ error: '食谱名称不能为空' });
    }
    const usersData = readJSON(USERS_FILE);
    const user = usersData.users.find(u => u.id === userId);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const recipeId = uuidv4();
    const versionId = uuidv4();
    const now = dayjs().toISOString();

    const recipe = {
      id: recipeId,
      userId,
      name,
      currentVersion: 'v1',
      mainBranch: 'main',
      createdAt: now,
      updatedAt: now
    };

    const version = {
      id: versionId,
      recipeId,
      versionNumber: 'v1',
      branch: 'main',
      authorId: userId,
      authorName: user.username,
      commitMessage: '初始版本',
      parentVersionId: null,
      mergeParentVersionId: null,
      ingredients,
      steps,
      notes,
      createdAt: now,
      isMerge: false
    };

    const recipesData = readJSON(RECIPES_FILE);
    recipesData.recipes.push(recipe);
    await writeJSON(RECIPES_FILE, recipesData, 'recipes');

    const versionsData = readJSON(VERSIONS_FILE);
    versionsData.versions.push(version);
    await writeJSON(VERSIONS_FILE, versionsData, 'versions');

    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/recipes/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const { name, ingredients = [], steps = [], notes = '', commitMessage = '' } = req.body;

    const recipesData = readJSON(RECIPES_FILE);
    const recipeIndex = recipesData.recipes.findIndex(r => r.id === req.params.id);
    if (recipeIndex === -1) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    const recipe = recipesData.recipes[recipeIndex];
    if (recipe.userId !== userId) {
      return res.status(403).json({ error: '无权修改' });
    }

    const usersData = readJSON(USERS_FILE);
    const user = usersData.users.find(u => u.id === userId);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const versionsData = readJSON(VERSIONS_FILE);
    const currentVersion = versionsData.versions.find(
      v => v.recipeId === recipe.id && v.versionNumber === recipe.currentVersion
    );

    const newVersionNumber = getNextMainVersion(versionsData.versions, recipe.id);
    const now = dayjs().toISOString();

    const newVersion = {
      id: uuidv4(),
      recipeId: recipe.id,
      versionNumber: newVersionNumber,
      branch: 'main',
      authorId: userId,
      authorName: user.username,
      commitMessage: commitMessage || '更新版本',
      parentVersionId: currentVersion ? currentVersion.id : null,
      mergeParentVersionId: null,
      ingredients,
      steps,
      notes,
      createdAt: now,
      isMerge: false
    };

    versionsData.versions.push(newVersion);
    await writeJSON(VERSIONS_FILE, versionsData, 'versions');

    if (name) {
      recipe.name = name;
    }
    recipe.currentVersion = newVersionNumber;
    recipe.updatedAt = now;
    recipesData.recipes[recipeIndex] = recipe;
    await writeJSON(RECIPES_FILE, recipesData, 'recipes');

    res.json(newVersion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const recipesData = readJSON(RECIPES_FILE);
    const recipeIndex = recipesData.recipes.findIndex(r => r.id === req.params.id);
    if (recipeIndex === -1) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    const recipe = recipesData.recipes[recipeIndex];
    if (recipe.userId !== userId) {
      return res.status(403).json({ error: '无权删除' });
    }

    recipesData.recipes.splice(recipeIndex, 1);
    await writeJSON(RECIPES_FILE, recipesData, 'recipes');

    const versionsData = readJSON(VERSIONS_FILE);
    versionsData.versions = versionsData.versions.filter(v => v.recipeId !== req.params.id);
    await writeJSON(VERSIONS_FILE, versionsData, 'versions');

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/:id/versions', (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const recipesData = readJSON(RECIPES_FILE);
    const recipe = recipesData.recipes.find(r => r.id === req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    if (recipe.userId !== userId) {
      return res.status(403).json({ error: '无权访问' });
    }
    const versionsData = readJSON(VERSIONS_FILE);
    const recipeVersions = versionsData.versions
      .filter(v => v.recipeId === req.params.id)
      .sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf());
    res.json(recipeVersions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/:id/versions/:versionId', (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const recipesData = readJSON(RECIPES_FILE);
    const recipe = recipesData.recipes.find(r => r.id === req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    if (recipe.userId !== userId) {
      return res.status(403).json({ error: '无权访问' });
    }
    const versionsData = readJSON(VERSIONS_FILE);
    const version = versionsData.versions.find(v => v.id === req.params.versionId);
    if (!version || version.recipeId !== req.params.id) {
      return res.status(404).json({ error: '版本不存在' });
    }
    res.json(version);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/:id/diff', (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: '请指定from和to版本号' });
    }
    const recipesData = readJSON(RECIPES_FILE);
    const recipe = recipesData.recipes.find(r => r.id === req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    if (recipe.userId !== userId) {
      return res.status(403).json({ error: '无权访问' });
    }
    const versionsData = readJSON(VERSIONS_FILE);
    const fromVersion = versionsData.versions.find(v => v.recipeId === req.params.id && v.versionNumber === from);
    const toVersion = versionsData.versions.find(v => v.recipeId === req.params.id && v.versionNumber === to);
    if (!fromVersion || !toVersion) {
      return res.status(404).json({ error: '版本不存在' });
    }

    const ingredientsMap = new Map();
    fromVersion.ingredients.forEach(ing => ingredientsMap.set(ing.id, { from: ing, to: null }));
    toVersion.ingredients.forEach(ing => {
      if (ingredientsMap.has(ing.id)) {
        ingredientsMap.get(ing.id).to = ing;
      } else {
        ingredientsMap.set(ing.id, { from: null, to: ing });
      }
    });

    const ingredientsDiff = [];
    ingredientsMap.forEach(({ from, to }, id) => {
      if (from && to) {
        const fromStr = `${from.name} ${from.quantity} ${from.unit}`;
        const toStr = `${to.name} ${to.quantity} ${to.unit}`;
        if (fromStr !== toStr) {
          ingredientsDiff.push({
            type: 'modified',
            value: toStr,
            oldValue: fromStr,
            id
          });
        }
      } else if (to) {
        ingredientsDiff.push({
          type: 'added',
          value: `${to.name} ${to.quantity} ${to.unit}`,
          id
        });
      } else if (from) {
        ingredientsDiff.push({
          type: 'removed',
          value: `${from.name} ${from.quantity} ${from.unit}`,
          id
        });
      }
    });

    const stepsMap = new Map();
    fromVersion.steps.forEach(step => stepsMap.set(step.id, { from: step, to: null }));
    toVersion.steps.forEach(step => {
      if (stepsMap.has(step.id)) {
        stepsMap.get(step.id).to = step;
      } else {
        stepsMap.set(step.id, { from: null, to: step });
      }
    });

    const stepsDiff = [];
    stepsMap.forEach(({ from, to }, id) => {
      if (from && to) {
        if (from.description !== to.description || from.order !== to.order) {
          stepsDiff.push({
            type: 'modified',
            value: `步骤${to.order}: ${to.description}`,
            oldValue: `步骤${from.order}: ${from.description}`,
            id
          });
        }
      } else if (to) {
        stepsDiff.push({
          type: 'added',
          value: `步骤${to.order}: ${to.description}`,
          id
        });
      } else if (from) {
        stepsDiff.push({
          type: 'removed',
          value: `步骤${from.order}: ${from.description}`,
          id
        });
      }
    });

    const notesLines = diffLines(fromVersion.notes || '', toVersion.notes || '');
    const notesDiff = notesLines
      .filter(part => part.added || part.removed)
      .map(part => ({
        type: part.added ? 'added' : 'removed',
        value: part.value
      }));

    res.json({
      ingredients: ingredientsDiff,
      steps: stepsDiff,
      notes: notesDiff
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recipes/:id/versions/:versionId/branch', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const { branchName } = req.body;
    if (!branchName) {
      return res.status(400).json({ error: '分支名称不能为空' });
    }
    const recipesData = readJSON(RECIPES_FILE);
    const recipe = recipesData.recipes.find(r => r.id === req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    if (recipe.userId !== userId) {
      return res.status(403).json({ error: '无权操作' });
    }
    const versionsData = readJSON(VERSIONS_FILE);
    const parentVersion = versionsData.versions.find(v => v.id === req.params.versionId);
    if (!parentVersion || parentVersion.recipeId !== req.params.id) {
      return res.status(404).json({ error: '版本不存在' });
    }
    const usersData = readJSON(USERS_FILE);
    const user = usersData.users.find(u => u.id === userId);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const newVersionNumber = getNextBranchVersion(versionsData.versions, recipe.id, parentVersion.versionNumber);
    const now = dayjs().toISOString();

    const newVersion = {
      id: uuidv4(),
      recipeId: recipe.id,
      versionNumber: newVersionNumber,
      branch: branchName,
      authorId: userId,
      authorName: user.username,
      commitMessage: `从 ${parentVersion.versionNumber} 创建分支 ${branchName}`,
      parentVersionId: parentVersion.id,
      mergeParentVersionId: null,
      ingredients: JSON.parse(JSON.stringify(parentVersion.ingredients)),
      steps: JSON.parse(JSON.stringify(parentVersion.steps)),
      notes: parentVersion.notes,
      createdAt: now,
      isMerge: false
    };

    versionsData.versions.push(newVersion);
    await writeJSON(VERSIONS_FILE, versionsData, 'versions');

    res.json(newVersion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recipes/:id/merge', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const { sourceBranch, targetBranch, commitMessage = '' } = req.body;
    if (!sourceBranch || !targetBranch) {
      return res.status(400).json({ error: '请指定源分支和目标分支' });
    }
    const recipesData = readJSON(RECIPES_FILE);
    const recipeIndex = recipesData.recipes.findIndex(r => r.id === req.params.id);
    if (recipeIndex === -1) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    const recipe = recipesData.recipes[recipeIndex];
    if (recipe.userId !== userId) {
      return res.status(403).json({ error: '无权操作' });
    }
    const versionsData = readJSON(VERSIONS_FILE);
    const recipeVersions = versionsData.versions.filter(v => v.recipeId === recipe.id);

    const sourceVersions = recipeVersions.filter(v => v.branch === sourceBranch);
    const targetVersions = recipeVersions.filter(v => v.branch === targetBranch);

    if (sourceVersions.length === 0) {
      return res.status(404).json({ error: '源分支不存在' });
    }
    if (targetVersions.length === 0) {
      return res.status(404).json({ error: '目标分支不存在' });
    }

    const latestSource = sourceVersions.sort(
      (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
    )[0];
    const latestTarget = targetVersions.sort(
      (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
    )[0];

    const usersData = readJSON(USERS_FILE);
    const user = usersData.users.find(u => u.id === userId);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const newVersionNumber = getNextMainVersion(versionsData.versions, recipe.id);
    const now = dayjs().toISOString();

    const newVersion = {
      id: uuidv4(),
      recipeId: recipe.id,
      versionNumber: newVersionNumber,
      branch: targetBranch,
      authorId: userId,
      authorName: user.username,
      commitMessage: commitMessage || `合并 ${sourceBranch} 到 ${targetBranch}`,
      parentVersionId: latestTarget.id,
      mergeParentVersionId: latestSource.id,
      ingredients: JSON.parse(JSON.stringify(latestSource.ingredients)),
      steps: JSON.parse(JSON.stringify(latestSource.steps)),
      notes: latestSource.notes,
      createdAt: now,
      isMerge: true
    };

    versionsData.versions.push(newVersion);
    await writeJSON(VERSIONS_FILE, versionsData, 'versions');

    if (targetBranch === 'main') {
      recipe.currentVersion = newVersionNumber;
    }
    recipe.updatedAt = now;
    recipesData.recipes[recipeIndex] = recipe;
    await writeJSON(RECIPES_FILE, recipesData, 'recipes');

    res.json(newVersion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recipes/:id/rollback/:versionId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    const recipesData = readJSON(RECIPES_FILE);
    const recipeIndex = recipesData.recipes.findIndex(r => r.id === req.params.id);
    if (recipeIndex === -1) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    const recipe = recipesData.recipes[recipeIndex];
    if (recipe.userId !== userId) {
      return res.status(403).json({ error: '无权操作' });
    }
    const versionsData = readJSON(VERSIONS_FILE);
    const targetVersion = versionsData.versions.find(v => v.id === req.params.versionId);
    if (!targetVersion || targetVersion.recipeId !== recipe.id) {
      return res.status(404).json({ error: '版本不存在' });
    }
    const usersData = readJSON(USERS_FILE);
    const user = usersData.users.find(u => u.id === userId);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const newVersionNumber = getNextMainVersion(versionsData.versions, recipe.id);
    const now = dayjs().toISOString();

    const newVersion = {
      id: uuidv4(),
      recipeId: recipe.id,
      versionNumber: newVersionNumber,
      branch: 'main',
      authorId: userId,
      authorName: user.username,
      commitMessage: `回滚到 ${targetVersion.versionNumber}`,
      parentVersionId: targetVersion.id,
      mergeParentVersionId: null,
      ingredients: JSON.parse(JSON.stringify(targetVersion.ingredients)),
      steps: JSON.parse(JSON.stringify(targetVersion.steps)),
      notes: targetVersion.notes,
      createdAt: now,
      isMerge: false
    };

    versionsData.versions.push(newVersion);
    await writeJSON(VERSIONS_FILE, versionsData, 'versions');

    recipe.currentVersion = newVersionNumber;
    recipe.updatedAt = now;
    recipesData.recipes[recipeIndex] = recipe;
    await writeJSON(RECIPES_FILE, recipesData, 'recipes');

    res.json(newVersion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Recipe version control server running on http://localhost:${PORT}`);
});
