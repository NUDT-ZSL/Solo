import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { diffLines } from 'diff';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
};

const writeJsonFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json());

const generateVersion = (branch, existingVersions, fromVersion = null) => {
  const branchVersions = existingVersions.filter((v) => v.branch === branch);

  if (branch === 'main') {
    const mainNums = branchVersions
      .map((v) => {
        const match = v.version.match(/^v(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter((n) => n > 0);
    const nextNum = mainNums.length > 0 ? Math.max(...mainNums) + 1 : 1;
    return `v${nextNum}`;
  } else {
    if (fromVersion) {
      const baseMatch = fromVersion.match(/^v(\d+)$/);
      if (baseMatch) {
        const baseNum = baseMatch[1];
        const branchSuffixes = branchVersions
          .map((v) => {
            const match = v.version.match(new RegExp(`^v${baseNum}\\.(\\d+)$`));
            return match ? parseInt(match[1]) : 0;
          })
          .filter((n) => n > 0);
        const nextSuffix = branchSuffixes.length > 0 ? Math.max(...branchSuffixes) + 1 : 1;
        return `v${baseNum}.${nextSuffix}`;
      }
    }
    const fallbackNums = branchVersions
      .map((v) => {
        const match = v.version.match(/^v(\d+\.\d+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    if (fallbackNums.length === 0) return 'v1.1';
    const maxParts = fallbackNums
      .map((v) => v.split('.').map(Number))
      .reduce((max, curr) => (curr[0] > max[0] || (curr[0] === max[0] && curr[1] > max[1]) ? curr : max));
    return `v${maxParts[0]}.${maxParts[1] + 1}`;
  }
};

const computeDiff = (content1, content2) => {
  const serializeIngredients = (ings) =>
    (ings || [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((i) => `${i.quantity}${i.unit} ${i.name}`)
      .join('\n');

  const serializeSteps = (steps) =>
    (steps || [])
      .sort((a, b) => a.order - b.order)
      .map((s) => `${s.order}. ${s.description}`)
      .join('\n');

  const processDiff = (diffResult) => {
    return diffResult.map((part) => ({
      type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
      value: part.value.trim() ? part.value : '(空行)',
    }));
  };

  return {
    name: processDiff(diffLines(content1.name || '', content2.name || '')),
    ingredients: processDiff(
      diffLines(serializeIngredients(content1.ingredients), serializeIngredients(content2.ingredients))
    ),
    steps: processDiff(diffLines(serializeSteps(content1.steps), serializeSteps(content2.steps))),
    notes: processDiff(diffLines(content1.notes || '', content2.notes || '')),
  };
};

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const users = readJsonFile(USERS_FILE);
  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  const newUser = {
    id: uuidv4(),
    username,
    password,
    createdAt: dayjs().toISOString(),
  };
  users.push(newUser);
  writeJsonFile(USERS_FILE, users);

  const { password: _, ...userWithoutPassword } = newUser;
  res.json(userWithoutPassword);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const users = readJsonFile(USERS_FILE);
  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.get('/api/recipes', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId 参数缺失' });
  }

  const recipes = readJsonFile(RECIPES_FILE);
  const userRecipes = recipes.filter((r) => r.ownerId === userId);
  const simplified = userRecipes.map((r) => ({
    id: r.id,
    ownerId: r.ownerId,
    currentVersionId: r.currentVersionId,
    currentBranch: r.currentBranch,
    versions: r.versions.slice(-1),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
  res.json(simplified);
});

app.get('/api/recipes/:recipeId', (req, res) => {
  const { recipeId } = req.params;
  const recipes = readJsonFile(RECIPES_FILE);
  const recipe = recipes.find((r) => r.id === recipeId);

  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const { userId, content, authorName } = req.body;
  if (!userId || !content) {
    return res.status(400).json({ error: '参数缺失' });
  }

  const recipes = readJsonFile(RECIPES_FILE);
  const versionId = uuidv4();

  const initialVersion = {
    id: versionId,
    recipeId: '',
    version: 'v1',
    branch: 'main',
    content,
    parentIds: [],
    authorId: userId,
    authorName: authorName || '匿名',
    message: '初始版本',
    timestamp: dayjs().toISOString(),
  };

  const newRecipe = {
    id: uuidv4(),
    ownerId: userId,
    currentVersionId: versionId,
    currentBranch: 'main',
    versions: [],
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
  };

  initialVersion.recipeId = newRecipe.id;
  newRecipe.versions.push(initialVersion);

  recipes.push(newRecipe);
  writeJsonFile(RECIPES_FILE, recipes);

  res.json(newRecipe);
});

app.post('/api/recipes/:recipeId/versions', (req, res) => {
  const { recipeId } = req.params;
  const { content, parentVersionId, message, authorId, authorName } = req.body;

  const recipes = readJsonFile(RECIPES_FILE);
  const recipeIndex = recipes.findIndex((r) => r.id === recipeId);

  if (recipeIndex === -1) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  const recipe = recipes[recipeIndex];
  const parentVersion = recipe.versions.find((v) => v.id === parentVersionId);
  const branch = parentVersion ? parentVersion.branch : recipe.currentBranch;

  const versionStr = generateVersion(branch, recipe.versions);

  const newVersion = {
    id: uuidv4(),
    recipeId,
    version: versionStr,
    branch,
    content,
    parentIds: parentVersionId ? [parentVersionId] : [],
    authorId,
    authorName: authorName || '匿名',
    message: message || `更新版本`,
    timestamp: dayjs().toISOString(),
  };

  recipe.versions.push(newVersion);
  if (branch === recipe.currentBranch) {
    recipe.currentVersionId = newVersion.id;
  }
  recipe.updatedAt = dayjs().toISOString();

  recipes[recipeIndex] = recipe;
  writeJsonFile(RECIPES_FILE, recipes);

  res.json(newVersion);
});

app.post('/api/recipes/:recipeId/branch', (req, res) => {
  const { recipeId } = req.params;
  const { fromVersionId, branchName, authorId, authorName } = req.body;

  if (!fromVersionId || !branchName) {
    return res.status(400).json({ error: '参数缺失' });
  }

  const recipes = readJsonFile(RECIPES_FILE);
  const recipeIndex = recipes.findIndex((r) => r.id === recipeId);

  if (recipeIndex === -1) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  const recipe = recipes[recipeIndex];
  const fromVersion = recipe.versions.find((v) => v.id === fromVersionId);

  if (!fromVersion) {
    return res.status(400).json({ error: '源版本不存在' });
  }

  const versionStr = generateVersion(branchName, recipe.versions, fromVersion.version);

  const newBranchVersion = {
    id: uuidv4(),
    recipeId,
    version: versionStr,
    branch: branchName,
    content: JSON.parse(JSON.stringify(fromVersion.content)),
    parentIds: [fromVersionId],
    authorId,
    authorName: authorName || '匿名',
    message: `创建分支 ${branchName}`,
    timestamp: dayjs().toISOString(),
  };

  recipe.versions.push(newBranchVersion);
  recipe.updatedAt = dayjs().toISOString();

  recipes[recipeIndex] = recipe;
  writeJsonFile(RECIPES_FILE, recipes);

  res.json(newBranchVersion);
});

app.post('/api/recipes/:recipeId/merge', (req, res) => {
  const { recipeId } = req.params;
  const { targetVersionId, sourceVersionId, authorId, authorName } = req.body;

  if (!targetVersionId || !sourceVersionId) {
    return res.status(400).json({ error: '参数缺失' });
  }

  const recipes = readJsonFile(RECIPES_FILE);
  const recipeIndex = recipes.findIndex((r) => r.id === recipeId);

  if (recipeIndex === -1) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  const recipe = recipes[recipeIndex];
  const targetVersion = recipe.versions.find((v) => v.id === targetVersionId);
  const sourceVersion = recipe.versions.find((v) => v.id === sourceVersionId);

  if (!targetVersion || !sourceVersion) {
    return res.status(400).json({ error: '目标版本或源版本不存在' });
  }

  const mergedContent = {
    name: sourceVersion.content.name || targetVersion.content.name,
    ingredients: sourceVersion.content.ingredients.length > 0
      ? sourceVersion.content.ingredients
      : targetVersion.content.ingredients,
    steps: sourceVersion.content.steps.length > 0
      ? sourceVersion.content.steps
      : targetVersion.content.steps,
    notes: sourceVersion.content.notes || targetVersion.content.notes,
  };

  const versionStr = generateVersion('main', recipe.versions);

  const mergedVersion = {
    id: uuidv4(),
    recipeId,
    version: versionStr,
    branch: 'main',
    content: mergedContent,
    parentIds: [targetVersionId, sourceVersionId],
    authorId,
    authorName: authorName || '匿名',
    message: `合并 ${sourceVersion.branch} 到 main`,
    timestamp: dayjs().toISOString(),
    isMerge: true,
  };

  recipe.versions.push(mergedVersion);
  recipe.currentVersionId = mergedVersion.id;
  recipe.currentBranch = 'main';
  recipe.updatedAt = dayjs().toISOString();

  recipes[recipeIndex] = recipe;
  writeJsonFile(RECIPES_FILE, recipes);

  res.json(mergedVersion);
});

app.post('/api/recipes/:recipeId/rollback', (req, res) => {
  const { recipeId } = req.params;
  const { versionId, authorId, authorName } = req.body;

  if (!versionId) {
    return res.status(400).json({ error: '参数缺失' });
  }

  const recipes = readJsonFile(RECIPES_FILE);
  const recipeIndex = recipes.findIndex((r) => r.id === recipeId);

  if (recipeIndex === -1) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  const recipe = recipes[recipeIndex];
  const rollbackFrom = recipe.versions.find((v) => v.id === versionId);

  if (!rollbackFrom) {
    return res.status(400).json({ error: '回滚版本不存在' });
  }

  const versionStr = generateVersion('main', recipe.versions);

  const rollbackVersion = {
    id: uuidv4(),
    recipeId,
    version: versionStr,
    branch: 'main',
    content: JSON.parse(JSON.stringify(rollbackFrom.content)),
    parentIds: recipe.currentVersionId ? [recipe.currentVersionId] : [],
    authorId,
    authorName: authorName || '匿名',
    message: `回滚到版本 ${rollbackFrom.version}`,
    timestamp: dayjs().toISOString(),
  };

  recipe.versions.push(rollbackVersion);
  recipe.currentVersionId = rollbackVersion.id;
  recipe.updatedAt = dayjs().toISOString();

  recipes[recipeIndex] = recipe;
  writeJsonFile(RECIPES_FILE, recipes);

  res.json(rollbackVersion);
});

app.get('/api/recipes/:recipeId/diff', (req, res) => {
  const { recipeId } = req.params;
  const { versionId1, versionId2 } = req.query;

  if (!versionId1 || !versionId2) {
    return res.status(400).json({ error: '参数缺失' });
  }

  const recipes = readJsonFile(RECIPES_FILE);
  const recipe = recipes.find((r) => r.id === recipeId);

  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  const v1 = recipe.versions.find((v) => v.id === versionId1);
  const v2 = recipe.versions.find((v) => v.id === versionId2);

  if (!v1 || !v2) {
    return res.status(400).json({ error: '版本不存在' });
  }

  const diffResult = computeDiff(v1.content, v2.content);
  res.json(diffResult);
});

app.listen(PORT, () => {
  console.log(`🍳 食谱版本管理后端服务已启动: http://localhost:${PORT}`);
});
