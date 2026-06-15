import { ScoreResult, CommonError, WordStat } from '../types';

const GRAMMAR_RULES = [
  { pattern: /\b(i|you|he|she|it|we|they) is\b/gi, message: "注意主谓一致，例如 'I am' 而不是 'I is'", correction: (m: string) => m.replace(/is\b/i, m.match(/^I\b/i) ? 'am' : 'are') },
  { pattern: /\b(he|she|it) have\b/gi, message: "第三人称单数应使用 'has' 而非 'have'", correction: (m: string) => m.replace(/have\b/i, 'has') },
  { pattern: /\b(does|do(?!n't)) (he|she|it|i|you|we|they) (has|have)\b/gi, message: "助动词后应使用动词原形 'have'", correction: (m: string) => m.replace(/(has|have)\b/i, 'have') },
  { pattern: /\ba ([aeiou])/gi, message: "元音前应使用 'an' 而非 'a'", correction: (m: string) => m.replace(/^a\b/i, 'an') },
  { pattern: /\bi\b/g, message: "代词 'I' 应始终大写", correction: () => 'I' },
  { pattern: /\bvery much (good|bad|nice|happy|sad|angry)\b/gi, message: "直接用 'very + 形容词'，不用 'very much'", correction: (m: string) => m.replace(/very much\b/i, 'very') },
  { pattern: /\bmore better\b/gi, message: "'better' 已经是比较级，无需 'more'", correction: () => 'better' },
  { pattern: /\bmore +\w+er\b/gi, message: "-er 结尾的比较级无需再加 'more'", correction: (m: string) => m.replace(/^more\s+/i, '') },
  { pattern: /\bin the last time\b/gi, message: "应使用 'last time' 或 'recently'", correction: () => 'recently' }
];

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'so', 'basically', 'actually', 'literally', 'sort of', 'kind of'];

const PRONUNCIATION_TIPS = [
  '注意清辅音和浊辅音的区别，如 /p/ 和 /b/',
  '练习 "th" 音的正确发音，舌尖轻触上齿',
  '注意重读音节的位置，英语重音很重要',
  '练习长元音和短元音的区别，如 /iː/ 和 /ɪ/',
  '注意连读和弱读现象，让口语更自然',
  '练习词尾辅音，不要吞音',
  '注意双元音的饱满发音，如 /eɪ/ 和 /aʊ/',
  '练习 /r/ 和 /l/ 的区别'
];

const GRAMMAR_TIPS = [
  '注意时态的一致性，对话中不要随意切换时态',
  '记住规则动词过去式加 -ed，不规则动词需要专门记忆',
  '学习正确使用冠词 a, an, the',
  '介词 in, on, at 的用法需要多加练习',
  '句子结构要完整，包含主语和谓语',
  '注意名词单复数的变化',
  '学习正确的语序，英语陈述句通常是主语+谓语+宾语'
];

const FLUENCY_TIPS = [
  '尽量减少 "um", "uh" 等填充词的使用',
  '想不起来时用英语思考而非停顿',
  '可以练习固定表达和连接词，如 "Well...", "Actually..."',
  '大声朗读英文文章可以提升流利度',
  '尝试用自己的话复述听到的内容',
  '保持稳定的语速，不要太快也不要太慢',
  '学会用简单词汇表达复杂意思，避免卡壳'
];

export function analyzeText(text: string, topicKeywords: string[] = []): ScoreResult {
  const cleanedText = text.trim();
  const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
  const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

  const pronunciationScore = calculatePronunciationScore(cleanedText, words, topicKeywords);
  const grammarScore = calculateGrammarScore(cleanedText, sentences, words);
  const fluencyScore = calculateFluencyScore(cleanedText, words, sentences);

  const overallScore = Math.round(
    pronunciationScore * 0.35 + grammarScore * 0.35 + fluencyScore * 0.3
  );

  return {
    pronunciation: pronunciationScore,
    grammar: grammarScore,
    fluency: fluencyScore,
    overallScore,
    suggestions: {
      pronunciation: getRandomTip(PRONUNCIATION_TIPS, pronunciationScore),
      grammar: getRandomTip(GRAMMAR_TIPS, grammarScore),
      fluency: getRandomTip(FLUENCY_TIPS, fluencyScore)
    }
  };
}

function calculatePronunciationScore(text: string, words: string[], topicKeywords: string[]): number {
  let score = 60;

  if (words.length >= 5) score += 8;
  if (words.length >= 10) score += 5;
  if (words.length >= 20) score += 4;

  if (topicKeywords.length > 0) {
    const matchedKeywords = topicKeywords.filter(kw =>
      words.some(w => w.toLowerCase().includes(kw.toLowerCase()))
    );
    const keywordRatio = matchedKeywords.length / Math.min(topicKeywords.length, 5);
    score += Math.round(keywordRatio * 8);
  }

  const avgWordLength = words.length > 0 ? words.reduce((s, w) => s + w.length, 0) / words.length : 0;
  if (avgWordLength >= 4) score += 5;
  if (avgWordLength >= 5) score += 3;

  const uniqueRatio = new Set(words.map(w => w.toLowerCase())).size / (words.length || 1);
  score += Math.round(uniqueRatio * 7);

  return Math.min(100, score);
}

function calculateGrammarScore(text: string, sentences: string[], words: string[]): number {
  let score = 60;
  let errors = 0;

  for (const rule of GRAMMAR_RULES) {
    const matches = text.match(rule.pattern);
    if (matches) errors += matches.length;
  }

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 0 && /^[a-z]/.test(trimmed)) errors += 0.5;
    if (trimmed.split(/\s+/).filter(w => w.length > 0).length < 2) errors += 0.5;
  }

  score -= Math.round(errors * 4);

  if (sentences.length >= 2) score += 8;
  if (sentences.length >= 3) score += 5;

  const hasConjunctions = /\b(and|but|or|because|so|although|while|when|if|however)\b/i.test(text);
  if (hasConjunctions) score += 7;

  const hasComplexStructure = /\b(that|which|who|whom|whose|where|when|why)\b/i.test(text);
  if (hasComplexStructure) score += 5;

  const isCapitalized = /\bI\b/.test(text) ? text.match(/\bi\b/g) === null : true;
  if (isCapitalized) score += 5;

  return Math.max(0, Math.min(100, score));
}

function calculateFluencyScore(text: string, words: string[], sentences: string[]): number {
  let score = 50;

  const fillerCount = FILLER_WORDS.reduce((count, filler) => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    return count + (text.match(regex)?.length || 0);
  }, 0);

  const fillerRatio = words.length > 0 ? fillerCount / words.length : 0;
  if (fillerRatio === 0) score += 20;
  else if (fillerRatio < 0.05) score += 15;
  else if (fillerRatio < 0.1) score += 10;
  else if (fillerRatio < 0.2) score += 5;

  if (words.length >= 10) score += 5;
  if (words.length >= 20) score += 6;
  if (words.length >= 30) score += 4;

  const wordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
  if (wordsPerSentence >= 5 && wordsPerSentence <= 15) score += 8;
  else if (wordsPerSentence >= 4 && wordsPerSentence <= 20) score += 5;

  const hasConnectors = /\b(first|second|then|next|finally|also|moreover|furthermore|in addition|as a result|therefore)\b/i.test(text);
  if (hasConnectors) score += 7;

  return Math.min(100, score);
}

function getRandomTip(tips: string[], score: number): string {
  let filteredTips = tips;
  if (score >= 85) {
    filteredTips = ['发音很好！继续保持，注意细节可以更完美', '出色的表现！尝试使用更高级的词汇', '非常棒！可以练习更复杂的句子结构'];
  } else if (score >= 70) {
    filteredTips = tips.slice(0, 5);
  }
  return filteredTips[Math.floor(Math.random() * filteredTips.length)];
}

export function detectErrors(text: string): CommonError[] {
  const errors: CommonError[] = [];

  for (const rule of GRAMMAR_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    const matches = text.match(regex);
    if (matches) {
      for (const match of matches.slice(0, 2)) {
        errors.push({
          type: 'grammar',
          original: match,
          correction: typeof rule.correction === 'function' ? rule.correction(match) : match,
          suggestion: rule.message
        });
      }
    }
  }

  const fillerRegex = new RegExp(`\\b(${FILLER_WORDS.join('|')})\\b`, 'gi');
  const fillerMatches = text.match(fillerRegex);
  if (fillerMatches && fillerMatches.length >= 3) {
    const uniqueFillers = [...new Set(fillerMatches.map(f => f.toLowerCase()))];
    errors.push({
      type: 'vocabulary',
      original: uniqueFillers.slice(0, 3).join(', '),
      correction: '(减少填充词)',
      suggestion: `检测到 ${fillerMatches.length} 个填充词，尝试用停顿或连接词代替`
    });
  }

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const shortSentences = sentences.filter(s => s.trim().split(/\s+/).filter(w => w.length > 0).length < 3);
  if (shortSentences.length >= 2) {
    errors.push({
      type: 'grammar',
      original: `${shortSentences.length} 个短句`,
      correction: '使用连接词合并句子',
      suggestion: '建议使用 and, but, so, because 等连接词组成更完整的句子'
    });
  }

  return errors.slice(0, 5);
}

export function getWordStats(text: string, maxItems: number = 8): WordStat[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
    'can', 'could', 'may', 'might', 'must', 'ought', 'used', 'need', 'dare',
    'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours', 'you', 'your', 'yours',
    'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them', 'their', 'theirs',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
    'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'but', 'and', 'or', 'if', 'because',
    'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against',
    'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'am'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const wordCount: Record<string, number> = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }

  return Object.entries(wordCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);
}

export function generateFollowUpQuestion(topicId: string, usedQuestions: string[]): string {
  const questions = FOLLOW_UP_MAP[topicId] || FOLLOW_UP_MAP.daily;
  const available = questions.filter(q => !usedQuestions.includes(q));
  const pool = available.length > 0 ? available : questions;
  return pool[Math.floor(Math.random() * pool.length)];
}

const FOLLOW_UP_MAP: Record<string, string[]> = {
  restaurant: [
    "Would you like to hear about today's chef specials?",
    "How would you like your main course cooked?",
    "Can I get you any appetizers to start?",
    "Would you prefer still or sparkling water?",
    "Is there any dietary restriction I should know about?"
  ],
  travel: [
    "What brings you to this beautiful city?",
    "Would you like directions to the city center?",
    "Are you traveling alone or with your family?",
    "Would you like me to recommend any local restaurants?",
    "Have you booked your accommodation yet?"
  ],
  interview: [
    "Can you describe your ideal work environment?",
    "What motivates you to perform your best?",
    "Tell me about a time you resolved a conflict at work.",
    "What skills would you like to develop in the next year?",
    "How do you prioritize tasks when you have multiple deadlines?"
  ],
  shopping: [
    "Is this a gift for someone special?",
    "What's your favorite color for clothing?",
    "Have you shopped at our store before?",
    "Would you like to join our loyalty program for exclusive discounts?",
    "Are you looking for anything in particular today?"
  ],
  daily: [
    "What do you usually do after work or school?",
    "Do you have any pets at home?",
    "What's your favorite season and why?",
    "Are you a morning person or a night owl?",
    "What's the best piece of advice you've ever received?"
  ],
  business: [
    "What's your timeline for implementing this plan?",
    "How does this compare to last year's performance?",
    "What resources do you need to complete this project?",
    "Can we schedule a follow-up meeting next week?",
    "What are the potential obstacles we should anticipate?"
  ]
};
