import type { DateRange } from '../types'
import './TimelineSlider.css'

interface TimelineSliderProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  memoCount: number
}

export default function TimelineSlider({
  dateRange,
  onDateRangeChange,
  memoCount,
}: TimelineSliderProps) {
  const ranges: { value: DateRange; label: string }[] = [
    { value: '7days', label: '7天' },
    { value: '30days', label: '30天' },
    { value: 'all', label: '全部' },
  ]

  const getSliderPosition = () => {
    switch (dateRange) {
      case '7days': return 0
      case '30days': return 50
      case 'all': return 100
    }
  }

  return (
    <div className="timeline-slider">
      <div className="slider-header">
        <span className="slider-label">⏰ 时间范围</span>
        <span className="slider-count">{memoCount} 条备忘</span>
      </div>
      
      <div className="slider-track">
        <div 
          className="slider-fill"
          style={{ width: `${getSliderPosition() + 5}%` }}
        />
        
        {ranges.map((range, index) => (
          <button
            key={range.value}
            className={`slider-option ${dateRange === range.value ? 'active' : ''}`}
            onClick={() => onDateRangeChange(range.value)}
            style={{ left: `${index * 50}%` }}
          >
            <span className="option-label">{range.label}</span>
          </button>
        ))}
        
        <div 
          className="slider-thumb"
          style={{ left: `calc(${getSliderPosition()}% + 8px)` }}
        >
          <span className="thumb-arrow-left">◀</span>
          <span className="thumb-arrow-right">▶</span>
        </div>
      </div>
    </div>
  )
}
