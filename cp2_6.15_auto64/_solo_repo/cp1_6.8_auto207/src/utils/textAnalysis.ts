export type Sentiment = 'positive' | 'neutral' | 'melancholic' | 'heroic'

export interface KeywordInfo {
  word: string
  frequency: number
  sentiment: Sentiment
  sourceLines: string[]
}

const stopWords = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '他', '她', '它', '们', '那', '些', '什么', '又', '还', '与',
  '而', '但', '却', '之', '其', '或', '且', '若', '则', '皆', '以', '于',
  '及', '乎', '哉', '矣', '焉', '耳', '兮', '为', '所', '此', '彼',
  '个', '中', '里', '后', '前', '时', '年', '月', '日', '地', '天',
  '多', '少', '大', '小', '来', '去', '能', '可', '将', '被', '从',
])

const sentimentDict: Record<string, Sentiment> = {
  '明': 'positive', '春': 'positive', '花': 'positive', '绿': 'positive',
  '风': 'positive', '月': 'positive', '酒': 'positive', '歌': 'positive',
  '舞': 'positive', '长': 'heroic', '高': 'heroic', '飞': 'heroic',
  '千': 'heroic', '万': 'heroic', '流': 'heroic', '山': 'heroic',
  '河': 'heroic', '海': 'heroic', '望': 'heroic', '穷': 'heroic',
  '更': 'heroic', '霜': 'melancholic', '寒': 'melancholic', '孤': 'melancholic',
  '独': 'melancholic', '凄': 'melancholic', '凉': 'melancholic', '别': 'melancholic',
  '恨': 'melancholic', '愁': 'melancholic', '悲': 'melancholic', '离': 'melancholic',
  '落': 'melancholic', '灭': 'melancholic', '绝': 'melancholic', '废': 'melancholic',
  '思': 'melancholic', '忆': 'melancholic', '泪': 'melancholic', '苦': 'melancholic',
  '沉': 'melancholic', '病': 'melancholic', '弃': 'melancholic',
  '水': 'neutral', '日': 'neutral', '夜': 'neutral', '云': 'neutral',
  '烟': 'neutral', '雪': 'neutral', '树': 'neutral', '叶': 'neutral',
  '舟': 'neutral', '江': 'neutral', '楼': 'neutral', '天': 'neutral',
  '青': 'neutral', '白': 'neutral', '紫': 'neutral', '玉': 'neutral',
  '声': 'neutral', '影': 'neutral', '光': 'neutral', '色': 'neutral',
  '年': 'neutral', '人': 'neutral', '乡': 'neutral', '家': 'neutral',
  '杯': 'neutral', '剑': 'neutral', '马': 'neutral', '笛': 'neutral',
  '赋': 'neutral', '诗': 'neutral', '词': 'neutral', '曲': 'neutral',
  '鹊': 'neutral', '宫': 'neutral', '阁': 'neutral', '户': 'neutral',
  '岸': 'neutral', '畔': 'neutral', '峡': 'neutral', '峰': 'neutral',
  '瀑': 'neutral', '川': 'neutral', '帆': 'neutral', '舟': 'neutral',
  '笠': 'neutral', '蓑': 'neutral', '钓': 'neutral', '鱼': 'neutral',
  '剪': 'neutral', '裁': 'neutral', '妆': 'neutral', '丝': 'neutral',
  '绦': 'neutral', '碧': 'neutral', '炉': 'neutral', '香': 'neutral',
}

const dictionary = new Set([
  '明月', '月光', '故乡', '地上', '霜', '春风', '啼鸟', '风雨', '花落',
  '白日', '黄河', '千里', '层楼', '瀑布', '飞流', '银河', '九天',
  '千山', '万径', '孤舟', '寒江', '独钓', '碧玉', '绿丝', '细叶',
  '剪刀', '二月', '巴山', '楚水', '凄凉', '弃置', '怀旧', '烂柯',
  '沉舟', '千帆', '病树', '万木', '杯酒', '精神', '把酒', '青天',
  '宫阙', '乘风', '琼楼', '玉宇', '清影', '人间', '朱阁', '绮户',
  '无眠', '悲欢', '离合', '阴晴', '圆缺', '婵娟', '长久',
  '明', '月', '春', '花', '风', '酒', '歌', '舞', '霜', '寒',
  '孤', '独', '飞', '流', '山', '河', '海', '望', '穷', '更',
  '长', '高', '千', '万', '别', '恨', '愁', '悲', '离', '落',
  '思', '忆', '泪', '水', '日', '夜', '云', '烟', '雪', '树',
  '叶', '舟', '江', '楼', '天', '青', '白', '紫', '玉', '声',
  '影', '光', '色', '年', '人', '乡', '家', '杯', '剑', '马',
  '笛', '赋', '诗', '词', '曲', '鹊', '宫', '阁', '户', '岸',
  '畔', '峡', '峰', '瀑', '川', '帆', '笠', '蓑', '钓', '鱼',
  '剪', '裁', '妆', '丝', '绦', '碧', '炉', '香', '沉', '病',
  '弃', '灭', '绝', '苦', '凉', '凄', '愁', '恨', '寒', '孤',
  '回', '来', '去', '照', '看', '听', '问', '答', '寻', '觅',
])

function segmentChinese(text: string): string[] {
  const cleanText = text.replace(/[，。！？、；：""''《》（）\s\n\r,.!?;:'"()\d]/g, ' ')
  const words: string[] = []
  const segments = cleanText.split(/\s+/).filter(Boolean)

  for (const segment of segments) {
    let i = 0
    while (i < segment.length) {
      let matched = false
      for (let len = Math.min(4, segment.length - i); len >= 1; len--) {
        const candidate = segment.substring(i, i + len)
        if (dictionary.has(candidate)) {
          words.push(candidate)
          i += len
          matched = true
          break
        }
      }
      if (!matched) {
        i++
      }
    }
  }

  return words
}

function getSentiment(word: string, context: string): Sentiment {
  if (sentimentDict[word]) {
    return sentimentDict[word]
  }

  const melancholicContext = ['凄', '凉', '孤', '独', '寒', '悲', '愁', '泪', '恨', '离', '别', '灭', '绝']
  const heroicContext = ['千', '万', '飞', '长', '高', '大', '雄', '壮', '勇', '战']
  const positiveContext = ['春', '花', '月', '明', '歌', '舞', '酒', '笑', '欢', '乐', '绿', '新']

  const contextChars = context.split('')
  const melancholicScore = contextChars.filter(c => melancholicContext.includes(c)).length
  const heroicScore = contextChars.filter(c => heroicContext.includes(c)).length
  const positiveScore = contextChars.filter(c => positiveContext.includes(c)).length

  if (melancholicScore > heroicScore && melancholicScore > positiveScore) return 'melancholic'
  if (heroicScore > positiveScore) return 'heroic'
  if (positiveScore > 0) return 'positive'
  return 'neutral'
}

export function analyzeText(text: string, sourceLines?: string[]): KeywordInfo[] {
  const words = segmentChinese(text)
  const freqMap = new Map<string, number>()
  const lineMap = new Map<string, string[]>()

  for (const word of words) {
    if (stopWords.has(word) || word.length === 0) continue
    freqMap.set(word, (freqMap.get(word) || 0) + 1)

    const matchingLines = sourceLines
      ? sourceLines.filter(line => line.includes(word))
      : []
    const existing = lineMap.get(word) || []
    for (const line of matchingLines) {
      if (!existing.includes(line)) {
        existing.push(line)
      }
    }
    lineMap.set(word, existing)
  }

  const sorted = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)

  return sorted.map(([word, frequency]) => ({
    word,
    frequency,
    sentiment: getSentiment(word, text),
    sourceLines: lineMap.get(word) || [],
  }))
}
