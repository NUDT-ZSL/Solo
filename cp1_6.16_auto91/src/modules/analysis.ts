export interface Flaw {
  x: number;
  y: number;
  w: number;
  h: number;
  description: string;
  imageIndex: number;
}

export interface AnalysisResult {
  score: number;
  flaws: Flaw[];
  brightness: number;
  noiseLevel: number;
  edgeCount: number;
}

export interface PriceRange {
  min: number;
  max: number;
  unit: string;
}

export interface HistoryData {
  [brand: string]: {
    [model: string]: {
      avgPrice: number;
      salesCount: number;
      priceTrend: number;
    };
  };
}

const FLAW_DESCRIPTIONS = [
  '琴颈轻微划痕',
  '指板磨损痕迹',
  '琴身漆面小磕碰',
  '金属部件氧化',
  '面板轻微划痕',
  '背板磨损',
  '琴桥位置痕迹',
  '品丝磨损',
  '护板划痕',
  '旋钮松动',
  '琴弦锈迹',
  '音孔周围磨损'
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let totalBrightness = 0;
  const step = Math.max(1, Math.floor(data.length / (4 * 10000)));
  
  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    totalBrightness += brightness;
  }
  
  const pixelCount = data.length / (4 * step);
  return totalBrightness / pixelCount;
}

function calculateNoiseLevel(imageData: ImageData): number {
  const data = imageData.data;
  let sum = 0;
  let sumSq = 0;
  const step = Math.max(1, Math.floor(data.length / (4 * 5000)));
  let count = 0;
  
  for (let i = 0; i < data.length; i += 4 * step) {
    const brightness = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    sum += brightness;
    sumSq += brightness * brightness;
    count++;
  }
  
  const mean = sum / count;
  const variance = (sumSq / count) - (mean * mean);
  return Math.sqrt(variance);
}

function sobelEdgeDetection(imageData: ImageData): number {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  let edgeCount = 0;
  
  const getGray = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    const idx = (y * width + x) * 4;
    return (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
  };
  
  const step = 2;
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const gx = 
        -getGray(x - 1, y - 1) + getGray(x + 1, y - 1) +
        -2 * getGray(x - 1, y) + 2 * getGray(x + 1, y) +
        -getGray(x - 1, y + 1) + getGray(x + 1, y + 1);
      
      const gy = 
        -getGray(x - 1, y - 1) - 2 * getGray(x, y - 1) - getGray(x + 1, y - 1) +
        getGray(x - 1, y + 1) + 2 * getGray(x, y + 1) + getGray(x + 1, y + 1);
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude > 0.3) {
        edgeCount++;
      }
    }
  }
  
  return edgeCount;
}

function generateFlaws(
  imageData: ImageData,
  imageIndex: number,
  score: number,
  random: () => number
): Flaw[] {
  const flaws: Flaw[] = [];
  const flawCount = Math.floor((100 - score) / 5) + random() * 3);
  const width = imageData.width;
  const height = imageData.height;
  
  for (let i = 0; i < flawCount; i++) {
    const centerX = 0.15 + random() * 0.7;
    const centerY = 0.15 + random() * 0.7;
    const w = 0.05 + random() * 0.15;
    const h = 0.05 + random() * 0.15;
    
    flaws.push({
      x: Math.max(0, Math.min(1, centerX - w / 2)),
      y: Math.max(0, Math.min(1, centerY - h / 2)),
      w: Math.min(1 - centerX + w / 2, w),
      h: Math.min(1 - centerY + h / 2, h),
      description: FLAW_DESCRIPTIONS[Math.floor(random() * FLAW_DESCRIPTIONS.length)],
      imageIndex
    });
  }
  
  return flaws.slice(0, Math.min(flaws.length, 4));
}

export function analyzeInstrument(imageDataList: ImageData[]): AnalysisResult {
  if (imageDataList.length === 0) {
    return {
      score: 0,
      flaws: [],
      brightness: 0,
      noiseLevel: 0,
      edgeCount: 0
    };
  }
  
  let totalBrightness = 0;
  let totalNoise = 0;
  let totalEdges = 0;
  const allFlaws: Flaw[] = [];
  
  imageDataList.forEach((imageData, index) => {
    const brightness = calculateBrightness(imageData);
    const noise = calculateNoiseLevel(imageData);
    const edges = sobelEdgeDetection(imageData);
    
    totalBrightness += brightness;
    totalNoise += noise;
    totalEdges += edges;
    
    const seed = index * 1000 + Math.floor(brightness * 1000) + Math.floor(noise * 10000);
    const random = seededRandom(seed);
    
    const imageScore = 50 + random() * 50;
    const flaws = generateFlaws(imageData, index, imageScore, random);
    allFlaws.push(...flaws);
  });
  
  const avgBrightness = totalBrightness / imageDataList.length;
  const avgNoise = totalNoise / imageDataList.length;
  const avgEdges = totalEdges / imageDataList.length;
  
  const brightnessFactor = Math.abs(avgBrightness - 0.5) * 100;
  const noiseFactor = avgNoise * 100;
  const edgeFactor = Math.min(100, avgEdges / 100);
  
  const baseScore = 70 + Math.random() * 25;
  const adjustedScore = Math.max(30, Math.min(98, baseScore - brightnessFactor * 0.1 - noiseFactor * 0.3));
  const finalScore = Math.round(adjustedScore);
  
  return {
    score: finalScore,
    flaws: allFlaws.slice(0, 6),
    brightness: Number(avgBrightness.toFixed(4)),
    noiseLevel: Number(avgNoise.toFixed(4)),
    edgeCount: Math.round(avgEdges)
  };
}

const mockHistoryData: HistoryData = {
  'Martin': {
    'D-28': { avgPrice: 15000, salesCount: 156, priceTrend: -0.03 },
    'D-18': { avgPrice: 12000, salesCount: 98, priceTrend: 0.02 },
    '000-15M': { avgPrice: 6500, salesCount: 78, priceTrend: 0.01 }
  },
  'Gibson': {
    'Les Paul Standard': { avgPrice: 18000, salesCount: 203, priceTrend: -0.02 },
    'SG Standard': { avgPrice: 9500, salesCount: 145, priceTrend: 0.01 },
    'ES-335': { avgPrice: 16000, salesCount: 87, priceTrend: 0.03 }
  },
  'Fender': {
    'Stratocaster': { avgPrice: 8500, salesCount: 312, priceTrend: 0 },
    'Telecaster': { avgPrice: 7800, salesCount: 245, priceTrend: 0.02 },
    'Jazz Bass': { avgPrice: 7200, salesCount: 167, priceTrend: -0.01 }
  },
  'Yamaha': {
    'FG800': { avgPrice: 1800, salesCount: 456, priceTrend: -0.05 },
    'LL16': { avgPrice: 4500, salesCount: 189, priceTrend: 0.01 },
    'C40': { avgPrice: 800, salesCount: 623, priceTrend: -0.03 }
  },
  'Taylor': {
    '814ce': { avgPrice: 18000, salesCount: 134, priceTrend: 0.02 },
    '314ce': { avgPrice: 9500, salesCount: 198, priceTrend: 0.01 },
    'GS Mini': { avgPrice: 3200, salesCount: 276, priceTrend: -0.02 }
  },
  'Ibanez': {
    'RG550': { avgPrice: 5500, salesCount: 178, priceTrend: -0.01 },
    'AF75': { avgPrice: 3800, salesCount: 95, priceTrend: 0 },
    'BTB400QM': { avgPrice: 4200, salesCount: 76, priceTrend: 0.02 }
  },
  'PRS': {
    'Custom 24': { avgPrice: 22000, salesCount: 87, priceTrend: 0.03 },
    'SE Standard': { avgPrice: 4500, salesCount: 156, priceTrend: 0.01 }
  },
  'Epiphone': {
    'Les Paul Standard': { avgPrice: 3200, salesCount: 289, priceTrend: -0.02 },
    'Casino': { avgPrice: 2800, salesCount: 145, priceTrend: 0 }
  }
};

export function estimatePrice(
  brand: string,
  model: string,
  score: number,
  historyData: HistoryData = mockHistoryData
): PriceRange {
  const brandData = historyData[brand];
  let avgPrice = 5000;
  
  if (brandData) {
    const modelData = brandData[model];
    if (modelData) {
      avgPrice = modelData.avgPrice;
    } else {
      const firstModel = Object.values(brandData)[0];
      if (firstModel) {
        avgPrice = firstModel.avgPrice;
      }
    }
  }
  
  const conditionMultiplier = 0.3 + (score / 100) * 0.9;
  const basePrice = avgPrice * conditionMultiplier;
  
  const variance = basePrice * 0.1;
  const minPrice = Math.round((basePrice - variance) / 100) * 100;
  const maxPrice = Math.round((basePrice + variance) / 100) * 100;
  
  return {
    min: Math.max(100, minPrice),
    max: Math.max(minPrice + 100, maxPrice),
    unit: 'CNY'
  };
}

export { mockHistoryData };
