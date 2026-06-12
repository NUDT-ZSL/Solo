import { useState, useMemo } from 'react'
import RadarChart from '@/components/RadarChart'
import LineChart from '@/components/LineChart'
import { mockArtworks } from '@/data/mockData'
import type { StyleMetrics, TrendDataPoint } from '@/types'

const DashboardPage = () => {
  const [selectedMetric, setSelectedMetric] = useState<keyof StyleMetrics>('warmRatio')
  const [selectedCategory, setSelectedCategory] = useState<'year' | 'tool'>('year')

  const averageMetrics: StyleMetrics = useMemo(() => {
    if (mockArtworks.length === 0) {
      return {
        warmRatio: 0,
        coolRatio: 0,
        saturation: 0,
        brightness: 0,
        contrast: 0
      }
    }

    const totals = mockArtworks.reduce(
      (acc, artwork) => ({
        warmRatio: acc.warmRatio + artwork.styleMetrics.warmRatio,
        coolRatio: acc.coolRatio + artwork.styleMetrics.coolRatio,
        saturation: acc.saturation + artwork.styleMetrics.saturation,
        brightness: acc.brightness + artwork.styleMetrics.brightness,
        contrast: acc.contrast + artwork.styleMetrics.contrast
      }),
      { warmRatio: 0, coolRatio: 0, saturation: 0, brightness: 0, contrast: 0 }
    )

    return {
      warmRatio: Math.round(totals.warmRatio / mockArtworks.length),
      coolRatio: Math.round(totals.coolRatio / mockArtworks.length),
      saturation: Math.round(totals.saturation / mockArtworks.length),
      brightness: Math.round(totals.brightness / mockArtworks.length),
      contrast: Math.round(totals.contrast / mockArtworks.length)
    }
  }, [])

  const trendData: TrendDataPoint[] = useMemo(() => {
    if (selectedCategory === 'year') {
      const years = [...new Set(mockArtworks.map((a) => a.year))].sort()
      return years.map((year) => {
        const yearWorks = mockArtworks.filter((a) => a.year === year)
        const avgValue =
          yearWorks.reduce((sum, w) => sum + w.styleMetrics[selectedMetric], 0) /
          yearWorks.length
        return {
          label: year.toString(),
          value: Math.round(avgValue),
          date: `${year}年`
        }
      })
    } else {
      const tools = ['digital', 'watercolor', 'pencil'] as const
      return tools
        .map((tool) => {
          const toolWorks = mockArtworks.filter((a) => a.tools.includes(tool))
          if (toolWorks.length === 0) return null
          const avgValue =
            toolWorks.reduce((sum, w) => sum + w.styleMetrics[selectedMetric], 0) /
            toolWorks.length
          const toolLabels: Record<string, string> = {
            digital: '数字绘画',
            watercolor: '水彩',
            pencil: '铅笔'
          }
          return {
            label: toolLabels[tool],
            value: Math.round(avgValue),
            date: toolLabels[tool]
          }
        })
        .filter(Boolean) as TrendDataPoint[]
    }
  }, [selectedMetric, selectedCategory])

  const metricOptions: { key: keyof StyleMetrics; label: string }[] = [
    { key: 'warmRatio', label: '暖色比例' },
    { key: 'coolRatio', label: '冷色比例' },
    { key: 'saturation', label: '饱和度' },
    { key: 'brightness', label: '明度' },
    { key: 'contrast', label: '对比度' }
  ]

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            风格探索仪表盘
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            分析作品的色彩风格趋势，探索你的艺术创作演变
          </p>
        </div>

        <div className="dashboard-page">
          <div className="dashboard-section">
            <h2 className="dashboard-section-title">整体色彩风格雷达图</h2>
            <RadarChart metrics={averageMetrics} size={340} />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '16px',
              marginTop: '24px',
              textAlign: 'center'
            }}>
              {metricOptions.map((metric) => (
                <div key={metric.key}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--primary-purple)'
                  }}>
                    {averageMetrics[metric.key]}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px'
                  }}>
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-section">
            <h2 className="dashboard-section-title">风格趋势分析</h2>

            <div className="filter-bar">
              <span style={{
                alignSelf: 'center',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginRight: '8px'
              }}>
                指标:
              </span>
              {metricOptions.map((metric) => (
                <button
                  key={metric.key}
                  className={`filter-btn ${selectedMetric === metric.key ? 'active' : ''}`}
                  onClick={() => setSelectedMetric(metric.key)}
                >
                  {metric.label}
                </button>
              ))}
            </div>

            <div className="filter-bar">
              <span style={{
                alignSelf: 'center',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginRight: '8px'
              }}>
                分类:
              </span>
              <button
                className={`filter-btn ${selectedCategory === 'year' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('year')}
              >
                按年份
              </button>
              <button
                className={`filter-btn ${selectedCategory === 'tool' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('tool')}
              >
                按工具
              </button>
            </div>

            <div style={{ marginTop: '24px' }}>
              <LineChart
                data={trendData}
                width={700}
                height={320}
                title={`${metricOptions.find((m) => m.key === selectedMetric)?.label}趋势`}
              />
            </div>
          </div>

          <div className="dashboard-section">
            <h2 className="dashboard-section-title">作品统计</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--light-gray)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary-blue)' }}>
                  {mockArtworks.length}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  总作品数
                </div>
              </div>
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--light-gray)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary-purple)' }}>
                  {new Set(mockArtworks.map((a) => a.year)).size}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  创作年份
                </div>
              </div>
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--light-gray)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--tool-watercolor)' }}>
                  3
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  使用工具
                </div>
              </div>
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--light-gray)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--tool-pencil)' }}>
                  {averageMetrics.brightness}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  平均明度
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
