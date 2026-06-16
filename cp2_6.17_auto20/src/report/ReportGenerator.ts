import { getWeeklySummaries, type DailyEmotionSummary } from '../clock/emotionData'

export interface WeeklyReportData {
  weekStart: string
  weekEnd: string
  dailySummaries: DailyEmotionSummary[]
  overallAvg: number
  highPoints: { date: string; value: number }[]
  lowPoints: { date: string; value: number }[]
  chartData: {
    labels: string[]
    values: number[]
    highIntervals: { start: number; end: number }[]
    lowIntervals: { start: number; end: number }[]
  }
}

export function generateWeeklyReport(): WeeklyReportData {
  const startTime = performance.now()

  const summaries = getWeeklySummaries()
  
  const total = summaries.reduce((sum, s) => sum + s.avgEmotion, 0)
  const overallAvg = Math.round(total / summaries.length)

  const sortedByValue = [...summaries].sort((a, b) => b.avgEmotion - a.avgEmotion)
  const highPoints = sortedByValue.slice(0, 2).map((s) => ({
    date: s.date,
    value: s.avgEmotion,
  }))
  const lowPoints = sortedByValue.slice(-2).reverse().map((s) => ({
    date: s.date,
    value: s.avgEmotion,
  }))

  const labels = summaries.map((s) => {
    const date = new Date(s.date)
    return `${date.getMonth() + 1}/${date.getDate()}`
  })
  const values = summaries.map((s) => s.avgEmotion)

  const threshold = overallAvg
  const highIntervals: { start: number; end: number }[] = []
  const lowIntervals: { start: number; end: number }[] = []

  let inHigh = false
  let inLow = false
  let intervalStart = 0

  for (let i = 0; i < values.length; i++) {
    const isHigh = values[i] > threshold + 5
    const isLow = values[i] < threshold - 5

    if (isHigh && !inHigh) {
      inHigh = true
      inLow = false
      intervalStart = i
    } else if (!isHigh && inHigh) {
      highIntervals.push({ start: intervalStart, end: i - 1 })
      inHigh = false
    }

    if (isLow && !inLow) {
      inLow = true
      inHigh = false
      intervalStart = i
    } else if (!isLow && inLow) {
      lowIntervals.push({ start: intervalStart, end: i - 1 })
      inLow = false
    }
  }

  if (inHigh) {
    highIntervals.push({ start: intervalStart, end: values.length - 1 })
  }
  if (inLow) {
    lowIntervals.push({ start: intervalStart, end: values.length - 1 })
  }

  const endTime = performance.now()
  console.log(`Weekly report generated in ${(endTime - startTime).toFixed(2)}ms`)

  return {
    weekStart: summaries[0].date,
    weekEnd: summaries[summaries.length - 1].date,
    dailySummaries: summaries,
    overallAvg,
    highPoints,
    lowPoints,
    chartData: {
      labels,
      values,
      highIntervals,
      lowIntervals,
    },
  }
}

export function shouldGenerateWeeklyReport(): boolean {
  const now = new Date()
  return now.getDay() === 1 && now.getHours() === 8
}

export function getLastMonday(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 6 : day - 1
  const lastMonday = new Date(today)
  lastMonday.setDate(today.getDate() - diff)
  lastMonday.setHours(0, 0, 0, 0)
  return lastMonday
}
