import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const TEA_CATEGORIES = ['绿茶', '红茶', '乌龙', '普洱', '白茶'];

const TEA_LIBRARY = [
  { id: 't1', name: '西湖龙井', category: '绿茶', origin: '浙江杭州', temp: 80, flavor: ['鲜爽', '豆香', '清甜'], description: '扁平光滑，色泽嫩绿，香气清高持久' },
  { id: 't2', name: '碧螺春', category: '绿茶', origin: '江苏苏州', temp: 75, flavor: ['花果香', '鲜醇', '回甘'], description: '卷曲成螺，满身披毫，银白隐翠' },
  { id: 't3', name: '六安瓜片', category: '绿茶', origin: '安徽六安', temp: 80, flavor: ['清高', '醇厚', '回甘'], description: '单片叶制成，形似瓜子，色泽宝绿' },
  { id: 't4', name: '黄山毛峰', category: '绿茶', origin: '安徽黄山', temp: 80, flavor: ['兰花香', '鲜爽', '甘甜'], description: '形似雀舌，白毫显露，色似象牙' },
  { id: 't5', name: '信阳毛尖', category: '绿茶', origin: '河南信阳', temp: 80, flavor: ['熟栗香', '鲜浓', '回甘'], description: '细圆紧直，白毫显露，色泽翠绿' },

  { id: 't6', name: '正山小种', category: '红茶', origin: '福建武夷山', temp: 90, flavor: ['松烟香', '桂圆汤', '醇厚'], description: '条索肥实，色泽乌润，带松烟香' },
  { id: 't7', name: '祁门红茶', category: '红茶', origin: '安徽祁门', temp: 90, flavor: ['祁门香', '鲜醇', '回甘'], description: '紧细匀整，色泽乌润，蜜糖香似花似果' },
  { id: 't8', name: '滇红工夫', category: '红茶', origin: '云南凤庆', temp: 95, flavor: ['蜜香', '浓强', '鲜爽'], description: '肥硕雄壮，金毫特显，汤色红艳' },
  { id: 't9', name: '金骏眉', category: '红茶', origin: '福建武夷山', temp: 90, flavor: ['花果香', '蜜甜', '鲜爽'], description: '紧秀纤细，金毫显露，汤色金黄' },
  { id: 't10', name: '川红工夫', category: '红茶', origin: '四川宜宾', temp: 90, flavor: ['橘糖香', '鲜爽', '醇厚'], description: '紧结肥壮，金毫显露，香气清鲜' },

  { id: 't11', name: '铁观音', category: '乌龙', origin: '福建安溪', temp: 95, flavor: ['兰花香', '观音韵', '回甘'], description: '螺旋紧结，色泽砂绿，七泡有余香' },
  { id: 't12', name: '大红袍', category: '乌龙', origin: '福建武夷山', temp: 95, flavor: ['岩韵', '醇厚', '回甘持久'], description: '条索紧结，色泽绿褐鲜润，岩骨花香' },
  { id: 't13', name: '凤凰单丛', category: '乌龙', origin: '广东潮州', temp: 95, flavor: ['花蜜香', '浓醇', '山韵'], description: '条索粗壮，匀整挺直，黄褐油润' },
  { id: 't14', name: '冻顶乌龙', category: '乌龙', origin: '台湾南投', temp: 95, flavor: ['桂花蜜香', '醇厚', '回甘'], description: '半球形紧结，色泽墨绿油润，汤色金黄' },
  { id: 't15', name: '武夷肉桂', category: '乌龙', origin: '福建武夷山', temp: 95, flavor: ['桂皮香', '辛锐', '岩韵'], description: '条索紧结，色泽青褐鲜润，香气浓郁' },

  { id: 't16', name: '生普饼茶', category: '普洱', origin: '云南西双版纳', temp: 100, flavor: ['兰香', '苦涩', '回甘'], description: '紧压成饼，色泽青绿，香气清纯' },
  { id: 't17', name: '熟普散茶', category: '普洱', origin: '云南勐海', temp: 100, flavor: ['陈香', '醇滑', '甘润'], description: '条索肥壮，色泽红褐，陈香浓郁' },
  { id: 't18', name: '老班章古树', category: '普洱', origin: '云南勐海', temp: 100, flavor: ['花蜜香', '浓烈', '回甘'], description: '条索粗壮，茶气强劲，山野气韵' },
  { id: 't19', name: '冰岛古树', category: '普洱', origin: '云南临沧', temp: 100, flavor: ['冰糖甜', '醇厚', '生津'], description: '条索肥壮，汤色金黄，蜜香馥郁' },
  { id: 't20', name: '易武正山', category: '普洱', origin: '云南易武', temp: 100, flavor: ['蜜香', '柔甜', '汤柔'], description: '条索紧结，色泽深绿，汤质细腻' },

  { id: 't21', name: '福鼎白毫银针', category: '白茶', origin: '福建福鼎', temp: 85, flavor: ['毫香', '鲜甜', '清爽'], description: '芽头肥壮，满披白毫，挺直如针' },
  { id: 't22', name: '政和白牡丹', category: '白茶', origin: '福建政和', temp: 85, flavor: ['花香', '鲜爽', '清甜'], description: '一芽二叶，绿叶夹银毫，形似花朵' },
  { id: 't23', name: '贡眉寿眉', category: '白茶', origin: '福建建阳', temp: 90, flavor: ['枣香', '醇和', '甘甜'], description: '毫心明显，色泽翠绿，汤色橙黄' },
  { id: 't24', name: '月光白', category: '白茶', origin: '云南景谷', temp: 85, flavor: ['花果香', '柔甜', '清爽'], description: '叶面黑润，叶背白毫，月光下阴阳分明' },
  { id: 't25', name: '老白茶饼', category: '白茶', origin: '福建福鼎', temp: 95, flavor: ['枣香', '陈香', '醇厚'], description: '紧压成饼，陈化三年以上，汤色橙红' }
];

let tastingRecords = [];

app.get('/api/teas', (req, res) => {
  const { category, keyword } = req.query;
  let result = [...TEA_LIBRARY];
  if (category && category !== '全部') {
    result = result.filter(t => t.category === category);
  }
  if (keyword) {
    const kw = keyword.toLowerCase();
    result = result.filter(t =>
      t.name.toLowerCase().includes(kw) ||
      t.origin.toLowerCase().includes(kw)
    );
  }
  res.json(result);
});

app.get('/api/teas/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const kw = String(q).toLowerCase();
  const matches = TEA_LIBRARY.filter(t => t.name.toLowerCase().includes(kw))
    .slice(0, 8)
    .map(t => ({ id: t.id, name: t.name, category: t.category, origin: t.origin, temp: t.temp }));
  res.json(matches);
});

app.get('/api/teas/:id', (req, res) => {
  const tea = TEA_LIBRARY.find(t => t.id === req.params.id);
  if (!tea) return res.status(404).json({ error: '茶品不存在' });
  res.json(tea);
});

app.get('/api/records', (_req, res) => {
  res.json(tastingRecords);
});

app.post('/api/records', (req, res) => {
  const record = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  tastingRecords.unshift(record);
  res.status(201).json(record);
});

app.put('/api/records/:id', (req, res) => {
  const idx = tastingRecords.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '记录不存在' });
  tastingRecords[idx] = { ...tastingRecords[idx], ...req.body, updatedAt: new Date().toISOString() };
  res.json(tastingRecords[idx]);
});

app.delete('/api/records/:id', (req, res) => {
  const idx = tastingRecords.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '记录不存在' });
  const deleted = tastingRecords.splice(idx, 1)[0];
  res.json(deleted);
});

const PORT = 3009;
app.listen(PORT, () => {
  console.log(`🍵 茶品品鉴系统后端服务已启动: http://localhost:${PORT}`);
});
