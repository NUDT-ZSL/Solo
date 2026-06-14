import React, { useState } from 'react'
import { Trip, CreateTripInput } from '../api-client'

interface HomePageProps {
  trips: Trip[]
  onCreateTrip: (data: CreateTripInput) => Promise<void>
  onDeleteTrip: (id: string) => Promise<void>
  onSelectTrip: (id: string) => void
  onEditTrip: (trip: Trip) => void
  loading: boolean
}

function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

function getNextWeekDate(): string {
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 8)
  return nextWeek.toISOString().split('T')[0]
}

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '16px',
        height: '16px',
        border: '2px solid white',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginRight: '8px',
        verticalAlign: 'middle',
      }}
    />
  )
}

const HomePage: React.FC<HomePageProps> = ({
  trips,
  onCreateTrip,
  onDeleteTrip,
  onSelectTrip,
  onEditTrip,
  loading,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'budget'>('date')
  const [formData, setFormData] = useState({
    destination: '',
    startDate: getTomorrowDate(),
    endDate: getNextWeekDate(),
    budget: 5000,
    mood: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onCreateTrip(formData)
      setShowCreateModal(false)
      setFormData({
        destination: '',
        startDate: getTomorrowDate(),
        endDate: getNextWeekDate(),
        budget: 5000,
        mood: '',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await onDeleteTrip(id)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredTrips = trips
    .filter(trip =>
      trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return b.budget - a.budget
    })

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f0f2f5',
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .sidebar {
            width: 100% !important;
            height: 60px !important;
            position: fixed !important;
            top: 0;
            left: 0;
            z-index: 100;
            background: white !important;
            border-radius: 0 !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
            flex-direction: row !important;
            align-items: center !important;
            padding: 0 16px !important;
          }
          .sidebar-title {
            font-size: 18px !important;
            margin-bottom: 0 !important;
          }
          .sidebar-content {
            display: none !important;
          }
          .sidebar-btn {
            padding: 8px 16px !important;
            margin-left: auto !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 80px 16px 24px !important;
          }
          .card-grid {
            justify-content: center !important;
          }
        }
      `}</style>

      <aside
        className="sidebar"
        style={{
          width: 300,
          minWidth: 300,
          maxWidth: 300,
          flexShrink: 0,
          background: '#f8fafc',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 12,
          borderBottomRightRadius: 12,
          borderBottomLeftRadius: 0,
          boxShadow: '4px 0 12px rgba(0,0,0,0.06)',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          zIndex: 50,
        }}
      >
        <h1
          className="sidebar-title"
          style={{
            fontSize: '24px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '32px',
          }}
        >
          ✈️ 旅行规划助手
        </h1>

        <div className="sidebar-content" style={{ marginBottom: '24px' }}>
          <button
            className="sidebar-btn"
            onClick={() => setShowCreateModal(true)}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            + 创建新旅行
          </button>
        </div>

        <div className="sidebar-content" style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="搜索目的地..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        <div className="sidebar-content">
          <label
            style={{
              fontSize: '13px',
              color: '#64748b',
              marginBottom: '8px',
              display: 'block',
            }}
          >
            排序方式
          </label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'date' | 'budget')}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              background: 'white',
              boxSizing: 'border-box',
            }}
          >
            <option value="date">按创建时间</option>
            <option value="budget">按预算金额</option>
          </select>
        </div>

        <div
          className="sidebar-content"
          style={{
            marginTop: 'auto',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#94a3b8',
          }}
        >
          共 {trips.length} 次旅行计划
        </div>
      </aside>

      <main
        className="main-content"
        style={{
          marginLeft: '300px',
          flex: 1,
          padding: '48px',
          maxWidth: '1200px',
          margin: '0 auto 0 300px',
        }}
      >
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
          }}
        >
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '8px',
            }}
          >
            我的旅行
          </h2>
          <p
            style={{
              color: '#64748b',
              marginBottom: '32px',
            }}
          >
            规划你的下一次精彩旅程
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <Spinner />
              <span style={{ marginLeft: '8px' }}>加载中...</span>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🗺️</div>
              <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>还没有旅行计划</h3>
              <p style={{ color: '#64748b', marginBottom: '24px' }}>
                创建你的第一次旅行，开始规划精彩旅程
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                创建旅行计划
              </button>
            </div>
          ) : (
            <div
              className="card-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, 320px)',
                gap: '24px',
                justifyContent: 'start',
              }}
            >
              {filteredTrips.map(trip => (
                <div
                  key={trip.id}
                  onClick={() => onSelectTrip(trip.id)}
                  style={{
                    width: '320px',
                    borderRadius: '16px',
                    background: 'linear-gradient(#2563eb, #7c3aed)',
                    boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: 'white',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow =
                      '0 12px 32px rgba(37,99,235,0.4)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow =
                      '0 8px 24px rgba(37,99,235,0.3)'
                  }}
                >
                  <h3
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      margin: '0 0 8px 0',
                      color: 'white',
                    }}
                  >
                    {trip.destination}
                  </h3>
                  <div
                    style={{
                      fontSize: '16px',
                      color: 'white',
                      marginBottom: '12px',
                      opacity: 0.95,
                    }}
                  >
                    💰 预算: ¥{trip.budget.toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.85)',
                      marginBottom: '16px',
                    }}
                  >
                    📅 {trip.startDate} ~ {trip.endDate}
                  </div>
                  {trip.mood && (
                    <p
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.5,
                        color: 'rgba(255,255,255,0.75)',
                        margin: '0 0 16px 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {trip.mood}
                    </p>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: 'auto',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onEditTrip(trip)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.3)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(trip.id)}
                      disabled={deletingId === trip.id}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(239,68,68,0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: deletingId === trip.id ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: deletingId === trip.id ? 0.7 : 1,
                      }}
                      onMouseEnter={e => {
                        if (deletingId !== trip.id) {
                          e.currentTarget.style.background = 'rgba(239,68,68,1)'
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.8)'
                      }}
                    >
                      {deletingId === trip.id ? (
                        <>
                          <Spinner />
                          删除中
                        </>
                      ) : (
                        '删除'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreateModal && (
        <div
          onClick={() => !submitting && setShowCreateModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
              boxSizing: 'border-box',
            }}
          >
            <h3
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1e293b',
                margin: '0 0 24px 0',
              }}
            >
              创建新旅行
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '6px',
                  }}
                >
                  目的地 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.destination}
                  onChange={e =>
                    setFormData({ ...formData, destination: e.target.value })
                  }
                  placeholder="例如：东京、巴黎、三亚..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '6px',
                  }}
                >
                  开始日期 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={e =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '6px',
                  }}
                >
                  结束日期 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={e =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '6px',
                  }}
                >
                  预算金额 (元) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.budget}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      budget: Number(e.target.value),
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '6px',
                  }}
                >
                  心情描述
                  <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: '4px' }}>
                    (最多200字)
                  </span>
                </label>
                <textarea
                  value={formData.mood}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      mood: e.target.value.slice(0, 200),
                    })
                  }
                  maxLength={200}
                  rows={4}
                  placeholder="描述一下你对这次旅行的期待和心情..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '12px',
                    color: '#94a3b8',
                    marginTop: '4px',
                  }}
                >
                  {formData.mood.length}/200
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {submitting ? (
                    <>
                      <Spinner />
                      创建中
                    </>
                  ) : (
                    '创建旅行'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
