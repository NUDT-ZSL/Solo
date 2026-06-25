// 心情标签类型：描述用户当前想体验的茶汤风格
export type MoodTag = '清甜' | '醇厚' | '花香' | '烟熏' | '鲜爽';

// 五维茶向量：从香气、滋味、汤色、叶底、回甘五个维度量化茶品特征
export type TeaVector = {
  aroma: number;      // 香气
  taste: number;      // 滋味
  color: number;      // 汤色
  leaf: number;       // 叶底
  aftertaste: number; // 回甘
};

// 品鉴记录类型：单次品鉴的五维评分数据
export type Tasting = {
  id: string;
  teaId: string;
  aroma: number;
  taste: number;
  color: number;
  leaf: number;
  aftertaste: number;
  totalScore?: number;
  notes?: string;
  createdAt?: string;
  scores?: {
    aroma: number;
    taste: number;
    color: number;
    leaf: number;
    aftertaste: number;
  };
};

// 茶品类型：包含基本信息与最近一次品鉴
export type Tea = {
  id: string;
  name: string;
  origin: string;
  year: number;
  imageUrl: string;
  isFavorite: boolean;
  latestTasting?: Tasting;
};

// 推荐结果：茶品对象、匹配分数、推荐理由
export type RecommendResult = {
  tea: Tea;
  matchScore: number;
  reason: string;
};

// 心情标签到五维权重的映射
// 不同心情对五个维度的重视程度不同，权重总和为1.0
export const MoodWeightMap: Record<MoodTag, TeaVector> = {
  '清甜': { aroma: 0.2, taste: 0.3, color: 0.1, leaf: 0.1, aftertaste: 0.3 },
  '醇厚': { aroma: 0.1, taste: 0.4, color: 0.1, leaf: 0.3, aftertaste: 0.1 },
  '花香': { aroma: 0.5, taste: 0.2, color: 0.1, leaf: 0.1, aftertaste: 0.1 },
  '烟熏': { aroma: 0.4, taste: 0.2, color: 0.1, leaf: 0.3, aftertaste: 0.0 },
  '鲜爽': { aroma: 0.1, taste: 0.2, color: 0.3, leaf: 0.1, aftertaste: 0.3 },
};

// 五维名称映射，用于生成推荐理由
const DimensionNames: Record<keyof TeaVector, string> = {
  aroma: '香气',
  taste: '滋味',
  color: '汤色',
  leaf: '叶底',
  aftertaste: '回甘',
};

/**
 * 计算两个向量的余弦相似度
 * 公式: dotProduct(A,B) / (norm(A) * norm(B))
 * 取值范围: [-1, 1]，值越接近1表示越相似
 * @param vecA 向量A
 * @param vecB 向量B
 * @returns 余弦相似度，分母为0时返回0
 */
export function cosineSimilarity(vecA: TeaVector, vecB: TeaVector): number {
  const keys: (keyof TeaVector)[] = ['aroma', 'taste', 'color', 'leaf', 'aftertaste'];

  // 计算点积
  let dotProduct = 0;
  for (const key of keys) {
    dotProduct += vecA[key] * vecB[key];
  }

  // 计算向量A的模
  let normA = 0;
  for (const key of keys) {
    normA += vecA[key] * vecA[key];
  }
  normA = Math.sqrt(normA);

  // 计算向量B的模
  let normB = 0;
  for (const key of keys) {
    normB += vecB[key] * vecB[key];
  }
  normB = Math.sqrt(normB);

  // 分母为0时返回0，避免除以零错误
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * 根据选中的多个心情标签构建综合心情向量
 * 对多种心情取权重平均值，然后归一化到0-10范围
 * @param moods 选中的心情标签数组
 * @returns 归一化到0-10范围的五维茶向量
 */
export function buildMoodVector(moods: MoodTag[]): TeaVector {
  const keys: (keyof TeaVector)[] = ['aroma', 'taste', 'color', 'leaf', 'aftertaste'];

  // 未选择任何心情时，返回中性向量（全5）
  if (moods.length === 0) {
    return { aroma: 5, taste: 5, color: 5, leaf: 5, aftertaste: 5 };
  }

  // 初始化累加向量
  const sumVector: TeaVector = { aroma: 0, taste: 0, color: 0, leaf: 0, aftertaste: 0 };

  // 累加所有选中心情的权重
  for (const mood of moods) {
    const weight = MoodWeightMap[mood];
    for (const key of keys) {
      sumVector[key] += weight[key];
    }
  }

  // 取平均值（权重总和理论上为1.0，但多心情时需要除以数量）
  const count = moods.length;
  const avgVector: TeaVector = {
    aroma: sumVector.aroma / count,
    taste: sumVector.taste / count,
    color: sumVector.color / count,
    leaf: sumVector.leaf / count,
    aftertaste: sumVector.aftertaste / count,
  };

  // 找出平均值中的最大值，用于归一化
  let maxValue = 0;
  for (const key of keys) {
    if (avgVector[key] > maxValue) {
      maxValue = avgVector[key];
    }
  }

  // 归一化到0-10范围
  // 如果最大值为0（极端情况），返回全5
  if (maxValue === 0) {
    return { aroma: 5, taste: 5, color: 5, leaf: 5, aftertaste: 5 };
  }

  const normalizedVector: TeaVector = {
    aroma: (avgVector.aroma / maxValue) * 10,
    taste: (avgVector.taste / maxValue) * 10,
    color: (avgVector.color / maxValue) * 10,
    leaf: (avgVector.leaf / maxValue) * 10,
    aftertaste: (avgVector.aftertaste / maxValue) * 10,
  };

  return normalizedVector;
}

/**
 * 计算某款茶所有品鉴记录的五维平均分
 * 如无品鉴记录则返回全5的默认向量（中性评分）
 * @param teaId 茶品ID
 * @param tastings 所有品鉴记录数组
 * @returns 五维平均向量
 */
export function getTeaAverageVector(teaId: string, tastings: Tasting[]): TeaVector {
  const keys: (keyof TeaVector)[] = ['aroma', 'taste', 'color', 'leaf', 'aftertaste'];

  // 筛选出该茶品的所有品鉴记录
  const teaTastings = tastings.filter((t) => t.teaId === teaId);

  // 无品鉴记录时返回默认向量
  if (teaTastings.length === 0) {
    return { aroma: 5, taste: 5, color: 5, leaf: 5, aftertaste: 5 };
  }

  // 累加各维度分数
  const sumVector: TeaVector = { aroma: 0, taste: 0, color: 0, leaf: 0, aftertaste: 0 };
  for (const tasting of teaTastings) {
    const aroma = tasting.aroma ?? tasting['scores']?.aroma ?? 5;
    const taste = tasting.taste ?? tasting['scores']?.taste ?? 5;
    const color = tasting.color ?? tasting['scores']?.color ?? 5;
    const leaf = tasting.leaf ?? tasting['scores']?.leaf ?? 5;
    const aftertaste = tasting.aftertaste ?? tasting['scores']?.aftertaste ?? 5;
    sumVector.aroma += aroma;
    sumVector.taste += taste;
    sumVector.color += color;
    sumVector.leaf += leaf;
    sumVector.aftertaste += aftertaste;
  }

  // 计算平均值
  const count = teaTastings.length;
  const avgVector: TeaVector = {
    aroma: sumVector.aroma / count,
    taste: sumVector.taste / count,
    color: sumVector.color / count,
    leaf: sumVector.leaf / count,
    aftertaste: sumVector.aftertaste / count,
  };

  return avgVector;
}

/**
 * 根据匹配分数和茶品特征生成中文推荐理由
 * 会根据匹配分数高低使用不同语气，并突出表现最好的维度
 * @param matchScore 匹配分数（0-100）
 * @param teaName 茶品名称
 * @param moods 选中的心情标签
 * @param vector 茶品的五维向量
 * @returns 中文推荐理由字符串
 */
export function generateReason(
  matchScore: number,
  teaName: string,
  moods: MoodTag[],
  vector: TeaVector
): string {
  const keys: (keyof TeaVector)[] = ['aroma', 'taste', 'color', 'leaf', 'aftertaste'];

  // 找出得分最高的两个维度
  const sortedDimensions = [...keys].sort((a, b) => vector[b] - vector[a]);
  const topDim1 = sortedDimensions[0];
  const topDim2 = sortedDimensions[1];
  const topDim1Name = DimensionNames[topDim1];
  const topDim2Name = DimensionNames[topDim2];

  // 格式化心情标签为字符串，如 "清甜与花香"
  const moodStr = moods.length > 0
    ? moods.length === 1
      ? moods[0]
      : `${moods.slice(0, -1).join('、')}与${moods[moods.length - 1]}`
    : '当下';

  // 根据匹配分数选择模板（至少3种不同模板）
  let templateIndex = 0;
  if (matchScore >= 85) {
    // 高分：完美契合
    templateIndex = Math.floor(Math.random() * 3); // 0, 1, 2
  } else if (matchScore >= 70) {
    // 中等：较为契合
    templateIndex = 3 + Math.floor(Math.random() * 2); // 3, 4
  } else {
    // 低分：尚可尝试
    templateIndex = 5;
  }

  const templates = [
    // 模板0：突出两个最佳维度 + 完美契合
    `${teaName}在${topDim1Name}与${topDim2Name}上表现卓越，完美契合您${moodStr}的心情`,
    // 模板1：强推荐语气 + 最佳维度
    `强烈推荐${teaName}！其${topDim1Name}尤为出色，与您追求${moodStr}的品味高度匹配`,
    // 模板2：体验描述 + 心情呼应
    `${teaName}的${topDim1Name}层次丰富，${topDim2Name}悠长绵延，正是${moodStr}心境的绝佳伴侣`,
    // 模板3：中肯推荐 + 双维度
    `${teaName}的${topDim1Name}可圈可点，${topDim2Name}也有不错表现，比较契合${moodStr}的偏好`,
    // 模板4：匹配度说明 + 亮点
    `${teaName}与${moodStr}风格有较高匹配度，尤其${topDim1Name}维度值得细细品味`,
    // 模板5：低匹配度的委婉推荐
    `${teaName}虽非${moodStr}风格的首选，但其${topDim1Name}仍有独到之处，不妨一试`,
  ];

  return templates[templateIndex];
}

/**
 * 主导出函数：根据用户心情推荐茶品
 * 流程：构建心情向量 → 计算每款茶的平均向量 → 余弦相似度 → 百分制 → 排序取前三 → 生成理由
 * @param teas 茶品列表
 * @param tastings 所有品鉴记录
 * @param selectedMoods 用户选择的心情标签
 * @returns 推荐结果数组，按匹配分降序排列，最多3条
 */
export function recommend(
  teas: Tea[],
  tastings: Tasting[],
  selectedMoods: MoodTag[]
): RecommendResult[] {

  // 1. 构建心情向量
  const moodVector = buildMoodVector(selectedMoods);

  // 2. 对每款茶计算匹配度
  const results: RecommendResult[] = teas.map((tea) => {
    // 计算茶品的平均向量
    const teaVector = getTeaAverageVector(tea.id, tastings);

    // 计算余弦相似度
    const similarity = cosineSimilarity(moodVector, teaVector);

    // 转为百分制分数（余弦相似度范围[-1,1]，映射到[0,100]）
    // 处理方式：先将[-1,1]线性映射到[0,1]，再乘以100
    const matchScore = Math.round(((similarity + 1) / 2) * 100);

    // 生成推荐理由
    const reason = generateReason(matchScore, tea.name, selectedMoods, teaVector);

    return {
      tea,
      matchScore,
      reason,
    };
  });

  // 3. 按匹配分数降序排列
  results.sort((a, b) => b.matchScore - a.matchScore);

  // 4. 取前3个结果
  return results.slice(0, 3);
}
