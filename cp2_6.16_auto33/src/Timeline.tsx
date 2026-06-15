import './Timeline.css'

interface TimelineProps {
  years: number[]
  selectedYear: number
  onYearSelect: (year: number) => void
}

function Timeline({ years, selectedYear, onYearSelect }: TimelineProps) {
  return (
    <div className="timeline-container">
      <div className="timeline-track">
        {years.map((year, idx) => (
          <span key={year}>
            <div
              className="timeline-node-wrapper"
              onClick={() => onYearSelect(year)}
              role="button"
              tabIndex={0}
              aria-label={`${year}年`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onYearSelect(year)
                }
              }}
            >
              <div className={`timeline-node${selectedYear === year ? ' active' : ''}`} />
              <span className={`timeline-year${selectedYear === year ? ' active' : ''}`}>
                {year}
              </span>
            </div>
            {idx < years.length - 1 && <div className="timeline-connector" />}
          </span>
        ))}
      </div>
    </div>
  )
}

export default Timeline
