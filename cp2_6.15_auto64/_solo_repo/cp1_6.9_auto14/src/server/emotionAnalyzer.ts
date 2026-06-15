import { EmotionTendency, EmotionTag } from '../shared/types';

interface EmotionDictionary {
  positive: string[];
  negative: string[];
  neutral: string[];
  keywordMap: Record<string, EmotionTag>;
  keywordWeight: Record<string, number>;
}

const emotionDictionary: EmotionDictionary = {
  positive: [
    '开心', '高兴', '快乐', '幸福', '欢笑', '喜悦', '愉快', '满足', '希望', '感恩',
    '美好', '阳光', '温暖', '甜蜜', '爱', '喜欢', '棒', '好', '美', '赞',
    '兴奋', '激动', '惊喜', '感动', '自豪', '自信', '勇气', '自由', '和平', '安详',
    '成功', '进步', '成长', '收获', '圆满', '如意', '顺利', '幸运', '奇迹', '祝福',
    '灿烂', '明媚', '芬芳', '清新', '舒适', '惬意', '轻松', '愉悦', '畅快', '欢乐',
  ],
  negative: [
    '伤心', '难过', '忧伤', '痛苦', '失望', '绝望', '沮丧', '郁闷', '烦躁', '焦虑',
    '害怕', '恐惧', '担忧', '生气', '愤怒', '委屈', '孤独', '寂寞', '空虚', '迷茫',
    '压力', '疲惫', '累', '讨厌', '恨', '糟糕', '坏', '差', '失败', '挫折',
    '悲伤', '流泪', '心碎', '绝望', '无助', '无奈', '后悔', '内疚', '羞愧', '自卑',
    '紧张', '不安', '惊惶', '惊恐', '恐慌', '厌倦', '麻木', '冷淡', '消极', '堕落',
  ],
  neutral: [
    '普通', '平常', '一般', '还行', '凑合', '平淡', '安静', '平静', '日常', '常规',
    '习惯', '平常', '正常', '标准', '通常', '照旧', '一样', '不变', '稳定', '平衡',
    '思考', '考虑', '想', '回忆', '记得', '忘记', '过去', '现在', '未来', '时间',
    '工作', '学习', '生活', '事情', '问题', '方法', '方式', '计划', '安排', '准备',
  ],
  keywordMap: {
    '开心': '快乐', '高兴': '快乐', '快乐': '快乐', '幸福': '快乐', '欢笑': '快乐',
    '喜悦': '快乐', '愉快': '快乐', '满足': '快乐', '阳光': '快乐', '温暖': '快乐',
    '伤心': '忧伤', '难过': '忧伤', '忧伤': '忧伤', '痛苦': '忧伤', '失望': '忧伤',
    '流泪': '忧伤', '悲伤': '忧伤', '心碎': '忧伤', '委屈': '忧伤', '孤独': '忧伤',
    '平静': '平静', '安静': '平静', '安宁': '平静', '祥和': '平静', '稳定': '平静',
    '放松': '平静', '宁静': '平静', '舒适': '平静', '惬意': '平静', '安详': '平静',
    '兴奋': '兴奋', '激动': '兴奋', '惊喜': '兴奋', '振奋': '兴奋', '热情': '兴奋',
    '活力': '兴奋', '激情': '兴奋', '澎湃': '兴奋', '沸腾': '兴奋', '雀跃': '兴奋',
    '怀念': '怀念', '回忆': '怀念', '思念': '怀念', '想念': '怀念', '追忆': '怀念',
    '怀旧': '怀念', '回首': '怀念', '往事': '怀念', '从前': '怀念', '过去': '怀念',
  },
  keywordWeight: {
    '开心': 2, '高兴': 2, '快乐': 3, '幸福': 3, '欢笑': 2,
    '喜悦': 3, '愉快': 2, '满足': 2, '阳光': 1, '温暖': 2,
    '伤心': -2, '难过': -2, '忧伤': -3, '痛苦': -3, '失望': -2,
    '流泪': -2, '悲伤': -3, '心碎': -3, '委屈': -2, '孤独': -2,
    '平静': 0, '安静': 0, '安宁': 0, '祥和': 0, '稳定': 0,
    '放松': 1, '宁静': 0, '舒适': 1, '惬意': 1, '安详': 0,
    '兴奋': 3, '激动': 3, '惊喜': 3, '振奋': 2, '热情': 2,
    '活力': 2, '激情': 3, '澎湃': 3, '沸腾': 3, '雀跃': 3,
    '怀念': 0, '回忆': 0, '思念': -1, '想念': -1, '追忆': 0,
    '怀旧': 0, '回首': 0, '往事': 0, '从前': 0, '过去': 0,
    '希望': 2, '感恩': 2, '美好': 2, '甜蜜': 2, '爱': 3,
    '喜欢': 2, '感动': 2, '自豪': 2, '自信': 2, '勇气': 2,
    '绝望': -3, '沮丧': -2, '郁闷': -2, '烦躁': -2, '焦虑': -2,
    '害怕': -2, '恐惧': -3, '担忧': -2, '生气': -2, '愤怒': -3,
    '寂寞': -2, '空虚': -2, '迷茫': -1, '压力': -2, '疲惫': -1,
  },
};

const tagWeightMap: Record<EmotionTag, number> = {
  '快乐': 2,
  '兴奋': 3,
  '平静': 0,
  '忧伤': -2,
  '怀念': -1,
};

export function analyzeEmotion(
  text: string,
  tags: EmotionTag[]
): {
  tendency: EmotionTendency;
  score: number;
  keywords: string[];
} {
  let score = 0;
  const foundKeywords: { word: string; count: number; weight: number }[] = [];
  const keywordSet = new Set<string>();

  for (const dict of Object.keys(emotionDictionary.keywordWeight)) {
    const regex = new RegExp(dict, 'g');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      const weight = emotionDictionary.keywordWeight[dict] || 0;
      score += weight * matches.length;
      if (!keywordSet.has(dict)) {
        keywordSet.add(dict);
        foundKeywords.push({ word: dict, count: matches.length, weight: Math.abs(weight) + matches.length });
      }
    }
  }

  for (const tag of tags) {
    score += tagWeightMap[tag] || 0;
    const tagKeywords = Object.entries(emotionDictionary.keywordMap)
      .filter(([, v]) => v === tag)
      .map(([k]) => k);
    for (const kw of tagKeywords.slice(0, 2)) {
      if (!keywordSet.has(kw)) {
        keywordSet.add(kw);
        foundKeywords.push({ word: kw, count: 1, weight: 1 });
      }
    }
  }

  let tendency: EmotionTendency;
  if (score > 1) {
    tendency = 'positive';
  } else if (score < -1) {
    tendency = 'negative';
  } else {
    tendency = 'neutral';
  }

  foundKeywords.sort((a, b) => b.weight - a.weight);
  const keywords = foundKeywords.slice(0, 5).map(k => k.word);

  if (keywords.length === 0) {
    keywords.push(tags[0] || '平静');
  }

  return { tendency, score, keywords };
}
