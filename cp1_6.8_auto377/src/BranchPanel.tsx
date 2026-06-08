import { useTimelineStore } from './store'
import { CATEGORY_LABELS, CATEGORY_COLORS } from './data'

export default function BranchPanel() {
  const { selectedEvent, selectEvent } = useTimelineStore()

  if (!selectedEvent) return null

  const categoryColor = CATEGORY_COLORS[selectedEvent.category] || '#ffb347'
  const categoryLabel = CATEGORY_LABELS[selectedEvent.category] || selectedEvent.category
  const yearStr = selectedEvent.year < 0 ? `公元前${Math.abs(selectedEvent.year)}年` : `公元${selectedEvent.year}年`

  return (
    <div
      className="h-full overflow-y-auto custom-scrollbar animate-slide-in"
      style={{
        width: 280,
        background: 'rgba(10, 10, 35, 0.7)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255, 215, 0, 0.1)',
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold font-mono tracking-wider" style={{ color: '#ffd700' }}>
            事件分支
          </h2>
          <button
            onClick={() => selectEvent(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(200, 200, 220, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div
          className="rounded-lg p-3 mb-4"
          style={{
            background: `${categoryColor}08`,
            border: `1px solid ${categoryColor}22`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{
                background: `${categoryColor}22`,
                color: categoryColor,
                border: `1px solid ${categoryColor}44`,
              }}
            >
              {categoryLabel}
            </span>
            <span className="text-xs font-mono" style={{ color: 'rgba(200, 200, 220, 0.5)' }}>
              {yearStr}
            </span>
          </div>
          <h3 className="text-sm font-bold font-mono mb-1.5" style={{ color: '#e8e0ff' }}>
            {selectedEvent.title}
          </h3>
          <p className="text-xs leading-relaxed font-mono" style={{ color: 'rgba(200, 200, 220, 0.7)' }}>
            {selectedEvent.detail}
          </p>
        </div>

        {selectedEvent.branches && selectedEvent.branches.length > 0 && (
          <div>
            <h3 className="text-xs font-mono mb-3 tracking-wide" style={{ color: 'rgba(200, 200, 220, 0.5)' }}>
              时间线分支
            </h3>
            <div className="relative pl-5">
              <div
                className="absolute left-[7px] top-2 bottom-2"
                style={{
                  width: 1,
                  background: `linear-gradient(to bottom, ${categoryColor}44, ${categoryColor}11)`,
                }}
              />

              {selectedEvent.branches.map((branch, index) => {
                const branchYearStr = branch.year < 0 ? `前${Math.abs(branch.year)}` : `${branch.year}`
                return (
                  <div key={branch.id} className="relative mb-4 last:mb-0 animate-branch-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <div
                      className="absolute -left-5 top-1.5 w-3 h-3 rounded-full"
                      style={{
                        background: categoryColor,
                        boxShadow: `0 0 8px ${categoryColor}66`,
                      }}
                    />
                    <div
                      className="rounded-lg p-2.5 transition-all duration-300 hover:translate-x-1"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold" style={{ color: categoryColor }}>
                          {branchYearStr}
                        </span>
                      </div>
                      <p className="text-xs font-mono font-semibold mb-0.5" style={{ color: '#d0c8f0' }}>
                        {branch.title}
                      </p>
                      <p className="text-xs font-mono leading-relaxed" style={{ color: 'rgba(200, 200, 220, 0.6)' }}>
                        {branch.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
