import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Pledge,
  PledgeCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  getAllPledges,
  addPledge,
  getCurrentUserId
} from './dataStore'
import PledgeCard from './PledgeCard'
import PledgeDetail from './PledgeDetail'
import SearchFilter, { SortOption } from './SearchFilter'

const PAGE_SIZE = 20

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

const ALL_CATEGORIES: PledgeCategory[] = ['plastic', 'transport', 'local', 'animal']

export default function App() {
  const [pledges, setPledges] = useState<Pledge[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<PledgeCategory | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [detailPledgeId, setDetailPledgeId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const [formDestination, setFormDestination] = useState('')
  const [formDate, setFormDate] = useState(todayStr())
  const [formCategory, setFormCategory] = useState<PledgeCategory>('plastic')
  const [formDescription, setFormDescription] = useState('')
  const [formUserName, setFormUserName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const maxDesc = 150
  const descCount = formDescription.length
  const descCounterClass =
    descCount > maxDesc * 0.9
      ? descCount > maxDesc
        ? 'danger'
        : 'warning'
      : ''

  const currentUserId = getCurrentUserId()

  const refreshPledges = useCallback(() => {
    setPledges(getAllPledges())
  }, [])

  useEffect(() => {
    refreshPledges()
    const savedName = localStorage.getItem('travel-pledge-username')
    if (savedName) setFormUserName(savedName)
  }, [refreshPledges])

  const filteredPledges = useMemo(() => {
    let result = [...pledges]

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (p) =>
          p.destination.toLowerCase().includes(q) ||
          p.userName.toLowerCase().includes(q)
      )
    }

    if (selectedCategory !== null) {
      result = result.filter((p) => p.category === selectedCategory)
    }

    switch (sortOption) {
      case 'newest':
        result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        break
      case 'oldest':
        result.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
        break
      case 'progress-high':
        result.sort((a, b) => b.progress - a.progress)
        break
      case 'progress-low':
        result.sort((a, b) => a.progress - b.progress)
        break
    }

    return result
  }, [pledges, searchQuery, selectedCategory, sortOption])

  const visiblePledges = useMemo(
    () => filteredPledges.slice(0, visibleCount),
    [filteredPledges, visibleCount]
  )

  const hasMore = visibleCount < filteredPledges.length

  const handleScroll = useCallback(() => {
    if (!hasMore) return
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const docHeight = document.documentElement.scrollHeight
    if (scrollTop + windowHeight >= docHeight - 400) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredPledges.length))
    }
  }, [hasMore, filteredPledges.length])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery, selectedCategory, sortOption])

  const handleCreateSubmit = async () => {
    if (
      isSubmitting ||
      !formDestination.trim() ||
      !formDescription.trim() ||
      !formUserName.trim() ||
      formDescription.length > maxDesc
    )
      return

    setIsSubmitting(true)
    try {
      const trimmedName = formUserName.trim()
      localStorage.setItem('travel-pledge-username', trimmedName)

      addPledge({
        userId: currentUserId,
        userName: trimmedName,
        destination: formDestination.trim(),
        departureDate: formDate,
        category: formCategory,
        description: formDescription.trim()
      })

      refreshPledges()
      setShowCreateModal(false)
      setFormDestination('')
      setFormDate(todayStr())
      setFormCategory('plastic')
      setFormDescription('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCreateModal = () => {
    setShowCreateModal(true)
  }

  const stats = useMemo(() => {
    const total = pledges.length
    const totalMilestones = pledges.reduce((sum, p) => sum + p.milestones.length, 0)
    const avgProgress = total > 0 ? Math.round(pledges.reduce((sum, p) => sum + p.progress, 0) / total) : 0
    const completed = pledges.filter((p) => p.progress === 100).length
    return { total, totalMilestones, avgProgress, completed }
  }, [pledges])

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h1 className="app-title">
              <span className="app-title-icon">🌍</span>
              TravelPledge
              <span style={{ fontSize: 14, fontWeight: 400, color: '#94a3b8' }}>
                · 环保旅行承诺墙
              </span>
            </h1>
            <button className="btn-primary" onClick={openCreateModal}>
              ✨ 发起承诺
            </button>
          </div>

          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />
        </div>
      </header>

      <main className="main-content">
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">承诺总数</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: '#22c55e' }}>{stats.totalMilestones}</div>
            <div className="stat-label">完成记录</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.avgProgress}%</div>
            <div className="stat-label">平均完成度</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: '#a855f7' }}>{stats.completed}</div>
            <div className="stat-label">已达成</div>
          </div>
        </div>

        {filteredPledges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, marginBottom: 8, color: '#94a3b8' }}>
              没有找到匹配的承诺
            </div>
            <div style={{ fontSize: 14 }}>试试调整搜索条件，或者发起一个新的承诺吧！</div>
          </div>
        ) : (
          <>
            <div className="masonry-grid">
              {visiblePledges.map((pledge) => (
                <div key={pledge.id} className="masonry-item">
                  <PledgeCard
                    pledge={pledge}
                    onClick={() => setDetailPledgeId(pledge.id)}
                  />
                </div>
              ))}
            </div>

            {hasMore && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#64748b',
                  fontSize: 14
                }}
              >
                <div>正在加载更多...</div>
                <div style={{ marginTop: 4, fontSize: 12 }}>
                  已显示 {visiblePledges.length} / {filteredPledges.length} 条承诺
                </div>
              </div>
            )}

            {!hasMore && filteredPledges.length > PAGE_SIZE && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 20px',
                  color: '#475569',
                  fontSize: 13,
                  borderTop: '1px solid #1e293b',
                  marginTop: 16
                }}
              >
                — 已展示全部 {filteredPledges.length} 条承诺 —
              </div>
            )}
          </>
        )}
      </main>

      {detailPledgeId && (
        <PledgeDetail
          pledgeId={detailPledgeId}
          onClose={() => setDetailPledgeId(null)}
          onUpdated={refreshPledges}
        />
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">✨ 发起环保旅行承诺</div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#94a3b8' }}>
                  公开承诺，用行动守护地球
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">你的昵称</label>
              <input
                type="text"
                className="form-input"
                placeholder="输入你的昵称..."
                value={formUserName}
                onChange={(e) => setFormUserName(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label className="form-label">目的地</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：云南大理、日本京都..."
                value={formDestination}
                onChange={(e) => setFormDestination(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label className="form-label">出发日期</label>
              <input
                type="date"
                className="form-input"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">承诺类别</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className="category-btn"
                    style={{
                      background: formCategory === cat ? CATEGORY_COLORS[cat] : '#475569',
                      color: '#fff',
                      fontWeight: formCategory === cat ? 600 : 400,
                      boxShadow: formCategory === cat ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                    }}
                    onClick={() => setFormCategory(cat)}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">承诺描述（最多{maxDesc}字）</label>
              <textarea
                className="form-textarea"
                placeholder="具体描述你的环保承诺，越具体越容易坚持！例如：全程自带水杯餐具，不使用塑料袋，选择公共交通出行..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                maxLength={maxDesc}
              />
              <div className={`char-counter ${descCounterClass}`}>
                {descCount}/{maxDesc}
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 24 }}>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateSubmit}
                disabled={
                  isSubmitting ||
                  !formDestination.trim() ||
                  !formDescription.trim() ||
                  !formUserName.trim() ||
                  formDescription.length > maxDesc
                }
                style={{
                  opacity:
                    isSubmitting ||
                    !formDestination.trim() ||
                    !formDescription.trim() ||
                    !formUserName.trim() ||
                    formDescription.length > maxDesc
                      ? 0.6
                      : 1,
                  cursor:
                    isSubmitting ||
                    !formDestination.trim() ||
                    !formDescription.trim() ||
                    !formUserName.trim() ||
                    formDescription.length > maxDesc
                      ? 'not-allowed'
                      : 'pointer'
                }}
              >
                {isSubmitting ? '提交中...' : '发布承诺 🌱'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
