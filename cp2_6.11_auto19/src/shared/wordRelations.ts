/**
 * 预设关联词库
 * 本地Mock数据，模拟关键词关联关系
 *
 * 修复问题4：每个关联词都携带关联类型和权重值
 */

import { RelationType } from './types';

export interface RelatedWordItem {
  word: string;
  strength: number;    // 关联强度 0-1（原字段，兼容）
  weight: number;      // 权重（与strength等价，语义更明确）
  relationType: RelationType; // 关系类型
}

export interface WordRelationMap {
  [keyword: string]: RelatedWordItem[];
}

/**
 * 根据关联词特征智能推断关系类型
 */
function inferRelationType(keyword: string, relatedWord: string): RelationType {
  const lowerK = keyword.toLowerCase();
  const lowerR = relatedWord.toLowerCase();

  // 检测是否为同义词（简单启发式：包含相同核心词）
  if (lowerR.includes(lowerK.slice(-2)) || lowerK.includes(lowerR.slice(-2))) {
    if (Math.random() < 0.3) return 'synonym';
  }

  // 检测是否为下位词（更具体的概念）
  const hyponymPatterns = ['网络', '系统', '算法', '模型', '方法', '技术', '学习'];
  for (const p of hyponymPatterns) {
    if (lowerR.includes(p) && !lowerK.includes(p)) {
      return 'hyponym';
    }
  }

  // 检测是否为属性/特征
  const attributePatterns = ['函数', '工程', '初始化', '下降', '传播'];
  for (const p of attributePatterns) {
    if (lowerR.includes(p)) {
      return 'attribute';
    }
  }

  // 默认为相关词
  return 'related';
}

/**
 * 从原始强度数据转换为带关系类型的格式
 */
function buildRelations(map: { [kw: string]: { [rw: string]: number } }): WordRelationMap {
  const result: WordRelationMap = {};
  for (const keyword of Object.keys(map)) {
    const items: RelatedWordItem[] = [];
    for (const [relatedWord, strength] of Object.entries(map[keyword])) {
      items.push({
        word: relatedWord,
        strength,
        weight: strength,
        relationType: inferRelationType(keyword, relatedWord),
      });
    }
    result[keyword] = items;
  }
  return result;
}

// ========== 原始词库数据 ==========
const rawRelations = {
  "人工智能": {
    "机器学习": 0.95,
    "深度学习": 0.90,
    "神经网络": 0.88,
    "自然语言处理": 0.82,
    "计算机视觉": 0.80,
    "专家系统": 0.65,
    "知识图谱": 0.70,
  },
  "机器学习": {
    "监督学习": 0.92,
    "无监督学习": 0.88,
    "强化学习": 0.85,
    "决策树": 0.78,
    "随机森林": 0.75,
    "支持向量机": 0.72,
    "特征工程": 0.70,
  },
  "深度学习": {
    "卷积神经网络": 0.93,
    "循环神经网络": 0.90,
    "Transformer": 0.95,
    "生成对抗网络": 0.82,
    "迁移学习": 0.80,
    "梯度下降": 0.75,
  },
  "神经网络": {
    "感知机": 0.85,
    "激活函数": 0.80,
    "损失函数": 0.78,
    "反向传播": 0.88,
    "权重初始化": 0.65,
    "Dropout": 0.70,
  },
  "自然语言处理": {
    "词嵌入": 0.90,
    "BERT": 0.92,
    "GPT": 0.95,
    "语义分析": 0.82,
    "机器翻译": 0.85,
    "文本分类": 0.78,
    "命名实体识别": 0.75,
  },
  "计算机视觉": {
    "图像识别": 0.92,
    "目标检测": 0.88,
    "语义分割": 0.85,
    "图像生成": 0.78,
    "特征提取": 0.72,
    "ResNet": 0.80,
  },
  "React": {
    "Hooks": 0.92,
    "组件": 0.95,
    "虚拟DOM": 0.88,
    "Redux": 0.78,
    "JSX": 0.85,
    "Props": 0.80,
    "State": 0.82,
  },
  "前端开发": {
    "HTML": 0.90,
    "CSS": 0.90,
    "JavaScript": 0.95,
    "TypeScript": 0.88,
    "Webpack": 0.75,
    "Vite": 0.78,
    "响应式设计": 0.82,
  },
  "知识图谱": {
    "实体识别": 0.88,
    "关系抽取": 0.85,
    "图数据库": 0.82,
    "Neo4j": 0.75,
    "本体构建": 0.70,
    "推理引擎": 0.68,
  },
  "数据结构": {
    "数组": 0.90,
    "链表": 0.88,
    "树": 0.85,
    "图": 0.80,
    "哈希表": 0.82,
    "栈": 0.78,
    "队列": 0.78,
  },
  "算法": {
    "排序算法": 0.90,
    "搜索算法": 0.88,
    "动态规划": 0.85,
    "贪心算法": 0.78,
    "回溯算法": 0.75,
    "图算法": 0.80,
  },
};

export const wordRelations: WordRelationMap = buildRelations(rawRelations);

/**
 * 获取关联词列表
 * 如果词库中没有该词，则生成通用关联（带随机关系类型）
 */
export function getRelatedWords(keyword: string): RelatedWordItem[] {
  const trimmed = keyword.trim();
  if (wordRelations[trimmed]) {
    return wordRelations[trimmed];
  }

  // 生成通用关联词（Mock fallback）
  const genericRelations: RelationType[] = ['related', 'hyponym', 'attribute'];
  const suffixes = [
    '基础', '应用', '技术', '方法', '系统',
    '理论', '实践', '研究', '发展', '优化'
  ];

  return suffixes.map((suffix, i) => {
    const strength = 0.85 - i * 0.06;
    return {
      word: `${trimmed}${suffix}`,
      strength,
      weight: strength,
      relationType: genericRelations[i % genericRelations.length],
    };
  });
}
