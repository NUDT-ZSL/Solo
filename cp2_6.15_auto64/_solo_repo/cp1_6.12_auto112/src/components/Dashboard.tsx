import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip as RechartsTooltip,
  LabelList
} from 'recharts'
import type { AnalyzeResult, DateFilter, LanguageStats } from '../types'
import './Dashboard.css'

interface DashboardProps {
  result: AnalyzeResult
  dateFilter: DateFilter
}

const DATE_FILTER_RATIOS: Record<DateFilter, number> = {
  '7days': 0.3,
  '30days': 0.7,
  '90days': 1.0
}

function createDonutCenterLabel(ratio: number) {
  return function DonutCenterLabel(props: { cx: number; cy: number }) {
    const { cx, cy } = props
    return (
      <g>
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '24px', fontWeight: 700, fill: '#F59E0B' }}
        >
          {(ratio * 100).toFixed(1)}%
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '12px', fill: '#6B7280' }}
        >
          注释占比
        </text>
      </g>
    )
  }
}

function CommentDonut({ ratio }: { ratio: number }) {
  const data = [
    { name: '注释', value: ratio * 100 },
    { name: '代码', value: (1 - ratio) * 100 }
  ]

  const COLORS = ['#F59E0B', '#E5E7EB']
  const CenterLabel = createDonutCenterLabel(ratio)

  return (
    <div className="donut-container">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={60}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            animationDuration={300}
            animationEasing="ease-in-out"
            label={CenterLabel}
            labelLine={false}
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: LanguageStats & { totalLines: number }
  }>
}

function CustomBarTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const percentage = data.totalLines > 0 ? (data.lines / data.totalLines) * 100 : 0
    return (
      <div className="recharts-custom-tooltip">
        {data.language}: {data.lines.toLocaleString()} lines ({percentage.toFixed(1)}%)
      </div>
    )
  }
  return null
}

interface LanguageBarRowProps {
  lang: LanguageStats
  totalLines: number
}

function LanguageBarRow({ lang, totalLines }: LanguageBarRowProps) {
  const barData = [
    {
      ...lang,
      totalLines,
      displayValue: totalLines > 0 ? (lang.lines / totalLines) * 100 : 0
    }
  ]

  return (
    <div className="lang-bar-row">
      <div className="lang-bar-header">
        <div className="lang-name">
          <span
            className="lang-color-dot"
            style={{ backgroundColor: lang.color }}
          />
          {lang.language}
        </div>
        <span className="lang-percentage">
          {totalLines > 0 ? ((lang.lines / totalLines) * 100).toFixed(1) : 0}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={16}>
        <BarChart
          data={barData}
          layout="vertical"
          barCategoryGap={0}
          barGap={0}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <RechartsTooltip
            content={<CustomBarTooltip />}
            cursor={false}
            isAnimationActive={true}
            animationDuration={100}
          />
          <Bar
            dataKey="displayValue"
            fill={lang.color}
            radius={[4, 4, 4, 4]}
            isAnimationActive={true}
            animationDuration={300}
            animationEasing="ease-in-out"
            barSize={12}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Dashboard({ result, dateFilter }: DashboardProps) {
  const ratio = DATE_FILTER_RATIOS[dateFilter]

  const scaledData = useMemo(() => {
    const scaledLanguages = result.languages.map((lang) => ({
      ...lang,
      lines: Math.round(lang.lines * ratio)
    }))

    return {
      totalLines: Math.round(result.totalLines * ratio),
      totalFiles: result.totalFiles,
      commentRatio: result.commentRatio,
      languages: scaledLanguages
    }
  }, [result, ratio])

  return (
    <div className="dashboard-grid">
      <div className="dashboard-card">
        <div className="card-title">总代码行数</div>
        <div className="card-value lines-value">
          {scaledData.totalLines.toLocaleString()}
          <span className="value-unit">lines</span>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-title">文件总数</div>
        <div className="card-value files-value">
          {scaledData.totalFiles}
          <span className="value-unit">files</span>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-title">注释行占比</div>
        <CommentDonut ratio={scaledData.commentRatio} />
      </div>

      <div className="dashboard-card">
        <div className="card-title">语言占比</div>
        <div className="lang-bars-container">
          {scaledData.languages.map((lang) => (
            <LanguageBarRow
              key={lang.language}
              lang={lang}
              totalLines={scaledData.totalLines}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
