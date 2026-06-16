import type { CellFeatures } from './imageProcessor';

export interface Artwork {
  id: number;
  name: string;
  style: string;
  avgColor: [number, number, number];
  variance: number;
  colors: [number, number, number][];
  gradient: string;
}

export interface StyleMatchResult {
  cellIndex: number;
  artworkId: number;
  artworkName: string;
  matchScore: number;
  artwork: Artwork;
}

export const artworks: Artwork[] = [
  {
    id: 0,
    name: '星月夜',
    style: '后印象派',
    avgColor: [45, 65, 120],
    variance: 3200,
    colors: [[20, 40, 90], [80, 100, 160], [200, 200, 180], [50, 70, 130]],
    gradient: 'linear-gradient(135deg, #142850 0%, #27496d 50%, #dae1e7 100%)'
  },
  {
    id: 1,
    name: '向日葵',
    style: '后印象派',
    avgColor: [220, 170, 50],
    variance: 4500,
    colors: [[255, 200, 50], [200, 140, 30], [100, 60, 20], [240, 180, 80]],
    gradient: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)'
  },
  {
    id: 2,
    name: '睡莲',
    style: '印象派',
    avgColor: [100, 140, 120],
    variance: 1800,
    colors: [[80, 120, 100], [140, 170, 150], [60, 90, 80], [180, 200, 190]],
    gradient: 'linear-gradient(135deg, #4a7c59 0%, #7eb77f 50%, #b8d4b8 100%)'
  },
  {
    id: 3,
    name: '日出印象',
    style: '印象派',
    avgColor: [180, 140, 110],
    variance: 2800,
    colors: [[200, 150, 100], [120, 100, 90], [255, 100, 50], [160, 140, 130]],
    gradient: 'linear-gradient(135deg, #87ceeb 0%, #f08080 50%, #ffd700 100%)'
  },
  {
    id: 4,
    name: '神奈川冲浪里',
    style: '浮世绘',
    avgColor: [40, 70, 100],
    variance: 3500,
    colors: [[30, 60, 90], [180, 200, 210], [20, 40, 70], [220, 230, 240]],
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #5c8aad 50%, #ffffff 100%)'
  },
  {
    id: 5,
    name: '富岳三十六景',
    style: '浮世绘',
    avgColor: [90, 120, 150],
    variance: 2500,
    colors: [[70, 100, 140], [150, 170, 190], [200, 210, 220], [50, 80, 120]],
    gradient: 'linear-gradient(180deg, #87ceeb 0%, #e0f0ff 50%, #ffb6c1 100%)'
  },
  {
    id: 6,
    name: '金宝汤罐头',
    style: '波普艺术',
    avgColor: [200, 30, 50],
    variance: 5000,
    colors: [[220, 20, 40], [255, 255, 255], [180, 10, 30], [240, 240, 240]],
    gradient: 'linear-gradient(135deg, #ff0000 0%, #ffffff 50%, #ff0000 100%)'
  },
  {
    id: 7,
    name: '玛丽莲梦露',
    style: '波普艺术',
    avgColor: [255, 200, 180],
    variance: 6000,
    colors: [[255, 150, 150], [255, 200, 100], [100, 150, 255], [255, 100, 200]],
    gradient: 'linear-gradient(135deg, #ff69b4 0%, #ffd700 50%, #00bfff 100%)'
  },
  {
    id: 8,
    name: '墨竹图',
    style: '水墨画',
    avgColor: [60, 60, 60],
    variance: 1500,
    colors: [[30, 30, 30], [90, 90, 90], [150, 150, 150], [50, 50, 50]],
    gradient: 'linear-gradient(135deg, #2c2c2c 0%, #696969 50%, #d3d3d3 100%)'
  },
  {
    id: 9,
    name: '山水图',
    style: '水墨画',
    avgColor: [100, 100, 100],
    variance: 2000,
    colors: [[50, 50, 50], [120, 120, 120], [180, 180, 180], [80, 80, 80]],
    gradient: 'linear-gradient(180deg, #f5f5f5 0%, #a9a9a9 50%, #2f4f4f 100%)'
  },
  {
    id: 10,
    name: '呐喊',
    style: '表现主义',
    avgColor: [180, 90, 70],
    variance: 4800,
    colors: [[200, 100, 80], [100, 50, 60], [255, 150, 100], [80, 40, 50]],
    gradient: 'linear-gradient(135deg, #8b0000 0%, #cd5c5c 50%, #ff8c00 100%)'
  },
  {
    id: 11,
    name: '记忆的永恒',
    style: '超现实主义',
    avgColor: [180, 160, 130],
    variance: 2200,
    colors: [[200, 180, 140], [140, 120, 100], [100, 80, 60], [220, 200, 170]],
    gradient: 'linear-gradient(135deg, #d4a574 0%, #8b7355 50%, #f5deb3 100%)'
  },
  {
    id: 12,
    name: '格尔尼卡',
    style: '立体主义',
    avgColor: [80, 80, 80],
    variance: 5500,
    colors: [[20, 20, 20], [150, 150, 150], [255, 255, 255], [100, 100, 100]],
    gradient: 'linear-gradient(135deg, #000000 0%, #808080 50%, #ffffff 100%)'
  },
  {
    id: 13,
    name: '亚维农少女',
    style: '立体主义',
    avgColor: [160, 120, 100],
    variance: 3800,
    colors: [[180, 140, 110], [100, 70, 50], [200, 160, 130], [80, 50, 30]],
    gradient: 'linear-gradient(135deg, #d2691e 0%, #8b4513 50%, #deb887 100%)'
  },
  {
    id: 14,
    name: '吻',
    style: '新艺术运动',
    avgColor: [200, 160, 80],
    variance: 3000,
    colors: [[220, 180, 100], [180, 140, 60], [240, 200, 120], [160, 120, 40]],
    gradient: 'linear-gradient(135deg, #daa520 0%, #b8860b 50%, #ffd700 100%)'
  },
  {
    id: 15,
    name: '构成VIII',
    style: '包豪斯',
    avgColor: [250, 240, 230],
    variance: 6500,
    colors: [[255, 50, 50], [50, 100, 255], [255, 220, 50], [30, 30, 30]],
    gradient: 'linear-gradient(135deg, #ff4444 25%, #4444ff 50%, #ffff44 75%, #222222 100%)'
  },
  {
    id: 16,
    name: '大宫女',
    style: '新古典主义',
    avgColor: [180, 150, 130],
    variance: 1600,
    colors: [[200, 170, 140], [150, 120, 100], [220, 190, 160], [120, 90, 70]],
    gradient: 'linear-gradient(135deg, #bc8f8f 0%, #e9967a 50%, #f5deb3 100%)'
  },
  {
    id: 17,
    name: '自由引导人民',
    style: '浪漫主义',
    avgColor: [100, 70, 60],
    variance: 4000,
    colors: [[130, 50, 40], [80, 60, 50], [200, 150, 100], [60, 40, 30]],
    gradient: 'linear-gradient(135deg, #8b0000 0%, #a0522d 50%, #daa520 100%)'
  },
  {
    id: 18,
    name: '白嘴鸦的飞行',
    style: '现实主义',
    avgColor: [120, 110, 100],
    variance: 2400,
    colors: [[100, 90, 80], [150, 140, 130], [80, 70, 60], [180, 170, 160]],
    gradient: 'linear-gradient(180deg, #708090 0%, #a9a9a9 50%, #d3d3d3 100%)'
  },
  {
    id: 19,
    name: '红蓝椅',
    style: '风格派',
    avgColor: [240, 240, 240],
    variance: 7000,
    colors: [[255, 0, 0], [0, 0, 0], [0, 50, 255], [255, 255, 0]],
    gradient: 'linear-gradient(135deg, #ff0000 33%, #000000 33%, #0000ff 66%, #ffff00 100%)'
  }
];

function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function varianceDistance(v1: number, v2: number): number {
  return Math.abs(v1 - v2);
}

export function matchStyle(features: CellFeatures): StyleMatchResult {
  const cellColor: [number, number, number] = [features.avgR, features.avgG, features.avgB];
  
  let bestMatch: Artwork | null = null;
  let bestScore = Infinity;
  let bestMatchIndex = -1;

  for (let i = 0; i < artworks.length; i++) {
    const artwork = artworks[i];
    
    const colorDist = colorDistance(cellColor, artwork.avgColor);
    const varDist = varianceDistance(features.variance, artwork.variance);
    
    const normalizedColorDist = colorDist / 255;
    const normalizedVarDist = Math.min(varDist / 8000, 1);
    
    const score = normalizedColorDist * 0.7 + normalizedVarDist * 0.3;
    
    if (score < bestScore) {
      bestScore = score;
      bestMatch = artwork;
      bestMatchIndex = i;
    }
  }

  const matchScore = Math.max(0, Math.min(100, (1 - bestScore) * 100));

  return {
    cellIndex: 0,
    artworkId: bestMatch!.id,
    artworkName: bestMatch!.name,
    matchScore: Math.round(matchScore * 10) / 10,
    artwork: bestMatch!
  };
}

export function matchAllCells(cells: { features: CellFeatures }[]): StyleMatchResult[] {
  return cells.map((cell, index) => {
    const result = matchStyle(cell.features);
    result.cellIndex = index;
    return result;
  });
}

export function getArtworkById(id: number): Artwork | undefined {
  return artworks.find(a => a.id === id);
}

export function getRandomArtwork(): Artwork {
  return artworks[Math.floor(Math.random() * artworks.length)];
}
