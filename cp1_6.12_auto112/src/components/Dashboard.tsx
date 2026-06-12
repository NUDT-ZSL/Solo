import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
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

function CommentDonut({ ratio }: { ratio: number }) {
  const data = [
    { name: '注释', value: ratio * 100 },
    { name: '代码', value: (1 - ratio) * 100 }
  ]

  const COLORS = ['#F59E0B', '#E5E7EB']

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
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <span className="donut-percentage">{(ratio * 100).toFixed(1)}%</span>
        <span className="donut-label">注释占比</span>
      </div>
    </div>
  )
}

interface LanguageBarItemProps {
  lang: LanguageStats
  totalLines: number
  index: number
}

function LanguageBarItem({ lang, totalLines, index }: LanguageBarItemProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const percentage = totalLines > 0 ? (lang.lines / totalLines) * 100 : 0

  return (
    <div
      className="lang-bar-item"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="lang-bar-header">
        <div className="lang-name">
          <span
            className="lang-color-dot"
            style={{ backgroundColor: lang.color }}
          />
          {lang.language}
        </div>
        <span className="lang-percentage">{percentage.toFixed(1)}%</span>
      </div>
      <div className="lang-bar-track">
        <div
          className="lang-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: lang.color,
            transition: 'width 0.3s ease-in-out'
          }}
        />
      </div>
      {showTooltip && (
        <div className="lang-tooltip" style={{ animationDelay: '0.1s' }}>
          {lang.language}: {lang.lines.toLocaleString()} lines ({percentage.toFixed(1)}%)
        </div>
      )}
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
          {scaledData.languages.map((lang, index) => (
            <LanguageBarItem
              key={lang.language}
              lang={lang}
              totalLines={scaledData.totalLines}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
