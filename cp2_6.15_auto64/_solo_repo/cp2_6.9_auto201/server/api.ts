import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface CoffeeBean {
  id: number;
  name: string;
  origin: string;
  description: string;
  color: string;
}

interface Flavor {
  id: number;
  name: string;
  emoji: string;
  gradient: [string, string];
}

interface Combination {
  beanId: number;
  flavorId: number;
  score: number;
  aroma: string;
}

const beans: CoffeeBean[] = [
  { id: 1, name: '埃塞俄比亚', origin: '非洲', description: '花香浓郁，带有柑橘和蓝莓的酸甜感', color: '#D4A574' },
  { id: 2, name: '哥伦比亚', origin: '南美洲', description: '平衡的果酸与焦糖甜感，醇厚适中', color: '#8B5E3C' },
  { id: 3, name: '巴西', origin: '南美洲', description: '坚果巧克力风味，低酸度高醇厚度', color: '#C49A6C' },
  { id: 4, name: '危地马拉', origin: '中美洲', description: '巧克力与烟熏气息，层次丰富', color: '#7B4A2A' },
  { id: 5, name: '肯尼亚', origin: '非洲', description: '强烈的黑醋栗和番茄酸质，明亮活泼', color: '#B87333' },
  { id: 6, name: '印尼曼特宁', origin: '亚洲', description: '草本与泥土气息，厚重饱满', color: '#6F4E37' },
  { id: 7, name: '哥斯达黎加', origin: '中美洲', description: '蜂蜜甜感与柑橘调，干净清爽', color: '#A0522D' },
  { id: 8, name: '巴拿马瑰夏', origin: '南美洲', description: '茉莉花香与热带水果，优雅细腻', color: '#5C4033' }
];

const flavors: Flavor[] = [
  { id: 1, name: '焦糖', emoji: '🍯', gradient: ['#D4A574', '#B87333'] },
  { id: 2, name: '榛果', emoji: '🌰', gradient: ['#8B4513', '#A0522D'] },
  { id: 3, name: '奶油', emoji: '🥛', gradient: ['#FFF8DC', '#F5DEB3'] },
  { id: 4, name: '肉桂', emoji: '🌿', gradient: ['#A0522D', '#8B4513'] }
];

const combinations: Record<string, Combination> = {
  '1-1': { beanId: 1, flavorId: 1, score: 85, aroma: '焦糖的甜感包裹着埃塞俄比亚的花香，余韵悠长' },
  '1-2': { beanId: 1, flavorId: 2, score: 78, aroma: '榛果的坚果香与柑橘酸质碰撞，层次分明' },
  '1-3': { beanId: 1, flavorId: 3, score: 92, aroma: '奶油的丝滑柔化了果酸，花香在舌尖绽放' },
  '1-4': { beanId: 1, flavorId: 4, score: 70, aroma: '肉桂的辛香与蓝莓调交织，独特而温暖' },
  '2-1': { beanId: 2, flavorId: 1, score: 95, aroma: '焦糖的甜感包裹着哥伦比亚的果酸，余韵悠长' },
  '2-2': { beanId: 2, flavorId: 2, score: 88, aroma: '榛果与巧克力风味融合，醇厚饱满' },
  '2-3': { beanId: 2, flavorId: 3, score: 90, aroma: '奶油增添了丝滑口感，平衡感极佳' },
  '2-4': { beanId: 2, flavorId: 4, score: 82, aroma: '肉桂的温暖辛香烘托出坚果甜感' },
  '3-1': { beanId: 3, flavorId: 1, score: 87, aroma: '焦糖与巴西的巧克力香完美融合' },
  '3-2': { beanId: 3, flavorId: 2, score: 93, aroma: '双份坚果香的叠加，醇厚如丝绒' },
  '3-3': { beanId: 3, flavorId: 3, score: 85, aroma: '奶油柔化了浓郁的可可风味，顺滑可口' },
  '3-4': { beanId: 3, flavorId: 4, score: 80, aroma: '肉桂为巧克力基底增添了温暖层次' },
  '4-1': { beanId: 4, flavorId: 1, score: 82, aroma: '焦糖甜感中和了烟熏气息，柔和顺口' },
  '4-2': { beanId: 4, flavorId: 2, score: 90, aroma: '榛果与巧克力烟熏的三重奏，复杂迷人' },
  '4-3': { beanId: 4, flavorId: 3, score: 78, aroma: '奶油为厚重的烟熏感增添了轻盈' },
  '4-4': { beanId: 4, flavorId: 4, score: 86, aroma: '肉桂与烟熏的温暖组合，冬日最佳' },
  '5-1': { beanId: 5, flavorId: 1, score: 75, aroma: '焦糖的甜试图平衡强烈的酸质，反差鲜明' },
  '5-2': { beanId: 5, flavorId: 2, score: 72, aroma: '榛果的沉稳与黑醋栗的明亮形成对比' },
  '5-3': { beanId: 5, flavorId: 3, score: 88, aroma: '奶油柔化了尖锐的酸，口感圆润' },
  '5-4': { beanId: 5, flavorId: 4, score: 85, aroma: '肉桂的辛香提亮了番茄酸质，活泼动人' },
  '6-1': { beanId: 6, flavorId: 1, score: 80, aroma: '焦糖为草本泥土气息带来一丝甜蜜' },
  '6-2': { beanId: 6, flavorId: 2, score: 85, aroma: '榛果与草本的大地气息相得益彰' },
  '6-3': { beanId: 6, flavorId: 3, score: 92, aroma: '奶油平衡了厚重醇度，顺滑无比' },
  '6-4': { beanId: 6, flavorId: 4, score: 78, aroma: '肉桂的辛香与草本气息形成独特风味' },
  '7-1': { beanId: 7, flavorId: 1, score: 90, aroma: '蜂蜜般的甜感与焦糖完美呼应' },
  '7-2': { beanId: 7, flavorId: 2, score: 82, aroma: '榛果为清爽的柑橘调增添了厚度' },
  '7-3': { beanId: 7, flavorId: 3, score: 94, aroma: '奶油与蜂蜜甜感的组合，如丝绸般顺滑' },
  '7-4': { beanId: 7, flavorId: 4, score: 76, aroma: '肉桂为干净清爽的口感增添了温暖' },
  '8-1': { beanId: 8, flavorId: 1, score: 88, aroma: '焦糖甜感衬托出优雅的茉莉花香' },
  '8-2': { beanId: 8, flavorId: 2, score: 80, aroma: '榛果的沉稳为花果香提供了坚实基底' },
  '8-3': { beanId: 8, flavorId: 3, score: 96, aroma: '奶油与热带水果的结合，奢华无比' },
  '8-4': { beanId: 8, flavorId: 4, score: 74, aroma: '肉桂的辛香与优雅花香的大胆碰撞' }
};

app.get('/api/beans', (_req, res) => {
  setTimeout(() => {
    res.json(beans);
  }, 100);
});

app.get('/api/flavors', (_req, res) => {
  setTimeout(() => {
    res.json(flavors);
  }, 100);
});

app.get('/api/combinations', (req, res) => {
  const { beanId, flavorId } = req.query;
  const key = `${beanId}-${flavorId}`;
  const combination = combinations[key];
  
  setTimeout(() => {
    if (combination) {
      res.json(combination);
    } else {
      res.status(404).json({ error: 'Combination not found' });
    }
  }, 150);
});

app.listen(PORT, () => {
  console.log(`Coffee API server running on http://localhost:${PORT}`);
});
