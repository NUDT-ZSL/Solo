import { v4 as uuidv4 } from 'uuid'

export interface WordVector {
  word: string
  vector: number[]
  category: string
}

export interface PoemTemplate {
  id: string
  pattern: string
  keywords: string[]
  vector: number[]
}

export interface VoteRecord {
  poemId: string
  card1Id: string
  card2Id: string
  count: number
  votedUsers: Set<string>
  date: string
}

export interface CollisionRecord {
  id: string
  timestamp: number
  word1: string
  word2: string
  poemId: string
  poem: string
  votes: number
}

export const wordCategories = {
  nature: ['月光', '潮汐', '星辰', '山川', '溪流', '微风', '云朵', '薄雾', '晚霞', '清泉', '落叶', '烟雨', '青峦', '碧波', '寒梅'],
  time: ['黎明', '黄昏', '子夜', '流年', '往昔', '瞬间', '永恒', '刹那', '四季', '朝夕', '岁月', '韶光', '斑驳', '蹉跎', '须臾'],
  emotion: ['思念', '追忆', '憧憬', '孤寂', '欢愉', '静谧', '惆怅', '缱绻', '悠然', '清欢', '阑珊', '悱恻', '怅惘', '安然', '澄澈'],
  object: ['纸鸢', '琥珀', '琉璃', '锦瑟', '铜铃', '书卷', '烛火', '铜镜', '玉佩', '风铃', '青笺', '檀烟', '银簪', '玉笛', '朱砂'],
  space: ['天涯', '咫尺', '归途', '彼岸', '云端', '巷陌', '庭前', '檐下', '渡口', '长亭', '古道', '西楼', '东篱', '南窗', '北榭']
}

function generateVector(seed: number, category: number): number[] {
  const vector: number[] = []
  const baseValue = (category + 1) * 0.1
  for (let i = 0; i < 32; i++) {
    const pseudo = Math.sin(seed * (i + 1) * 12.9898 + category * 78.233) * 43758.5453
    vector.push(((pseudo - Math.floor(pseudo)) - 0.5) * 2 * 0.8 + baseValue * (i % 3 === 0 ? 1 : 0))
  }
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0))
  return vector.map(v => v / norm)
}

export function buildWordVectors(): Map<string, WordVector> {
  const map = new Map<string, WordVector>()
  const categories = Object.entries(wordCategories)
  let seed = 1

  categories.forEach(([category, words], catIndex) => {
    words.forEach(word => {
      map.set(word, {
        word,
        vector: generateVector(seed++, catIndex),
        category
      })
    })
  })

  return map
}

export const poemPatterns: string[] = [
  '{word1}轻拂{word2}面，一帘幽梦落人间',
  '{word1}不解{word2}意，化作相思满画栏',
  '{word2}深处{word1}落，岁月无声染山河',
  '{word1}摇曳{word2}旁，半盏清茶饮疏狂',
  '{word2}映{word1}影，一曲离殇诉衷肠',
  '{word1}缱绻{word2}间，墨染宣纸度流年',
  '{word2}初醒{word1}暖，满城风絮绕清欢',
  '{word1}潇潇{word2}寒，独倚阑干思渺然',
  '{word2}逐{word1}去，浮生若梦几轮回',
  '{word1}淡淡{word2}悠，闲看云卷水自流',
  '{word2}栖{word1}梢，琴音袅袅绕云霄',
  '{word1}漫漫{word2}遥，长夜无眠听晚潮',
  '{word2}含{word1}韵，半窗疏影半窗诗',
  '{word1}依依{word2}恋，三生石畔旧盟缘',
  '{word2}藏{word1}心，玲珑骰子安红豆',
  '{word1}缕缕{word2}绵，细雨斜风织晓烟',
  '{word2}伴{word1}行，一蓑烟雨任平生',
  '{word1}寂寂{word2}深，小楼明月照离人',
  '{word2}缀{word1}痕，锦瑟华年谁与度',
  '{word1}悠悠{word2}远，回首烟波十四桥',
  '{word2}和{word1}鸣，高山流水觅知音',
  '{word1}溶溶{word2}淡，梨花院落溶溶月',
  '{word2}衬{word1}娇，云想衣裳花想容',
  '{word1}瑟瑟{word2}凉，金风玉露一相逢',
  '{word2}牵{word1}情，两情若是久长时',
  '{word1}点点{word2}柔，自在飞花轻似梦',
  '{word2}映{word1}辉，水晶帘动微风起',
  '{word1}朦朦{word2}胧，雾失楼台月迷津',
  '{word2}绕{word1}行，为君沉醉又何妨',
  '{word1}盈盈{word2}间，疏影横斜水清浅',
  '{word2}藏{word1}踪，踏雪寻梅暗香浮',
  '{word1}簌簌{word2}喧，空山新雨后天气',
  '{word2}恋{word1}恩，春蚕到死丝方尽',
  '{word1}涓涓{word2}潺，问渠那得清如许',
  '{word2}缀{word1}前，乱花渐欲迷人眼',
  '{word1}苍苍{word2}茫，白露为霜在水一方',
  '{word2}随{word1}舞，蝶恋花蕊两依依',
  '{word1}瑟瑟{word2}萧，无边落木萧萧下',
  '{word2}盼{word1}归，望尽天涯路漫漫',
  '{word1}灼灼{word2}煌，日出江花红胜火',
  '{word2}共{word1}眠，海上明月共潮生',
  '{word1}淡淡{word2}浓，浓妆淡抹总相宜',
  '{word2}忆{word1}容，桃花依旧笑春风',
  '{word1}滚滚{word2}东，大江东去浪淘尽',
  '{word2}恋{word1}魂，曾经沧海难为水',
  '{word1}悠悠{word2}心，青青子衿悠悠我心',
  '{word2}携{word1}行，执子之手与子偕老',
  '{word1}皎皎{word2}弯弯，月上柳梢黄昏后',
  '{word2}融{word1}意，心有灵犀一点通',
  '{word1}层层{word2}叠，山重水复疑无路'
]

export function buildPoemTemplates(): PoemTemplate[] {
  return poemPatterns.map((pattern, idx) => ({
    id: `tpl_${String(idx + 1).padStart(3, '0')}`,
    pattern,
    keywords: pattern.match(/[\u4e00-\u9fa5]+/g) || [],
    vector: generateVector(idx + 100, idx % 5)
  }))
}

export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return 0
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i]
    norm1 += v1[i] * v1[i]
    norm2 += v2[i] * v2[i]
  }
  const denom = Math.sqrt(norm1) * Math.sqrt(norm2)
  return denom === 0 ? 0 : dotProduct / denom
}

export function averageVectors(v1: number[], v2: number[]): number[] {
  const len = Math.min(v1.length, v2.length)
  const avg: number[] = []
  for (let i = 0; i < len; i++) {
    avg.push((v1[i] + v2[i]) / 2)
  }
  const norm = Math.sqrt(avg.reduce((s, v) => s + v * v, 0))
  return norm === 0 ? avg : avg.map(v => v / norm)
}

export function getBestMatchingTemplate(
  wordVec1: WordVector,
  wordVec2: WordVector,
  templates: PoemTemplate[]
): { template: PoemTemplate; similarity: number } {
  const combinedVector = averageVectors(wordVec1.vector, wordVec2.vector)
  let bestTemplate = templates[0]
  let bestSimilarity = -1

  for (const tpl of templates) {
    const sim = cosineSimilarity(combinedVector, tpl.vector)
    if (sim > bestSimilarity) {
      bestSimilarity = sim
      bestTemplate = tpl
    }
  }

  return { template: bestTemplate, similarity: Math.max(0, Math.min(1, bestSimilarity)) }
}

export function generatePoem(
  word1: string,
  word2: string,
  template: PoemTemplate
): { poem: string; poemId: string } {
  const poem = template.pattern
    .replace(/{word1}/g, word1)
    .replace(/{word2}/g, word2)
  return {
    poem,
    poemId: `poem_${uuidv4().slice(0, 8)}`
  }
}

export function getTodayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
