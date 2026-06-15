import { v4 as uuidv4 } from 'uuid';

export type InstrumentCategory = '全部' | '吉他' | '钢琴' | '小提琴' | '架子鼓' | '管乐器';

export type InstrumentType = 
  | '木吉他' | '电吉他' | '古典吉他'
  | '立式钢琴' | '三角钢琴' | '电钢琴'
  | '小提琴' | '中提琴' | '大提琴'
  | '架子鼓' | '电子鼓'
  | '萨克斯' | '长笛' | '小号' | '单簧管';

export interface Instrument {
  id: string;
  name: string;
  type: InstrumentType;
  category: InstrumentCategory;
  price: number;
  condition: number;
  description: string;
  contact: string;
  publishDate: Date;
}

export const categories: InstrumentCategory[] = ['全部', '吉他', '钢琴', '小提琴', '架子鼓', '管乐器'];

const categoryMap: Record<InstrumentType, InstrumentCategory> = {
  '木吉他': '吉他',
  '电吉他': '吉他',
  '古典吉他': '吉他',
  '立式钢琴': '钢琴',
  '三角钢琴': '钢琴',
  '电钢琴': '钢琴',
  '小提琴': '小提琴',
  '中提琴': '小提琴',
  '大提琴': '小提琴',
  '架子鼓': '架子鼓',
  '电子鼓': '架子鼓',
  '萨克斯': '管乐器',
  '长笛': '管乐器',
  '小号': '管乐器',
  '单簧管': '管乐器',
};

function createInstrument(
  name: string,
  type: InstrumentType,
  price: number,
  condition: number,
  description: string,
  contact: string,
  daysAgo: number
): Instrument {
  const publishDate = new Date();
  publishDate.setDate(publishDate.getDate() - daysAgo);
  return {
    id: uuidv4(),
    name,
    type,
    category: categoryMap[type],
    price,
    condition,
    description,
    contact,
    publishDate,
  };
}

export const instrumentsData: Instrument[] = [
  createInstrument('雅马哈 FG830 民谣吉他', '木吉他', 2800, 92, '自用两年，保养良好，音色温暖，适合指弹和弹唱。送原装琴包、变调夹、备用琴弦一套。', '张先生 138****1234', 3),
  createInstrument('芬达 Player Strat 电吉他', '电吉他', 6500, 88, '墨产芬达玩家系列，枫木指板，三单拾音器，成色很新，无磕碰划痕。', '李女士 139****5678', 7),
  createInstrument('马丁 D28 民谣吉他', '木吉他', 15800, 95, '美产马丁经典型号，云杉面板玫瑰木背侧，开声完美，收藏级成色。', '王先生 137****9012', 1),
  createInstrument('雅马哈 C40 古典吉他', '古典吉他', 800, 75, '入门级古典吉他，尼龙弦，适合初学者。有轻微使用痕迹，不影响演奏。', '赵同学 136****3456', 14),
  createInstrument('卡瓦依 K300 立式钢琴', '立式钢琴', 28000, 90, '日本原装进口，家用保养，定期调律，音色纯净，键盘手感佳。', '陈老师 135****7890', 5),
  createInstrument('雅马哈 CLP-735 电钢琴', '电钢琴', 5500, 94, '高端电钢琴，逐级配重锤感键盘，音色逼真，带盖设计，九成新。', '刘女士 134****2345', 2),
  createInstrument('珠江 UP118 立式钢琴', '立式钢琴', 8500, 70, '国产名牌，家用十年，正常使用痕迹，音质依然很好，适合初学。', '孙先生 133****6789', 20),
  createInstrument('斯坦威 三角钢琴', '三角钢琴', 88000, 97, '施坦威入门级三角钢琴，专业演奏级，保养极佳，音色优美。', '周老师 132****0123', 10),
  createInstrument('斯特拉迪瓦里 仿古琴', '小提琴', 3200, 85, '手工制作小提琴，枫木背板，云杉面板，声音通透，适合中级学者。', '吴先生 131****4567', 8),
  createInstrument('雅马哈 V3SKA 小提琴', '小提琴', 4800, 92, '日产雅马哈高级小提琴，做工精细，音色明亮，附琴盒和弓。', '郑女士 130****8901', 4),
  createInstrument('大提琴 入门练习款', '大提琴', 2200, 78, '4/4全尺寸大提琴，实木制作，适合初学者和学生练习使用。', '钱同学 158****2345', 12),
  createInstrument('中提琴 16英寸', '中提琴', 3500, 82, '16英寸专业中提琴，云杉面板，枫木背侧，音色温暖醇厚。', '冯老师 159****6789', 6),
  createInstrument('雅马哈 DTX450 电子鼓', '电子鼓', 3800, 87, '雅马哈入门电子鼓，五鼓三镲配置，静音练习好选择，成色新。', '褚先生 157****0123', 9),
  createInstrument('TAMA 节奏伴侣 架子鼓', '架子鼓', 7500, 80, 'TAMA经典系列，五鼓配置，镲片另算，鼓皮状态良好，有使用痕迹。', '卫先生 156****4567', 11),
  createInstrument('罗兰 TD-17KV 电子鼓', '电子鼓', 9800, 93, '罗兰中端电子鼓，网状鼓皮，手感接近真鼓，功能丰富。', '蒋同学 155****8901', 3),
  createInstrument('雅马哈 YAS-280 萨克斯', '萨克斯', 5200, 86, '中音萨克斯，入门级首选，吹奏省力，音色饱满，配原装箱包。', '沈老师 154****2345', 5),
  createInstrument('长笛 雅马哈 212SL', '长笛', 3600, 91, '闭孔长笛，镀银表面，初学者理想选择，音准好，成色佳。', '韩女士 153****6789', 7),
  createInstrument('小号 巴哈 TR305', '小号', 4500, 78, '巴哈入门小号，黄铜材质，吹奏轻松，适合学生和业余爱好者。', '杨先生 152****0123', 13),
  createInstrument('单簧管 布菲 B12', '单簧管', 4200, 83, '布菲入门级单簧管，胶木材质，音色稳定，适合考级练习。', '朱同学 151****4567', 15),
  createInstrument('萨克斯 塞尔曼 802', '萨克斯', 18500, 96, '法国塞尔曼802中音萨克斯，专业级，收藏级成色，巅峰状态。', '秦老师 150****8901', 2),
];

export function filterByCategory(instruments: Instrument[], category: InstrumentCategory): Instrument[] {
  if (category === '全部') {
    return instruments;
  }
  return instruments.filter(inst => inst.category === category);
}

export function searchByName(instruments: Instrument[], query: string): Instrument[] {
  if (!query.trim()) {
    return [];
  }
  const lowerQuery = query.toLowerCase();
  return instruments.filter(inst => 
    inst.name.toLowerCase().includes(lowerQuery) ||
    inst.type.toLowerCase().includes(lowerQuery)
  );
}

export function sortByPrice(instruments: Instrument[], ascending: boolean = true): Instrument[] {
  return [...instruments].sort((a, b) => ascending ? a.price - b.price : b.price - a.price);
}

export function sortByCondition(instruments: Instrument[], ascending: boolean = false): Instrument[] {
  return [...instruments].sort((a, b) => ascending ? a.condition - b.condition : b.condition - a.condition);
}

export function formatDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日发布`;
}

export function formatPrice(price: number): string {
  return `¥${price.toLocaleString()}`;
}

export function getConditionColor(condition: number): string {
  const ratio = condition / 100;
  const r = Math.round(255 - ratio * (255 - 76));
  const g = Math.round(77 + ratio * (175 - 77));
  const b = Math.round(77 + ratio * (80 - 77));
  return `rgb(${r}, ${g}, ${b})`;
}

export interface FormattedInstrument {
  id: string;
  name: string;
  type: InstrumentType;
  category: InstrumentCategory;
  formattedPrice: string;
  condition: number;
  conditionColor: string;
  description: string;
  contact: string;
  formattedDate: string;
}

export function formatInstrument(inst: Instrument): FormattedInstrument {
  return {
    id: inst.id,
    name: inst.name,
    type: inst.type,
    category: inst.category,
    formattedPrice: formatPrice(inst.price),
    condition: inst.condition,
    conditionColor: getConditionColor(inst.condition),
    description: inst.description,
    contact: inst.contact,
    formattedDate: formatDate(inst.publishDate),
  };
}

export function getFormattedInstruments(instruments: Instrument[]): FormattedInstrument[] {
  return instruments.map(formatInstrument);
}
