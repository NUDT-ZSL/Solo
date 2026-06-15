import { useState } from 'react'
import { useTimelineStore, allCenturies } from './store'
import { CATEGORY_LABELS, CATEGORY_COLORS } from './data'

const allCategories = Object.keys(CATEGORY_LABELS) as string[]

export default function FilterPanel() {
  const { filters, setFilters } = useTimelineStore()
  const [collapsed, setCollapsed] = useState(false)

  const toggleCentury = (century: number) => {
    const current = filters.centuries
    if (current.includes(century)) {
      setFilters({ centuries: current.filter((c) => c !== century) })
    } else {
      setFilters({ centuries: [...current, century] })
    }
  }

  const toggleCategory = (cat: string) => {
    const current = filters.categories
    if (current.includes(cat)) {
      setFilters({ categories: current.filter((c) => c !== cat) })
    } else {
      setFilters({ categories: [...current, cat] })
    }
  }

  const clearFilters = () => {
    setFilters({ centuries: [], categories: [] })
  }

  const hasFilters = filters.centuries.length > 0 || filters.categories.length > 0

  const formatCentury = (c: number) => {
    if (c < 0) return `前${Math.abs(c)}世纪`
    return `${c}世纪`
  }

  return (
    <div
      className="relative h-full transition-all duration-500 ease-in-out flex"
      style={{ width: collapsed ? 48 : 260 }}
    >
      <div
        className="flex-1 h-full overflow-hidden transition-all duration-500"
        style={{
          background: 'rgba(10, 10, 35, 0.7)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255, 215, 0, 0.1)',
        }}
      >
        {!collapsed && (
          <div className="p-4 h-full overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold font-mono tracking-wider" style={{ color: '#ffd700' }}>
                筛选器
              </h2>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-mono px-2 py-1 rounded transition-colors"
                  style={{ color: 'rgba(200, 200, 220, 0.6)', background: 'rgba(255,255,255,0.05)' }}
                >
                  重置
                </button>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-mono mb-3 tracking-wide" style={{ color: 'rgba(200, 200, 220, 0.6)' }}>
                世纪
              </h3>
              <div className="flex flex-wrap gap-2">
                {allCenturies.map((c) => {
                  const active = filters.centuries.includes(c)
                  return (
                    <button
                      key={c}
                      onClick={() => toggleCentury(c)}
                      className="px-2 py-1 rounded text-xs font-mono transition-all duration-300"
                      style={{
                        background: active ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: active ? '#ffd700' : 'rgba(200, 200, 220, 0.6)',
                        border: `1px solid ${active ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                        boxShadow: active ? '0 0 10px rgba(255, 215, 0, 0.1)' : 'none',
                      }}
                    >
                      {formatCentury(c)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono mb-3 tracking-wide" style={{ color: 'rgba(200, 200, 220, 0.6)' }}>
                事件类型
              </h3>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => {
                  const active = filters.categories.includes(cat)
                  const color = CATEGORY_COLORS[cat]
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className="px-2 py-1 rounded text-xs font-mono transition-all duration-300"
                      style={{
                        background: active ? `${color}22` : 'rgba(255, 255, 255, 0.05)',
                        color: active ? color : 'rgba(200, 200, 220, 0.6)',
                        border: `1px solid ${active ? `${color}55` : 'rgba(255, 255, 255, 0.08)'}`,
                        boxShadow: active ? `0 0 10px ${color}11` : 'none',
                      }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                })}
              </div>
            </div>

            {hasFilters && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,215,0,0.08)' }}>
                <p className="text-xs font-mono" style={{ color: 'rgba(200, 200, 220, 0.4)' }}>
                  已选: {filters.centuries.length + filters.categories.length} 个筛选条件
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex-shrink-0 w-12 h-full flex items-center justify-center transition-colors"
        style={{
          background: 'rgba(10, 10, 35, 0.5)',
          borderLeft: '1px solid rgba(255, 215, 0, 0.08)',
        }}
        title={collapsed ? '展开筛选面板' : '收起筛选面板'}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="transition-transform duration-300"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'none', color: '#ffd70088' }}
        >
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
