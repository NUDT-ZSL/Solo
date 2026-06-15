import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Recipe } from '../../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'recipes.db');
const db = Datastore.create({ filename: dbPath, autoload: true });

const sampleRecipes: Recipe[] = [
  {
    name: '番茄炒蛋',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tomato%20scrambled%20eggs%20chinese%20food%20on%20white%20plate&image_size=square',
    prepTime: 15,
    ingredients: [
      { name: '番茄', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '葱', amount: '适量' },
      { name: '盐', amount: '少许' },
      { name: '糖', amount: '少许' },
    ],
    steps: [
      { order: 1, description: '番茄切块，鸡蛋打散备用。' },
      { order: 2, description: '热锅凉油，倒入蛋液炒至凝固盛出。' },
      { order: 3, description: '锅中加油，放入番茄翻炒出汁。' },
      { order: 4, description: '加入盐、糖调味，倒入炒好的鸡蛋翻炒均匀。' },
      { order: 5, description: '撒上葱花即可出锅。' },
    ],
    favorite: false,
  },
  {
    name: '红烧肉',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=braised%20pork%20belly%20hongshao%20rou%20chinese%20cuisine&image_size=square',
    prepTime: 90,
    ingredients: [
      { name: '五花肉', amount: '500g' },
      { name: '冰糖', amount: '30g' },
      { name: '生抽', amount: '2勺' },
      { name: '老抽', amount: '1勺' },
      { name: '料酒', amount: '2勺' },
      { name: '姜', amount: '3片' },
      { name: '八角', amount: '2个' },
    ],
    steps: [
      { order: 1, description: '五花肉切块，冷水下锅焯水去腥。' },
      { order: 2, description: '锅中放少许油，加入冰糖小火炒出糖色。' },
      { order: 3, description: '放入五花肉翻炒上色。' },
      { order: 4, description: '加入生抽、老抽、料酒、姜片、八角，加水没过肉。' },
      { order: 5, description: '大火烧开后转小火炖60分钟。' },
      { order: 6, description: '大火收汁至浓稠即可。' },
    ],
    favorite: false,
  },
  {
    name: '蒜蓉西兰花',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=garlic%20broccoli%20stir%20fry%20chinese%20vegetable%20dish&image_size=square',
    prepTime: 10,
    ingredients: [
      { name: '西兰花', amount: '1颗' },
      { name: '大蒜', amount: '3瓣' },
      { name: '盐', amount: '适量' },
      { name: '蚝油', amount: '1勺' },
    ],
    steps: [
      { order: 1, description: '西兰花切小朵，洗净沥干。' },
      { order: 2, description: '大蒜切末备用。' },
      { order: 3, description: '烧开水，加少许盐和油，西兰花焯水1分钟捞出。' },
      { order: 4, description: '热锅凉油，爆香蒜末。' },
      { order: 5, description: '放入西兰花翻炒，加盐、蚝油调味即可。' },
    ],
    favorite: false,
  },
  {
    name: '酸辣土豆丝',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spicy%20sour%20shredded%20potato%20chinese%20dish%20on%20plate&image_size=square',
    prepTime: 20,
    ingredients: [
      { name: '土豆', amount: '2个' },
      { name: '干辣椒', amount: '5个' },
      { name: '醋', amount: '2勺' },
      { name: '盐', amount: '适量' },
      { name: '葱', amount: '适量' },
    ],
    steps: [
      { order: 1, description: '土豆去皮切丝，泡水去淀粉。' },
      { order: 2, description: '干辣椒剪段，葱切葱花。' },
      { order: 3, description: '热锅凉油，爆香干辣椒。' },
      { order: 4, description: '土豆丝沥干下锅大火快炒。' },
      { order: 5, description: '加醋、盐调味，撒葱花出锅。' },
    ],
    favorite: false,
  },
  {
    name: '宫保鸡丁',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kung%20pao%20chicken%20gongbao%20jiding%20with%20peanuts&image_size=square',
    prepTime: 25,
    ingredients: [
      { name: '鸡胸肉', amount: '300g' },
      { name: '花生米', amount: '50g' },
      { name: '干辣椒', amount: '10个' },
      { name: '花椒', amount: '少许' },
      { name: '生抽', amount: '2勺' },
      { name: '醋', amount: '1勺' },
      { name: '糖', amount: '1勺' },
      { name: '淀粉', amount: '适量' },
    ],
    steps: [
      { order: 1, description: '鸡胸肉切丁，用生抽、淀粉腌制10分钟。' },
      { order: 2, description: '调碗汁：生抽、醋、糖、淀粉、水拌匀。' },
      { order: 3, description: '花生米小火炸至金黄捞出。' },
      { order: 4, description: '锅中留油，爆香花椒、干辣椒。' },
      { order: 5, description: '放入鸡丁滑炒至变色。' },
      { order: 6, description: '倒入碗汁翻炒至浓稠，加入花生米炒匀出锅。' },
    ],
    favorite: false,
  },
  {
    name: '麻婆豆腐',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mapo%20tofu%20sichuan%20spicy%20chinese%20food&image_size=square',
    prepTime: 20,
    ingredients: [
      { name: '嫩豆腐', amount: '1盒' },
      { name: '肉末', amount: '100g' },
      { name: '豆瓣酱', amount: '2勺' },
      { name: '花椒粉', amount: '少许' },
      { name: '生抽', amount: '1勺' },
      { name: '淀粉', amount: '适量' },
      { name: '葱', amount: '适量' },
    ],
    steps: [
      { order: 1, description: '豆腐切小块，用盐水浸泡备用。' },
      { order: 2, description: '热锅凉油，放入肉末炒散。' },
      { order: 3, description: '加入豆瓣酱炒出红油。' },
      { order: 4, description: '加适量水烧开，放入豆腐轻推均匀。' },
      { order: 5, description: '加生抽调味，水淀粉勾芡。' },
      { order: 6, description: '撒花椒粉和葱花即可。' },
    ],
    favorite: false,
  },
  {
    name: '清蒸鲈鱼',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=steamed%20sea%20bass%20fish%20chinese%20cantonese%20style&image_size=square',
    prepTime: 20,
    ingredients: [
      { name: '鲈鱼', amount: '1条' },
      { name: '葱', amount: '适量' },
      { name: '姜', amount: '适量' },
      { name: '蒸鱼豉油', amount: '2勺' },
      { name: '料酒', amount: '1勺' },
    ],
    steps: [
      { order: 1, description: '鲈鱼处理干净，两面划几刀，抹上料酒腌制。' },
      { order: 2, description: '盘底铺葱姜丝，放上鱼，鱼腹内也塞葱姜。' },
      { order: 3, description: '水开后上锅蒸8-10分钟。' },
      { order: 4, description: '蒸好后倒掉盘中汤水，铺上新的葱丝。' },
      { order: 5, description: '淋上蒸鱼豉油，浇上热油激出香味。' },
    ],
    favorite: false,
  },
  {
    name: '蛋炒饭',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=egg%20fried%20rice%20chinese%20style%20golden%20grains&image_size=square',
    prepTime: 10,
    ingredients: [
      { name: '隔夜米饭', amount: '1碗' },
      { name: '鸡蛋', amount: '2个' },
      { name: '葱', amount: '适量' },
      { name: '盐', amount: '适量' },
    ],
    steps: [
      { order: 1, description: '鸡蛋打散，隔夜米饭打散备用。' },
      { order: 2, description: '热锅凉油，倒入蛋液快速划散。' },
      { order: 3, description: '倒入米饭大火翻炒均匀。' },
      { order: 4, description: '加盐调味，撒葱花翻炒出锅。' },
    ],
    favorite: false,
  },
];

async function initData() {
  const count = await db.count({});
  if (count === 0) {
    console.log('[DB] Initializing sample recipes...');
    const recipesWithDates = sampleRecipes.map((r) => ({
      ...r,
      createdAt: new Date().toISOString(),
    }));
    await db.insert(recipesWithDates);
    console.log(`[DB] Inserted ${sampleRecipes.length} sample recipes`);
  }
}

initData().catch(console.error);

export const recipeModel = {
  async getAll(): Promise<Recipe[]> {
    return db.find<Recipe>({}).sort({ createdAt: -1 });
  },

  async getById(id: string): Promise<Recipe | null> {
    return db.findOne<Recipe>({ _id: id });
  },

  async searchByIngredients(ingredients: string[]): Promise<Recipe[]> {
    const startTime = Date.now();
    const allRecipes = await db.find<Recipe>({});
    const lowerIngredients = ingredients.map((i) => i.toLowerCase().trim());

    const results = allRecipes
      .map((recipe) => {
        const recipeIngredientNames = recipe.ingredients.map((ing) =>
          ing.name.toLowerCase()
        );
        const matchCount = lowerIngredients.filter((ing) =>
          recipeIngredientNames.some((name) => name.includes(ing) || ing.includes(name))
        ).length;
        return { recipe, matchCount };
      })
      .filter((r) => r.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .map((r) => r.recipe);

    const duration = Date.now() - startTime;
    console.log(`[Performance] DB search: ${duration}ms, matched ${results.length} recipes`);

    return results;
  },

  async create(recipe: Omit<Recipe, '_id' | 'favorite' | 'createdAt'>): Promise<Recipe> {
    const newRecipe: Recipe = {
      ...recipe,
      favorite: false,
      createdAt: new Date().toISOString(),
    };
    return db.insert<Recipe>(newRecipe as any);
  },

  async toggleFavorite(id: string, favorite: boolean): Promise<Recipe | null> {
    const updated = await db.update<Recipe>(
      { _id: id },
      { $set: { favorite } },
      { returnUpdatedDocs: true }
    );
    if (Array.isArray(updated)) return updated[1] as unknown as Recipe;
    return null;
  },

  async delete(id: string): Promise<number> {
    return db.remove({ _id: id }, {});
  },
};

export default db;
