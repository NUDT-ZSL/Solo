import initSqlJs, { Database } from 'sql.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const dbPath = join(__dirname, 'recipes.db');

export interface Ingredient {
  id: string;
  name: string;
  category: string;
}

export interface RecipeStep {
  description: string;
  duration: number;
}

export interface Recipe {
  id: string;
  name: string;
  cuisine: 'chinese' | 'western' | 'japanese' | 'other';
  ingredients: { name: string; amount: string }[];
  steps: RecipeStep[];
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

export interface Favorite {
  id: string;
  recipeId: string;
  recipeName: string;
  cuisine: string;
  difficulty: string;
  createdAt: string;
}

const defaultIngredients: Omit<Ingredient, 'id'>[] = [
  { name: '鸡胸肉', category: '肉类' },
  { name: '牛肉', category: '肉类' },
  { name: '猪肉', category: '肉类' },
  { name: '鸡蛋', category: '蛋类' },
  { name: '豆腐', category: '豆制品' },
  { name: '三文鱼', category: '海鲜' },
  { name: '虾', category: '海鲜' },
  { name: '西兰花', category: '蔬菜' },
  { name: '胡萝卜', category: '蔬菜' },
  { name: '洋葱', category: '蔬菜' },
  { name: '西红柿', category: '蔬菜' },
  { name: '黄瓜', category: '蔬菜' },
  { name: '生菜', category: '蔬菜' },
  { name: '土豆', category: '蔬菜' },
  { name: '茄子', category: '蔬菜' },
  { name: '青椒', category: '蔬菜' },
  { name: '菠菜', category: '蔬菜' },
  { name: '蘑菇', category: '蔬菜' },
  { name: '大蒜', category: '调料' },
  { name: '生姜', category: '调料' },
  { name: '葱', category: '调料' },
  { name: '柠檬', category: '水果' },
  { name: '苹果', category: '水果' },
  { name: '香蕉', category: '水果' },
  { name: '米饭', category: '主食' },
  { name: '面条', category: '主食' },
  { name: '面包', category: '主食' },
  { name: '意大利面', category: '主食' },
  { name: '酱油', category: '调料' },
  { name: '盐', category: '调料' },
  { name: '糖', category: '调料' },
  { name: '醋', category: '调料' },
  { name: '料酒', category: '调料' },
  { name: '橄榄油', category: '调料' },
  { name: '花生油', category: '调料' },
  { name: '黑胡椒', category: '调料' },
  { name: '孜然', category: '调料' },
  { name: '辣椒粉', category: '调料' },
  { name: '咖喱粉', category: '调料' },
  { name: '奶酪', category: '乳制品' },
  { name: '牛奶', category: '乳制品' },
  { name: '酸奶', category: '乳制品' },
  { name: '黄油', category: '乳制品' },
  { name: '蜂蜜', category: '调料' },
  { name: '番茄酱', category: '调料' },
  { name: '豆瓣酱', category: '调料' },
  { name: '香菇', category: '蔬菜' },
  { name: '金针菇', category: '蔬菜' },
  { name: '木耳', category: '蔬菜' },
  { name: '海带', category: '海鲜' },
  { name: '紫菜', category: '海鲜' },
  { name: '豆芽', category: '蔬菜' },
  { name: '白菜', category: '蔬菜' },
  { name: '油菜', category: '蔬菜' },
  { name: '芹菜', category: '蔬菜' },
  { name: '韭菜', category: '蔬菜' },
  { name: '山药', category: '蔬菜' },
  { name: '莲藕', category: '蔬菜' },
  { name: '竹笋', category: '蔬菜' },
  { name: '玉米', category: '蔬菜' },
  { name: '豌豆', category: '蔬菜' },
  { name: '毛豆', category: '蔬菜' },
  { name: '蚕豆', category: '蔬菜' },
  { name: '豆角', category: '蔬菜' },
  { name: '四季豆', category: '蔬菜' },
  { name: '冬瓜', category: '蔬菜' },
  { name: '南瓜', category: '蔬菜' },
  { name: '苦瓜', category: '蔬菜' },
  { name: '白萝卜', category: '蔬菜' },
  { name: '红萝卜', category: '蔬菜' },
  { name: '紫薯', category: '蔬菜' },
  { name: '红薯', category: '蔬菜' },
  { name: '荸荠', category: '蔬菜' },
  { name: '茨菇', category: '蔬菜' },
  { name: '小葱', category: '调料' },
  { name: '大葱', category: '调料' },
  { name: '蒜苗', category: '调料' },
  { name: '蒜苔', category: '蔬菜' },
  { name: '韭菜花', category: '蔬菜' },
  { name: '花椰菜', category: '蔬菜' },
  { name: '紫甘蓝', category: '蔬菜' },
  { name: '卷心菜', category: '蔬菜' },
  { name: '娃娃菜', category: '蔬菜' },
  { name: '鸡毛菜', category: '蔬菜' },
  { name: '空心菜', category: '蔬菜' },
  { name: '油麦菜', category: '蔬菜' },
  { name: '苦菊', category: '蔬菜' },
  { name: '芝麻菜', category: '蔬菜' },
  { name: '罗勒', category: '调料' },
  { name: '薄荷', category: '调料' },
  { name: '迷迭香', category: '调料' },
  { name: '百里香', category: '调料' },
  { name: '欧芹', category: '调料' },
  { name: '紫苏', category: '调料' },
  { name: '芝麻', category: '调料' },
  { name: '花生', category: '坚果' },
  { name: '核桃', category: '坚果' },
  { name: '杏仁', category: '坚果' },
  { name: '腰果', category: '坚果' },
  { name: '松子', category: '坚果' },
  { name: '枸杞', category: '药材' },
  { name: '红枣', category: '药材' },
  { name: '桂圆', category: '药材' },
  { name: '莲子', category: '药材' },
  { name: '百合', category: '药材' },
  { name: '银耳', category: '药材' },
  { name: '黑木耳', category: '蔬菜' },
  { name: '白木耳', category: '药材' },
  { name: '粉丝', category: '主食' },
  { name: '粉条', category: '主食' },
  { name: '年糕', category: '主食' },
  { name: '饺子皮', category: '主食' },
  { name: '馄饨皮', category: '主食' },
  { name: '春卷皮', category: '主食' },
  { name: '巧克力', category: '零食' },
  { name: '葡萄干', category: '零食' },
  { name: '蔓越莓干', category: '零食' },
  { name: '蓝莓干', category: '零食' },
  { name: '草莓', category: '水果' },
  { name: '蓝莓', category: '水果' },
  { name: '树莓', category: '水果' },
  { name: '橙子', category: '水果' },
  { name: '橘子', category: '水果' },
  { name: '柚子', category: '水果' },
  { name: '葡萄', category: '水果' },
  { name: '提子', category: '水果' },
  { name: '猕猴桃', category: '水果' },
  { name: '芒果', category: '水果' },
  { name: '菠萝', category: '水果' },
  { name: '火龙果', category: '水果' },
  { name: '牛油果', category: '水果' },
  { name: '椰子', category: '水果' },
  { name: '榴莲', category: '水果' },
  { name: '山竹', category: '水果' },
  { name: '荔枝', category: '水果' },
  { name: '龙眼', category: '水果' },
  { name: '樱桃', category: '水果' },
  { name: '桃子', category: '水果' },
  { name: '李子', category: '水果' },
  { name: '杏子', category: '水果' },
  { name: '杨梅', category: '水果' },
  { name: '枣', category: '水果' },
  { name: '山楂', category: '水果' },
  { name: '柿子', category: '水果' },
  { name: '石榴', category: '水果' },
  { name: '百香果', category: '水果' },
  { name: '罗汉果', category: '药材' },
  { name: '胖大海', category: '药材' },
  { name: '菊花', category: '药材' },
  { name: '金银花', category: '药材' },
  { name: '玫瑰花', category: '药材' },
  { name: '桂花', category: '药材' },
  { name: '茉莉花', category: '药材' },
  { name: '丁香', category: '调料' },
  { name: '八角', category: '调料' },
  { name: '桂皮', category: '调料' },
  { name: '香叶', category: '调料' },
  { name: '草果', category: '调料' },
  { name: '豆蔻', category: '调料' },
  { name: '砂仁', category: '调料' },
  { name: '陈皮', category: '调料' },
  { name: '甘草', category: '调料' },
  { name: '鸡腿肉', category: '肉类' },
  { name: '鸡翅', category: '肉类' },
  { name: '鸡爪', category: '肉类' },
  { name: '鸡肝', category: '肉类' },
  { name: '鸡胗', category: '肉类' },
  { name: '鸭胸肉', category: '肉类' },
  { name: '鸭肉', category: '肉类' },
  { name: '鸭血', category: '肉类' },
  { name: '鹅肉', category: '肉类' },
  { name: '鹌鹑蛋', category: '蛋类' },
  { name: '鸭蛋', category: '蛋类' },
  { name: '鹅蛋', category: '蛋类' },
  { name: '咸蛋', category: '蛋类' },
  { name: '皮蛋', category: '蛋类' },
  { name: '牛排', category: '肉类' },
  { name: '牛腩', category: '肉类' },
  { name: '牛腱子', category: '肉类' },
  { name: '牛里脊', category: '肉类' },
  { name: '牛百叶', category: '肉类' },
  { name: '牛肚', category: '肉类' },
  { name: '羊排', category: '肉类' },
  { name: '羊肉', category: '肉类' },
  { name: '羊腿', category: '肉类' },
  { name: '里脊肉', category: '肉类' },
  { name: '五花肉', category: '肉类' },
  { name: '肘子', category: '肉类' },
  { name: '猪蹄', category: '肉类' },
  { name: '猪肚', category: '肉类' },
  { name: '猪大肠', category: '肉类' },
  { name: '猪肝', category: '肉类' },
  { name: '猪腰', category: '肉类' },
  { name: '猪心', category: '肉类' },
  { name: '猪肺', category: '肉类' },
  { name: '猪血', category: '肉类' },
  { name: '培根', category: '肉类' },
  { name: '火腿', category: '肉类' },
  { name: '香肠', category: '肉类' },
  { name: '腊肠', category: '肉类' },
  { name: '腊肉', category: '肉类' },
  { name: '午餐肉', category: '肉类' },
  { name: '蟹', category: '海鲜' },
  { name: '螃蟹', category: '海鲜' },
  { name: '大闸蟹', category: '海鲜' },
  { name: '梭子蟹', category: '海鲜' },
  { name: '青蟹', category: '海鲜' },
  { name: '花蟹', category: '海鲜' },
  { name: '扇贝', category: '海鲜' },
  { name: '生蚝', category: '海鲜' },
  { name: '牡蛎', category: '海鲜' },
  { name: '蛤蜊', category: '海鲜' },
  { name: '蛏子', category: '海鲜' },
  { name: '蚬子', category: '海鲜' },
  { name: '海螺', category: '海鲜' },
  { name: '鲍鱼', category: '海鲜' },
  { name: '海参', category: '海鲜' },
  { name: '鱿鱼', category: '海鲜' },
  { name: '墨鱼', category: '海鲜' },
  { name: '章鱼', category: '海鲜' },
  { name: '带鱼', category: '海鲜' },
  { name: '黄鱼', category: '海鲜' },
  { name: '鲈鱼', category: '海鲜' },
  { name: '鲫鱼', category: '海鲜' },
  { name: '鲤鱼', category: '海鲜' },
  { name: '草鱼', category: '海鲜' },
  { name: '鲢鱼', category: '海鲜' },
  { name: '鳙鱼', category: '海鲜' },
  { name: '鳜鱼', category: '海鲜' },
  { name: '黑鱼', category: '海鲜' },
  { name: '鲶鱼', category: '海鲜' },
  { name: '黄鳝', category: '海鲜' },
  { name: '泥鳅', category: '海鲜' },
  { name: '鳗鱼', category: '海鲜' },
  { name: '银鱼', category: '海鲜' },
  { name: '沙丁鱼', category: '海鲜' },
  { name: '金枪鱼', category: '海鲜' },
  { name: '鳕鱼', category: '海鲜' },
  { name: '龙利鱼', category: '海鲜' },
  { name: '巴沙鱼', category: '海鲜' },
  { name: '秋刀鱼', category: '海鲜' },
  { name: '多宝鱼', category: '海鲜' },
  { name: '石斑鱼', category: '海鲜' }
];

const defaultRecipes: Omit<Recipe, 'id'>[] = [
  {
    name: '香煎鸡胸肉沙拉',
    cuisine: 'western',
    ingredients: [
      { name: '鸡胸肉', amount: '200g' },
      { name: '生菜', amount: '100g' },
      { name: '西兰花', amount: '50g' },
      { name: '柠檬', amount: '半个' },
      { name: '橄榄油', amount: '1勺' },
      { name: '黑胡椒', amount: '适量' },
      { name: '盐', amount: '适量' }
    ],
    steps: [
      { description: '鸡胸肉用盐和黑胡椒腌制15分钟', duration: 15 },
      { description: '西兰花焯水备用', duration: 5 },
      { description: '平底锅加橄榄油，中火煎鸡胸肉，每面3-4分钟', duration: 8 },
      { description: '煎好的鸡胸肉静置3分钟后切片', duration: 3 },
      { description: '生菜洗净摆盘，放上西兰花和鸡胸肉', duration: 2 },
      { description: '挤上柠檬汁，撒上少许黑胡椒即可', duration: 1 }
    ],
    totalTime: 34,
    difficulty: 'easy',
    description: '低脂高蛋白的健康选择'
  },
  {
    name: '宫保鸡丁',
    cuisine: 'chinese',
    ingredients: [
      { name: '鸡胸肉', amount: '300g' },
      { name: '花生', amount: '50g' },
      { name: '干辣椒', amount: '10个' },
      { name: '葱', amount: '适量' },
      { name: '大蒜', amount: '3瓣' },
      { name: '生姜', amount: '2片' },
      { name: '酱油', amount: '2勺' },
      { name: '醋', amount: '1勺' },
      { name: '糖', amount: '1勺' },
      { name: '料酒', amount: '1勺' }
    ],
    steps: [
      { description: '鸡胸肉切丁，用料酒、酱油腌制15分钟', duration: 15 },
      { description: '调制料汁：酱油、醋、糖、淀粉水混合', duration: 2 },
      { description: '热锅下油，爆香干辣椒、葱姜蒜', duration: 2 },
      { description: '放入鸡丁翻炒至变色', duration: 3 },
      { description: '倒入料汁翻炒均匀', duration: 2 },
      { description: '最后加入花生米翻炒几下即可出锅', duration: 1 }
    ],
    totalTime: 25,
    difficulty: 'medium',
    description: '经典川菜，麻辣鲜香'
  },
  {
    name: '日式照烧鸡肉饭',
    cuisine: 'japanese',
    ingredients: [
      { name: '鸡腿肉', amount: '2个' },
      { name: '米饭', amount: '2碗' },
      { name: '西兰花', amount: '适量' },
      { name: '胡萝卜', amount: '适量' },
      { name: '酱油', amount: '3勺' },
      { name: '料酒', amount: '2勺' },
      { name: '糖', amount: '1勺' },
      { name: '蜂蜜', amount: '1勺' },
      { name: '大蒜', amount: '2瓣' },
      { name: '生姜', amount: '1片' }
    ],
    steps: [
      { description: '鸡腿肉去骨，用刀背拍松', duration: 3 },
      { description: '调制照烧汁：酱油、料酒、糖、蜂蜜、蒜末、姜末混合', duration: 2 },
      { description: '平底锅不加油，鸡皮朝下煎至金黄，翻面继续煎', duration: 6 },
      { description: '倒入照烧汁，小火收汁，不断翻面', duration: 5 },
      { description: '西兰花和胡萝卜焯水摆盘', duration: 4 },
      { description: '鸡肉切片，铺在米饭上，淋上照烧汁', duration: 2 }
    ],
    totalTime: 22,
    difficulty: 'easy',
    description: '经典日式料理，甜咸适口'
  },
  {
    name: '奶油蘑菇意面',
    cuisine: 'western',
    ingredients: [
      { name: '意大利面', amount: '200g' },
      { name: '蘑菇', amount: '150g' },
      { name: '黄油', amount: '20g' },
      { name: '大蒜', amount: '2瓣' },
      { name: '牛奶', amount: '200ml' },
      { name: '奶酪', amount: '30g' },
      { name: '黑胡椒', amount: '适量' },
      { name: '盐', amount: '适量' },
      { name: '欧芹', amount: '适量' }
    ],
    steps: [
      { description: '烧一锅水，加盐，下意面煮至8成熟', duration: 10 },
      { description: '蘑菇切片，大蒜切末', duration: 2 },
      { description: '黄油融化，爆香蒜末，加入蘑菇炒至金黄', duration: 5 },
      { description: '倒入牛奶，加入奶酪，小火搅拌至融化', duration: 3 },
      { description: '加入煮好的意面和少许面汤，翻拌均匀', duration: 2 },
      { description: '加盐和黑胡椒调味，撒上欧芹碎', duration: 1 }
    ],
    totalTime: 23,
    difficulty: 'easy',
    description: '奶香浓郁的经典意式面食'
  },
  {
    name: '麻婆豆腐',
    cuisine: 'chinese',
    ingredients: [
      { name: '豆腐', amount: '1盒' },
      { name: '牛肉', amount: '100g' },
      { name: '豆瓣酱', amount: '2勺' },
      { name: '辣椒粉', amount: '1勺' },
      { name: '花椒粉', amount: '1勺' },
      { name: '葱', amount: '适量' },
      { name: '大蒜', amount: '3瓣' },
      { name: '生姜', amount: '2片' },
      { name: '酱油', amount: '1勺' },
      { name: '淀粉', amount: '适量' }
    ],
    steps: [
      { description: '豆腐切小块，用盐水浸泡5分钟', duration: 5 },
      { description: '牛肉切末，葱姜蒜切末', duration: 3 },
      { description: '热锅下油，炒香牛肉末', duration: 3 },
      { description: '加入豆瓣酱、辣椒粉炒出红油', duration: 2 },
      { description: '加入适量水，放入豆腐，小火炖煮5分钟', duration: 5 },
      { description: '淀粉水勾芡，撒上花椒粉和葱花', duration: 2 }
    ],
    totalTime: 20,
    difficulty: 'easy',
    description: '麻辣鲜香的川菜经典'
  },
  {
    name: '三文鱼刺身丼',
    cuisine: 'japanese',
    ingredients: [
      { name: '三文鱼', amount: '200g' },
      { name: '米饭', amount: '2碗' },
      { name: '紫菜', amount: '适量' },
      { name: '芥末', amount: '适量' },
      { name: '酱油', amount: '适量' },
      { name: '芝麻', amount: '适量' },
      { name: '葱', amount: '适量' }
    ],
    steps: [
      { description: '米饭煮好，稍微放凉，加少许寿司醋拌匀', duration: 5 },
      { description: '三文鱼切成厚片', duration: 3 },
      { description: '紫菜剪成细条', duration: 1 },
      { description: '米饭盛入碗中，铺上三文鱼片', duration: 2 },
      { description: '撒上芝麻、葱花和紫菜条', duration: 1 },
      { description: '配上芥末和酱油即可食用', duration: 1 }
    ],
    totalTime: 13,
    difficulty: 'easy',
    description: '新鲜美味的日式盖饭'
  },
  {
    name: '西红柿炒鸡蛋',
    cuisine: 'chinese',
    ingredients: [
      { name: '西红柿', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '糖', amount: '1勺' },
      { name: '盐', amount: '适量' },
      { name: '葱', amount: '适量' }
    ],
    steps: [
      { description: '西红柿切块，鸡蛋打散加少许盐', duration: 2 },
      { description: '热锅下油，炒熟鸡蛋盛出', duration: 2 },
      { description: '锅中加油，放入西红柿翻炒出汁', duration: 3 },
      { description: '加入糖和盐调味', duration: 1 },
      { description: '倒入炒好的鸡蛋，翻拌均匀', duration: 1 },
      { description: '撒上葱花出锅', duration: 1 }
    ],
    totalTime: 10,
    difficulty: 'easy',
    description: '国民家常菜，酸甜可口'
  },
  {
    name: '土豆烧牛肉',
    cuisine: 'chinese',
    ingredients: [
      { name: '牛肉', amount: '500g' },
      { name: '土豆', amount: '2个' },
      { name: '胡萝卜', amount: '1根' },
      { name: '葱', amount: '适量' },
      { name: '生姜', amount: '3片' },
      { name: '大蒜', amount: '5瓣' },
      { name: '八角', amount: '2个' },
      { name: '桂皮', amount: '1小块' },
      { name: '酱油', amount: '3勺' },
      { name: '料酒', amount: '2勺' }
    ],
    steps: [
      { description: '牛肉切块，冷水下锅焯水去血沫', duration: 10 },
      { description: '土豆、胡萝卜切滚刀块', duration: 3 },
      { description: '热锅下油，爆香葱姜蒜、八角、桂皮', duration: 2 },
      { description: '放入牛肉翻炒，加酱油、料酒', duration: 3 },
      { description: '加水没过牛肉，大火烧开转小火炖40分钟', duration: 40 },
      { description: '加入土豆胡萝卜继续炖20分钟，收汁即可', duration: 20 }
    ],
    totalTime: 78,
    difficulty: 'medium',
    description: '软烂入味的经典家常菜'
  },
  {
    name: '凯撒沙拉',
    cuisine: 'western',
    ingredients: [
      { name: '生菜', amount: '150g' },
      { name: '面包', amount: '2片' },
      { name: '鸡胸肉', amount: '150g' },
      { name: '奶酪', amount: '30g' },
      { name: '鸡蛋', amount: '1个' },
      { name: '橄榄油', amount: '2勺' },
      { name: '柠檬', amount: '半个' },
      { name: '大蒜', amount: '1瓣' },
      { name: '黑胡椒', amount: '适量' },
      { name: '盐', amount: '适量' }
    ],
    steps: [
      { description: '鸡胸肉煎熟切片，面包切丁烤至金黄', duration: 12 },
      { description: '生菜洗净撕成小块', duration: 2 },
      { description: '制作凯撒酱：蛋黄、蒜末、橄榄油、柠檬汁、奶酪搅拌', duration: 5 },
      { description: '生菜放入大碗，加入凯撒酱拌匀', duration: 1 },
      { description: '铺上鸡胸肉和面包丁', duration: 1 },
      { description: '撒上奶酪碎和黑胡椒', duration: 1 }
    ],
    totalTime: 22,
    difficulty: 'medium',
    description: '经典西式沙拉，风味浓郁'
  },
  {
    name: '咖喱鸡肉饭',
    cuisine: 'other',
    ingredients: [
      { name: '鸡胸肉', amount: '300g' },
      { name: '土豆', amount: '2个' },
      { name: '胡萝卜', amount: '1根' },
      { name: '洋葱', amount: '半个' },
      { name: '咖喱粉', amount: '2勺' },
      { name: '牛奶', amount: '100ml' },
      { name: '米饭', amount: '2碗' },
      { name: '橄榄油', amount: '2勺' },
      { name: '盐', amount: '适量' }
    ],
    steps: [
      { description: '鸡肉切块，土豆胡萝卜切块，洋葱切丝', duration: 5 },
      { description: '热锅下油，炒香洋葱', duration: 2 },
      { description: '加入鸡肉翻炒至变色', duration: 3 },
      { description: '加入土豆胡萝卜翻炒2分钟', duration: 2 },
      { description: '加水没过食材，加入咖喱粉，中火炖15分钟', duration: 15 },
      { description: '加入牛奶和盐，收汁后浇在米饭上', duration: 3 }
    ],
    totalTime: 30,
    difficulty: 'easy',
    description: '浓郁醇香的东南亚风味'
  },
  {
    name: '寿喜烧',
    cuisine: 'japanese',
    ingredients: [
      { name: '牛肉', amount: '300g' },
      { name: '豆腐', amount: '1盒' },
      { name: '洋葱', amount: '半个' },
      { name: '大葱', amount: '2根' },
      { name: '蘑菇', amount: '100g' },
      { name: '白菜', amount: '150g' },
      { name: '金针菇', amount: '100g' },
      { name: '酱油', amount: '3勺' },
      { name: '料酒', amount: '2勺' },
      { name: '糖', amount: '2勺' },
      { name: '鸡蛋', amount: '2个' }
    ],
    steps: [
      { description: '所有蔬菜洗净切好，牛肉切薄片', duration: 8 },
      { description: '调制寿喜烧汁：酱油、料酒、糖、水混合', duration: 2 },
      { description: '平底锅加热，涂上黄油，煎香洋葱和大葱', duration: 3 },
      { description: '依次放入牛肉、蔬菜、豆腐、蘑菇', duration: 2 },
      { description: '倒入寿喜烧汁，小火炖煮10分钟', duration: 10 },
      { description: '配生鸡蛋液蘸食', duration: 1 }
    ],
    totalTime: 26,
    difficulty: 'medium',
    description: '日式经典火锅，鲜甜可口'
  },
  {
    name: '红烧肉',
    cuisine: 'chinese',
    ingredients: [
      { name: '五花肉', amount: '500g' },
      { name: '冰糖', amount: '50g' },
      { name: '酱油', amount: '3勺' },
      { name: '料酒', amount: '3勺' },
      { name: '葱', amount: '适量' },
      { name: '生姜', amount: '5片' },
      { name: '八角', amount: '2个' },
      { name: '桂皮', amount: '1小块' },
      { name: '香叶', amount: '2片' }
    ],
    steps: [
      { description: '五花肉切块，冷水下锅焯水去血沫', duration: 10 },
      { description: '锅中放少许油，加入冰糖小火炒糖色', duration: 5 },
      { description: '放入五花肉翻炒上色', duration: 3 },
      { description: '加入葱姜、八角、桂皮、香叶爆香', duration: 2 },
      { description: '加酱油、料酒、热水没过肉，大火烧开转小火炖1小时', duration: 60 },
      { description: '大火收汁即可', duration: 5 }
    ],
    totalTime: 85,
    difficulty: 'medium',
    description: '肥而不腻的经典名菜'
  },
  {
    name: '清炒时蔬',
    cuisine: 'chinese',
    ingredients: [
      { name: '西兰花', amount: '200g' },
      { name: '胡萝卜', amount: '1根' },
      { name: '蘑菇', amount: '100g' },
      { name: '大蒜', amount: '3瓣' },
      { name: '橄榄油', amount: '2勺' },
      { name: '盐', amount: '适量' }
    ],
    steps: [
      { description: '西兰花切小朵，胡萝卜切片，蘑菇切片', duration: 3 },
      { description: '烧一锅水，加盐和油，焯水西兰花和胡萝卜', duration: 3 },
      { description: '热锅下油，爆香蒜末', duration: 1 },
      { description: '加入蘑菇翻炒至出水', duration: 3 },
      { description: '加入焯好的蔬菜，快速翻炒', duration: 2 },
      { description: '加盐调味即可出锅', duration: 1 }
    ],
    totalTime: 13,
    difficulty: 'easy',
    description: '清淡健康的素菜'
  },
  {
    name: '芝士焗红薯',
    cuisine: 'other',
    ingredients: [
      { name: '红薯', amount: '2个' },
      { name: '奶酪', amount: '50g' },
      { name: '黄油', amount: '20g' },
      { name: '牛奶', amount: '50ml' },
      { name: '糖', amount: '1勺' },
      { name: '鸡蛋', amount: '1个' }
    ],
    steps: [
      { description: '红薯洗净，上锅蒸30分钟至软烂', duration: 30 },
      { description: '红薯对半切开，挖出薯泥', duration: 3 },
      { description: '薯泥中加入黄油、牛奶、糖、蛋黄拌匀', duration: 2 },
      { description: '将薯泥填回红薯壳中', duration: 2 },
      { description: '表面撒上奶酪丝', duration: 1 },
      { description: '烤箱180度烤15分钟至金黄', duration: 15 }
    ],
    totalTime: 53,
    difficulty: 'easy',
    description: '香甜软糯的甜品'
  },
  {
    name: '冬阴功汤',
    cuisine: 'other',
    ingredients: [
      { name: '虾', amount: '200g' },
      { name: '蘑菇', amount: '150g' },
      { name: '椰浆', amount: '200ml' },
      { name: '冬阴功酱', amount: '2勺' },
      { name: '柠檬', amount: '半个' },
      { name: '鱼露', amount: '1勺' },
      { name: '糖', amount: '1勺' },
      { name: '辣椒', amount: '2个' },
      { name: '香茅', amount: '2根' }
    ],
    steps: [
      { description: '虾去壳留尾，蘑菇切片，香茅切段', duration: 5 },
      { description: '锅中加水，放入香茅、辣椒、冬阴功酱煮开', duration: 5 },
      { description: '加入蘑菇煮5分钟', duration: 5 },
      { description: '加入虾煮至变红', duration: 3 },
      { description: '倒入椰浆，加鱼露、糖调味', duration: 2 },
      { description: '关火挤入柠檬汁即可', duration: 1 }
    ],
    totalTime: 21,
    difficulty: 'medium',
    description: '酸辣鲜美的泰国国汤'
  },
  {
    name: '龙井虾仁',
    cuisine: 'chinese',
    ingredients: [
      { name: '虾', amount: '300g' },
      { name: '龙井茶', amount: '5g' },
      { name: '鸡蛋', amount: '1个' },
      { name: '料酒', amount: '1勺' },
      { name: '盐', amount: '适量' },
      { name: '淀粉', amount: '适量' }
    ],
    steps: [
      { description: '虾去壳去虾线，用料酒、盐、蛋清、淀粉腌制15分钟', duration: 15 },
      { description: '龙井茶用80度水泡开，留茶汤', duration: 3 },
      { description: '热锅下油，滑炒虾仁至变色盛出', duration: 2 },
      { description: '锅中留底油，倒入茶叶和虾仁快速翻炒', duration: 1 },
      { description: '淋入少许茶汤', duration: 1 },
      { description: '出锅装盘即可', duration: 1 }
    ],
    totalTime: 23,
    difficulty: 'medium',
    description: '杭帮菜经典，茶香虾鲜'
  },
  {
    name: '鱼香肉丝',
    cuisine: 'chinese',
    ingredients: [
      { name: '里脊肉', amount: '300g' },
      { name: '胡萝卜', amount: '1根' },
      { name: '青椒', amount: '1个' },
      { name: '木耳', amount: '适量' },
      { name: '豆瓣酱', amount: '1勺' },
      { name: '醋', amount: '2勺' },
      { name: '糖', amount: '2勺' },
      { name: '酱油', amount: '1勺' },
      { name: '淀粉', amount: '适量' },
      { name: '大蒜', amount: '3瓣' }
    ],
    steps: [
      { description: '里脊肉丝加料酒、酱油、淀粉腌制10分钟', duration: 10 },
      { description: '胡萝卜、青椒切丝，木耳泡发切丝', duration: 3 },
      { description: '调制鱼香汁：醋、糖、酱油、淀粉水混合', duration: 2 },
      { description: '热锅下油，滑炒肉丝变色盛出', duration: 2 },
      { description: '锅中加油，爆香蒜末和豆瓣酱', duration: 1 },
      { description: '加入蔬菜翻炒，倒入肉丝和鱼香汁收汁', duration: 3 }
    ],
    totalTime: 21,
    difficulty: 'easy',
    description: '酸甜微辣的川菜经典'
  },
  {
    name: '西班牙海鲜饭',
    cuisine: 'western',
    ingredients: [
      { name: '虾', amount: '200g' },
      { name: '蛤蜊', amount: '200g' },
      { name: '鱿鱼', amount: '150g' },
      { name: '米饭', amount: '200g' },
      { name: '洋葱', amount: '半个' },
      { name: '大蒜', amount: '3瓣' },
      { name: '番茄', amount: '1个' },
      { name: '白葡萄酒', amount: '100ml' },
      { name: '柠檬', amount: '半个' }
    ],
    steps: [
      { description: '所有海鲜处理干净，洋葱大蒜番茄切碎', duration: 10 },
      { description: '热锅下油，炒香洋葱大蒜，加入番茄炒烂', duration: 5 },
      { description: '加入米饭翻炒，加白葡萄酒', duration: 3 },
      { description: '加水，小火煮15分钟', duration: 15 },
      { description: '码上所有海鲜，盖盖焖煮10分钟', duration: 10 },
      { description: '挤上柠檬汁，撒上欧芹即可', duration: 1 }
    ],
    totalTime: 44,
    difficulty: 'hard',
    description: '西班牙经典名菜，海鲜丰富'
  },
  {
    name: '提拉米苏',
    cuisine: 'western',
    ingredients: [
      { name: '马斯卡彭奶酪', amount: '250g' },
      { name: '手指饼干', amount: '200g' },
      { name: '咖啡', amount: '200ml' },
      { name: '鸡蛋', amount: '3个' },
      { name: '糖', amount: '80g' },
      { name: '可可粉', amount: '适量' },
      { name: '朗姆酒', amount: '1勺' }
    ],
    steps: [
      { description: '蛋黄加糖打发至发白，加入马斯卡彭奶酪拌匀', duration: 8 },
      { description: '蛋白加糖打发至硬性发泡，与蛋黄糊混合', duration: 5 },
      { description: '咖啡加朗姆酒混合', duration: 1 },
      { description: '手指饼干快速蘸咖啡，铺一层', duration: 3 },
      { description: '抹上奶酪糊，重复铺层', duration: 5 },
      { description: '冷藏4小时，食用前筛上可可粉', duration: 240 }
    ],
    totalTime: 262,
    difficulty: 'hard',
    description: '意式经典甜品，入口即化'
  },
  {
    name: '日式豚骨拉面',
    cuisine: 'japanese',
    ingredients: [
      { name: '猪大骨', amount: '500g' },
      { name: '面条', amount: '200g' },
      { name: '五花肉', amount: '200g' },
      { name: '鸡蛋', amount: '2个' },
      { name: '海带', amount: '1片' },
      { name: '木鱼花', amount: '适量' },
      { name: '酱油', amount: '3勺' },
      { name: '味噌', amount: '2勺' },
      { name: '葱', amount: '适量' },
      { name: '竹笋', amount: '适量' }
    ],
    steps: [
      { description: '猪大骨焯水后，加海带小火熬煮3小时成汤底', duration: 180 },
      { description: '五花肉卷起来，用绳子绑紧，煎至金黄后用酱油卤制', duration: 40 },
      { description: '鸡蛋煮6分钟，泡入卤汁中做溏心蛋', duration: 10 },
      { description: '汤底过滤，加入味噌、酱油调味', duration: 3 },
      { description: '面条煮熟，盛入碗中，倒入汤底', duration: 3 },
      { description: '摆上叉烧肉、溏心蛋、笋片、葱花', duration: 2 }
    ],
    totalTime: 238,
    difficulty: 'hard',
    description: '浓郁鲜美的日式拉面'
  }
];

class RecipeDatabase {
  private db: Database | null = null;

  async init(): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file: string) => {
        return require.resolve(`sql.js/dist/${file}`);
      }
    });

    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      this.db = new SQL.Database(fileBuffer);
      console.log('Loaded existing SQLite database');
    } else {
      this.db = new SQL.Database();
      console.log('Created new SQLite database');
      this.createTables();
      this.insertIngredients();
      this.insertRecipes();
      this.saveToDisk();
    }
  }

  private saveToDisk(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (error) {
      console.error('Failed to save database to disk:', error);
    }
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cuisine TEXT NOT NULL,
        total_time INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        description TEXT,
        steps_json TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount TEXT NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        recipe_name TEXT NOT NULL,
        cuisine TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name)');
  }

  private insertIngredients(): void {
    if (!this.db) return;

    const uniqueIngredients = defaultIngredients.filter(
      (ingredient, index, self) =>
        index === self.findIndex((i) => i.name === ingredient.name)
    ).slice(0, 150);

    const stmt = this.db.prepare('INSERT INTO ingredients (id, name, category) VALUES (?, ?, ?)');
    uniqueIngredients.forEach((ing, index) => {
      stmt.run([`ing_${index + 1}`, ing.name, ing.category]);
    });
    stmt.free();

    console.log(`Inserted ${uniqueIngredients.length} ingredients`);
  }

  private insertRecipes(): void {
    if (!this.db) return;

    const recipeStmt = this.db.prepare(
      'INSERT INTO recipes (id, name, cuisine, total_time, difficulty, description, steps_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const ingredientStmt = this.db.prepare(
      'INSERT INTO recipe_ingredients (id, recipe_id, name, amount) VALUES (?, ?, ?, ?)'
    );

    defaultRecipes.forEach((recipe, recipeIndex) => {
      const recipeId = `rec_${recipeIndex + 1}`;
      recipeStmt.run([
        recipeId,
        recipe.name,
        recipe.cuisine,
        recipe.totalTime,
        recipe.difficulty,
        recipe.description,
        JSON.stringify(recipe.steps)
      ]);

      recipe.ingredients.forEach((ing, ingIndex) => {
        ingredientStmt.run([
          `ri_${recipeIndex + 1}_${ingIndex + 1}`,
          recipeId,
          ing.name,
          ing.amount
        ]);
      });
    });

    recipeStmt.free();
    ingredientStmt.free();

    console.log(`Inserted ${defaultRecipes.length} recipes`);
  }

  private getRecipeByIdFromDb(id: string): Recipe | null {
    if (!this.db) return null;

    const recipeResult = this.db.exec(
      'SELECT * FROM recipes WHERE id = ?',
      [id]
    );

    if (recipeResult.length === 0 || recipeResult[0].values.length === 0) {
      return null;
    }

    const recipeRow = recipeResult[0].values[0];
    const ingredientsResult = this.db.exec(
      'SELECT name, amount FROM recipe_ingredients WHERE recipe_id = ? ORDER BY rowid',
      [id]
    );

    const ingredients = ingredientsResult.length > 0
      ? ingredientsResult[0].values.map((row: any[]) => ({
          name: row[0] as string,
          amount: row[1] as string
        }))
      : [];

    return {
      id: recipeRow[0] as string,
      name: recipeRow[1] as string,
      cuisine: recipeRow[2] as 'chinese' | 'western' | 'japanese' | 'other',
      totalTime: recipeRow[3] as number,
      difficulty: recipeRow[4] as 'easy' | 'medium' | 'hard',
      description: recipeRow[5] as string,
      steps: JSON.parse(recipeRow[6] as string),
      ingredients
    };
  }

  getAllIngredients(): Ingredient[] {
    if (!this.db) return [];

    const result = this.db.exec('SELECT id, name, category FROM ingredients ORDER BY name');
    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
      id: row[0] as string,
      name: row[1] as string,
      category: row[2] as string
    }));
  }

  matchIngredients(input: string): Ingredient[] {
    if (!this.db) return [];

    const keywords = input.split(/[,，、\s]+/).filter(k => k.trim());
    if (keywords.length === 0) return [];

    const allIngredients = this.getAllIngredients();
    
    return allIngredients.filter(ing =>
      keywords.some(keyword =>
        ing.name.includes(keyword.trim()) || keyword.trim().includes(ing.name)
      )
    );
  }

  getRecipesByIngredients(ingredientNames: string[]): Recipe[] {
    if (!this.db || ingredientNames.length === 0) return [];

    const allRecipes = this.getAllRecipes();

    const scored = allRecipes.map(recipe => {
      const recipeIngredientNames = recipe.ingredients.map(i => i.name);
      const matchCount = ingredientNames.filter(name =>
        recipeIngredientNames.some(ri => ri.includes(name) || name.includes(ri))
      ).length;
      const matchRatio = matchCount / Math.max(recipeIngredientNames.length, 1);
      return { recipe, score: matchCount + matchRatio * 0.1 };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.filter(s => s.score > 0).slice(0, 10).map(s => s.recipe);
  }

  private getAllRecipes(): Recipe[] {
    if (!this.db) return [];

    const result = this.db.exec('SELECT id FROM recipes ORDER BY name');
    if (result.length === 0) return [];

    const recipeIds = result[0].values.map((row: any[]) => row[0] as string);
    return recipeIds
      .map(id => this.getRecipeByIdFromDb(id))
      .filter((r): r is Recipe => r !== null);
  }

  searchRecipes(query: string): Recipe[] {
    if (!this.db || !query) return [];

    const searchTerm = query.toLowerCase();
    const allRecipes = this.getAllRecipes();

    return allRecipes.filter(recipe =>
      recipe.name.toLowerCase().includes(searchTerm) ||
      recipe.description.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
  }

  getRecipeById(id: string): Recipe | null {
    return this.getRecipeByIdFromDb(id);
  }

  addFavorite(recipeId: string, recipeName: string, cuisine: string, difficulty: string): Favorite {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const favorite: Favorite = {
      id: `fav_${Date.now()}_${uuidv4().slice(0, 8)}`,
      recipeId,
      recipeName,
      cuisine,
      difficulty,
      createdAt: new Date().toISOString()
    };

    this.db.run(
      'INSERT INTO favorites (id, recipe_id, recipe_name, cuisine, difficulty, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [favorite.id, favorite.recipeId, favorite.recipeName, favorite.cuisine, favorite.difficulty, favorite.createdAt]
    );

    this.saveToDisk();
    return favorite;
  }

  removeFavorite(id: string): void {
    if (!this.db) return;

    this.db.run('DELETE FROM favorites WHERE id = ?', [id]);
    this.saveToDisk();
  }

  getFavorites(): Favorite[] {
    if (!this.db) return [];

    const result = this.db.exec(
      'SELECT id, recipe_id, recipe_name, cuisine, difficulty, created_at FROM favorites ORDER BY created_at DESC'
    );
    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
      id: row[0] as string,
      recipeId: row[1] as string,
      recipeName: row[2] as string,
      cuisine: row[3] as string,
      difficulty: row[4] as string,
      createdAt: row[5] as string
    }));
  }
}

export const db = new RecipeDatabase();
