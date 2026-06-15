export interface FrequencyProfile {
  lowRatio: number
  midRatio: number
  highRatio: number
  averageAmplitude: number
  dominantFrequency: number
}

export interface BadgeColors {
  lowFreqColor: string
  midFreqColor: string
  highFreqColor: string
  gradientStops: string[]
  particleCount: number
}

export function analyzeFrequencyProfile(audioData: Float32Array, sampleRate: number): FrequencyProfile {
  const len = audioData.length
  if (len === 0) {
    return { lowRatio: 0.33, midRatio: 0.33, highRatio: 0.34, averageAmplitude: 0, dominantFrequency: 0 }
  }

  let lowEnergy = 0
  let midEnergy = 0
  let highEnergy = 0
  let totalEnergy = 0
  let maxAmp = 0
  let maxAmpIndex = 0

  const lowBound = Math.floor(len * 0.1)
  const midBound = Math.floor(len * 0.5)

  for (let i = 0; i < len; i++) {
    const amp = Math.abs(audioData[i])
    totalEnergy += amp

    if (i < lowBound) {
      lowEnergy += amp
    } else if (i < midBound) {
      midEnergy += amp
    } else {
      highEnergy += amp
    }

    if (amp > maxAmp) {
      maxAmp = amp
      maxAmpIndex = i
    }
  }

  const safeTotal = totalEnergy || 1
  return {
    lowRatio: lowEnergy / safeTotal,
    midRatio: midEnergy / safeTotal,
    highRatio: highEnergy / safeTotal,
    averageAmplitude: totalEnergy / len,
    dominantFrequency: (maxAmpIndex * sampleRate) / (len * 2),
  }
}

export function generateBadgeColors(profile: FrequencyProfile, recordingCount: number): BadgeColors {
  const lowHue = blendColor('#8B3A2F', '#D4714A', profile.lowRatio)
  const midHue = blendColor('#2D6B4F', '#5FD89A', profile.midRatio)
  const highHue = blendColor('#4A7B9D', '#A8D8EA', profile.highRatio)

  const gradientStops = [
    lowHue,
    blendColor(lowHue, midHue, 0.5),
    midHue,
    blendColor(midHue, highHue, 0.5),
    highHue,
  ]

  return {
    lowFreqColor: lowHue,
    midFreqColor: midHue,
    highFreqColor: highHue,
    gradientStops,
    particleCount: Math.min(60, 12 + recordingCount * 3),
  }
}

function blendColor(color1: string, color2: string, ratio: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)
  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)

  const r = Math.round(r1 + (r2 - r1) * ratio)
  const g = Math.round(g1 + (g2 - g1) * ratio)
  const b = Math.round(b1 + (b2 - b1) * ratio)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function analyzeAudioBuffer(audioBuffer: AudioBuffer): FrequencyProfile {
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate)
  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer

  const analyser = offlineCtx.createAnalyser()
  analyser.fftSize = 2048
  source.connect(analyser)
  analyser.connect(offlineCtx.destination)
  source.start(0)

  const dataArray = new Float32Array(analyser.frequencyBinCount)
  analyser.getFloatFrequencyData(dataArray)

  const normalizedData = new Float32Array(dataArray.length)
  for (let i = 0; i < dataArray.length; i++) {
    normalizedData[i] = Math.max(0, (dataArray[i] + 140) / 140)
  }

  return analyzeFrequencyProfile(normalizedData, audioBuffer.sampleRate)
}

export type EmotionTag = '温暖' | '忧伤' | '欢快' | '宁静' | '怀旧' | '激昂'

const emotionKeywords: Record<EmotionTag, string[]> = {
  '温暖': ['温暖', '阳光', '微笑', '拥抱', '幸福', '甜蜜', '家', '爱', '烛光', '壁炉'],
  '忧伤': ['忧伤', '离别', '雨', '泪', '孤独', '消逝', '远去', '失去', '思念', '回忆'],
  '欢快': ['欢快', '笑声', '舞蹈', '奔跑', '庆祝', '派对', '节日', '童年', '嬉戏', '风筝'],
  '宁静': ['宁静', '月光', '湖面', '微风', '清晨', '山间', '书', '茶', '冥想', '星空'],
  '怀旧': ['怀旧', '老照片', '磁带', '旧书', '巷子', '童年', '外婆', '故乡', '旧时光', '唱机'],
  '激昂': ['激昂', '风暴', '雷鸣', '奔跑', '战斗', '热血', '呐喊', '冲刺', '征服', '巅峰'],
}

export function detectEmotion(text: string): EmotionTag {
  let bestTag: EmotionTag = '宁静'
  let bestScore = 0

  for (const [tag, keywords] of Object.entries(emotionKeywords)) {
    let score = 0
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestTag = tag as EmotionTag
    }
  }

  return bestTag
}

export async function extractFrequencyFromBlob(audioBlob: Blob): Promise<FrequencyProfile> {
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioCtx = new AudioContext()
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    return analyzeAudioBuffer(audioBuffer)
  } finally {
    await audioCtx.close()
  }
}
