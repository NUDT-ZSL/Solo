import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface DimensionScore {
  name: string;
  score: number;
  maxScore: number;
  color: string;
}

interface SentenceIssue {
  sentenceIndex: number;
  sentence: string;
  type: 'grammar' | 'weak';
  description: string;
}

interface EvaluateResponse {
  totalScore: number;
  dimensions: DimensionScore[];
  issues: SentenceIssue[];
  sentences: string[];
  wordCount: number;
}

const LOGICAL_CONNECTORS = [
  'however', 'therefore', 'thus', 'hence', 'consequently',
  'firstly', 'secondly', 'thirdly', 'finally', 'lastly',
  'moreover', 'furthermore', 'additionally', 'in addition',
  'nevertheless', 'nonetheless', 'on the contrary', 'in contrast',
  'on the other hand', 'for example', 'for instance', 'in conclusion',
  'to sum up', 'in summary', 'as a result', 'because', 'since',
  'although', 'though', 'even though', 'while', 'whereas',
  'similarly', 'likewise', 'in the same way', 'meanwhile'
];

const TOPIC_SENTENCE_PATTERNS = [
  /^in my opinion/i,
  /^i believe/i,
  /^i argue/i,
  /^this essay/i,
  /^this paper/i,
  /^the purpose of/i,
  /^the main point/i,
  /^the key issue/i,
  /^it is important to note/i,
  /^it is evident that/i,
  /^from my perspective/i,
  /^as far as i am concerned/i,
  /^in conclusion/i,
  /^to conclude/i,
  /^in summary/i,
  /^to sum up/i,
  /^overall/i,
  /^ultimately/i,
  /\bis important\b/i,
  /\bis crucial\b/i,
  /\bis essential\b/i,
  /\bis necessary\b/i,
  /\bplays a (key|vital|important|crucial) role\b/i,
  /\bthe (first|second|third|last|final) reason\b/i,
  /\bone (major|significant|important) (reason|factor|aspect)\b/i
];

const WEAK_EXPRESSION_PATTERNS = [
  { pattern: /\b(very|really|quite|pretty|somewhat|sort of|kind of)\b/gi, desc: '使用模糊副词' },
  { pattern: /\b(maybe|perhaps|possibly|probably)\b/gi, desc: '表达不肯定' },
  { pattern: /\ba lot of\b/gi, desc: '用词不够精确' },
  { pattern: /\bthings?\b/gi, desc: '指代过于模糊' },
  { pattern: /\bstuff\b/gi, desc: '用词不够正式' },
  { pattern: /\bi think\b/gi, desc: '可替换为更客观的表达' },
  { pattern: /\bbad\b/gi, desc: '用词过于简单' },
  { pattern: /\bgood\b/gi, desc: '用词过于简单' },
  { pattern: /\bnice\b/gi, desc: '用词过于简单' },
  { pattern: /\bbig\b/gi, desc: '用词过于简单' },
  { pattern: /\bsmall\b/gi, desc: '用词过于简单' }
];

const GRAMMAR_ERROR_PATTERNS = [
  { pattern: /\b(i|he|she|it) (have|do|does)\b/gi, desc: '主谓不一致' },
  { pattern: /\b(they|we|you) (has|is|was)\b/gi, desc: '主谓不一致' },
  { pattern: /\bhe (are|were)\b/gi, desc: '主谓不一致' },
  { pattern: /\bshe (are|were)\b/gi, desc: '主谓不一致' },
  { pattern: /\bit (are|were)\b/gi, desc: '主谓不一致' },
  { pattern: /\bi (is|are|were)\b/gi, desc: '主谓不一致' },
  { pattern: /\b(doesn't|don't|didn't) (has|had|having)\b/gi, desc: '助动词后动词形式错误' },
  { pattern: /\b(is|are|was|were) (go|eat|do|make|take|give|see|come|write|read)\b/gi, desc: '进行时动词形式错误' },
  { pattern: /\b(has|have|had) (go|eat|do|make|take|give|see|come|write|read)\b/gi, desc: '完成时动词形式错误' },
  { pattern: /\b(will|would|shall|should|can|could|may|might|must) (went|ate|did|made|took|gave|saw|came|wrote|read)\b/gi, desc: '情态动词后动词形式错误' },
  { pattern: /\bmore (better|worse|less|more)\b/gi, desc: '比较级重复' },
  { pattern: /\bmost (best|worst|least|most)\b/gi, desc: '最高级重复' },
  { pattern: /\b(your|their|our|my|his|her) (is|are|was|were)\b/gi, desc: '所有格误用为主格' },
  { pattern: /\b(there|their|they're) (have|has)\b/gi, desc: 'there/their/they\'re混淆' },
  { pattern: /\ba (aeiou)/i, desc: '不定冠词使用错误' },
  { pattern: /\ban (bcdfghjklmnpqrstvwxyz)/i, desc: '不定冠词使用错误' }
];

function splitIntoSentences(text: string): string[] {
  const sentences = text
    .replace(/([.!?])\s*(?=[A-Z"']|$)/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return sentences;
}

function countWords(text: string): number {
  const matches = text.match(/[a-zA-Z]+/g);
  return matches ? matches.length : 0;
}

function evaluateClarity(text: string, sentences: string[]): { score: number; feedback: string } {
  const wordCount = countWords(text);
  const expectedTopicSentences = Math.max(1, Math.floor(wordCount / 200));
  
  let topicSentenceCount = 0;
  for (const sentence of sentences) {
    for (const pattern of TOPIC_SENTENCE_PATTERNS) {
      if (pattern.test(sentence)) {
        topicSentenceCount++;
        break;
      }
    }
  }
  
  const firstSentence = sentences[0] || '';
  const lastSentence = sentences[sentences.length - 1] || '';
  let structureBonus = 0;
  if (/^(in this|this essay|this paper|the purpose|i believe|i argue|in my opinion)/i.test(firstSentence)) {
    structureBonus += 0.3;
  }
  if (/^(in conclusion|to conclude|in summary|to sum up|overall|ultimately)/i.test(lastSentence)) {
    structureBonus += 0.3;
  }
  
  const ratio = Math.min(1, (topicSentenceCount / expectedTopicSentences) + structureBonus);
  const score = Math.round(Math.min(25, ratio * 25));
  
  let feedback = '';
  if (score >= 20) feedback = '论点结构清晰，主题句分布合理';
  else if (score >= 15) feedback = '论点表达较为清晰，可增加更多主题句';
  else if (score >= 10) feedback = '论点表达不够明确，建议增加主题句';
  else feedback = '论点缺乏清晰的主题句支撑';
  
  return { score, feedback };
}

function evaluateCoherence(text: string, sentences: string[]): { score: number; feedback: string } {
  const wordCount = countWords(text);
  if (wordCount === 0) return { score: 0, feedback: '文本为空' };
  
  const textLower = text.toLowerCase();
  let connectorCount = 0;
  for (const connector of LOGICAL_CONNECTORS) {
    const regex = new RegExp(`\\b${connector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const matches = textLower.match(regex);
    if (matches) connectorCount += matches.length;
  }
  
  const connectorDensity = (connectorCount / wordCount) * 100;
  const idealDensity = 1.5;
  
  let score: number;
  if (connectorDensity >= 1.0 && connectorDensity <= 2.0) {
    score = 25;
  } else if (connectorDensity > 2.0 && connectorDensity <= 3.0) {
    score = Math.round(25 - (connectorDensity - 2.0) * 8);
  } else if (connectorDensity < 1.0) {
    score = Math.round(connectorDensity * 25 / 1.0);
  } else {
    score = Math.round(Math.max(0, 25 - (connectorDensity - 3.0) * 10));
  }
  score = Math.max(0, Math.min(25, score));
  
  let feedback = '';
  if (score >= 20) feedback = '逻辑连接自然流畅，过渡恰当';
  else if (score >= 15) feedback = '逻辑连贯性较好，可适当调整连接词密度';
  else if (connectorDensity < 1.0) feedback = '逻辑连接词不足，建议增加过渡表达';
  else feedback = '逻辑连接词过多，建议精简使用';
  
  return { score, feedback };
}

function evaluateVocabulary(text: string): { score: number; feedback: string } {
  const words = text.match(/[a-zA-Z]+/g);
  if (!words || words.length === 0) return { score: 0, feedback: '文本为空' };
  
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const uniquenessRatio = uniqueWords.size / words.length;
  
  let score: number;
  if (uniquenessRatio >= 0.6) {
    score = 25;
  } else if (uniquenessRatio >= 0.5) {
    score = Math.round(20 + (uniquenessRatio - 0.5) * 50);
  } else if (uniquenessRatio >= 0.4) {
    score = Math.round(15 + (uniquenessRatio - 0.4) * 50);
  } else {
    score = Math.round(uniquenessRatio * 37.5);
  }
  score = Math.max(0, Math.min(25, score));
  
  let feedback = '';
  if (score >= 20) feedback = '词汇丰富多样，表达生动';
  else if (score >= 15) feedback = '词汇运用较为丰富';
  else if (score >= 10) feedback = '词汇重复较多，建议增加同义替换';
  else feedback = '词汇单一，建议扩充词汇量';
  
  return { score, feedback };
}

function evaluateGrammar(text: string, sentences: string[]): { 
  score: number; 
  feedback: string;
  grammarIssues: { sentenceIndex: number; description: string }[]
} {
  const wordCount = countWords(text);
  if (wordCount === 0) return { score: 0, feedback: '文本为空', grammarIssues: [] };
  
  const grammarIssues: { sentenceIndex: number; description: string }[] = [];
  let totalErrorCount = 0;
  
  sentences.forEach((sentence, index) => {
    const sentenceErrors = new Set<string>();
    for (const { pattern, desc } of GRAMMAR_ERROR_PATTERNS) {
      if (pattern.test(sentence)) {
        sentenceErrors.add(desc);
      }
    }
    totalErrorCount += sentenceErrors.size;
    if (sentenceErrors.size > 0) {
      grammarIssues.push({
        sentenceIndex: index,
        description: Array.from(sentenceErrors).join('、')
      });
    }
  });
  
  const errorDensity = (totalErrorCount / wordCount) * 100;
  
  let score: number;
  if (errorDensity < 1.0) {
    score = 25;
  } else if (errorDensity < 2.0) {
    score = Math.round(20 - (errorDensity - 1.0) * 10);
  } else if (errorDensity < 4.0) {
    score = Math.round(15 - (errorDensity - 2.0) * 2.5);
  } else {
    score = Math.round(Math.max(0, 10 - (errorDensity - 4.0) * 2));
  }
  score = Math.max(0, Math.min(25, score));
  
  let feedback = '';
  if (score >= 20) feedback = '语法准确，几乎无错误';
  else if (score >= 15) feedback = '语法整体较好，偶有小错误';
  else if (score >= 10) feedback = '存在一定语法问题，建议仔细检查';
  else feedback = '语法错误较多，需要重点改进';
  
  return { score, feedback, grammarIssues };
}

function findWeakExpressions(sentences: string[]): { sentenceIndex: number; description: string }[] {
  const weakIssues: { sentenceIndex: number; description: string }[] = [];
  
  sentences.forEach((sentence, index) => {
    const wordCount = countWords(sentence);
    const issues = new Set<string>();
    
    for (const { pattern, desc } of WEAK_EXPRESSION_PATTERNS) {
      const matches = sentence.match(pattern);
      if (matches && matches.length > 0) {
        issues.add(desc);
      }
    }
    
    if (wordCount < 5 && wordCount > 0) {
      issues.add('句子过短，缺乏论据支撑');
    }
    
    if (wordCount > 0) {
      const weakWords = sentence.match(/\b(very|really|quite|somewhat|maybe|perhaps|possibly|probably)\b/gi);
      const weakCount = weakWords ? weakWords.length : 0;
      const weakRatio = weakCount / wordCount;
      if (weakRatio > 0.15) {
        issues.add('弱化词汇使用过度');
      }
    }
    
    if (issues.size > 0) {
      weakIssues.push({
        sentenceIndex: index,
        description: Array.from(issues).join('、')
      });
    }
  });
  
  return weakIssues;
}

app.post('/api/evaluate', (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '请提供有效的文本内容' });
    }
    
    const wordCount = countWords(text);
    if (wordCount < 50) {
      return res.status(400).json({ error: '文本字数过少，请至少输入50个单词' });
    }
    
    const sentences = splitIntoSentences(text);
    
    const clarityResult = evaluateClarity(text, sentences);
    const coherenceResult = evaluateCoherence(text, sentences);
    const vocabularyResult = evaluateVocabulary(text);
    const grammarResult = evaluateGrammar(text, sentences);
    const weakIssues = findWeakExpressions(sentences);
    
    const dimensions: DimensionScore[] = [
      { name: '论点清晰度', score: clarityResult.score, maxScore: 25, color: '#2196F3' },
      { name: '逻辑连贯性', score: coherenceResult.score, maxScore: 25, color: '#4CAF50' },
      { name: '词汇丰富度', score: vocabularyResult.score, maxScore: 25, color: '#FF9800' },
      { name: '语法正确性', score: grammarResult.score, maxScore: 25, color: '#F44336' }
    ];
    
    const totalScore = clarityResult.score + coherenceResult.score + vocabularyResult.score + grammarResult.score;
    
    const issues: SentenceIssue[] = [];
    
    for (const g of grammarResult.grammarIssues) {
      issues.push({
        sentenceIndex: g.sentenceIndex,
        sentence: sentences[g.sentenceIndex],
        type: 'grammar',
        description: g.description
      });
    }
    
    for (const w of weakIssues) {
      const existing = issues.find(i => i.sentenceIndex === w.sentenceIndex);
      if (existing) {
        existing.description += '；' + w.description;
        if (existing.type === 'grammar') existing.type = 'grammar';
      } else {
        issues.push({
          sentenceIndex: w.sentenceIndex,
          sentence: sentences[w.sentenceIndex],
          type: 'weak',
          description: w.description
        });
      }
    }
    
    const elapsed = Date.now() - startTime;
    if (elapsed < 50) {
      setTimeout(() => {
        res.json({
          totalScore,
          dimensions,
          issues,
          sentences,
          wordCount
        } as EvaluateResponse);
      }, 50 - elapsed);
    } else {
      res.json({
        totalScore,
        dimensions,
        issues,
        sentences,
        wordCount
      } as EvaluateResponse);
    }
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ error: '评估过程中发生错误' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] 深阅写作评估器后端服务已启动: http://localhost:${PORT}`);
});
