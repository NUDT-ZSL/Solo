export interface EmotionRecord {
  id: string
  timestamp: number
  emotionValue: number
  note?: string
  emoji?: string
}

export interface DailyEmotionSummary {
  date: string
  avgEmotion: number
  peaks: { hour: number; emotionValue: number }[]
}

const EMOTION_MIN = 0
const EMOTION_MAX = 100

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

function getHourEmotionBase(hour: number): number {
  const normalizedHour = hour / 24
  const morningPeak = Math.exp(-Math.pow((normalizedHour - 0.35) * 5, 2)) * 25
  const afternoonPeak = Math.exp(-Math.pow((normalizedHour - 0.6) * 4, 2)) * 20
  const eveningTrough = Math.exp(-Math.pow((normalizedHour - 0.85) * 3.5, 2)) * -15
  const nightTrough = Math.exp(-Math.pow((normalizedHour - 0.05) * 6, 2)) * -20
  
  return 50 + morningPeak + afternoonPeak + eveningTrough + nightTrough
}

export function getCurrentEmotionValue(): number {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const second = now.getSeconds()
  
  const hourDecimal = hour + minute / 60 + second / 3600
  
  const baseValue = getHourEmotionBase(hourDecimal)
  
  const daySeed = Math.floor(now.getTime() / 86400000)
  const hourSeed = daySeed * 24 + hour
  const randomVariation = (seededRandom(hourSeed) - 0.5) * 20
  
  let value = baseValue + randomVariation
  value = Math.max(EMOTION_MIN, Math.min(EMOTION_MAX, value))
  
  return Math.round(value)
}

export function getEmotionValueByTime(date: Date): number {
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  
  const hourDecimal = hour + minute / 60 + second / 3600
  
  const baseValue = getHourEmotionBase(hourDecimal)
  
  const daySeed = Math.floor(date.getTime() / 86400000)
  const hourSeed = daySeed * 24 + hour
  const randomVariation = (seededRandom(hourSeed) - 0.5) * 20
  
  let value = baseValue + randomVariation
  value = Math.max(EMOTION_MIN, Math.min(EMOTION_MAX, value))
  
  return Math.round(value)
}

export function getEmotionForHourSegment(hourSegment: number): number {
  const hourDecimal = hourSegment * 0.25
  return getHourEmotionBase(hourDecimal)
}

export function generateWaveformSamples(
  emotionValue: number,
  count: number = 24,
  phaseOffset: number = 0
): number[] {
  const samples: number[] = []
  const baseAmplitude = (emotionValue / 100) * 0.7 + 0.1

  for (let i = 0; i < count; i++) {
    const t = i / count
    const phase = t * Math.PI * 2 + phaseOffset

    const primaryWave = Math.sin(phase) * baseAmplitude * 0.5

    const secondaryWave = Math.sin(phase * 2 + phaseOffset * 0.5) * baseAmplitude * 0.25

    const tertiaryWave = Math.sin(phase * 4 + phaseOffset * 0.3) * baseAmplitude * 0.15

    const sineModulation = Math.sin(phaseOffset * 0.8 + t * Math.PI) * baseAmplitude * 0.1

    const subtleNoise = (Math.random() - 0.5) * baseAmplitude * 0.08

    let sample = primaryWave + secondaryWave + tertiaryWave + sineModulation + subtleNoise
    sample = Math.max(-1, Math.min(1, sample))

    samples.push(sample)
  }

  return samples
}

export function getAmbientSoundType(hour: number): string {
  if (hour >= 5 && hour < 9) return 'morning_birds'
  if (hour >= 9 && hour < 12) return 'morning_chirp'
  if (hour >= 12 && hour < 17) return 'afternoon_cicada'
  if (hour >= 17 && hour < 20) return 'evening_wind'
  if (hour >= 20 && hour < 23) return 'night_cricket'
  return 'night_rain'
}

export function getEmotionColor(emotionValue: number): string {
  const t = Math.max(0, Math.min(1, emotionValue / 100))

  const c1 = { r: 13, g: 27, b: 42 }
  const c2 = { r: 255, g: 71, b: 87 }

  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)

  return `rgb(${r}, ${g}, ${b})`
}

export function getEmotionColorRgb(emotionValue: number): { r: number; g: number; b: number } {
  const t = Math.max(0, Math.min(1, emotionValue / 100))

  const c1 = { r: 13, g: 27, b: 42 }
  const c2 = { r: 255, g: 71, b: 87 }

  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  }
}

export function getTimeSliceColor(startHour: number, endHour: number): string {
  const midHour = (startHour + endHour) / 2

  if (midHour < 6 || midHour >= 22) {
    return '#0d1b2a'
  } else if (midHour >= 6 && midHour < 10) {
    const t = (midHour - 6) / 4
    return interpolateColor('#0d1b2a', '#f4a261', t)
  } else if (midHour >= 10 && midHour < 14) {
    const t = (midHour - 10) / 4
    return interpolateColor('#f4a261', '#f4d35e', t)
  } else if (midHour >= 14 && midHour < 18) {
    const t = (midHour - 14) / 4
    return interpolateColor('#f4d35e', '#e76f51', t)
  } else {
    const t = (midHour - 18) / 4
    return interpolateColor('#e76f51', '#0d1b2a', t)
  }
}

export function getTimeColorAtHour(hourDecimal: number): { r: number; g: number; b: number } {
  let c1Hex: string
  let c2Hex: string
  let t: number

  if (hourDecimal < 6) {
    return hexToRgb('#0d1b2a')
  } else if (hourDecimal >= 6 && hourDecimal < 10) {
    c1Hex = '#0d1b2a'
    c2Hex = '#f4a261'
    t = (hourDecimal - 6) / 4
  } else if (hourDecimal >= 10 && hourDecimal < 14) {
    c1Hex = '#f4a261'
    c2Hex = '#f4d35e'
    t = (hourDecimal - 10) / 4
  } else if (hourDecimal >= 14 && hourDecimal < 18) {
    c1Hex = '#f4d35e'
    c2Hex = '#e76f51'
    t = (hourDecimal - 14) / 4
  } else if (hourDecimal >= 18 && hourDecimal < 22) {
    c1Hex = '#e76f51'
    c2Hex = '#0d1b2a'
    t = (hourDecimal - 18) / 4
  } else {
    return hexToRgb('#0d1b2a')
  }

  const c1 = hexToRgb(c1Hex)
  const c2 = hexToRgb(c2Hex)

  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  }
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  
  return `rgb(${r}, ${g}, ${b})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

export function getDailySummary(date: Date): DailyEmotionSummary {
  const dateStr = date.toISOString().split('T')[0]
  
  let totalEmotion = 0
  let count = 0
  const hourlyValues: { hour: number; value: number }[] = []
  
  for (let hour = 0; hour < 24; hour++) {
    const hourDate = new Date(date)
    hourDate.setHours(hour, 0, 0, 0)
    const value = getEmotionValueByTime(hourDate)
    totalEmotion += value
    count++
    hourlyValues.push({ hour, value })
  }
  
  hourlyValues.sort((a, b) => b.value - a.value)
  const peaks = hourlyValues.slice(0, 3).map(({ hour, value }) => ({
    hour,
    emotionValue: value,
  }))
  
  return {
    date: dateStr,
    avgEmotion: Math.round(totalEmotion / count),
    peaks,
  }
}

export function getWeeklySummaries(): DailyEmotionSummary[] {
  const summaries: DailyEmotionSummary[] = []
  const today = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    summaries.push(getDailySummary(date))
  }
  
  return summaries
}
