export interface EmotionWord {
  word: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  intensity: number;
  rhythm: number;
}

const POSITIVE_DICT: Record<string, number> = {
  '爱': 0.9, '美': 0.8, '好': 0.6, '乐': 0.8, '笑': 0.7,
  '欢': 0.8, '喜': 0.8, '温': 0.6, '暖': 0.7, '光': 0.7,
  '希': 0.8, '梦': 0.7, '甜': 0.7, '香': 0.5, '彩': 0.5,
  '虹': 0.6, '晴': 0.5, '春': 0.7, '花': 0.6, '月': 0.5,
  '星': 0.6, '舞': 0.7, '歌': 0.7, '飞': 0.7, '锦': 0.7,
  '灿': 0.7, '烂': 0.6, '辉': 0.7, '煌': 0.8, '艳': 0.6,
  '芬': 0.5, '芳': 0.5, '馨': 0.6, '怡': 0.6, '悦': 0.7,
  '欣': 0.7, '畅': 0.6, '安': 0.5, '宁': 0.5, '祥': 0.6,
  '瑞': 0.6, '福': 0.8, '康': 0.6, '健': 0.5, '强': 0.6,
  '勇': 0.7, '毅': 0.6, '坚': 0.5, '信': 0.5, '愿': 0.6,
  '望': 0.6, '盼': 0.6, '灿烂': 0.8, '辉煌': 0.9, '美丽': 0.8,
  '快乐': 0.9, '温暖': 0.8, '希望': 0.8, '幸福': 0.9, '光明': 0.7,
  '春风': 0.7, '明月': 0.6, '繁星': 0.6, '飞翔': 0.7, '喜悦': 0.8,
  '欢乐': 0.8, '爱恋': 0.9, '甜蜜': 0.8, '芬芳': 0.6, '安宁': 0.6,
  '吉祥': 0.7, '如意': 0.7, '壮丽': 0.7, '宏伟': 0.7, '澄澈': 0.5,
  '晶莹': 0.6, '绚丽': 0.7, '璀璨': 0.8, '熠熠': 0.7, '闪耀': 0.7,
  '灿烂': 0.8, '欢喜': 0.8, '温柔': 0.7, '慈爱': 0.8, '飘逸': 0.6,
  '清新': 0.6, '明媚': 0.7, '婉约': 0.5, '灵动': 0.6, '生机': 0.7,
  '蓬勃': 0.7, '绚烂': 0.8, '瑰丽': 0.7, '斑斓': 0.7, '翩跹': 0.6,
  '婀娜': 0.5, '优雅': 0.6, '璀璨': 0.8, '烂漫': 0.7, '绽放': 0.7,
  '日出': 0.6, '霞光': 0.7, '晨曦': 0.6, '朝阳': 0.7, '满天': 0.5,
  '如意': 0.7, '平安': 0.6, '团圆': 0.8, '相聚': 0.7, '归来': 0.6,
};

const NEGATIVE_DICT: Record<string, number> = {
  '愁': 0.7, '苦': 0.8, '悲': 0.9, '哭': 0.8, '泣': 0.7,
  '泪': 0.7, '伤': 0.7, '痛': 0.9, '恨': 0.9, '怒': 0.8,
  '气': 0.6, '怨': 0.7, '寒': 0.6, '冷': 0.5, '冰': 0.5,
  '霜': 0.5, '阴': 0.5, '暗': 0.6, '黑': 0.5, '沉': 0.5,
  '重': 0.5, '孤': 0.7, '独': 0.7, '寂': 0.7, '寥': 0.6,
  '荒': 0.6, '凉': 0.6, '凄': 0.7, '惨': 0.8, '残': 0.7,
  '破': 0.6, '碎': 0.6, '散': 0.5, '落': 0.5, '枯': 0.6,
  '萎': 0.6, '凋': 0.6, '零': 0.5, '衰': 0.6, '败': 0.7,
  '亡': 0.9, '死': 0.9, '灭': 0.8, '消': 0.5, '失': 0.6,
  '离': 0.7, '别': 0.7, '远': 0.4, '遥': 0.4, '迟': 0.4,
  '暮': 0.5, '夕': 0.4, '秋': 0.4, '悲伤': 0.9, '痛苦': 0.9,
  '孤独': 0.8, '寂寞': 0.7, '凄凉': 0.8, '残破': 0.7, '离别': 0.8,
  '沉重': 0.6, '黑暗': 0.7, '忧愁': 0.7, '哀伤': 0.8, '凄惨': 0.8,
  '凋零': 0.6, '荒凉': 0.7, '冷漠': 0.6, '绝望': 0.9, '幽暗': 0.6,
  '惆怅': 0.6, '黯然': 0.6, '凄清': 0.6, '苍凉': 0.7, '萧瑟': 0.6,
  '落寞': 0.7, '忧伤': 0.7, '悲痛': 0.9, '凄苦': 0.8, '苦难': 0.8,
  '沧桑': 0.6, '颠沛': 0.7, '流离': 0.7, '烽火': 0.7, '战乱': 0.8,
  '血泪': 0.9, '生离': 0.8, '死别': 0.9, '断肠': 0.9, '肝肠': 0.8,
  '天涯': 0.5, '沦落': 0.7, '漂泊': 0.6, '流浪': 0.6, '迷茫': 0.5,
  '叹息': 0.5, '无奈': 0.5, '遗憾': 0.5, '悔恨': 0.7, '愧疚': 0.6,
  '思念': 0.6, '牵挂': 0.5, '等待': 0.4, '期盼': 0.3,
};

const DICT_MAX_LEN = 4;

function forwardMaxMatch(text: string): string[] {
  const words: string[] = [];
  let i = 0;
  const cleanText = text.replace(/[\s，。！？、；：""''（）\.\,\!\?\;\:\"\'\(\)]/g, '');
  while (i < cleanText.length) {
    let matched = false;
    for (let len = Math.min(DICT_MAX_LEN, cleanText.length - i); len >= 2; len--) {
      const substr = cleanText.substring(i, i + len);
      if (POSITIVE_DICT[substr] !== undefined || NEGATIVE_DICT[substr] !== undefined) {
        words.push(substr);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      words.push(cleanText[i]);
      i++;
    }
  }
  return words;
}

function computePunctuationFactor(text: string, wordIndex: number): number {
  const puncts = /[，。！？、；：""''（）\.\,\!\?\;\:\"\'\(\)]/g;
  const matches = [...text.matchAll(puncts)];
  if (matches.length === 0) return 1.0;
  const avgGap = text.length / (matches.length + 1);
  return Math.min(1.5, avgGap / 10);
}

export function parseText(text: string): EmotionWord[] {
  if (!text || text.trim().length === 0) return [];

  const words = forwardMaxMatch(text);
  const results: EmotionWord[] = [];

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let intensity = 0.15 + Math.random() * 0.15;

    if (POSITIVE_DICT[word] !== undefined) {
      sentiment = 'positive';
      intensity = POSITIVE_DICT[word];
    } else if (NEGATIVE_DICT[word] !== undefined) {
      sentiment = 'negative';
      intensity = NEGATIVE_DICT[word];
    }

    const punctFactor = computePunctuationFactor(text, wi);
    const rhythm = (word.length / text.length) * punctFactor;

    results.push({ word, sentiment, intensity, rhythm });
  }

  return results;
}
