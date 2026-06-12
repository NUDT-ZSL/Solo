export interface Quiz {
  id?: string;
  videoId?: string;
  timePoint?: number;
  question: string;
  options: string[];
  correctIndex: number;
  subtitleText: string;
}

export interface QuizGenerationOptions {
  difficulty?: 'easy' | 'medium' | 'hard';
  numOptions?: number;
  questionTypes?: ('fact' | 'concept' | 'application')[];
}

interface KeywordMatch {
  word: string;
  startIndex: number;
  endIndex: number;
  score: number;
  type: 'noun' | 'verb' | 'adjective' | 'technical';
}

const CHINESE_STOPWORDS = new Set([
  '的', '是', '在', '了', '和', '与', '及', '或', '等', '也', '都', '就', '要',
  '这', '那', '有', '被', '把', '给', '让', '向', '从', '到', '于', '以', '为',
  '对', '不', '没', '很', '更', '最', '只', '还', '又', '再', '已', '曾', '将',
  '会', '可以', '能够', '应该', '必须', '需要', '可能', '也许', '大概', '大约',
  '我们', '你们', '他们', '它们', '这个', '那个', '这些', '那些', '什么', '怎么',
  '为什么', '哪里', '何时', '如何', '是否', '不是', '没有', '不是', '等等',
  '一个', '一种', '一些', '一下', '一般', '一定', '一直', '已经', '正在',
]);

const TECHNICAL_KEYWORDS_PATTERNS = [
  /O\(\s*\w+\s*\)/g,
  /\b[A-Z][a-zA-Z0-9]*\b/g,
  /\b(?:算法|数据结构|复杂度|复杂度|时间复杂度|空间复杂度|递归|迭代|动态规划|贪心算法|回溯|分治|二分查找|排序|搜索|图|树|链表|数组|栈|队列|哈希表|堆|集合|映射|缓存|线程|进程|并发|并行|同步|异步|阻塞|非阻塞|死锁|竞态条件|内存泄漏|垃圾回收|编译|解释|虚拟机|字节码|汇编|机器码|二进制|十六进制|十进制|八进制|位运算|移位|掩码|协议|接口|抽象类|继承|多态|封装|设计模式|单例|工厂|观察者|策略|适配器|装饰器|代理|MVC|MVVM|REST|API|HTTP|HTTPS|TCP|IP|DNS|SSL|TLS|加密|解密|哈希|签名|证书|认证|授权|Token|JWT|OAuth|SQL|NoSQL|MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|Kafka|RabbitMQ|Docker|Kubernetes|微服务|单体|分布式|集群|负载均衡|容灾|备份|恢复|监控|日志|追踪|指标|熔断|降级|限流|幂等|缓存|CDN|反向代理|正向代理|防火墙|WAF|IDS|IPS|VPN|SSH|RDP|FTP|SMTP|POP3|IMAP|WebSocket|GraphQL|gRPC|SOAP|XML|JSON|YAML|TOML|INI|CSV|Markdown|HTML|CSS|JavaScript|TypeScript|Java|Python|C\+\+|C#|Go|Rust|Swift|Kotlin|Objective-C|PHP|Ruby|Perl|Shell|Bash|PowerShell|cmd|npm|yarn|pnpm|pip|conda|maven|gradle|ant|make|cmake|webpack|rollup|vite|esbuild|babel|eslint|prettier|jest|mocha|chai|sinon|cypress|playwright|selenium|vitest)\b/g,
];

const NEGATION_PREFIXES = ['不', '非', '无', '未', '反', '逆', '否'];
const POSITIVE_PREFIXES = ['正', '是', '有', '包含', '支持', '允许', '可以', '能够'];

const QUESTION_TEMPLATES = {
  fact: [
    '根据内容，{keyword}是什么？',
    '以下关于{keyword}的描述，正确的是？',
    '{keyword}的主要作用是？',
    '根据讲解，{keyword}的特点包括？',
  ],
  concept: [
    '{keyword}的核心概念是？',
    '如何理解{keyword}？',
    '{keyword}与其他概念的主要区别在于？',
    '{keyword}的本质是？',
  ],
  application: [
    在实际应用中，{keyword}主要用于？',
    '以下哪种场景适合使用{keyword}？',
    '使用{keyword}可以解决什么问题？',
    '{keyword}的典型应用场景是？',
  ],
};

function isChineseChar(code: number): boolean {
  return code >= 0x4e00 && code <= 0x9fff;
}

function extractChineseWords(text: string): string[] {
  const words: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (isChineseChar(text.charCodeAt(i))) {
      let j = i;
      while (j < text.length && isChineseChar(text.charCodeAt(j))) {
        j++;
      }
      if (j - i >= 2) {
        words.push(text.substring(i, j));
      }
      i = j;
    } else {
      i++;
    }
  }
  return words;
}

function extractTechnicalKeywords(text: string): KeywordMatch[] {
  const matches: KeywordMatch[] = [];

  for (const pattern of TECHNICAL_KEYWORDS_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const word = match[0];
      if (word.length >= 2 && !CHINESE_STOPWORDS.has(word)) {
        matches.push({
          word,
          startIndex: match.index,
          endIndex: match.index + word.length,
          score: 10,
          type: 'technical',
        });
      }
    }
  }

  return matches;
}

function extractChineseKeywords(text: string): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const words = extractChineseWords(text);

  for (const word of words) {
    if (CHINESE_STOPWORDS.has(word)) continue;
    if (word.length < 2) continue;

    let score = word.length;

    if (word.length >= 4) score += 3;
    else if (word.length >= 3) score += 1;

    const patterns = ['数据', '算法', '结构', '系统', '技术', '方法', '理论', '原理', '概念', '模型'];
    for (const p of patterns) {
      if (word.includes(p)) score += 2;
    }

    const startIndex = text.indexOf(word);
    if (startIndex >= 0) {
      matches.push({
        word,
        startIndex,
        endIndex: startIndex + word.length,
        score,
        type: 'noun',
      });
    }
  }

  return matches;
}

function extractKeywords(text: string): KeywordMatch[] {
  const technical = extractTechnicalKeywords(text);
  const chinese = extractChineseKeywords(text);

  const seen = new Set<string>();
  const all: KeywordMatch[] = [];

  for (const m of [...technical, ...chinese]) {
    if (!seen.has(m.word)) {
      seen.add(m.word);
      all.push(m);
    }
  }

  return all.sort((a, b) => b.score - a.score);
}

function selectBestKeyword(text: string, keywords: KeywordMatch[]): KeywordMatch | null {
  if (keywords.length === 0) return null;

  for (const kw of keywords) {
    if (kw.type === 'technical') return kw;
  }

  if (keywords.length > 0) {
    return keywords[0];
  }

  return null;
}

function generateCorrectOption(keyword: KeywordMatch, subtitleText: string, difficulty: string): string {
  const sentenceEnd = Math.min(keyword.endIndex + 40, subtitleText.length);
  const context = subtitleText.substring(keyword.startIndex, sentenceEnd);

  if (difficulty === 'easy') {
    return subtitleText.substring(keyword.startIndex, Math.min(keyword.endIndex + 30, subtitleText.length));
  } else if (difficulty === 'medium') {
    return context.length > 15 ? context : keyword.word + '是' + subtitleText.substring(keyword.endIndex, Math.min(keyword.endIndex + 25, subtitleText.length));
  } else {
    const cleanContext = context.replace(/[，。；！？,.;!?]/g, '，');
    return cleanContext.length > 20 ? cleanContext : subtitleText;
  }
}

function generateDistractor(correctOption: string, keyword: string, difficulty: string, index: number): string {
  const strategies = [
    () => {
      for (const neg of NEGATION_PREFIXES) {
        if (correctOption.includes(neg)) {
          const positive = POSITIVE_PREFIXES[index % POSITIVE_PREFIXES.length];
          return correctOption.replace(neg, positive);
        }
      }
      return correctOption.includes('可以')
        ? correctOption.replace('可以', '不可以')
        : correctOption.includes('是')
          ? correctOption.replace('是', '不是')
          : '不' + correctOption;
    },
    () => {
      if (keyword) {
        const fakeTerms = [
          `${keyword}的反义概念`,
          `与${keyword}无关的概念`,
          `${keyword}的过时版本`,
          `错误的${keyword}实现`,
        ];
        return fakeTerms[index % fakeTerms.length];
      }
      return '这个描述是错误的概念';
    },
    () => {
      if (correctOption.length > 10) {
        const mid = Math.floor(correctOption.length / 2);
        return correctOption.substring(0, mid) + '...（内容不完整）';
      }
      return '描述过于简化，没有涵盖核心要点';
    },
    () => {
      const suffixes = ['，但实际上并非如此', '，这是一个常见的误解', '，这是完全相反的概念', '，这是旧版本的定义'];
      return correctOption + suffixes[index % suffixes.length];
    },
  ];

  const strategyIndex = (index + (difficulty === 'hard' ? 2 : 0)) % strategies.length;
  return strategies[strategyIndex]();
}

function generateQuestion(keyword: KeywordMatch, subtitleText: string, questionType: string): string {
  const templates = QUESTION_TEMPLATES[questionType as keyof typeof QUESTION_TEMPLATES] || QUESTION_TEMPLATES.fact;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace('{keyword}', keyword.word);
}

function shuffleOptions(options: string[], correctIndex: number): { options: string[]; correctIndex: number } {
  const indexed = options.map((opt, i) => ({ opt, originalIndex: i }));

  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  const shuffled = indexed.map(x => x.opt);
  const newCorrectIndex = indexed.findIndex(x => x.originalIndex === correctIndex);

  return { options: shuffled, correctIndex: newCorrectIndex };
}

function validateQuiz(quiz: Quiz): boolean {
  if (!quiz.question || quiz.question.trim().length < 5) return false;
  if (!quiz.options || quiz.options.length < 2) return false;
  if (quiz.correctIndex < 0 || quiz.correctIndex >= quiz.options.length) return false;

  const uniqueOptions = new Set(quiz.options.map(o => o.trim()));
  if (uniqueOptions.size !== quiz.options.length) return false;

  for (const opt of quiz.options) {
    if (!opt || opt.trim().length < 2) return false;
  }

  return true;
}

export function generateQuizFromSubtitle(
  subtitleText: string,
  options: QuizGenerationOptions = {}
): Quiz {
  const difficulty = options.difficulty || 'medium';
  const numOptions = Math.min(Math.max(options.numOptions || 4, 2), 6);
  const questionTypes = options.questionTypes || ['fact', 'concept', 'application'];
  const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

  const keywords = extractKeywords(subtitleText);
  const keyword = selectBestKeyword(subtitleText, keywords);

  if (!keyword) {
    const words = subtitleText.split(/[，。；！？,.;!?\s]/).filter(w => w.trim().length > 2);
    const fallbackKeyword = words[0] || subtitleText.substring(0, 8);

    const fallbackKw: KeywordMatch = {
      word: fallbackKeyword,
      startIndex: 0,
      endIndex: fallbackKeyword.length,
      score: 5,
      type: 'noun',
    };

    return generateQuizFromSubtitleWithKeyword(subtitleText, fallbackKw, difficulty, numOptions, questionType);
  }

  return generateQuizFromSubtitleWithKeyword(subtitleText, keyword, difficulty, numOptions, questionType);
}

function generateQuizFromSubtitleWithKeyword(
  subtitleText: string,
  keyword: KeywordMatch,
  difficulty: string,
  numOptions: number,
  questionType: string
): Quiz {
  const question = generateQuestion(keyword, subtitleText, questionType);
  const correctOption = generateCorrectOption(keyword, subtitleText, difficulty);

  const options: string[] = [correctOption];
  for (let i = 0; i < numOptions - 1; i++) {
    options.push(generateDistractor(correctOption, keyword.word, difficulty, i));
  }

  const { options: shuffledOptions, correctIndex: newCorrectIndex } = shuffleOptions(options, 0);

  const quiz: Quiz = {
    question,
    options: shuffledOptions,
    correctIndex: newCorrectIndex,
    subtitleText,
  };

  if (!validateQuiz(quiz)) {
    quiz.question = `根据以下内容，"${keyword.word}"是什么？`;
    quiz.options = [
      subtitleText,
      generateDistractor(subtitleText, keyword.word, difficulty, 0),
      generateDistractor(subtitleText, keyword.word, difficulty, 1),
      generateDistractor(subtitleText, keyword.word, difficulty, 2),
    ];
    const reShuffled = shuffleOptions(quiz.options, 0);
    quiz.options = reShuffled.options;
    quiz.correctIndex = reShuffled.correctIndex;
  }

  return quiz;
}

export function generateMultipleQuizzes(
  subtitles: string[],
  options: QuizGenerationOptions = {}
): Quiz[] {
  return subtitles.map(text => generateQuizFromSubtitle(text, options));
}

export function getAnswerFeedback(isCorrect: boolean, quiz: Quiz): string {
  if (isCorrect) {
    const praises = ['回答正确！', '太棒了！', '做得好！', '完全正确！', '没错！'];
    return praises[Math.floor(Math.random() * praises.length)];
  } else {
    const encouragements = ['回答错误，再想想哦', '不对哦，下次加油', '答错了，正确答案是：' + quiz.options[quiz.correctIndex].substring(0, 20)];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  }
}

export default {
  generateQuizFromSubtitle,
  generateMultipleQuizzes,
  getAnswerFeedback,
  validateQuiz,
  extractKeywords,
};
