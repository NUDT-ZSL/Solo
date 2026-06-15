export interface TasteProfile {
  sour: number;
  sweet: number;
  bitter: number;
  spicy: number;
  salty: number;
}

export interface Ingredient {
  id: string;
  name: string;
  calories: number;
  taste: TasteProfile;
  category: '肉类' | '蔬菜' | '调料' | '主食' | '水产' | '蛋奶' | '豆制品';
}

export interface IngredientUsage {
  id: string;
  name: string;
  amount: number;
  unit: string;
  isReplaced?: boolean;
  originalId?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface RecipeVersion {
  version: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  ingredients: IngredientUsage[];
  cookTime: number;
  steps: string[];
  votes: number;
  weeklyVotes: number;
  weekRankHistory: (number | null)[];
  comments: Comment[];
  isClassic?: boolean;
  classicDate?: number;
}

export interface Recipe {
  id: string;
  name: string;
  image: string;
  taste: TasteProfile;
  baseVersion: RecipeVersion;
  versions: RecipeVersion[];
  category: string;
  description: string;
  updatedAt: number;
}

export interface RecipeWithMatch extends Recipe {
  matchScore: number;
  matchLabel?: '正常' | '可能不符合口味';
}

export interface HistoryItem {
  timestamp: number;
  before: TasteProfile;
  after: TasteProfile;
}

export interface UserProfile {
  id: string;
  name: string;
  taste: TasteProfile;
  createdAt: number;
  updatedAt: number;
  history: HistoryItem[];
}

export interface VoteResult {
  success: boolean;
  remainingVotes: number;
  totalVotes: number;
  message?: string;
}

export interface VoteRecord {
  recipeId: string;
  versionId: string;
  timestamp: number;
}

export function createTaste(sour: number, sweet: number, bitter: number, spicy: number, salty: number): TasteProfile {
  return { sour, sweet, bitter, spicy, salty };
}

export function clampTaste(t: TasteProfile): TasteProfile {
  return {
    sour: Math.max(0, Math.min(100, t.sour)),
    sweet: Math.max(0, Math.min(100, t.sweet)),
    bitter: Math.max(0, Math.min(100, t.bitter)),
    spicy: Math.max(0, Math.min(100, t.spicy)),
    salty: Math.max(0, Math.min(100, t.salty)),
  };
}

export function euclideanDistance(a: TasteProfile, b: TasteProfile, scaleA = 10, scaleB = 10): number {
  const as = a.sour / scaleA;
  const aw = a.sweet / scaleA;
  const ai = a.bitter / scaleA;
  const ap = a.spicy / scaleA;
  const ay = a.salty / scaleA;
  const bs = b.sour / scaleB;
  const bw = b.sweet / scaleB;
  const bi = b.bitter / scaleB;
  const bp = b.spicy / scaleB;
  const by = b.salty / scaleB;
  return Math.sqrt(
    Math.pow(as - bs, 2) + Math.pow(aw - bw, 2) + Math.pow(ai - bi, 2) + Math.pow(ap - bp, 2) + Math.pow(ay - by, 2)
  );
}

export function calculateMatchScore(userTaste: TasteProfile, recipeTaste: TasteProfile): { score: number; label?: '正常' | '可能不符合口味' } {
  const d = euclideanDistance(userTaste, recipeTaste, 100, 10);
  const maxDist = Math.sqrt(5 * 10 * 10);
  const raw = (1 - d / maxDist) * 100;
  const score = Math.round(Math.max(0, Math.min(100, raw)));
  const label = score < 50 ? '可能不符合口味' : '正常';
  return { score, label };
}

export function recommendRecipes(userTaste: TasteProfile, recipes: Recipe[], limit = 8): RecipeWithMatch[] {
  const start = performance.now();
  const results = recipes.map(r => {
    const { score, label } = calculateMatchScore(userTaste, r.taste);
    return { ...r, matchScore: score, matchLabel: label };
  });
  results.sort((a, b) => b.matchScore - a.matchScore);
  const elapsed = performance.now() - start;
  if (elapsed > 500) {
    console.warn(`[RecipeEngine] 推荐计算耗时 ${elapsed.toFixed(1)}ms 超过 500ms 阈值`);
  }
  return results.slice(0, limit);
}

export function nextVersion(existing: RecipeVersion[]): string {
  const all = ['v0.0', ...existing.map(v => v.version)];
  let maxMajor = 0;
  let maxMinor = 0;
  for (const v of all) {
    const m = v.match(/^v(\d+)\.(\d+)$/);
    if (m) {
      const ma = parseInt(m[1], 10);
      const mi = parseInt(m[2], 10);
      if (ma > maxMajor || (ma === maxMajor && mi > maxMinor)) {
        maxMajor = ma;
        maxMinor = mi;
      }
    }
  }
  let nextMajor = maxMajor;
  let nextMinor = maxMinor + 1;
  if (nextMinor > 9) {
    nextMinor = 0;
    nextMajor = Math.min(9, maxMajor + 1);
  }
  return `v${nextMajor}.${nextMinor}`;
}

export function adjustAmount(original: number, percent: number): number {
  const factor = 1 + percent / 100;
  return Math.round(original * factor * 10) / 10;
}

export function clampCookTime(minutes: number): number {
  const stepped = Math.round(minutes / 5) * 5;
  return Math.max(5, Math.min(120, stepped));
}

export function buildVersion(
  authorId: string,
  authorName: string,
  ingredients: IngredientUsage[],
  cookTime: number,
  steps: string[],
  existing: RecipeVersion[]
): RecipeVersion {
  return {
    version: nextVersion(existing),
    authorId,
    authorName,
    createdAt: Date.now(),
    ingredients: JSON.parse(JSON.stringify(ingredients)),
    cookTime: clampCookTime(cookTime),
    steps: JSON.parse(JSON.stringify(steps)),
    votes: 0,
    weeklyVotes: 0,
    weekRankHistory: [],
    comments: [],
  };
}

export function tallyWeeklyRankings(recipes: Recipe[], classics: RecipeVersion[], classicsLimit = 100): { updatedRecipes: Recipe[]; newClassics: RecipeVersion[]; archived: RecipeVersion[] } {
  const allVersions: { rv: RecipeVersion; recipeId: string; recipeName: string }[] = [];
  for (const r of recipes) {
    for (const rv of [r.baseVersion, ...r.versions]) {
      allVersions.push({ rv, recipeId: r.id, recipeName: r.name });
    }
  }
  allVersions.sort((a, b) => b.rv.weeklyVotes - a.rv.weeklyVotes);

  const existingClassicKeys = new Set(classics.map(c => `${c.version}_${c.authorId}`));
  const newClassics: RecipeVersion[] = [];
  let slots = Math.max(0, classicsLimit - classics.length);
  const rankingMap = new Map<string, number>();
  for (let i = 0; i < allVersions.length; i++) {
    const key = `${allVersions[i].rv.version}_${allVersions[i].rv.recipeId}`;
    rankingMap.set(key, i + 1);
  }

  for (const entry of allVersions) {
    const key = `${entry.rv.version}_${entry.rv.authorId}`;
    if (entry.rv.weeklyVotes > 0 && !existingClassicKeys.has(key) && slots > 0) {
      entry.rv.isClassic = true;
      entry.rv.classicDate = Date.now();
      newClassics.push(entry.rv);
      existingClassicKeys.add(key);
      slots--;
    }
  }

  for (const r of recipes) {
    for (const rv of [r.baseVersion, ...r.versions]) {
      const key = `${rv.version}_${r.id}`;
      const rank = rankingMap.get(key) ?? null;
      rv.weekRankHistory = [rank, ...rv.weekRankHistory.slice(0, 3)];
    }
  }

  const archived: RecipeVersion[] = [];
  for (const r of recipes) {
    r.versions = r.versions.filter(rv => {
      if (rv.isClassic) return true;
      const history = rv.weekRankHistory;
      if (history.length >= 4 && history.every(h => h === null)) {
        archived.push(rv);
        return false;
      }
      return true;
    });
  }

  for (const r of recipes) {
    for (const rv of [r.baseVersion, ...r.versions]) {
      rv.weeklyVotes = 0;
    }
  }

  return {
    updatedRecipes: recipes,
    newClassics,
    archived,
  };
}

export function sortBy<T>(list: T[], field: keyof T | ((t: T) => number | string), desc = true): T[] {
  const fn = typeof field === 'function' ? field : (t: T) => t[field] as number | string;
  return [...list].sort((a, b) => {
    const va = fn(a);
    const vb = fn(b);
    if (typeof va === 'number' && typeof vb === 'number') {
      return desc ? vb - va : va - vb;
    }
    return desc ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
  });
}

export function paginate<T>(list: T[], page: number, size = 12): { items: T[]; total: number; page: number; size: number; pages: number } {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.max(1, Math.min(pages, page));
  const start = (p - 1) * size;
  return {
    items: list.slice(start, start + size),
    total,
    page: p,
    size,
    pages,
  };
}

export function fuzzySearchRecipes(
  recipes: RecipeWithMatch[],
  options: { name?: string; tastes?: (keyof TasteProfile)[]; ingredient?: string }
): RecipeWithMatch[] {
  let list = recipes;
  if (options.name && options.name.trim()) {
    const q = options.name.trim().toLowerCase();
    list = list.filter(r => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }
  if (options.tastes && options.tastes.length > 0) {
    list = list.filter(r => options.tastes!.every(t => r.taste[t] >= 3));
  }
  if (options.ingredient && options.ingredient.trim()) {
    const q = options.ingredient.trim().toLowerCase();
    list = list.filter(r => {
      const all = [...r.baseVersion.ingredients, ...r.versions.flatMap(v => v.ingredients)];
      return all.some(i => i.name.toLowerCase().includes(q));
    });
  }
  return list;
}

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const TASTE_KEYS: (keyof TasteProfile)[] = ['sour', 'sweet', 'bitter', 'spicy', 'salty'];
export const TASTE_LABELS: Record<keyof TasteProfile, string> = {
  sour: '酸',
  sweet: '甜',
  bitter: '苦',
  spicy: '辣',
  salty: '咸',
};
export const TASTE_EMOJI: Record<keyof TasteProfile, string> = {
  sour: '🍋',
  sweet: '🍯',
  bitter: '☕',
  spicy: '🌶️',
  salty: '🧂',
};

export const INGREDIENTS: Ingredient[] = [
  { id: 'i01', name: '猪肉', calories: 395, taste: createTaste(0, 0, 0, 0, 3), category: '肉类' },
  { id: 'i02', name: '牛肉', calories: 250, taste: createTaste(0, 0, 1, 0, 2), category: '肉类' },
  { id: 'i03', name: '鸡胸肉', calories: 165, taste: createTaste(0, 0, 0, 0, 1), category: '肉类' },
  { id: 'i04', name: '鸡腿肉', calories: 209, taste: createTaste(0, 0, 0, 0, 2), category: '肉类' },
  { id: 'i05', name: '羊肉', calories: 294, taste: createTaste(0, 0, 2, 0, 2), category: '肉类' },
  { id: 'i06', name: '鸭肉', calories: 240, taste: createTaste(0, 0, 1, 0, 2), category: '肉类' },
  { id: 'i07', name: '草鱼', calories: 113, taste: createTaste(0, 0, 0, 0, 2), category: '水产' },
  { id: 'i08', name: '鲈鱼', calories: 105, taste: createTaste(0, 0, 0, 0, 2), category: '水产' },
  { id: 'i09', name: '虾', calories: 99, taste: createTaste(0, 0, 0, 0, 3), category: '水产' },
  { id: 'i10', name: '螃蟹', calories: 103, taste: createTaste(0, 0, 0, 0, 3), category: '水产' },
  { id: 'i11', name: '鱿鱼', calories: 84, taste: createTaste(0, 0, 0, 0, 3), category: '水产' },
  { id: 'i12', name: '白菜', calories: 17, taste: createTaste(0, 0, 0, 0, 0), category: '蔬菜' },
  { id: 'i13', name: '青菜', calories: 15, taste: createTaste(0, 0, 1, 0, 0), category: '蔬菜' },
  { id: 'i14', name: '番茄', calories: 18, taste: createTaste(6, 2, 0, 0, 0), category: '蔬菜' },
  { id: 'i15', name: '青椒', calories: 27, taste: createTaste(0, 1, 0, 5, 0), category: '蔬菜' },
  { id: 'i16', name: '红椒', calories: 31, taste: createTaste(0, 2, 0, 8, 0), category: '蔬菜' },
  { id: 'i17', name: '土豆', calories: 77, taste: createTaste(0, 1, 0, 0, 0), category: '蔬菜' },
  { id: 'i18', name: '萝卜', calories: 16, taste: createTaste(1, 2, 0, 0, 1), category: '蔬菜' },
  { id: 'i19', name: '胡萝卜', calories: 41, taste: createTaste(0, 3, 0, 0, 0), category: '蔬菜' },
  { id: 'i20', name: '茄子', calories: 25, taste: createTaste(0, 0, 1, 0, 0), category: '蔬菜' },
  { id: 'i21', name: '黄瓜', calories: 16, taste: createTaste(0, 1, 0, 0, 0), category: '蔬菜' },
  { id: 'i22', name: '冬瓜', calories: 12, taste: createTaste(0, 1, 0, 0, 0), category: '蔬菜' },
  { id: 'i23', name: '丝瓜', calories: 20, taste: createTaste(0, 1, 0, 0, 0), category: '蔬菜' },
  { id: 'i24', name: '玉米', calories: 96, taste: createTaste(0, 5, 0, 0, 0), category: '主食' },
  { id: 'i25', name: '大米', calories: 130, taste: createTaste(0, 0, 0, 0, 0), category: '主食' },
  { id: 'i26', name: '面条', calories: 138, taste: createTaste(0, 0, 0, 0, 0), category: '主食' },
  { id: 'i27', name: '馒头', calories: 221, taste: createTaste(0, 1, 0, 0, 1), category: '主食' },
  { id: 'i28', name: '豆腐', calories: 76, taste: createTaste(0, 0, 1, 0, 1), category: '豆制品' },
  { id: 'i29', name: '豆干', calories: 140, taste: createTaste(0, 0, 2, 0, 3), category: '豆制品' },
  { id: 'i30', name: '鸡蛋', calories: 155, taste: createTaste(0, 0, 0, 0, 2), category: '蛋奶' },
  { id: 'i31', name: '牛奶', calories: 42, taste: createTaste(0, 2, 0, 0, 1), category: '蛋奶' },
  { id: 'i32', name: '奶酪', calories: 402, taste: createTaste(0, 0, 1, 0, 5), category: '蛋奶' },
  { id: 'i33', name: '葱花', calories: 30, taste: createTaste(0, 0, 2, 0, 0), category: '蔬菜' },
  { id: 'i34', name: '姜末', calories: 33, taste: createTaste(0, 0, 3, 0, 0), category: '蔬菜' },
  { id: 'i35', name: '蒜末', calories: 98, taste: createTaste(0, 0, 4, 1, 0), category: '蔬菜' },
  { id: 'i36', name: '酱油', calories: 53, taste: createTaste(0, 0, 2, 0, 9), category: '调料' },
  { id: 'i37', name: '香醋', calories: 31, taste: createTaste(8, 1, 0, 0, 2), category: '调料' },
  { id: 'i38', name: '料酒', calories: 44, taste: createTaste(0, 0, 2, 0, 1), category: '调料' },
  { id: 'i39', name: '白糖', calories: 387, taste: createTaste(0, 10, 0, 0, 0), category: '调料' },
  { id: 'i40', name: '食盐', calories: 0, taste: createTaste(0, 0, 0, 0, 10), category: '调料' },
  { id: 'i41', name: '味精', calories: 297, taste: createTaste(0, 0, 0, 0, 8), category: '调料' },
  { id: 'i42', name: '辣椒面', calories: 312, taste: createTaste(0, 0, 2, 9, 3), category: '调料' },
  { id: 'i43', name: '花椒', calories: 258, taste: createTaste(0, 0, 6, 7, 2), category: '调料' },
  { id: 'i44', name: '八角', calories: 296, taste: createTaste(0, 1, 4, 0, 0), category: '调料' },
  { id: 'i45', name: '香油', calories: 884, taste: createTaste(0, 0, 1, 0, 0), category: '调料' },
  { id: 'i46', name: '花生油', calories: 884, taste: createTaste(0, 0, 0, 0, 0), category: '调料' },
  { id: 'i47', name: '蚝油', calories: 181, taste: createTaste(0, 1, 1, 0, 7), category: '调料' },
  { id: 'i48', name: '淀粉', calories: 381, taste: createTaste(0, 0, 0, 0, 0), category: '主食' },
  { id: 'i49', name: '木耳', calories: 265, taste: createTaste(0, 0, 2, 0, 1), category: '蔬菜' },
  { id: 'i50', name: '香菇', calories: 247, taste: createTaste(0, 1, 3, 0, 1), category: '蔬菜' },
];

function findIngredient(name: string): Ingredient {
  const found = INGREDIENTS.find(i => i.name === name);
  if (!found) return INGREDIENTS[0];
  return found;
}

function use(name: string, amount: number, unit = '克'): IngredientUsage {
  const i = findIngredient(name);
  return { id: i.id, name: i.name, amount, unit };
}

export const SEED_RECIPES: Recipe[] = [
  {
    id: 'r01', name: '麻婆豆腐', image: '🥘',
    taste: createTaste(1, 1, 2, 8, 6), category: '川菜',
    description: '经典川菜，麻辣鲜香，嫩滑爽口的豆腐配上浓郁肉沫酱汁。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('豆腐', 400), use('猪肉', 80), use('辣椒面', 5), use('花椒', 2), use('酱油', 15), use('蒜末', 10), use('姜末', 10), use('葱花', 15), use('淀粉', 5), use('花生油', 20)],
      cookTime: 25, steps: ['豆腐切块焯水备用', '热油炒散肉沫', '加姜蒜辣椒炒香', '加水烧开下豆腐', '调味后勾芡撒葱花出锅'],
      votes: 342, weeklyVotes: 28, weekRankHistory: [3, 1, 2, 5], comments: [],
    },
    versions: [
      {
        version: 'v0.1', authorId: 'u_spicy', authorName: '辣王', createdAt: Date.now() - 86400000,
        ingredients: [use('豆腐', 400), use('牛肉', 80, '克'), use('辣椒面', 12, '克', true, 'i42'), use('花椒', 5, '克', true, 'i43'), use('酱油', 15), use('蒜末', 10), use('姜末', 10), use('葱花', 15), use('淀粉', 5), use('花生油', 20)],
        cookTime: 30, steps: ['豆腐切块焯水备用', '热油炒散牛肉沫', '加倍辣椒花椒炒香', '加水烧开下豆腐', '调味后勾芡撒葱花出锅'],
        votes: 189, weeklyVotes: 45, weekRankHistory: [1, 3, null, null], comments: [],
      },
    ],
  },
  {
    id: 'r02', name: '宫保鸡丁', image: '🍗',
    taste: createTaste(3, 5, 1, 6, 4), category: '川菜',
    description: '酸甜微辣，鸡肉嫩滑，花生香脆，经典川味。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('鸡胸肉', 300), use('青椒', 80), use('胡萝卜', 50), use('花生', 50), use('白糖', 20), use('香醋', 20), use('酱油', 15), use('料酒', 10), use('辣椒面', 5), use('淀粉', 5), use('蒜末', 10), use('花生油', 25)],
      cookTime: 20, steps: ['鸡肉切丁腌制备用', '调宫保汁备用', '炸花生', '滑炒鸡丁盛出', '爆香加蔬菜鸡丁', '倒入宫保汁翻炒加花生出锅'],
      votes: 512, weeklyVotes: 38, weekRankHistory: [2, 2, 3, 1], comments: [],
    },
    versions: [],
  },
  {
    id: 'r03', name: '鱼香肉丝', image: '🥩',
    taste: createTaste(6, 4, 0, 5, 5), category: '川菜',
    description: '鱼香味浓郁，肉丝嫩滑，酸甜微辣，开胃下饭。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('猪肉', 250), use('胡萝卜', 80), use('木耳', 30), use('青椒', 60), use('香醋', 20), use('白糖', 18), use('酱油', 15), use('料酒', 10), use('辣椒面', 5), use('淀粉', 5), use('姜末', 8), use('蒜末', 8), use('葱花', 10), use('花生油', 25)],
      cookTime: 25, steps: ['肉丝腌制上浆', '调鱼香汁', '蔬菜切丝焯水', '滑炒肉丝盛出', '爆香加蔬菜', '倒入鱼香汁勾芡出锅'],
      votes: 398, weeklyVotes: 31, weekRankHistory: [5, 4, 4, 3], comments: [],
    },
    versions: [],
  },
  {
    id: 'r04', name: '水煮牛肉', image: '🥣',
    taste: createTaste(0, 1, 1, 9, 5), category: '川菜',
    description: '麻辣鲜香，牛肉嫩滑，红油沸腾，极具川味特色。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('牛肉', 300), use('白菜', 150), use('豆芽', 100), use('辣椒面', 15), use('花椒', 8), use('酱油', 20), use('料酒', 15), use('淀粉', 10), use('蒜末', 15), use('姜末', 10), use('葱花', 15), use('花生油', 40)],
      cookTime: 30, steps: ['牛肉切片腌制备用', '蔬菜焯水铺底', '煮牛肉至断生', '铺在蔬菜上', '撒辣椒花椒淋热油出锅'],
      votes: 421, weeklyVotes: 42, weekRankHistory: [4, 5, 1, 2], comments: [],
    },
    versions: [],
  },
  {
    id: 'r05', name: '糖醋里脊', image: '🍖',
    taste: createTaste(4, 8, 0, 0, 2), category: '鲁菜',
    description: '外酥里嫩，酸甜可口，老少皆宜的经典鲁菜。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('猪肉', 300), use('白糖', 60), use('香醋', 45), use('酱油', 10), use('料酒', 10), use('淀粉', 40), use('面粉', 20), use('番茄', 80), use('鸡蛋', 1), use('花生油', 50), use('葱花', 10)],
      cookTime: 35, steps: ['里脊切条腌制备用', '裹糊油炸至金黄', '复炸酥脆', '调糖醋汁', '倒入里脊翻炒均匀出锅'],
      votes: 578, weeklyVotes: 55, weekRankHistory: [1, 1, 2, 2], comments: [], isClassic: true, classicDate: Date.now() - 86400000 * 7,
    },
    versions: [],
  },
  {
    id: 'r06', name: '白切鸡', image: '🐔',
    taste: createTaste(1, 0, 0, 0, 3), category: '粤菜',
    description: '皮爽肉滑，原汁原味，广东经典名菜。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('鸡腿肉', 500), use('姜', 20), use('葱', 20), use('料酒', 15), use('食盐', 5), use('香油', 10), use('酱油', 20)],
      cookTime: 30, steps: ['三浸三提煮鸡', '冰水浸泡', '斩件摆盘', '姜葱蘸料淋油'],
      votes: 356, weeklyVotes: 22, weekRankHistory: [8, 7, 6, 8], comments: [],
    },
    versions: [],
  },
  {
    id: 'r07', name: '清蒸鲈鱼', image: '🐟',
    taste: createTaste(1, 0, 0, 0, 2), category: '粤菜',
    description: '鱼肉鲜嫩，清香扑鼻，最能体现鱼的原味。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('鲈鱼', 600), use('姜丝', 15), use('葱丝', 15), use('蒸鱼豉油', 20), use('料酒', 10), use('香油', 10)],
      cookTime: 15, steps: ['鱼处理干净划刀', '铺姜葱蒸8分钟', '倒掉盘水', '淋蒸鱼豉油', '热油浇葱丝出锅'],
      votes: 488, weeklyVotes: 36, weekRankHistory: [3, 3, 5, 4], comments: [],
    },
    versions: [],
  },
  {
    id: 'r08', name: '红烧肉', image: '🥓',
    taste: createTaste(0, 6, 1, 0, 4), category: '家常菜',
    description: '肥而不腻，入口即化，色泽红亮，家的味道。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('猪肉', 600), use('白糖', 30), use('酱油', 30), use('料酒', 20), use('八角', 2), use('姜片', 15), use('葱段', 20), use('香叶', 1), use('食盐', 3)],
      cookTime: 90, steps: ['五花肉切块焯水', '炒糖色', '肉块上色', '加调料和水', '小火慢炖收汁出锅'],
      votes: 692, weeklyVotes: 62, weekRankHistory: [1, 2, 1, 1], comments: [], isClassic: true, classicDate: Date.now() - 86400000 * 21,
    },
    versions: [
      {
        version: 'v0.1', authorId: 'u_honey', authorName: '蜜糖小姐', createdAt: Date.now() - 86400000 * 3,
        ingredients: [use('猪肉', 600), use('白糖', 45, '克', true, 'i39'), use('酱油', 30), use('料酒', 20), use('八角', 2), use('姜片', 15), use('葱段', 20), use('香叶', 1), use('食盐', 3)],
        cookTime: 120, steps: ['五花肉切块焯水', '炒糖色加深', '肉块上色', '加调料和水', '小火慢炖2小时收汁出锅'],
        votes: 134, weeklyVotes: 18, weekRankHistory: [null, null, null, null], comments: [],
      },
    ],
  },
  {
    id: 'r09', name: '番茄炒蛋', image: '🍅',
    taste: createTaste(4, 3, 0, 0, 3), category: '家常菜',
    description: '最经典的家常菜，酸甜可口，简单美味。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('番茄', 300), use('鸡蛋', 3), use('白糖', 10), use('食盐', 3), use('葱花', 10), use('花生油', 20)],
      cookTime: 10, steps: ['番茄切块', '鸡蛋打散炒熟盛出', '炒番茄出汁', '倒回鸡蛋', '调味撒葱花出锅'],
      votes: 875, weeklyVotes: 80, weekRankHistory: [1, 1, 1, 1], comments: [], isClassic: true, classicDate: Date.now() - 86400000 * 30,
    },
    versions: [],
  },
  {
    id: 'r10', name: '土豆丝', image: '🥔',
    taste: createTaste(3, 1, 0, 2, 3), category: '家常菜',
    description: '清爽脆口，酸辣开胃，夏日首选。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('土豆', 400), use('青椒', 50), use('红椒', 30), use('香醋', 15), use('花椒', 2), use('食盐', 3), use('蒜末', 8), use('花生油', 20)],
      cookTime: 15, steps: ['土豆切丝泡水', '爆香花椒', '炒土豆丝', '加青椒红椒', '淋醋调味出锅'],
      votes: 456, weeklyVotes: 35, weekRankHistory: [6, 5, 5, 6], comments: [],
    },
    versions: [],
  },
  {
    id: 'r11', name: '青椒肉丝', image: '🌶️',
    taste: createTaste(1, 1, 0, 5, 4), category: '家常菜',
    description: '青椒爽脆，肉丝滑嫩，下饭神器。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('猪肉', 200), use('青椒', 250), use('酱油', 15), use('料酒', 8), use('淀粉', 5), use('食盐', 3), use('蒜末', 8), use('花生油', 20)],
      cookTime: 15, steps: ['肉丝腌制上浆', '青椒切丝', '滑炒肉丝盛出', '爆香炒青椒', '倒回肉丝调味出锅'],
      votes: 389, weeklyVotes: 28, weekRankHistory: [7, 8, 7, 7], comments: [],
    },
    versions: [],
  },
  {
    id: 'r12', name: '鱼香茄子', image: '🍆',
    taste: createTaste(5, 4, 0, 4, 5), category: '川菜',
    description: '茄子软糯，鱼香味浓，素菜荤做的典范。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('茄子', 400), use('猪肉', 50), use('香醋', 15), use('白糖', 12), use('酱油', 12), use('辣椒面', 3), use('淀粉', 5), use('蒜末', 10), use('姜末', 8), use('葱花', 10), use('花生油', 30)],
      cookTime: 25, steps: ['茄子切条裹淀粉', '油炸定型盛出', '炒香肉沫', '调鱼香汁', '倒入茄子翻炒出锅'],
      votes: 312, weeklyVotes: 25, weekRankHistory: [9, 10, 8, 9], comments: [],
    },
    versions: [],
  },
  {
    id: 'r13', name: '红烧排骨', image: '🍖',
    taste: createTaste(0, 5, 1, 0, 4), category: '家常菜',
    description: '肉质酥烂，酱香浓郁，大人小孩都爱。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('排骨', 600), use('白糖', 25), use('酱油', 25), use('料酒', 20), use('八角', 2), use('姜片', 15), use('葱段', 20), use('食盐', 3), use('花生油', 15)],
      cookTime: 60, steps: ['排骨焯水', '炒糖色', '排骨上色', '加调料和水', '小火慢炖收汁'],
      votes: 623, weeklyVotes: 52, weekRankHistory: [2, 4, 3, 2], comments: [], isClassic: true, classicDate: Date.now() - 86400000 * 14,
    },
    versions: [],
  },
  {
    id: 'r14', name: '可乐鸡翅', image: '🍗',
    taste: createTaste(0, 7, 0, 0, 3), category: '家常菜',
    description: '甜甜嫩嫩，做法简单，小朋友最爱的鸡翅做法。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('鸡翅', 500), use('酱油', 20), use('料酒', 15), use('姜片', 10), use('可乐', 200), use('食盐', 2)],
      cookTime: 35, steps: ['鸡翅划刀焯水', '煎至金黄', '加调料可乐', '小火收汁'],
      votes: 567, weeklyVotes: 48, weekRankHistory: [4, 6, 4, 5], comments: [],
    },
    versions: [],
  },
  {
    id: 'r15', name: '辣子鸡', image: '🌶️',
    taste: createTaste(0, 1, 1, 9, 5), category: '川菜',
    description: '干香麻辣，外酥里嫩，越吃越上瘾。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('鸡腿肉', 400), use('干辣椒', 50), use('花椒', 10), use('酱油', 15), use('料酒', 15), use('淀粉', 15), use('蒜末', 10), use('姜末', 10), use('花生', 30), use('白糖', 5), use('食盐', 3), use('花生油', 40)],
      cookTime: 30, steps: ['鸡肉切块腌制', '油炸金黄酥脆', '爆香干辣椒花椒', '倒回鸡肉花生', '翻炒出锅'],
      votes: 445, weeklyVotes: 38, weekRankHistory: [5, 6, 6, 5], comments: [],
    },
    versions: [],
  },
  {
    id: 'r16', name: '回锅肉', image: '🥩',
    taste: createTaste(1, 1, 0, 5, 5), category: '川菜',
    description: '川菜之首，肥而不腻，青蒜香浓。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('猪肉', 350), use('青椒', 150), use('蒜苗', 100), use('豆瓣酱', 20), use('酱油', 10), use('白糖', 5), use('豆豉', 8), use('姜片', 10), use('花生油', 15)],
      cookTime: 25, steps: ['五花肉煮熟切片', '煎至两面金黄', '加豆瓣酱豆豉', '加蔬菜调料', '翻炒出锅'],
      votes: 521, weeklyVotes: 40, weekRankHistory: [3, 5, 4, 3], comments: [],
    },
    versions: [],
  },
  {
    id: 'r17', name: '蒜蓉虾', image: '🦐',
    taste: createTaste(1, 0, 2, 0, 4), category: '粤菜',
    description: '蒜香浓郁，虾肉鲜甜，蒸出来的美味。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('虾', 400), use('蒜末', 40), use('粉丝', 50), use('蒸鱼豉油', 20), use('料酒', 10), use('葱花', 15), use('花生油', 15)],
      cookTime: 15, steps: ['虾处理开背', '粉丝泡软铺底', '摆虾放蒜蓉', '大火蒸8分钟', '淋豉油热油出锅'],
      votes: 488, weeklyVotes: 33, weekRankHistory: [7, 7, 8, 6], comments: [],
    },
    versions: [],
  },
  {
    id: 'r18', name: '糖醋排骨', image: '🍖',
    taste: createTaste(5, 7, 0, 0, 2), category: '家常菜',
    description: '酸甜可口，色泽诱人，大人小孩都爱。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('排骨', 500), use('白糖', 50), use('香醋', 40), use('酱油', 15), use('料酒', 15), use('番茄', 50), use('淀粉', 10), use('姜片', 10), use('食盐', 2), use('花生油', 30)],
      cookTime: 45, steps: ['排骨焯水', '油炸金黄', '调糖醋汁', '倒入排骨裹匀', '收汁出锅'],
      votes: 534, weeklyVotes: 44, weekRankHistory: [4, 3, 5, 4], comments: [],
    },
    versions: [],
  },
  {
    id: 'r19', name: '葱烧豆腐', image: '🫘',
    taste: createTaste(0, 1, 1, 0, 5), category: '家常菜',
    description: '葱香浓郁，豆腐嫩滑，简单素菜。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('豆腐', 400), use('葱段', 60), use('酱油', 20), use('蚝油', 10), use('白糖', 3), use('淀粉', 5), use('食盐', 2), use('花生油', 20)],
      cookTime: 15, steps: ['豆腐切块煎金黄', '爆香葱段', '加调料', '炖入味勾芡出锅'],
      votes: 278, weeklyVotes: 20, weekRankHistory: [12, null, null, null], comments: [],
    },
    versions: [],
  },
  {
    id: 'r20', name: '冬瓜排骨汤', image: '🍲',
    taste: createTaste(0, 1, 0, 0, 3), category: '汤品',
    description: '清润去火，排骨酥烂，冬瓜透明，汤鲜味美。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('排骨', 400), use('冬瓜', 300), use('姜片', 10), use('葱段', 15), use('料酒', 10), use('食盐', 3), use('香油', 5)],
      cookTime: 80, steps: ['排骨焯水', '加水和姜片炖1小时', '加冬瓜炖20分钟', '调味淋香油出锅'],
      votes: 412, weeklyVotes: 30, weekRankHistory: [8, 9, 7, 8], comments: [],
    },
    versions: [],
  },
  {
    id: 'r21', name: '西红柿鸡蛋汤', image: '🥣',
    taste: createTaste(3, 2, 0, 0, 3), category: '汤品',
    description: '最家常的汤品，酸甜开胃，简单快捷。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('番茄', 200), use('鸡蛋', 2), use('葱花', 10), use('食盐', 2), use('白糖', 2), use('香油', 3), use('淀粉', 3)],
      cookTime: 10, steps: ['番茄切块炒出汁', '加水烧开', '淋蛋液', '勾芡调味淋香油出锅'],
      votes: 634, weeklyVotes: 55, weekRankHistory: [2, 2, 2, 2], comments: [], isClassic: true, classicDate: Date.now() - 86400000 * 10,
    },
    versions: [],
  },
  {
    id: 'r22', name: '酸辣土豆丝', image: '🥔',
    taste: createTaste(5, 1, 0, 3, 4), category: '家常菜',
    description: '酸辣开胃，脆爽可口，下饭神器。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('土豆', 400), use('青椒', 50), use('干辣椒', 10), use('花椒', 3), use('香醋', 20), use('食盐', 3), use('蒜末', 10), use('花生油', 20)],
      cookTime: 12, steps: ['土豆丝泡水', '爆香花椒干辣椒', '大火快炒土豆丝', '淋醋加青椒', '调味出锅'],
      votes: 512, weeklyVotes: 42, weekRankHistory: [5, 5, 5, 5], comments: [],
    },
    versions: [],
  },
  {
    id: 'r23', name: '咖喱鸡', image: '🍛',
    taste: createTaste(1, 2, 3, 1, 5), category: '东南亚',
    description: '浓郁咖喱，嫩滑鸡肉，拌饭绝佳。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('鸡腿肉', 400), use('土豆', 200), use('胡萝卜', 100), use('洋葱', 80), use('咖喱块', 50), use('椰奶', 100), use('食盐', 2), use('花生油', 20)],
      cookTime: 45, steps: ['鸡肉切块煎香', '加蔬菜翻炒', '加水咖喱块', '小火炖30分钟', '加椰奶收汁出锅'],
      votes: 367, weeklyVotes: 28, weekRankHistory: [9, 8, 9, 10], comments: [],
    },
    versions: [],
  },
  {
    id: 'r24', name: '凉拌黄瓜', image: '🥒',
    taste: createTaste(4, 1, 0, 3, 4), category: '凉菜',
    description: '清爽解腻，简单快手，夏日必备凉菜。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('黄瓜', 300), use('蒜末', 10), use('香醋', 15), use('酱油', 8), use('白糖', 3), use('辣椒面', 3), use('香油', 5), use('食盐', 2)],
      cookTime: 5, steps: ['黄瓜拍碎切段', '加盐腌5分钟挤水', '加蒜末调料', '拌匀淋香油出锅'],
      votes: 456, weeklyVotes: 39, weekRankHistory: [6, 6, 6, 6], comments: [],
    },
    versions: [],
  },
  {
    id: 'r25', name: '八宝饭', image: '🍚',
    taste: createTaste(0, 8, 0, 0, 0), category: '甜品',
    description: '软糯香甜，八宝料足，节日必备甜品。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('糯米', 300), use('白糖', 80), use('猪油', 30), use('红枣', 30), use('莲子', 20), use('葡萄干', 20), use('红豆沙', 100), use('玉米', 30)],
      cookTime: 60, steps: ['糯米泡4小时', '拌糖和猪油', '碗里摆果料', '铺米加豆沙', '上锅蒸1小时扣盘'],
      votes: 289, weeklyVotes: 18, weekRankHistory: [15, null, null, null], comments: [],
    },
    versions: [],
  },
  {
    id: 'r26', name: '拔丝地瓜', image: '🍠',
    taste: createTaste(0, 9, 0, 0, 0), category: '甜品',
    description: '金黄酥脆，丝丝相连，甜甜的幸福味道。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('土豆', 500), use('白糖', 150), use('淀粉', 30), use('花生油', 40)],
      cookTime: 25, steps: ['地瓜切块裹淀粉', '油炸金黄', '锅中炒糖色', '倒回地瓜翻匀', '趁热拔出丝'],
      votes: 312, weeklyVotes: 22, weekRankHistory: [11, 10, 11, 12], comments: [],
    },
    versions: [],
  },
  {
    id: 'r27', name: '芒果布丁', image: '🥭',
    taste: createTaste(0, 7, 0, 0, 0), category: '甜品',
    description: '香滑细腻，芒果味浓郁，冰凉解暑。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('牛奶', 250), use('白糖', 50), use('奶油', 50), use('芒果', 200), use('淀粉', 15)],
      cookTime: 20, steps: ['芒果打成果泥', '牛奶加糖煮开', '加淀粉糊化', '拌入芒果泥', '冷藏4小时凝固'],
      votes: 378, weeklyVotes: 30, weekRankHistory: [10, 11, 10, 11], comments: [],
    },
    versions: [],
  },
  {
    id: 'r28', name: '蛋炒饭', image: '🍳',
    taste: createTaste(0, 1, 0, 0, 4), category: '主食',
    description: '粒粒分明，蛋香浓郁，黄金蛋炒饭。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('大米', 300), use('鸡蛋', 2), use('葱花', 15), use('食盐', 3), use('酱油', 5), use('花生油', 15)],
      cookTime: 10, steps: ['冷米饭打散', '鸡蛋炒散', '加米饭大火翻炒', '调味撒葱花', '粒粒分明出锅'],
      votes: 890, weeklyVotes: 72, weekRankHistory: [1, 1, 2, 1], comments: [], isClassic: true, classicDate: Date.now() - 86400000 * 25,
    },
    versions: [
      {
        version: 'v0.1', authorId: 'u_chef', authorName: '料理达人', createdAt: Date.now() - 86400000 * 5,
        ingredients: [use('大米', 300), use('鸡蛋', 3, '个', true, 'i30'), use('火腿', 50), use('胡萝卜', 30), use('玉米', 20), use('葱花', 15), use('食盐', 3), use('酱油', 5), use('花生油', 15)],
        cookTime: 15, steps: ['冷米饭打散', '蔬菜火腿切丁', '鸡蛋炒散', '加蔬菜火腿炒香', '加米饭大火翻炒调味出锅'],
        votes: 256, weeklyVotes: 35, weekRankHistory: [2, null, null, null], comments: [],
      },
    ],
  },
  {
    id: 'r29', name: '炸酱面', image: '🍜',
    taste: createTaste(1, 1, 0, 0, 6), category: '主食',
    description: '酱香浓郁，面条筋道，经典北方面食。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('面条', 300), use('猪肉', 150), use('豆干', 50), use('香菇', 30), use('酱油', 20), use('甜面酱', 30), use('白糖', 5), use('姜末', 8), use('蒜末', 8), use('葱花', 15), use('黄瓜', 50), use('胡萝卜', 50), use('豆芽', 50), use('花生油', 20)],
      cookTime: 30, steps: ['肉沫豆干香菇切丁炒香', '加酱料熬成炸酱', '面条煮熟过凉', '蔬菜切丝码面', '浇上炸酱拌匀'],
      votes: 543, weeklyVotes: 46, weekRankHistory: [3, 4, 3, 3], comments: [],
    },
    versions: [],
  },
  {
    id: 'r30', name: '扬州炒饭', image: '🍱',
    taste: createTaste(0, 1, 0, 0, 4), category: '主食',
    description: '粒粒分明，五彩缤纷，扬州名点。',
    updatedAt: Date.now(),
    baseVersion: {
      version: 'v0.0', authorId: 'system', authorName: '食谱库', createdAt: Date.now(),
      ingredients: [use('大米', 300), use('鸡蛋', 2), use('虾', 50), use('火腿', 50), use('胡萝卜', 40), use('玉米', 30), use('豌豆', 30), use('葱花', 15), use('食盐', 3), use('料酒', 5), use('花生油', 20)],
      cookTime: 15, steps: ['虾仁火腿蔬菜切丁', '虾仁焯水', '鸡蛋炒散', '加全部食材翻炒', '米饭拌匀调味出锅'],
      votes: 612, weeklyVotes: 50, weekRankHistory: [2, 3, 2, 2], comments: [], isClassic: true, classicDate: Date.now() - 86400000 * 18,
    },
    versions: [],
  },
];

export function getIngredientById(id: string): Ingredient | undefined {
  return INGREDIENTS.find(i => i.id === id);
}
