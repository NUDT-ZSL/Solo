/**
 * 预设关联词库
 * 本地Mock数据，模拟关键词关联关系
 * 键 = 关键词，值 = { 关联词: 关联强度(0-1) }
 */

export interface WordRelationMap {
  [keyword: string]: {
    [relatedWord: string]: number;
  };
}

export const wordRelations: WordRelationMap = {
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
    "ResNet": 0.82,
    "YOLO": 0.80,
    "特征提取": 0.75,
  },
  "知识图谱": {
    "实体链接": 0.88,
    "关系抽取": 0.85,
    "图数据库": 0.82,
    "Neo4j": 0.78,
    "RDF": 0.70,
    "本体论": 0.68,
  },
  "前端开发": {
    "React": 0.95,
    "Vue": 0.93,
    "TypeScript": 0.90,
    "Webpack": 0.78,
    "Vite": 0.82,
    "CSS3": 0.85,
    "HTML5": 0.88,
  },
  "React": {
    "Hooks": 0.92,
    "Redux": 0.85,
    "JSX": 0.90,
    "虚拟DOM": 0.88,
    "Next.js": 0.82,
    "React Router": 0.80,
  },
  "数据结构": {
    "数组": 0.90,
    "链表": 0.88,
    "栈": 0.85,
    "队列": 0.85,
    "树": 0.92,
    "图": 0.88,
    "哈希表": 0.82,
  },
  "算法": {
    "排序算法": 0.92,
    "查找算法": 0.90,
    "动态规划": 0.88,
    "贪心算法": 0.82,
    "回溯算法": 0.80,
    "分治算法": 0.78,
  },
  "数据库": {
    "MySQL": 0.92,
    "PostgreSQL": 0.88,
    "MongoDB": 0.85,
    "Redis": 0.82,
    "SQL": 0.95,
    "索引优化": 0.80,
  },
};

/**
 * 获取关联词列表
 * 如果词库中没有该词，根据关键词生成通用关联词
 */
export function getRelatedWords(keyword: string): Array<{ word: string; strength: number }> {
  const relations = wordRelations[keyword];
  if (relations) {
    return Object.entries(relations).map(([word, strength]) => ({ word, strength }));
  }

  // 词库中没有的词，生成通用关联
  const prefixes = ["现代", "高级", "应用", "基础", "实践", "理论"];
  const suffixes = ["技术", "方法", "系统", "模型", "框架", "设计"];
  
  return prefixes.slice(0, 3).map((prefix, i) => ({
    word: prefix + keyword,
    strength: 0.7 - i * 0.08,
  })).concat(suffixes.slice(0, 3).map((suffix, i) => ({
    word: keyword + suffix,
    strength: 0.65 - i * 0.08,
  })));
}
