import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  TasteProfile, Recipe, RecipeWithMatch, RecipeVersion, Ingredient, UserProfile, Comment, VoteResult,
  SEED_RECIPES, INGREDIENTS, recommendRecipes, calculateMatchScore, buildVersion,
  sortBy, paginate, fuzzySearchRecipes, tallyWeeklyRankings, uid, TASTE_KEYS,
} from '../src/RecipeEngine.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface VoteMap {
  [dateKey: string]: { count: number; versionKeys: Set<string> };
}

const recipes: Recipe[] = JSON.parse(JSON.stringify(SEED_RECIPES));
const profiles: Map<string, UserProfile> = new Map();
const dailyVotes: VoteMap = {};
const allComments: Comment[] = [];
let classics: (RecipeVersion & { recipeId: string; recipeName: string; recipeImage: string; recipeCategory: string })[] = [];

const defaultUserId = 'user_' + Math.random().toString(36).slice(2, 8);
const defaultTaste: TasteProfile = { sour: 40, sweet: 60, bitter: 20, spicy: 50, salty: 50 };
profiles.set(defaultUserId, {
  id: defaultUserId,
  name: '美食探索者',
  taste: defaultTaste,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  history: [],
});

for (const r of recipes) {
  if (r.baseVersion.isClassic) {
    classics.push({ ...r.baseVersion, recipeId: r.id, recipeName: r.name, recipeImage: r.image, recipeCategory: r.category });
  }
  for (const rv of r.versions) {
    if (rv.isClassic) {
      classics.push({ ...rv, recipeId: r.id, recipeName: r.name, recipeImage: r.image, recipeCategory: r.category });
    }
    for (const c of rv.comments) allComments.push(c);
  }
  for (const c of r.baseVersion.comments) allComments.push(c);
}

function getDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getUserVotes(userId: string) {
  const key = getDateKey() + '_' + userId;
  if (!dailyVotes[key]) dailyVotes[key] = { count: 0, versionKeys: new Set() };
  return dailyVotes[key];
}

function findRecipe(id: string): Recipe | undefined {
  return recipes.find(r => r.id === id);
}

function findVersion(recipe: Recipe, version: string): RecipeVersion | undefined {
  if (recipe.baseVersion.version === version) return recipe.baseVersion;
  return recipe.versions.find(v => v.version === version);
}

function getAllVersionsWithMatch(taste?: TasteProfile) {
  const list: (RecipeWithMatch)[] = recipes.map(r => {
    let matchScore = 50;
    let matchLabel: '正常' | '可能不符合口味' | undefined = '正常';
    if (taste) {
      const m = calculateMatchScore(taste, r.taste);
      matchScore = m.score;
      matchLabel = m.label;
    }
    return { ...r, matchScore, matchLabel };
  });
  return list;
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now(), recipes: recipes.length, ingredients: INGREDIENTS.length });
});

app.get('/api/ingredients', (_req: Request, res: Response) => {
  res.json(INGREDIENTS as Ingredient[]);
});

app.get('/api/profile', (req: Request, res: Response) => {
  const userId = String(req.query.userId || defaultUserId);
  let p = profiles.get(userId);
  if (!p) {
    p = {
      id: userId, name: '美食探索者', taste: defaultTaste,
      createdAt: Date.now(), updatedAt: Date.now(), history: [],
    };
    profiles.set(userId, p);
  }
  res.json(p);
});

app.post('/api/profile', (req: Request, res: Response) => {
  const { userId, name, taste } = req.body || {};
  const uid2 = String(userId || defaultUserId);
  const before = profiles.get(uid2)?.taste || defaultTaste;
  const clamped: TasteProfile = {
    sour: Math.max(0, Math.min(100, Number(taste?.sour) ?? before.sour)),
    sweet: Math.max(0, Math.min(100, Number(taste?.sweet) ?? before.sweet)),
    bitter: Math.max(0, Math.min(100, Number(taste?.bitter) ?? before.bitter)),
    spicy: Math.max(0, Math.min(100, Number(taste?.spicy) ?? before.spicy)),
    salty: Math.max(0, Math.min(100, Number(taste?.salty) ?? before.salty)),
  };
  const historyItem = { timestamp: Date.now(), before: JSON.parse(JSON.stringify(before)), after: clamped };
  const existing = profiles.get(uid2);
  const newProfile: UserProfile = {
    id: uid2,
    name: String(name || existing?.name || '美食探索者'),
    taste: clamped,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
    history: [historyItem, ...(existing?.history || [])].slice(0, 5),
  };
  profiles.set(uid2, newProfile);
  res.json(newProfile);
});

app.get('/api/profile/history', (req: Request, res: Response) => {
  const userId = String(req.query.userId || defaultUserId);
  const p = profiles.get(userId);
  res.json(p?.history || []);
});

app.get('/api/recipes/recommend', (req: Request, res: Response) => {
  const taste: TasteProfile = {
    sour: Number(req.query.sour) ?? 50,
    sweet: Number(req.query.sweet) ?? 50,
    bitter: Number(req.query.bitter) ?? 50,
    spicy: Number(req.query.spicy) ?? 50,
    salty: Number(req.query.salty) ?? 50,
  };
  const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 8));
  const result = recommendRecipes(taste, recipes, limit);
  res.json(result);
});

app.get('/api/recipes', (req: Request, res: Response) => {
  const userId = String(req.query.userId || defaultUserId);
  const p = profiles.get(userId);
  const list = getAllVersionsWithMatch(p?.taste);

  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const ingredient = typeof req.query.ingredient === 'string' ? req.query.ingredient : undefined;
  const tastesParam = typeof req.query.tastes === 'string' ? req.query.tastes.split(',').filter(Boolean) : [];
  const tastes = tastesParam.filter(t => TASTE_KEYS.includes(t as any)) as (keyof TasteProfile)[];

  const filtered = fuzzySearchRecipes(list, { name: search, tastes: tastes.length ? tastes : undefined, ingredient });

  let sorted = filtered;
  const sort = String(req.query.sort || 'match');
  if (sort === 'time') sorted = sortBy(filtered, 'updatedAt', true);
  else if (sort === 'votes') sorted = sortBy(filtered, r => r.baseVersion.votes + r.versions.reduce((s, v) => s + v.votes, 0), true);
  else sorted = sortBy(filtered, 'matchScore', true);

  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.max(1, Math.min(50, Number(req.query.size) || 12));
  const result = paginate(sorted, page, size);
  res.json(result);
});

app.get('/api/recipes/:id', (req: Request, res: Response) => {
  const r = findRecipe(req.params.id);
  if (!r) return res.status(404).json({ error: '食谱不存在' });
  const userId = String(req.query.userId || defaultUserId);
  const p = profiles.get(userId);
  let matchScore = 50;
  let matchLabel: '正常' | '可能不符合口味' | undefined = '正常';
  if (p) {
    const m = calculateMatchScore(p.taste, r.taste);
    matchScore = m.score;
    matchLabel = m.label;
  }
  res.json({ ...r, matchScore, matchLabel });
});

app.get('/api/recipes/:id/versions', (req: Request, res: Response) => {
  const r = findRecipe(req.params.id);
  if (!r) return res.status(404).json({ error: '食谱不存在' });
  const all = [r.baseVersion, ...r.versions];
  const sorted = sortBy(all, v => v.votes, true);
  res.json(sorted);
});

app.post('/api/recipes/:id/versions', (req: Request, res: Response) => {
  const r = findRecipe(req.params.id);
  if (!r) return res.status(404).json({ error: '食谱不存在' });
  const { userId, authorName, ingredients, cookTime, steps } = req.body || {};
  const uid2 = String(userId || defaultUserId);
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: '食材不能为空' });
  }
  const existing = [r.baseVersion, ...r.versions];
  const replacedCount = ingredients.filter((i: any) => i.isReplaced).length;
  if (replacedCount > 3) {
    return res.status(400).json({ error: '最多只能替换3种食材' });
  }
  const newVersion = buildVersion(
    uid2,
    String(authorName || (profiles.get(uid2)?.name || '美食创作者')),
    ingredients,
    Number(cookTime) || r.baseVersion.cookTime,
    Array.isArray(steps) && steps.length > 0 ? steps : r.baseVersion.steps,
    existing
  );
  r.versions.push(newVersion);
  r.updatedAt = Date.now();
  res.json(newVersion);
});

app.post('/api/vote', (req: Request, res: Response) => {
  const { userId, recipeId, version } = req.body || {};
  const uid2 = String(userId || defaultUserId);
  const r = findRecipe(String(recipeId));
  if (!r) return res.status(404).json({ error: '食谱不存在' });
  const rv = findVersion(r, String(version));
  if (!rv) return res.status(404).json({ error: '版本不存在' });

  const votes = getUserVotes(uid2);
  const vkey = `${r.id}_${rv.version}`;
  if (votes.versionKeys.has(vkey)) {
    return res.json({ success: false, remainingVotes: Math.max(0, 5 - votes.count), totalVotes: rv.votes, message: '您已经为该版本投过票了' } as VoteResult);
  }
  if (votes.count >= 5) {
    return res.json({ success: false, remainingVotes: 0, totalVotes: rv.votes, message: '今日投票已用完（每日限5票）' } as VoteResult);
  }
  rv.votes += 1;
  rv.weeklyVotes += 1;
  votes.count += 1;
  votes.versionKeys.add(vkey);
  res.json({ success: true, remainingVotes: 5 - votes.count, totalVotes: rv.votes } as VoteResult);
});

app.get('/api/vote/stats', (req: Request, res: Response) => {
  const userId = String(req.query.userId || defaultUserId);
  const v = getUserVotes(userId);
  res.json({ used: v.count, remaining: Math.max(0, 5 - v.count), limit: 5 });
});

app.post('/api/comment', (req: Request, res: Response) => {
  const { userId, userName, recipeId, version, content } = req.body || {};
  const uid2 = String(userId || defaultUserId);
  const text = String(content || '').trim().slice(0, 100);
  if (!text) return res.status(400).json({ error: '评论内容不能为空' });
  const r = findRecipe(String(recipeId));
  if (!r) return res.status(404).json({ error: '食谱不存在' });
  const rv = findVersion(r, String(version));
  if (!rv) return res.status(404).json({ error: '版本不存在' });
  const comment: Comment = {
    id: uid('c_'),
    userId: uid2,
    userName: String(userName || profiles.get(uid2)?.name || '食客'),
    content: text,
    createdAt: Date.now(),
  };
  rv.comments.unshift(comment);
  allComments.push(comment);
  res.json(comment);
});

app.get('/api/classics', (_req: Request, res: Response) => {
  const list = sortBy(classics, c => c.votes, true).slice(0, 100);
  res.json(list);
});

app.get('/api/my-recipes', (req: Request, res: Response) => {
  const userId = String(req.query.userId || defaultUserId);
  const result: { recipeId: string; recipeName: string; recipeImage: string; recipeCategory: string; version: RecipeVersion }[] = [];
  for (const r of recipes) {
    for (const v of r.versions) {
      if (v.authorId === userId) {
        result.push({ recipeId: r.id, recipeName: r.name, recipeImage: r.image, recipeCategory: r.category, version: v });
      }
    }
  }
  const sorted = sortBy(result, x => x.version.createdAt, true);
  res.json(sorted);
});

app.post('/api/cron/weekly', (_req: Request, res: Response) => {
  const result = tallyWeeklyRankings(recipes, classics.map(c => {
    const { recipeId, recipeName, recipeImage, recipeCategory, ...rest } = c as any;
    return rest;
  }), 100);
  for (const nc of result.newClassics) {
    const r = recipes.find(r => r.baseVersion === nc || r.versions.includes(nc));
    if (r) {
      classics.push({ ...nc, recipeId: r.id, recipeName: r.name, recipeImage: r.image, recipeCategory: r.category });
    }
  }
  classics = sortBy(classics, c => c.votes, true).slice(0, 100);
  res.json({
    newClassics: result.newClassics.length,
    archived: result.archived.length,
    totalClassics: classics.length,
  });
});

app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: '服务器错误', message: err?.message });
});

app.listen(PORT, () => {
  console.log(`🍳 味觉图谱 API 服务已启动: http://localhost:${PORT}`);
  console.log(`   - 食谱: ${recipes.length} 道`);
  console.log(`   - 食材: ${INGREDIENTS.length} 种`);
  console.log(`   - 默认用户: ${defaultUserId}`);
});
