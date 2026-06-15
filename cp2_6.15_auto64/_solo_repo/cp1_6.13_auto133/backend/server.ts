import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const productsDB = Datastore.create({
  filename: path.join(__dirname, 'data', 'products.db'),
  autoload: true,
});

const favoritesDB = Datastore.create({
  filename: path.join(__dirname, 'data', 'favorites.db'),
  autoload: true,
});

const COLOR_PALETTE = ['#f97316', '#a855f7', '#06b6d4', '#22c55e'];
const PRODUCT_NAMES = [
  '星际探索者耳机',
  '极光智能手表',
  '幻影便携音箱',
  '星辰无线充电器',
  '量子护目镜',
  '银河相机稳定器',
  '赛博机械键盘',
  '流体艺术台灯',
  '能量核心充电宝',
  '纳米纤维背包',
];
const PRODUCT_DESCRIPTIONS = [
  '采用先进的主动降噪技术，沉浸于纯净音质。钛合金腔体，太空级材质，续航48小时。',
  'AMOLED超清屏幕，支持心率、血氧、睡眠监测。IP68防水，钛合金边框。',
  '360度环绕立体声，低音澎湃高音清澈。IPX7防水，可漂浮于水面。',
  '磁吸快充，支持多设备同时充电。航空铝材质，带LED氛围灯。',
  'AR增强现实镜片，实时翻译与导航。自适应焦距，防蓝光护眼。',
  '三轴防抖，手机和微单通用。折叠设计，手持稳定如铁。',
  '红轴机械按键，RGB幻彩背光。全键无冲，PBT键帽耐磨耐用。',
  '流体雕塑设计，色彩随温度流动。无极调光，护眼无频闪。',
  '20000mAh大容量，支持100W快充。OLED数显，智能分配输出。',
  '纳米防水涂层，自清洁面料。多隔层设计，防盗暗袋。',
];
const KEYWORDS_LIST = [
  ['降噪', '蓝牙5.3', '48h续航'],
  ['AMOLED', '健康监测', '防水'],
  ['360°环绕', 'IPX7', '20h续航'],
  ['磁吸', '多设备', '氛围灯'],
  ['AR现实', '翻译', '护眼'],
  ['三轴防抖', '折叠', '通用'],
  ['红轴', 'RGB', '全键无冲'],
  ['流体', '护眼', '无极调光'],
  ['100W快充', '数显', '大容量'],
  ['纳米防水', '防盗', '多隔层'],
];
const PRICES = [399, 1299, 599, 299, 1599, 899, 699, 459, 359, 799];

async function seedProducts() {
  const count = await productsDB.count({});
  if (count === 0) {
    const products = [];
    for (let i = 0; i < 10; i++) {
      products.push({
        _id: uuidv4(),
        name: PRODUCT_NAMES[i],
        price: PRICES[i],
        description: PRODUCT_DESCRIPTIONS[i],
        color: COLOR_PALETTE[i % COLOR_PALETTE.length],
        keywords: KEYWORDS_LIST[i],
        shapeType: i % 3,
        angle: (i / 10) * Math.PI * 2,
      });
    }
    await productsDB.insert(products);
    console.log('数据库已初始化，插入 10 条商品数据');
  }
}
seedProducts();

app.get('/api/products', async (req, res) => {
  try {
    const products = await productsDB.find({});
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await productsDB.findOne({ _id: req.params.id });
    if (!product) {
      return res.status(404).json({ error: '商品未找到' });
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/favorites', async (req, res) => {
  try {
    const favorites = await favoritesDB.find({});
    const ids = favorites.map((f: any) => f.productId);
    res.json(ids);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/favorites', async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: '缺少 productId' });
    }
    const existing = await favoritesDB.findOne({ productId });
    if (existing) {
      return res.json({ success: true, alreadyFavorited: true });
    }
    await favoritesDB.insert({ _id: uuidv4(), productId, createdAt: Date.now() });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/favorites/:id', async (req, res) => {
  try {
    await favoritesDB.remove({ productId: req.params.id }, {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
});
