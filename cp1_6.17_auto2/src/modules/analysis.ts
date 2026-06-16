export interface Flaw {
  x: number;
  y: number;
  w: number;
  h: number;
  description: string;
}

export interface AnalysisResult {
  score: number;
  flaws: Flaw[];
  brightness: number;
  contrast: number;
  edgeCount: number;
}

export interface PriceRange {
  min: number;
  max: number;
  unit: string;
}

const FLAW_DESCRIPTIONS = [
  '琴颈轻微划痕',
  '面板小磕碰',
  '品丝轻微磨损',
  '琴身边缘掉漆',
  '指板污渍',
  '琴桥轻微磨损',
  '背板划痕',
  '旋钮氧化',
  '护板划痕',
  '音孔装饰磨损'
];

function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let totalBrightness = 0;
  const pixelCount = data.length / 4;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    totalBrightness += brightness;
  }
  
  return totalBrightness / pixelCount;
}

function calculateContrast(imageData: ImageData): number {
  const data = imageData.data;
  const brightnessValues: number[] = [];
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    brightnessValues.push(brightness);
  }
  
  const mean = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
  const squaredDiffs = brightnessValues.map(b => Math.pow(b - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  
  return Math.sqrt(variance);
}

function detectEdges(imageData: ImageData): number {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  let edgeCount = 0;
  
  const grayscale = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    grayscale[idx] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
  }
  
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kidx = (ky + 1) * 3 + (kx + 1);
          gx += grayscale[idx] * sobelX[kidx];
          gy += grayscale[idx] * sobelY[kidx];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude > 30) {
        edgeCount++;
      }
    }
  }
  
  return edgeCount;
}

function detectFlaws(imageData: ImageData, index: number): Flaw[] {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const flaws: Flaw[] = [];
  
  const sampleSize = 20;
  const stepX = Math.floor(width / sampleSize);
  const stepY = Math.floor(height / sampleSize);
  
  const regions: { x: number; y: number; anomaly: number }[] = [];
  
  for (let sy = 2; sy < sampleSize - 2; sy++) {
    for (let sx = 2; sx < sampleSize - 2; sx++) {
      const centerX = sx * stepX + stepX / 2;
      const centerY = sy * stepY + stepY / 2;
      
      let regionBrightness = 0;
      let sampleCount = 0;
      
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const px = Math.floor(centerX + dx * 5);
          const py = Math.floor(centerY + dy * 5);
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            const brightness = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
            regionBrightness += brightness;
            sampleCount++;
          }
        }
      }
      
      regionBrightness /= sampleCount;
      
      const neighbors = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
      ];
      
      let neighborAvg = 0;
      let neighborCount = 0;
      
      for (const [ny, nx] of neighbors) {
        const nsx = sx + nx;
        const nsy = sy + ny;
        if (nsx >= 0 && nsx < sampleSize && nsy >= 0 && nsy < sampleSize) {
          const nCenterX = nsx * stepX + stepX / 2;
          const nCenterY = nsy * stepY + stepY / 2;
          const idx = (Math.floor(nCenterY) * width + Math.floor(nCenterX)) * 4;
          if (idx >= 0 && idx < data.length - 3) {
            const brightness = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
            neighborAvg += brightness;
            neighborCount++;
          }
        }
      }
      
      if (neighborCount > 0) {
        neighborAvg /= neighborCount;
        const anomaly = Math.abs(regionBrightness - neighborAvg);
        
        if (anomaly > 20) {
          regions.push({
            x: centerX / width,
            y: centerY / height,
            anomaly
          });
        }
      }
    }
  }
  
  regions.sort((a, b) => b.anomaly - a.anomaly);
  
  const flawCount = Math.min(regions.length, 2 + Math.floor(Math.random() * 2));
  const usedIndices = new Set<number>();
  
  for (let i = 0; i < flawCount && i < regions.length; i++) {
    const regionIndex = Math.floor(Math.random() * Math.min(regions.length, 6));
    if (usedIndices.has(regionIndex)) continue;
    usedIndices.add(regionIndex);
    
    const region = regions[regionIndex];
    const flawW = 0.05 + Math.random() * 0.1;
    const flawH = 0.03 + Math.random() * 0.06;
    
    flaws.push({
      x: Math.max(0.02, Math.min(0.98, region.x - flawW / 2)),
      y: Math.max(0.02, Math.min(0.98, region.y - flawH / 2)),
      w: flawW,
      h: flawH,
      description: FLAW_DESCRIPTIONS[(index * 3 + i) % FLAW_DESCRIPTIONS.length]
    });
  }
  
  return flaws;
}

export function analyzeInstrument(imageDatas: ImageData[]): AnalysisResult {
  if (imageDatas.length === 0) {
    return {
      score: 70,
      flaws: [],
      brightness: 128,
      contrast: 50,
      edgeCount: 0
    };
  }
  
  let totalBrightness = 0;
  let totalContrast = 0;
  let totalEdges = 0;
  let allFlaws: Flaw[] = [];
  
  imageDatas.forEach((imageData, index) => {
    totalBrightness += calculateBrightness(imageData);
    totalContrast += calculateContrast(imageData);
    totalEdges += detectEdges(imageData);
    
    const flaws = detectFlaws(imageData, index);
    flaws.forEach(flaw => {
      allFlaws.push({
        ...flaw
      });
    });
  });
  
  const avgBrightness = totalBrightness / imageDatas.length;
  const avgContrast = totalContrast / imageDatas.length;
  const avgEdges = totalEdges / imageDatas.length;
  
  const maxEdges = imageDatas[0].width * imageDatas[0].height * 0.1;
  const edgeRatio = Math.min(avgEdges / maxEdges, 1);
  
  let baseScore = 85;
  
  const brightnessDeviation = Math.abs(avgBrightness - 128);
  if (brightnessDeviation > 40) {
    baseScore -= (brightnessDeviation - 40) * 0.3;
  }
  
  if (avgContrast < 30) {
    baseScore -= (30 - avgContrast) * 0.5;
  }
  
  baseScore -= allFlaws.length * 5;
  
  baseScore -= edgeRatio * 10;
  
  const randomVariation = (Math.random() - 0.5) * 10;
  baseScore += randomVariation;
  
  const score = Math.max(20, Math.min(99, Math.round(baseScore)));
  
  if (allFlaws.length === 0 && score < 90) {
    allFlaws.push({
      x: 0.3 + Math.random() * 0.4,
      y: 0.3 + Math.random() * 0.4,
      w: 0.05 + Math.random() * 0.05,
      h: 0.03 + Math.random() * 0.04,
      description: FLAW_DESCRIPTIONS[Math.floor(Math.random() * FLAW_DESCRIPTIONS.length)]
    });
  }
  
  return {
    score,
    flaws: allFlaws.slice(0, 4),
    brightness: Math.round(avgBrightness),
    contrast: Math.round(avgContrast),
    edgeCount: Math.round(avgEdges)
  };
}

const BRAND_BASE_PRICES: Record<string, number> = {
  'Martin': 15000,
  'Gibson': 12000,
  'Taylor': 20000,
  'Fender': 8000,
  'Yamaha': 3000,
  'Ibanez': 5000,
  'Lakewood': 18000,
  'Guild': 9000,
  'Seagull': 4000,
  'Epiphone': 3500,
  'PRS': 16000,
  'Rickenbacker': 14000
};

const MODEL_MULTIPLIERS: Record<string, number> = {
  'D-28': 1.2,
  'D-45': 2.0,
  'HD-28': 1.3,
  'Les Paul': 1.1,
  'Les Paul Studio': 0.9,
  'Stratocaster': 1.0,
  'Telecaster': 0.95,
  '814ce': 1.5,
  '314ce': 1.0,
  'FG830': 1.1,
  'C40': 0.8,
  'RG550': 1.2,
  'M-32': 1.1
};

const HISTORICAL_DATA = {
  averageDiscountRate: 0.7,
  depreciationPerYear: 0.05,
  priceRangeVariance: 0.15
};

export function estimatePrice(
  brand: string,
  model: string,
  score: number,
  historicalData = HISTORICAL_DATA
): PriceRange {
  const brandLower = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  const basePrice = BRAND_BASE_PRICES[brand] || BRAND_BASE_PRICES[brandLower] || 5000;
  
  let modelMultiplier = 1;
  for (const [modelName, multiplier] of Object.entries(MODEL_MULTIPLIERS)) {
    if (model.toLowerCase().includes(modelName.toLowerCase())) {
      modelMultiplier = multiplier;
      break;
    }
  }
  
  const newPrice = basePrice * modelMultiplier;
  
  const scoreFactor = score / 100;
  const conditionFactor = 0.4 + scoreFactor * 0.55;
  
  const estimatedPrice = newPrice * conditionFactor;
  
  const variance = historicalData.priceRangeVariance;
  const minPrice = Math.floor(estimatedPrice * (1 - variance));
  const maxPrice = Math.floor(estimatedPrice * (1 + variance));
  
  return {
    min: Math.max(100, minPrice),
    max: Math.max(minPrice + 100, maxPrice),
    unit: 'CNY'
  };
}
