import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import MasonryGrid from '@/components/MasonryGrid'
import { mockArtworks } from '@/data/mockData'
import type { ToolType } from '@/types'

const PortfolioPage = () => {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [activeToolFilter, setActiveToolFilter] = useState<string>('all')

  const filters = [
    { key: 'all', label: '全部' },
    { key: '2024', label: '2024年' },
    { key: '2023', label: '2023年' },
    { key: '2022', label: '2022年' }
  ]

  const toolFilters: { key: string; label: string }[] = [
    { key: 'all', label: '全部工具' },
    { key: 'digital', label: '数字绘画' },
    { key: 'watercolor', label: '水彩' },
    { key: 'pencil', label: '铅笔' }
  ]

  const filteredArtworks = useMemo(() => {
    return mockArtworks.filter((artwork) => {
      const yearMatch = activeFilter === 'all' || artwork.year.toString() === activeFilter
      const toolMatch =
        activeToolFilter === 'all' ||
        artwork.tools.includes(activeToolFilter as ToolType)
      return yearMatch && toolMatch
    })
  }, [activeFilter, activeToolFilter])

  const handleCardClick = (id: string) => {
    navigate(`/artwork/${id}`)
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            作品集
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            探索个人插画作品，感受不同风格与媒介的艺术表达
          </p>
        </div>

        <div className="filter-bar">
          {filters.map((filter) => (
            <button
              key={filter.key}
              className={`filter-btn ${activeFilter === filter.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="filter-bar" style={{ marginBottom: '32px' }}>
          {toolFilters.map((filter) => (
            <button
              key={filter.key}
              className={`filter-btn ${activeToolFilter === filter.key ? 'active' : ''}`}
              onClick={() => setActiveToolFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredArtworks.length > 0 ? (
          <MasonryGrid artworks={filteredArtworks} onCardClick={handleCardClick} />
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-secondary)'
            }}
          >
            <p>暂无符合条件的作品</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PortfolioPage
