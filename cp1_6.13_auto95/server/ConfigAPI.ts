import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function generateBoardLayout() {
  const pathCoords: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= 10; i++) pathCoords.push({ x: i, y: 10 });
  for (let i = 9; i >= 0; i--) pathCoords.push({ x: 10, y: i });
  for (let i = 9; i >= 0; i--) pathCoords.push({ x: i, y: 0 });
  for (let i = 1; i <= 9; i++) pathCoords.push({ x: 0, y: i });

  const cellDefs = [
    { type: 'start', name: '起点' },
    { type: 'property', name: '地中海大道', price: 60, baseRent: 2, colorGroup: 'brown' },
    { type: 'fate', name: '命运' },
    { type: 'property', name: '波罗的海大道', price: 60, baseRent: 4, colorGroup: 'brown' },
    { type: 'tax', name: '所得税' },
    { type: 'railway', name: '雷丁铁路', price: 200, baseRent: 25, colorGroup: 'railway' },
    { type: 'property', name: '东方大道', price: 100, baseRent: 6, colorGroup: 'cyan' },
    { type: 'chance', name: '机会' },
    { type: 'property', name: '佛蒙特大道', price: 100, baseRent: 6, colorGroup: 'cyan' },
    { type: 'property', name: '康涅狄格大道', price: 120, baseRent: 8, colorGroup: 'cyan' },
    { type: 'jail', name: '监狱' },
    { type: 'property', name: '圣查尔斯广场', price: 140, baseRent: 10, colorGroup: 'pink' },
    { type: 'utility', name: '电力公司', price: 150, baseRent: 20, colorGroup: 'utility' },
    { type: 'property', name: '各州大道', price: 140, baseRent: 10, colorGroup: 'pink' },
    { type: 'property', name: '弗吉尼亚大道', price: 160, baseRent: 12, colorGroup: 'pink' },
    { type: 'railway', name: '宾夕法尼亚铁路', price: 200, baseRent: 25, colorGroup: 'railway' },
    { type: 'property', name: '圣詹姆斯广场', price: 180, baseRent: 14, colorGroup: 'orange' },
    { type: 'fate', name: '命运' },
    { type: 'property', name: '田纳西大道', price: 180, baseRent: 14, colorGroup: 'orange' },
    { type: 'property', name: '纽约大道', price: 200, baseRent: 16, colorGroup: 'orange' },
    { type: 'parking', name: '免费停车' },
    { type: 'property', name: '肯塔基大道', price: 220, baseRent: 18, colorGroup: 'red' },
    { type: 'chance', name: '机会' },
    { type: 'property', name: '印第安纳大道', price: 220, baseRent: 18, colorGroup: 'red' },
    { type: 'property', name: '伊利诺伊大道', price: 240, baseRent: 20, colorGroup: 'red' },
    { type: 'railway', name: 'B&O铁路', price: 200, baseRent: 25, colorGroup: 'railway' },
    { type: 'property', name: '大西洋大道', price: 260, baseRent: 22, colorGroup: 'yellow' },
    { type: 'property', name: '威尼托大道', price: 260, baseRent: 22, colorGroup: 'yellow' },
    { type: 'utility', name: '自来水公司', price: 150, baseRent: 20, colorGroup: 'utility' },
    { type: 'property', name: '马文花园', price: 280, baseRent: 24, colorGroup: 'yellow' },
    { type: 'jail', name: '去监狱' },
    { type: 'property', name: '太平洋大道', price: 300, baseRent: 26, colorGroup: 'green' },
    { type: 'property', name: '北卡罗来纳大道', price: 300, baseRent: 26, colorGroup: 'green' },
    { type: 'fate', name: '命运' },
    { type: 'property', name: '宾夕法尼亚大道', price: 320, baseRent: 28, colorGroup: 'green' },
    { type: 'railway', name: '短线铁路', price: 200, baseRent: 25, colorGroup: 'railway' },
    { type: 'chance', name: '机会' },
    { type: 'property', name: '公园广场', price: 350, baseRent: 35, colorGroup: 'purple' },
    { type: 'tax', name: '奢侈品税' },
    { type: 'property', name: '木板路', price: 400, baseRent: 50, colorGroup: 'purple' },
  ];

  const cells = cellDefs.map((def, i) => ({
    id: i,
    type: def.type,
    name: def.name,
    gridX: pathCoords[i].x,
    gridY: pathCoords[i].y,
    price: 'price' in def ? def.price : undefined,
    baseRent: 'baseRent' in def ? def.baseRent : undefined,
    colorGroup: 'colorGroup' in def ? def.colorGroup : undefined,
  }));

  return cells;
}

function generateCards() {
  return [
    { id: 'c1', type: 'chance' as const, title: '前进', description: '前进3步', effect: { type: 'move' as const, steps: 3 } },
    { id: 'c2', type: 'chance' as const, title: '后退', description: '后退2步', effect: { type: 'move' as const, steps: -2 } },
    { id: 'c3', type: 'chance' as const, title: '银行红利', description: '获得200元', effect: { type: 'money' as const, amount: 200 } },
    { id: 'c4', type: 'chance' as const, title: '缴税', description: '支付150元', effect: { type: 'money' as const, amount: -150 } },
    { id: 'c5', type: 'chance' as const, title: '进监狱', description: '直接进入监狱', effect: { type: 'jail' as const } },
    { id: 'c6', type: 'chance' as const, title: '去起点', description: '移动到起点', effect: { type: 'position' as const, position: 0 } },
    { id: 'c7', type: 'chance' as const, title: '生日', description: '获得100元', effect: { type: 'money' as const, amount: 100 } },
    { id: 'c8', type: 'chance' as const, title: '超速罚款', description: '支付50元', effect: { type: 'money' as const, amount: -50 } },
    { id: 'f1', type: 'fate' as const, title: '前进', description: '前进2步', effect: { type: 'move' as const, steps: 2 } },
    { id: 'f2', type: 'fate' as const, title: '后退', description: '后退3步', effect: { type: 'move' as const, steps: -3 } },
    { id: 'f3', type: 'fate' as const, title: '投资回报', description: '获得250元', effect: { type: 'money' as const, amount: 250 } },
    { id: 'f4', type: 'fate' as const, title: '医药费', description: '支付100元', effect: { type: 'money' as const, amount: -100 } },
    { id: 'f5', type: 'fate' as const, title: '进监狱', description: '直接进入监狱', effect: { type: 'jail' as const } },
    { id: 'f6', type: 'fate' as const, title: '遗产', description: '获得150元', effect: { type: 'money' as const, amount: 150 } },
    { id: 'f7', type: 'fate' as const, title: '修理房屋', description: '支付200元', effect: { type: 'money' as const, amount: -200 } },
    { id: 'f8', type: 'fate' as const, title: '退税', description: '获得75元', effect: { type: 'money' as const, amount: 75 } },
  ];
}

const boardLayout = generateBoardLayout();
const cards = generateCards();

app.get('/api/config', (_req, res) => {
  res.json({ cells: boardLayout, cards });
});

app.get('/api/cells', (_req, res) => {
  res.json(boardLayout);
});

app.get('/api/cards', (_req, res) => {
  res.json(cards);
});

app.listen(PORT, () => {
  console.log(`Monopoly Config API running on http://localhost:${PORT}`);
  console.log(`GET /api/config - Full config`);
  console.log(`GET /api/cells  - Board layout (${boardLayout.length} cells)`);
  console.log(`GET /api/cards  - Card deck (${cards.length} cards)`);
});
