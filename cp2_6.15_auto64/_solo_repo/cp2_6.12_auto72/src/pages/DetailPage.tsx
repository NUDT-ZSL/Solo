import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { mockArtworks } from '@/data/mockData'
import ColorPalette from '@/components/ColorPalette'
import type { ToolType } from '@/types'

const toolLabels: Record<ToolType, string> = {
  digital: '数字绘画',
  watercolor: '水彩',
  pencil: '铅笔'
}

const DetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [description, setDescription] = useState('')

  const artwork = mockArtworks.find((a) => a.id === id)

  useEffect(() => {
    if (artwork) {
      setDescription(artwork.description)
    }
  }, [artwork])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  if (!artwork) {
    return (
      <div className="page-container">
        <div className="content-wrapper" style={{ textAlign: 'center', paddingTop: '60px' }}>
          <h2>作品不存在</h2>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '20px',
              padding: '10px 24px',
              background: 'linear-gradient(to right, var(--primary-blue), var(--primary-purple))',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            返回作品集
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '24px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <span>←</span> 返回作品集
        </button>

        <div className="detail-page">
          <div className="detail-image-section">
            {!imageLoaded && (
              <div className="image-loader">
                <div className="loader-ring"></div>
              </div>
            )}
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="detail-image"
              onLoad={() => setImageLoaded(true)}
              style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
            />
          </div>

          <div className="detail-info-section">
            <h1 className="detail-title">{artwork.title}</h1>

            <div className="detail-meta">
              <div className="detail-meta-row">
                <span className="detail-meta-label">创作日期</span>
                <span>{formatDate(artwork.createdAt)}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">年份</span>
                <span>{artwork.year}年</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">尺寸</span>
                <span>{artwork.size}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">工具</span>
                <div className="detail-tags">
                  {artwork.tools.map((tool) => (
                    <span key={tool} className={`tool-tag ${tool}`}>
                      {toolLabels[tool]}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="detail-section-title">创作心得</h4>
              <textarea
                className="detail-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="记录你的创作灵感和心得..."
              />
            </div>

            <ColorPalette colors={artwork.colorPalette} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailPage
