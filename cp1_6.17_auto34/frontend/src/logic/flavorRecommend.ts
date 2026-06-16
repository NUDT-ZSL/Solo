import { RecommendedDrink } from '../types';

const DRINKS: RecommendedDrink[] = [
  { id: 'r1', name: '埃塞俄比亚手冲', region: '非洲果酸', roast: '浅烘', brew: '手冲', desc: '明亮果酸，花香四溢，如同置身春日果园' },
  { id: 'r2', name: '肯尼亚AA浓缩', region: '非洲果酸', roast: '浅烘', brew: '意式浓缩', desc: '黑醋栗与番茄酸感，层次丰富' },
  { id: 'r3', name: '耶加雪菲冷萃', region: '非洲果酸', roast: '浅烘', brew: '冷萃', desc: '柔和果酸，茶感清爽，适合夏日' },
  { id: 'r4', name: '非洲法压', region: '非洲果酸', roast: '浅烘', brew: '法压壶', desc: '醇厚body，莓果甜感，余韵悠长' },
  { id: 'r5', name: '曼特宁手冲', region: '印度尼西亚草本', roast: '深烘', brew: '手冲', desc: '草本香料，大地气息，沉稳内敛' },
  { id: 'r6', name: '黄金曼特宁', region: '印度尼西亚草本', roast: '深烘', brew: '法压壶', desc: '浓郁醇厚，尾韵悠长，咖啡老饕首选' },
  { id: 'r7', name: '印尼意式', region: '印度尼西亚草本', roast: '深烘', brew: '意式浓缩', desc: '厚实crema，烟熏感，力量感十足' },
  { id: 'r8', name: '巴厘岛冷萃', region: '印度尼西亚草本', roast: '中烘', brew: '冷萃', desc: '平衡顺滑，低酸易饮，日常佳选' },
  { id: 'r9', name: '哥伦比亚慧兰', region: '中南美洲平衡', roast: '中烘', brew: '手冲', desc: '焦糖甜感，坚果调性，温和百搭' },
  { id: 'r10', name: '巴西喜拉多', region: '中南美洲平衡', roast: '中烘', brew: '意式浓缩', desc: '巧克力坚果，平衡经典，奶咖良伴' },
  { id: 'r11', name: '哥斯达黎加', region: '中南美洲平衡', roast: '中烘', brew: '冷萃', desc: '蜜糖甜感，柔和干净，入口顺滑' },
  { id: 'r12', name: '危地马拉法压', region: '中南美洲平衡', roast: '中烘', brew: '法压壶', desc: '可可坚果，圆润厚实，满足感强' },
  { id: 'r13', name: '云南手冲', region: '亚洲醇厚', roast: '中烘', brew: '手冲', desc: '醇厚饱满，红糖甜感，国产之光' },
  { id: 'r14', name: '亚洲深烘意式', region: '亚洲醇厚', roast: '深烘', brew: '意式浓缩', desc: '焦糖果香，浓郁厚实，意式经典' },
  { id: 'r15', name: '极深烘拼配', region: '亚洲醇厚', roast: '极深烘', brew: '法压壶', desc: '炭烧风味，厚重浓烈，重口味最爱' }
];

export interface FlavorAnswers {
  region: string;
  roast: string;
  brew: string;
}

export function getQuestions() {
  return [
    {
      id: 1,
      title: '你更喜欢哪种咖啡产地风味？',
      options: ['非洲果酸', '亚洲醇厚', '中南美洲平衡', '印度尼西亚草本']
    },
    {
      id: 2,
      title: '你偏爱哪种烘焙程度？',
      options: ['浅烘', '中烘', '深烘', '极深烘']
    },
    {
      id: 3,
      title: '你喜欢的冲煮方式？',
      options: ['手冲', '意式浓缩', '法压壶', '冷萃']
    }
  ];
}

export function recommendDrink(answers: FlavorAnswers): RecommendedDrink {
  let bestMatch = DRINKS[0];
  let bestScore = -1;

  for (const drink of DRINKS) {
    let score = 0;
    if (drink.region === answers.region) score += 3;
    if (drink.roast === answers.roast) score += 2;
    if (drink.brew === answers.brew) score += 2;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = drink;
    }
  }

  return bestMatch;
}

export function getRecommendationReason(answers: FlavorAnswers): string {
  const parts: string[] = [];
  if (answers.region === '非洲果酸') parts.push('明亮的果酸风味');
  else if (answers.region === '亚洲醇厚') parts.push('醇厚饱满的口感');
  else if (answers.region === '中南美洲平衡') parts.push('平衡温和的调性');
  else if (answers.region === '印度尼西亚草本') parts.push('草本大地气息');

  if (answers.roast === '浅烘') parts.push('浅度烘焙保留的原生风味');
  else if (answers.roast === '中烘') parts.push('中度烘焙的平衡甜感');
  else if (answers.roast === '深烘') parts.push('深度烘焙的浓郁焦香');
  else if (answers.roast === '极深烘') parts.push('极深烘焙的炭烧厚重');

  parts.push(answers.brew + '的独特口感');

  return '您偏好' + parts.join('与') + '，这款最适合您！';
}

export function getAllDrinks(): RecommendedDrink[] {
  return DRINKS;
}
