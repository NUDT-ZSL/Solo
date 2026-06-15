import { useEffect, useRef, useState, type FC } from 'react'
import {
  Chart,
  DoughnutController,
  LineController,
  LineElement,
  PointElement,
  ArcElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  type ChartConfiguration,
} from 'chart.js'

Chart.register(
  DoughnutController,
  LineController,
  LineElement,
  PointElement,
  ArcElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
)

export type MoodType = 'happy' | 'calm' | 'neutral' | 'down' | 'anxious'

interface DailyDistribution {
  happy: number
  calm: number
  neutral: number
  down: number
  anxious: number
}

interface TrendPoint {
  date: string
  avgScore: number
}

interface WordFrequency {
  word: string
  count: number
}

interface ReportData {
  todayDistribution: DailyDistribution
  weekTrend: TrendPoint[]
  wordCloud: WordFrequency[]
}

const MOOD_COLORS: Record<MoodType, string> = {
  happy: '#FFD700',
  calm: '#81C784',
  neutral: '#BDBDBD',
  down: '#64B5F6',
  anxious: '#E57373',
}

const MOOD_LABELS: Record<MoodType, string> = {
  happy: '开心',
  calm: '平静',
  neutral: '一般',
  down: '低落',
  anxious: '焦虑',
}

const SOFT_COLORS = [
  '#F48FB1', '#CE93D8', '#B39DDB', '#9FA8DA', '#90CAF9',
  '#81D4FA', '#80DEEA', '#80CBC4', '#A5D6A7', '#FFCC80',
]

const Report: FC = () => {
  const doughnutRef = useRef<HTMLCanvasElement | null>(null)
  const lineRef = useRef<HTMLCanvasElement | null>(null)
  const doughnutChart = useRef<Chart<'doughnut'> | null>(null)
  const lineChart = useRef<Chart<'line'> | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/mood/report')
        if (!res.ok) throw new Error('Fetch failed')
        const data: ReportData = await res.json()
        if (!cancelled) setReport(data)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!report || !doughnutRef.current) return
    const dist = report.todayDistribution
    const labels: string[] = []
    const data: number[] = []
    const colors: string[] = []
    ;(Object.keys(dist) as MoodType[]).forEach((k) => {
      if (dist[k] > 0) {
        labels.push(MOOD_LABELS[k])
        data.push(dist[k])
        colors.push(MOOD_COLORS[k])
      }
    })
    if (doughnutChart.current) doughnutChart.current.destroy()

    const cfg: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#555',
              padding: 16,
              font: { size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0)
                const val = ctx.parsed
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0
                return `${ctx.label}: ${val} (${pct}%)`
              },
            },
          },
        },
      },
    }
    doughnutChart.current = new Chart(doughnutRef.current, cfg)
    return () => {
      if (doughnutChart.current) doughnutChart.current.destroy()
    }
  }, [report])

  useEffect(() => {
    if (!report || !lineRef.current) return
    const trend = report.weekTrend
    if (trend.length === 0) return

    if (lineChart.current) lineChart.current.destroy()

    const labels = trend.map((t) => t.date.slice(5))
    const data = trend.map((t) => t.avgScore)

    const createGradient = (ctx: CanvasRenderingContext2D, startY: number, endY: number) => {
      const gradient = ctx.createLinearGradient(0, startY, 0, endY)
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.25)')
      gradient.addColorStop(0.25, 'rgba(129, 199, 132, 0.25)')
      gradient.addColorStop(0.5, 'rgba(189, 189, 189, 0.25)')
      gradient.addColorStop(0.75, 'rgba(100, 181, 246, 0.25)')
      gradient.addColorStop(1, 'rgba(229, 115, 115, 0.25)')
      return gradient
    }

    const cfg: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '情绪指数',
          data,
          borderColor: (ctx) => {
            const { chart } = ctx
            const { ctx: c, chartArea } = chart
            if (!chartArea) return '#29B6F6'
            return createGradient(c, chartArea.top, chartArea.bottom)
          },
          backgroundColor: (ctx) => {
            const { chart } = ctx
            const { ctx: c, chartArea } = chart
            if (!chartArea) return 'rgba(79, 195, 247, 0.15)'
            return createGradient(c, chartArea.top, chartArea.bottom)
          },
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#4FC3F7',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.35,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1,
              color: '#888',
              callback: (v) => {
                const scores: Record<number, string> = {
                  5: '开心',
                  4: '平静',
                  3: '一般',
                  2: '低落',
                  1: '焦虑',
                }
                return scores[v as number] || String(v)
              },
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            ticks: { color: '#888' },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(50,50,50,0.9)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `情绪指数: ${ctx.parsed.y}`,
            },
          },
        },
      },
    }
    lineChart.current = new Chart(lineRef.current, cfg)
    return () => {
      if (lineChart.current) lineChart.current.destroy()
    }
  }, [report])

  const renderWordCloud = () => {
    if (!report || report.wordCloud.length === 0) {
      return <div className="empty-chart">暂无关键词数据</div>
    }

    const words = report.wordCloud
    const minCount = Math.min(...words.map((w) => w.count))
    const maxCount = Math.max(...words.map((w) => w.count))
    const range = maxCount - minCount || 1

    return (
      <div className="wordcloud-wrap">
        {words.map((item) => {
          const ratio = (item.count - minCount) / range
          const fontSize = 12 + ratio * (36 - 12)
          const color = SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)]
          return (
            <span
              key={item.word}
              className="word-item"
              style={{
                fontSize: `${fontSize}px`,
                color,
              }}
              title={`${item.word} ×${item.count}`}
            >
              {item.word}
            </span>
          )
        })}
      </div>
    )
  }

  const hasDoughnutData =
    report &&
    Object.values(report.todayDistribution).reduce((a, b) => a + b, 0) > 0

  return (
    <div className="report-section">
      <div>
        <h2 className="report-title">今日情绪分布</h2>
        <p className="report-subtitle">团队今日各心情占比情况</p>
        {loading ? (
          <div className="empty-chart">加载中...</div>
        ) : !hasDoughnutData ? (
          <div className="empty-chart">今日暂无数据，等待员工提交</div>
        ) : (
          <div className="chart-wrap">
            <canvas ref={doughnutRef} />
          </div>
        )}
      </div>

      <div>
        <h2 className="report-title">近7天情绪趋势</h2>
        <p className="report-subtitle">团队平均情绪指数变化（5分开心→1分焦虑）</p>
        {loading ? (
          <div className="empty-chart">加载中...</div>
        ) : !report || report.weekTrend.length === 0 ? (
          <div className="empty-chart">近7天暂无数据</div>
        ) : (
          <div className="chart-wrap line-chart">
            <canvas ref={lineRef} />
          </div>
        )}
      </div>

      <div>
        <h2 className="report-title">反馈关键词云</h2>
        <p className="report-subtitle">近7天员工描述中最常见的词</p>
        {loading ? <div className="empty-chart">加载中...</div> : renderWordCloud()}
      </div>
    </div>
  )
}

export default Report
