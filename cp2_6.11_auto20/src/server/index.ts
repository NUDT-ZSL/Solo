import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const positiveWords = [
  '快乐', '幸福', '温暖', '阳光', '希望', '梦想', '爱', '美好', '喜悦', '欢笑',
  '成功', '勇气', '自由', '和平', '友谊', '热情', '光芒', '绚烂', '甜蜜', '温馨',
  '活力', '朝气', '晴朗', '彩虹', '花朵', '春天', '清晨', '微风', '温柔', '宁静',
  '喜悦', '欢乐', '愉快', '满足', '感恩', '乐观', '自信', '坚强', '善良', '美丽',
  '向往', '期待', '憧憬', '浪漫', '优雅', '华丽', '辉煌', '灿烂', '闪耀', '明亮',
]

const negativeWords = [
  '悲伤', '孤独', '黑暗', '恐惧', '绝望', '痛苦', '忧伤', '失落', '迷茫', '空虚',
  '焦虑', '愤怒', '憎恨', '嫉妒', '仇恨', '冷漠', '残酷', '死亡', '毁灭', '痛苦',
  '疲惫', '沉重', '压抑', '忧郁', '哀愁', '哀怨', '凄凉', '萧瑟', '寒冷', '阴暗',
  '哭泣', '泪水', '心碎', '绝望', '无助', '无奈', '挣扎', '煎熬', '折磨', '伤痛',
  '寂寞', '孤单', '冷落', '遗忘', '放弃', '失败', '挫折', '困难', '危险', '恐惧',
]

const neutralWords = [
  '时间', '空间', '世界', '生命', '道路', '远方', '山川', '河流', '城市', '乡村',
  '天空', '大地', '海洋', '森林', '季节', '日夜', '星辰', '月亮', '太阳', '云彩',
  '思考', '回忆', '记忆', '想象', '梦境', '现实', '过去', '未来', '现在', '时光',
  '旅程', '旅途', '方向', '脚步', '身影', '目光', '声音', '气息', '味道', '触感',
  '日常', '平凡', '简单', '平静', '安静', '沉默', '悠然', '从容', '淡然', '平和',
]

interface GenerateRequest {
  text: string
  style: string
}

interface Keyword {
  word: string
  color: string
  position: { x: number; y: number }
  emotionWeight: number
}

interface VisualParams {
  particles: {
    count: number
    colors: string[]
    sizes: number[]
    speeds: number[]
  }
  keywords: Keyword[]
  emotionPolarity: number
  bpm: number
  chordProgression: string[][]
  style: string
}

interface GenerateResponse {
  audioDataUrl: string
  visualParams: VisualParams
}

function analyzeEmotion(text: string): { polarity: number; keywords: Array<{ word: string; weight: number; emotion: number }> } {
  let positiveCount = 0
  let negativeCount = 0
  const foundKeywords: Array<{ word: string; weight: number; emotion: number }> = []

  positiveWords.forEach((word) => {
    const count = (text.match(new RegExp(word, 'g')) || []).length
    if (count > 0) {
      positiveCount += count
      foundKeywords.push({ word, weight: count, emotion: 1 })
    }
  })

  negativeWords.forEach((word) => {
    const count = (text.match(new RegExp(word, 'g')) || []).length
    if (count > 0) {
      negativeCount += count
      foundKeywords.push({ word, weight: count, emotion: -1 })
    }
  })

  neutralWords.forEach((word) => {
    const count = (text.match(new RegExp(word, 'g')) || []).length
    if (count > 0) {
      foundKeywords.push({ word, weight: count * 0.5, emotion: 0 })
    }
  })

  const total = positiveCount + negativeCount
  let polarity = 0
  if (total > 0) {
    polarity = (positiveCount - negativeCount) / total
  }

  return { polarity, keywords: foundKeywords }
}

function extractKeywords(text: string, emotionAnalysis: { polarity: number; keywords: Array<{ word: string; weight: number; emotion: number }> }): Keyword[] {
  const sorted = [...emotionAnalysis.keywords].sort((a, b) => {
    const scoreA = a.weight * (1 + Math.abs(a.emotion) * 0.5)
    const scoreB = b.weight * (1 + Math.abs(b.emotion) * 0.5)
    return scoreB - scoreA
  })

  const topKeywords = sorted.slice(0, 5)

  if (topKeywords.length < 3) {
    const chars = text.replace(/[，。、；：""''（）\s.,;:!?()]/g, '').split('')
    const charCount: Record<string, number> = {}
    chars.forEach((c) => {
      charCount[c] = (charCount[c] || 0) + 1
    })
    const topChars = Object.entries(charCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3 - topKeywords.length)
      .map(([word]) => ({ word, weight: 1, emotion: emotionAnalysis.polarity * 0.3 }))
    topKeywords.push(...topChars)
  }

  const positions = [
    { x: 0.5, y: 0.45 },
    { x: 0.25, y: 0.35 },
    { x: 0.75, y: 0.35 },
    { x: 0.3, y: 0.65 },
    { x: 0.7, y: 0.65 },
  ]

  return topKeywords.map((kw, index) => {
    const emotionColor = kw.emotion > 0.3
      ? `hsl(${45 + kw.emotion * 15}, 100%, 60%)`
      : kw.emotion < -0.3
      ? `hsl(${260 + Math.abs(kw.emotion) * 40}, 60%, 40%)`
      : '#E0E0E0'

    let hexColor = '#E0E0E0'
    if (kw.emotion > 0.3) {
      const t = (kw.emotion - 0.3) / 0.7
      hexColor = t > 0.5 ? '#FF69B4' : '#FFD700'
    } else if (kw.emotion < -0.3) {
      const t = (Math.abs(kw.emotion) - 0.3) / 0.7
      hexColor = t > 0.5 ? '#7B2D8E' : '#1E3A5F'
    }

    return {
      word: kw.word,
      color: hexColor,
      position: positions[index % positions.length],
      emotionWeight: kw.emotion,
    }
  })
}

function getChordProgression(style: string): string[][] {
  const progressions: Record<string, string[][]> = {
    dreamy: [
      ['C'], ['F'], ['Am'], ['G'],
      ['C'], ['F'], ['Dm'], ['G'],
    ],
    tense: [
      ['Am'], ['Dm'], ['Em'], ['Am'],
      ['F'], ['E'], ['Am'], ['Am'],
    ],
    healing: [
      ['C'], ['F'], ['G'], ['Am'],
      ['C'], ['F'], ['G'], ['C'],
    ],
    epic: [
      ['Am'], ['G'], ['F'], ['E'],
      ['Am'], ['G'], ['F'], ['E'],
    ],
  }
  return progressions[style] || progressions.healing
}

function calculateBPM(emotionPolarity: number, style: string): number {
  const baseBPMs: Record<string, number> = {
    dreamy: 70,
    tense: 120,
    healing: 75,
    epic: 100,
  }
  const base = baseBPMs[style] || 80
  const emotionMod = emotionPolarity * 20
  return Math.max(60, Math.min(140, Math.round(base + emotionMod)))
}

function calculateParticleCount(text: string): number {
  const length = text.length
  const count = Math.round(150 + (length / 300) * 350)
  return Math.max(150, Math.min(500, count))
}

function generateAudioDataUrl(params: VisualParams): string {
  const sampleRate = 44100
  const duration = 2
  const numSamples = sampleRate * duration
  const buffer = new Float32Array(numSamples)

  const bpm = params.bpm
  const beatDuration = 60 / bpm
  const chords = params.chordProgression

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0

    const chordIndex = Math.floor(t / (beatDuration * 2)) % chords.length
    const chord = chords[chordIndex]

    const noteFreqs = chord.map((note) => {
      const noteMap: Record<string, number> = {
        'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23,
        'G': 392.00, 'A': 440.00, 'B': 493.88,
        'Cm': 261.63, 'Dm': 293.66, 'Em': 329.63, 'Fm': 349.23,
        'Gm': 392.00, 'Am': 440.00, 'Bm': 493.88,
      }
      return noteMap[note] || 440
    })

    const beatProgress = (t % (beatDuration * 2)) / (beatDuration * 2)
    const envelope = beatProgress < 0.05
      ? beatProgress / 0.05
      : beatProgress > 0.9
      ? (1 - beatProgress) / 0.1
      : 1

    noteFreqs.forEach((freq) => {
      sample += Math.sin(2 * Math.PI * freq * t) * 0.1
    })

    buffer[i] = sample * envelope * 0.3
  }

  const wavBuffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(wavBuffer)

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, buffer[i]))
    view.setInt16(44 + i * 2, val * 0x7FFF, true)
  }

  const binary = []
  const bytes = new Uint8Array(wavBuffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary.push(String.fromCharCode(bytes[i]))
  }
  const base64 = btoa(binary.join(''))

  return `data:audio/wav;base64,${base64}`
}

app.post('/api/generate', (req, res) => {
  const { text, style }: GenerateRequest = req.body

  if (!text || text.trim().length < 50) {
    return res.status(400).json({ error: '文字内容不能少于50字' })
  }

  if (text.trim().length > 300) {
    return res.status(400).json({ error: '文字内容不能超过300字' })
  }

  const validStyles = ['dreamy', 'tense', 'healing', 'epic']
  if (!validStyles.includes(style)) {
    return res.status(400).json({ error: '无效的风格参数' })
  }

  setTimeout(() => {
    try {
      const emotionAnalysis = analyzeEmotion(text)
      const keywords = extractKeywords(text, emotionAnalysis)
      const particleCount = calculateParticleCount(text)
      const bpm = calculateBPM(emotionAnalysis.polarity, style)
      const chordProgression = getChordProgression(style)

      const colors: string[] = []
      const sizes: number[] = []
      const speeds: number[] = []

      for (let i = 0; i < particleCount; i++) {
        const emotionOffset = (Math.random() - 0.5) * 0.6
        const pEmotion = Math.max(-1, Math.min(1, emotionAnalysis.polarity + emotionOffset))

        let color = '#E0E0E0'
        if (pEmotion > 0.3) {
          const t = (pEmotion - 0.3) / 0.7
          color = t > 0.5 ? '#FF69B4' : '#FFD700'
        } else if (pEmotion < -0.3) {
          const t = (Math.abs(pEmotion) - 0.3) / 0.7
          color = t > 0.5 ? '#7B2D8E' : '#1E3A5F'
        }

        colors.push(color)
        sizes.push(3 + Math.random() * 7)
        speeds.push(0.3 + Math.random() * 0.4)
      }

      const visualParams: VisualParams = {
        particles: {
          count: particleCount,
          colors,
          sizes,
          speeds,
        },
        keywords,
        emotionPolarity: emotionAnalysis.polarity,
        bpm,
        chordProgression,
        style,
      }

      const audioDataUrl = generateAudioDataUrl(visualParams)

      const response: GenerateResponse = {
        audioDataUrl,
        visualParams,
      }

      res.json(response)
    } catch (error) {
      console.error('Generation error:', error)
      res.status(500).json({ error: '生成失败，请稍后重试' })
    }
  }, 500)
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', id: uuidv4() })
})

app.listen(PORT, () => {
  console.log(`余音织梦后端服务运行在 http://localhost:${PORT}`)
})

export default app
