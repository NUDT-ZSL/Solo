import { useState, useMemo, useEffect } from 'react'
import { Photo, sortPhotos, filterByStyle, filterByPriceRange, filterByDateRange, getPriceRange, formatDate } from '../business/portfolio'

const STYLE_TAGS = [
  { value: 'all', label: '全部' },
  { value: 'portrait', label: '人像' },
  { value: 'landscape', label: '风景' },
  { value: 'commercial', label: '商业' },
  { value: 'wedding', label: '婚礼' },
] as const

interface GalleryPageProps {
  photos: Photo[]
}

function GalleryPage({ photos }: GalleryPageProps) {
  const [selectedStyle, setSelectedStyle] = useState<typeof STYLE_TAGS[number]['value']>('all')
  const [priceMax, setPriceMax] = useState<number>(0)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [fadeKey, setFadeKey] = useState(0)
  const [columns, setColumns] = useState(3)

  const priceRange = useMemo(() => getPriceRange(photos), [photos])

  useEffect(() => {
    setPriceMax(priceRange[1])
  }, [priceRange])

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width <= 480) {
        setColumns(1)
      } else if (width <= 768) {
        setColumns(2)
      } else {
        setColumns(3)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const filteredPhotos = useMemo(() => {
    const startTime = performance.now()
    
    let result = [...photos]
    
    result = filterByStyle(result, selectedStyle as Photo['style'] | 'all')
    result = filterByPriceRange(result, priceRange[0], priceMax)
    result = filterByDateRange(result, startDate, endDate)
    result = sortPhotos(result, 'date')
    
    const endTime = performance.now()
    console.log(`Filtering completed in ${endTime - startTime}ms`)
    
    return result
  }, [photos, selectedStyle, priceMax, startDate, endDate, priceRange])

  const waterfallColumns = useMemo(() => {
    const cols: Photo[][] = Array.from({ length: columns }, () => [])
    const colHeights: number[] = Array(columns).fill(0)
    
    filteredPhotos.forEach(photo => {
      const shortestColIndex = colHeights.indexOf(Math.min(...colHeights))
      cols[shortestColIndex].push(photo)
      colHeights[shortestColIndex] += photo.height + 80 + 24
    })
    
    return cols
  }, [filteredPhotos, columns])

  const handleStyleChange = (style: typeof STYLE_TAGS[number]['value']) => {
    setSelectedStyle(style)
    setFadeKey(prev => prev + 1)
  }

  return (
    <div className="container">
      <h1 className="page-title">作品集</h1>
      
      <div className="filter-section">
        <div className="filter-header">
          <div className="result-count">
            共找到 <strong style={{ color: '#D4A574' }}>{filteredPhotos.length}</strong> 个作品
          </div>
        </div>
        
        <div className="style-tags">
          {STYLE_TAGS.map(tag => (
            <button
              key={tag.value}
              className={`style-tag ${selectedStyle === tag.value ? 'active fade-in' : ''}`}
              onClick={() => handleStyleChange(tag.value)}
            >
              {tag.label}
            </button>
          ))}
        </div>
        
        <div className="price-range-section">
          <div className="filter-group">
            <label className="filter-label">价格上限</label>
            <div className="slider-container">
              <input
                type="range"
                className="price-slider"
                min={priceRange[0]}
                max={priceRange[1]}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
              />
              <span className="price-value">¥{priceMax.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">开始日期</label>
            <input
              type="date"
              className="date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label className="filter-label">结束日期</label>
            <input
              type="date"
              className="date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="waterfall-container" key={fadeKey}>
        {waterfallColumns.map((column, colIndex) => (
          <div className="waterfall-column" key={colIndex}>
            {column.map(photo => (
              <div
                key={photo.id}
                className="photo-card"
                style={{ animation: `fadeIn 0.4s ease` }}
              >
                <div
                  className="photo-placeholder"
                  style={{ height: photo.height }}
                >
                  <span>{photo.title.charAt(0)}</span>
                </div>
                <div className="photo-info">
                  <h3 className="photo-title">{photo.title}</h3>
                  <p className="photo-date">{formatDate(photo.shootDate)}</p>
                  <p className="photo-price">¥{photo.price.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GalleryPage
