import type {
  ClothingItem,
  ClothingCategory,
  DailyWeather,
  OutfitPlan,
  OutfitItem,
  WeatherWeight
} from '../types';

const WARDROBE: ClothingItem[] = [
  { id: 'top-1', name: '白色T恤', category: 'top', icon: '👕', warmthWeight: 2, waterproof: false, windproof: false, suitableTemp: [22, 35] },
  { id: 'top-2', name: '棉质衬衫', category: 'top', icon: '👔', warmthWeight: 3, waterproof: false, windproof: false, suitableTemp: [18, 30] },
  { id: 'top-3', name: '长袖卫衣', category: 'top', icon: '🥼', warmthWeight: 5, waterproof: false, windproof: false, suitableTemp: [10, 22] },
  { id: 'top-4', name: '羊毛针织衫', category: 'top', icon: '🧶', warmthWeight: 7, waterproof: false, windproof: false, suitableTemp: [0, 15] },
  { id: 'top-5', name: '高领毛衣', category: 'top', icon: '🧣', warmthWeight: 8, waterproof: false, windproof: false, suitableTemp: [-5, 10] },
  { id: 'bottom-1', name: '短裤', category: 'bottom', icon: '🩳', warmthWeight: 1, waterproof: false, windproof: false, suitableTemp: [25, 35] },
  { id: 'bottom-2', name: '牛仔裤', category: 'bottom', icon: '👖', warmthWeight: 3, waterproof: false, windproof: true, suitableTemp: [15, 28] },
  { id: 'bottom-3', name: '休闲裤', category: 'bottom', icon: '👖', warmthWeight: 4, waterproof: false, windproof: false, suitableTemp: [12, 25] },
  { id: 'bottom-4', name: '加绒长裤', category: 'bottom', icon: '👖', warmthWeight: 6, waterproof: false, windproof: true, suitableTemp: [-5, 15] },
  { id: 'bottom-5', name: '运动裤', category: 'bottom', icon: '👖', warmthWeight: 4, waterproof: false, windproof: false, suitableTemp: [10, 25] },
  { id: 'outer-1', name: '轻薄风衣', category: 'outerwear', icon: '🧥', warmthWeight: 4, waterproof: false, windproof: true, suitableTemp: [10, 22] },
  { id: 'outer-2', name: '牛仔外套', category: 'outerwear', icon: '🧥', warmthWeight: 5, waterproof: false, windproof: true, suitableTemp: [8, 20] },
  { id: 'outer-3', name: '羽绒服', category: 'outerwear', icon: '🧥', warmthWeight: 9, waterproof: true, windproof: true, suitableTemp: [-15, 5] },
  { id: 'outer-4', name: '雨衣', category: 'outerwear', icon: '🧥', warmthWeight: 3, waterproof: true, windproof: true, suitableTemp: [10, 30] },
  { id: 'outer-5', name: '呢大衣', category: 'outerwear', icon: '🧥', warmthWeight: 8, waterproof: false, windproof: true, suitableTemp: [-5, 12] },
  { id: 'shoes-1', name: '凉鞋', category: 'shoes', icon: '👡', warmthWeight: 1, waterproof: false, windproof: false, suitableTemp: [25, 35] },
  { id: 'shoes-2', name: '运动鞋', category: 'shoes', icon: '👟', warmthWeight: 3, waterproof: false, windproof: false, suitableTemp: [15, 30] },
  { id: 'shoes-3', name: '皮鞋', category: 'shoes', icon: '👞', warmthWeight: 4, waterproof: false, windproof: false, suitableTemp: [12, 28] },
  { id: 'shoes-4', name: '雪地靴', category: 'shoes', icon: '🥾', warmthWeight: 8, waterproof: true, windproof: true, suitableTemp: [-15, 5] },
  { id: 'shoes-5', name: '雨靴', category: 'shoes', icon: '🥾', warmthWeight: 3, waterproof: true, windproof: false, suitableTemp: [10, 25] },
  { id: 'acc-1', name: '遮阳帽', category: 'accessory', icon: '🎩', warmthWeight: 0, waterproof: false, windproof: false, suitableTemp: [20, 40] },
  { id: 'acc-2', name: '雨伞', category: 'accessory', icon: '☂️', warmthWeight: 0, waterproof: true, windproof: false, suitableTemp: [0, 40] },
  { id: 'acc-3', name: '围巾', category: 'accessory', icon: '🧣', warmthWeight: 2, waterproof: false, windproof: true, suitableTemp: [-15, 15] },
  { id: 'acc-4', name: '太阳镜', category: 'accessory', icon: '🕶️', warmthWeight: 0, waterproof: false, windproof: false, suitableTemp: [15, 40] },
  { id: 'acc-5', name: '手套', category: 'accessory', icon: '🧤', warmthWeight: 2, waterproof: true, windproof: true, suitableTemp: [-15, 5] }
];

const outfitCache = new Map<string, { plan: OutfitPlan; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const clothingByCategory: Record<ClothingCategory, ClothingItem[]> = {
  top: WARDROBE.filter(item => item.category === 'top'),
  bottom: WARDROBE.filter(item => item.category === 'bottom'),
  outerwear: WARDROBE.filter(item => item.category === 'outerwear'),
  shoes: WARDROBE.filter(item => item.category === 'shoes'),
  accessory: WARDROBE.filter(item => item.category === 'accessory')
};

function buildTempIndex(): Map<string, ClothingItem[]> {
  const index = new Map<string, ClothingItem[]>();
  for (let t = -15; t <= 35; t += 5) {
    const key = `${t}_${t + 5}`;
    const items = WARDROBE.filter(item => {
      const [minT, maxT] = item.suitableTemp;
      return !(maxT < t || minT > t + 5);
    });
    index.set(key, items);
  }
  return index;
}
const tempIndex = buildTempIndex();

function getClothingByTempRange(feelsLike: number): ClothingItem[] {
  const bucketStart = Math.floor(feelsLike / 5) * 5;
  const key = `${bucketStart}_${bucketStart + 5}`;
  return tempIndex.get(key) || WARDROBE;
}

export function calcFeelsLike(weather: DailyWeather): number {
  return weather.temp - weather.windSpeed * 0.1 + (weather.humidity > 70 ? -2 : 0);
}

export function calcWeatherWeight(weather: DailyWeather): WeatherWeight {
  const tempNorm = (weather.temp + 15) / 50;
  const tempWeight = tempNorm > 0.5 ? 1 - tempNorm : tempNorm;
  const humidityWeight = weather.humidity / 100;
  const windWeight = weather.windSpeed / 30;
  const rainWeight = weather.rainProb / 100;

  return {
    tempWeight: Math.min(1, Math.max(0, tempWeight)),
    humidityWeight: Math.min(1, Math.max(0, humidityWeight)),
    windWeight: Math.min(1, Math.max(0, windWeight)),
    rainWeight: Math.min(1, Math.max(0, rainWeight))
  };
}

function calculateMatchScore(
  item: ClothingItem,
  weather: DailyWeather,
  feelsLike: number,
  weight: WeatherWeight
): number {
  let score = 0;

  const [minTemp, maxTemp] = item.suitableTemp;
  if (feelsLike >= minTemp && feelsLike <= maxTemp) {
    const tempCenter = (minTemp + maxTemp) / 2;
    const tempRange = (maxTemp - minTemp) / 2;
    const tempDistance = Math.abs(feelsLike - tempCenter);
    score += (1 - tempDistance / tempRange) * 50 * weight.tempWeight;
  } else {
    score -= 100;
  }

  if (weather.rainProb > 50) {
    score += item.waterproof ? 30 * weight.rainWeight : -20 * weight.rainWeight;
  }

  if (weather.windSpeed > 15) {
    score += item.windproof ? 25 * weight.windWeight : -10 * weight.windWeight;
  }

  if (weather.humidity > 70) {
    score += item.warmthWeight <= 4 ? 10 * weight.humidityWeight : -10 * weight.humidityWeight;
  }

  score += item.warmthWeight * 2;

  return score;
}

export function matchClothing(
  category: ClothingCategory,
  weather: DailyWeather,
  feelsLike: number,
  weight: WeatherWeight
): ClothingItem[] {
  const tempFiltered = getClothingByTempRange(feelsLike);
  const items = tempFiltered.filter(item => item.category === category);
  const candidateItems = items.length > 0 ? items : clothingByCategory[category];

  const scored = candidateItems.map(item => ({
    item,
    score: calculateMatchScore(item, weather, feelsLike, weight)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.item);
}

export function generateReason(item: ClothingItem, weather: DailyWeather): string {
  const reasons: string[] = [];
  const feelsLike = calcFeelsLike(weather);
  const [minTemp, maxTemp] = item.suitableTemp;

  if (feelsLike >= minTemp && feelsLike <= maxTemp) {
    reasons.push(`适用于当前体感温度 ${feelsLike.toFixed(1)}°C`);
  }

  if (weather.rainProb > 50) {
    if (item.waterproof) {
      reasons.push(`降雨概率${weather.rainProb}%，具备防水性能`);
    } else {
      reasons.push(`注意：不防水，降雨概率${weather.rainProb}%`);
    }
  }

  if (weather.windSpeed > 15) {
    if (item.windproof) {
      reasons.push(`风力${weather.windSpeed}km/h，具备防风性能`);
    }
  }

  if (weather.type === 'sunny' && (item.name.includes('遮阳帽') || item.name.includes('太阳镜'))) {
    reasons.push('晴天防晒必备');
  }

  if (weather.type === 'rainy' && item.name.includes('雨伞')) {
    reasons.push('雨天必备');
  }

  if (weather.temp < 10 && item.warmthWeight >= 5) {
    reasons.push(`保暖值${item.warmthWeight}，适合低温天气`);
  }

  if (weather.temp > 25 && item.warmthWeight <= 3) {
    reasons.push(`轻薄透气，适合高温天气`);
  }

  if (reasons.length === 0) {
    reasons.push('基础搭配选择');
  }

  return reasons.join('，');
}

function getWeatherCacheKey(weather: DailyWeather): string {
  return `${weather.type}-${weather.temp}-${weather.humidity}-${weather.windSpeed}-${weather.rainProb}`;
}

export function generateOutfit(weather: DailyWeather): OutfitPlan {
  const cacheKey = getWeatherCacheKey(weather);
  const cached = outfitCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return {
      ...cached.plan,
      id: String(now),
      timestamp: now
    };
  }

  const startTime = performance.now();

  const feelsLike = calcFeelsLike(weather);
  const weight = calcWeatherWeight(weather);
  const categories: ClothingCategory[] = ['top', 'bottom', 'outerwear', 'shoes', 'accessory'];

  const items: OutfitItem[] = categories.map(category => {
    const matched = matchClothing(category, weather, feelsLike, weight);
    const bestMatch = matched[0];
    return {
      ...bestMatch,
      reason: generateReason(bestMatch, weather)
    };
  });

  const plan: OutfitPlan = {
    id: String(now),
    timestamp: now,
    weatherSnapshot: { ...weather },
    items,
    modified: false
  };

  outfitCache.set(cacheKey, { plan, timestamp: now });

  const elapsed = performance.now() - startTime;
  console.debug(`[outfitService] generateOutfit 耗时: ${elapsed.toFixed(2)}ms (目标≤200ms)`);

  return plan;
}

export function getAllClothingByCategory(category: ClothingCategory): ClothingItem[] {
  return [...clothingByCategory[category]];
}

export function saveOutfit(plan: OutfitPlan, rating?: number): void {
  try {
    const key = 'outfit_history';
    const existing = localStorage.getItem(key);
    const history: OutfitPlan[] = existing ? JSON.parse(existing) : [];

    const updatedPlan: OutfitPlan = { ...plan };
    if (rating !== undefined) {
      updatedPlan.rating = rating;
    }

    const index = history.findIndex(p => p.id === plan.id);
    if (index >= 0) {
      history[index] = updatedPlan;
    } else {
      history.push(updatedPlan);
    }

    localStorage.setItem(key, JSON.stringify(history));
  } catch (e) {
    console.error('保存穿搭计划失败:', e);
  }
}

export function getOutfitHistory(page = 1, pageSize = 20): { list: OutfitPlan[]; total: number } {
  try {
    const key = 'outfit_history';
    const existing = localStorage.getItem(key);
    const history: OutfitPlan[] = existing ? JSON.parse(existing) : [];

    history.sort((a, b) => b.timestamp - a.timestamp);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const list = history.slice(start, end);

    return {
      list,
      total: history.length
    };
  } catch (e) {
    console.error('读取穿搭历史失败:', e);
    return { list: [], total: 0 };
  }
}

export { WARDROBE };
