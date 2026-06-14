export interface TastingRecord {
  id: string;
  rating: number;
  notes: string;
  date: string;
}

export interface Beer {
  id: string;
  name: string;
  brewery: string;
  style: string;
  abv: number;
  rating: number;
  notes: string;
  flavorTags: string[];
  tastingRecords: TastingRecord[];
  createdAt: string;
}

export interface BeerInput {
  name: string;
  brewery: string;
  style: string;
  abv: number;
  rating: number;
  notes: string;
  flavorTags: string[];
}

export interface Stats {
  totalBeers: number;
  avgRating: number;
  favoriteStyle: string;
  favoriteTag: string;
  radarData: { dimension: string; value: number }[];
}

export const BEER_STYLES = [
  'IPA', '双料IPA', '新英格兰IPA', '世涛', '帝国世涛',
  '波特', '酸啤', '兰比克', '古斯', '小麦啤',
  '比利时白啤', '修道院啤酒', '皮尔森', '拉格', '博克',
  '琥珀艾尔', '棕色艾尔', '大麦酒', '赛松', '其他'
];

export const FLAVOR_TAGS = [
  '柑橘', '热带水果', '莓果', '苹果', '蜂蜜',
  '焦糖', '巧克力', '咖啡', '坚果', '烘烤',
  '麦芽', '面包', '花香', '草本', '香料',
  '胡椒', '松木', '树脂', '烟熏', '橡木',
  '奶油', '清爽', '干爽', '甜润', '苦涩'
];
