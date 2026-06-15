import { Artwork } from '../types';

export const artworks: Artwork[] = [
  {
    id: 'art-001',
    title: '日出·印象',
    artist: '克劳德·莫奈',
    year: 1872,
    genre: 'impressionism',
    type: 'painting',
    width: 80,
    height: 60,
    color: '#5B8FB9'
  },
  {
    id: 'art-002',
    title: '睡莲',
    artist: '克劳德·莫奈',
    year: 1906,
    genre: 'impressionism',
    type: 'painting',
    width: 90,
    height: 70,
    color: '#7FB069'
  },
  {
    id: 'art-003',
    title: '煎饼磨坊的舞会',
    artist: '皮埃尔·奥古斯特·雷诺阿',
    year: 1876,
    genre: 'impressionism',
    type: 'painting',
    width: 85,
    height: 65,
    color: '#D4A574'
  },
  {
    id: 'art-004',
    title: '舞蹈课',
    artist: '埃德加·德加',
    year: 1874,
    genre: 'impressionism',
    type: 'painting',
    width: 75,
    height: 55,
    color: '#B8A9C9'
  },
  {
    id: 'art-005',
    title: '大碗岛的星期天下午',
    artist: '乔治·修拉',
    year: 1884,
    genre: 'impressionism',
    type: 'painting',
    width: 95,
    height: 75,
    color: '#6B8E6B'
  },
  {
    id: 'art-006',
    title: '亚维农少女',
    artist: '巴勃罗·毕加索',
    year: 1907,
    genre: 'modern',
    type: 'painting',
    width: 85,
    height: 70,
    color: '#C4956A'
  },
  {
    id: 'art-007',
    title: '记忆的永恒',
    artist: '萨尔瓦多·达利',
    year: 1931,
    genre: 'modern',
    type: 'painting',
    width: 70,
    height: 55,
    color: '#E8D5B7'
  },
  {
    id: 'art-008',
    title: '构成第八号',
    artist: '瓦西里·康定斯基',
    year: 1923,
    genre: 'modern',
    type: 'painting',
    width: 80,
    height: 65,
    color: '#D9534F'
  },
  {
    id: 'art-009',
    title: '呐喊',
    artist: '爱德华·蒙克',
    year: 1893,
    genre: 'modern',
    type: 'painting',
    width: 75,
    height: 60,
    color: '#E67E22'
  },
  {
    id: 'art-010',
    title: '星月夜',
    artist: '文森特·梵高',
    year: 1889,
    genre: 'modern',
    type: 'painting',
    width: 85,
    height: 70,
    color: '#4A6FA5'
  },
  {
    id: 'art-011',
    title: '思想者',
    artist: '奥古斯特·罗丹',
    year: 1904,
    genre: 'sculpture',
    type: 'sculpture',
    width: 50,
    height: 50,
    color: '#5C4033'
  },
  {
    id: 'art-012',
    title: '大卫',
    artist: '米开朗基罗',
    year: 1504,
    genre: 'sculpture',
    type: 'sculpture',
    width: 55,
    height: 55,
    color: '#D4C5B5'
  },
  {
    id: 'art-013',
    title: '鸟',
    artist: '康斯坦丁·布朗库西',
    year: 1919,
    genre: 'sculpture',
    type: 'sculpture',
    width: 45,
    height: 45,
    color: '#B8860B'
  },
  {
    id: 'art-014',
    title: '空间中独特形式的连续性',
    artist: '翁贝托·博乔尼',
    year: 1913,
    genre: 'sculpture',
    type: 'sculpture',
    width: 50,
    height: 50,
    color: '#8B4513'
  },
  {
    id: 'art-015',
    title: '舞',
    artist: '埃德加·德加',
    year: 1882,
    genre: 'sculpture',
    type: 'sculpture',
    width: 48,
    height: 48,
    color: '#A0522D'
  }
];

export const genreLabels: Record<string, string> = {
  all: '全部',
  impressionism: '印象派',
  modern: '现代派',
  sculpture: '雕塑'
};

export const yearRanges = [
  { label: '全部', range: [1400, 2000] as [number, number] },
  { label: '19世纪前', range: [1400, 1800] as [number, number] },
  { label: '19世纪', range: [1800, 1900] as [number, number] },
  { label: '20世纪后', range: [1900, 2000] as [number, number] }
];
