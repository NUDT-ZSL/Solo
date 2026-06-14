import React, { useState, useRef, useEffect } from 'react'
import { Trip, ItineraryItem, Expense, updateTrip } from '../api-client'
import TravelReportGenerator from './TravelReportGenerator'

interface DetailPageProps {
  trip: Trip
  onBack: () => void
  onUpdate: (trip: Trip) => void
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

function generateGradient(destination: string): string {
  const gradients = [
    'linear-gradient(135deg, #2563eb, #7c3aed)',
    'linear-gradient(135deg, #0891b2, #2563eb)',
    'linear-gradient(135deg, #7c3aed, #db2777)',
    'linear-gradient(135deg, #059669, #0891b2)',
    'linear-gradient(135deg, #dc2626, #f59e0b)',
  ]
  let hash = 0
  for (let i = 0; i < destination.length; i++) {
    hash = destination.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

const CATEGORY_INFO: Record<Expense['category'], { icon: string; color: string; label: string }> = {
  transport: { icon: '🚗', color: '#3b82f6', label: '交通' },
  food: { icon: '🍜', color: '#f59e0b', label: '餐饮' },
  accommodation: { icon: '🏨', color: '#a855f7', label: '住宿' },
  ticket: { icon: '🎫', color: '#22c55e', label: '门票' },
}

const DetailPage: React.FC<DetailPageProps> = ({ trip, onBack, onUpdate }) => {
  const [showAddItinerary, setShowAddItinerary] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [itineraryForm, setItineraryForm] = useState({
    date: trip.startDate,
    time: '09:00',
    location: '',
    description: '',
  })

  const [expenseForm, setExpenseForm] = useState<{
    category: Expense['category']
    amount: string
    note: string
    date: string
  }>({
    category: 'transport',
    amount: '',
    note: '',
    date: trip.startDate,
  })

  const photoInputRef = useRef<HTMLInputElement>(null)
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([])

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        const result = ev.target?.result as string
        setPendingPhotos(prev => [...prev, result])
      }
      reader.readAsDataURL(file)
    })

    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }

  async function handleAddItinerary(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const newItem: ItineraryItem = {
        id: generateId(),
        date: itineraryForm.date,
        time: itineraryForm.time,
        location: itineraryForm.location,
        description: itineraryForm.description,
        photos: pendingPhotos,
      }
      const updated = await updateTrip(trip.id, {
        itinerary: [...trip.itinerary, newItem],
      })
      onUpdate(updated)
      setShowAddItinerary(false)
      setItineraryForm({
        date: trip.startDate,
        time: '09:00',
        location: '',
        description: '',
      })
      setPendingPhotos([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加行程失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const newExpense: Expense = {
        id: generateId(),
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        note: expenseForm.note,
        date: expenseForm.date,
      }
      const updated = await updateTrip(trip.id, {
        expenses: [...trip.expenses, newExpense],
      })
      onUpdate(updated)
      setShowAddExpense(false)
      setExpenseForm({
        category: 'transport',
        amount: '',
        note: '',
        date: trip.startDate,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加开销失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteItinerary(id: string) {
    try {
      const updated = await updateTrip(trip.id, {
        itinerary: trip.itinerary.filter(i => i.id !== id),
      })
      onUpdate(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除行程失败')
    }
  }

  async function handleDeleteExpense(id: string) {
    try {
      const updated = await updateTrip(trip.id, {
        expenses: trip.expenses.filter(e => e.id !== id),
      })
      onUpdate(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除开销失败')
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id)
    const target = e.currentTarget as HTMLElement
    target.style.transform = 'scale(1.05)'
    target.style.boxShadow = '0 16px 32px rgba(0,0,0,0.2)'
    target.style.zIndex = '1000'
    target.style.opacity = '0.9'
    try {
      e.dataTransfer.effectAllowed = 'move'
    } catch (_err) {}
  }

  async function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    const items = [...trip.itinerary]
    const draggedIdx = items.findIndex(i => i.id === draggedId)
    const targetIdx = items.findIndex(i => i.id === targetId)

    if (draggedIdx === -1 || targetIdx === -1) return

    const [removed] = items.splice(draggedIdx, 1)
    items.splice(targetIdx, 0, removed)

    try {
      const updated = await updateTrip(trip.id, { itinerary: items })
      onUpdate(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : '排序失败')
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    setDraggedId(null)
    const target = e.currentTarget as HTMLElement
    target.style.transform = 'translateY(0)'
    target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
    target.style.zIndex = 'auto'
    target.style.opacity = '1'
  }

  const groupedItinerary = trip.itinerary.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item)
    return acc
  }, {} as Record<string, ItineraryItem[]>)

  const sortedDates = Object.keys(groupedItinerary).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  )

  const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0)
  const expensesByCategory = trip.expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .detail-layout {
            flex-direction: column !important;
            padding: 16px !important;
          }
          .itinerary-col {
            width: 100% !important;
          }
          .expense-col {
            width: 100% !important;
            margin-top: 24px;
          }
          .banner {
            height: 160px !important;
          }
        }
      `}</style>

      {error && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ef4444',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideIn 0.3s ease',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              padding: '4px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.5)',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            重试
          </button>
        </div>
      )}

      <div
        className="banner"
        style={{
          height: '240px',
          background: generateGradient(trip.destination),
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '24px 32px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
          }}
        />
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            zIndex: 10,
            transition: 'all 0.2s',
          }}
        >
          ← 返回列表
        </button>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: 'white',
              margin: 0,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {trip.destination}
          </h1>
          <div
            style={{
              marginTop: '8px',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '14px',
            }}
          >
            📅 {trip.startDate} ~ {trip.endDate} · 💰 预算 ¥{trip.budget.toLocaleString()}
          </div>
        </div>
      </div>

      <div
        className="detail-layout"
        style={{
          display: 'flex',
          gap: '24px',
          padding: '32px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div
          className="itinerary-col"
          style={{ width: '60%', flexShrink: 0 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#1e293b',
                margin: 0,
              }}
            >
              📋 每日行程
            </h2>
            <button
              onClick={() => setShowAddItinerary(true)}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              + 添加行程
            </button>
          </div>

          {sortedDates.length === 0 ? (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '48px 24px',
                textAlign: 'center',
                color: '#94a3b8',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗓️</div>
              还没有行程安排，点击上方按钮添加
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date} style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: '#f59e0b',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '12px',
                  }}
                >
                  {date}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {groupedItinerary[date]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map(item => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={e => handleDragStart(e, item.id)}
                        onDragOver={e => handleDragOver(e, item.id)}
                        onDragEnd={e => handleDragEnd(e)}
                        style={{
                          background: 'white',
                          borderRadius: '12px',
                          padding: '16px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          cursor: draggedId === item.id ? 'grabbing' : 'grab',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          if (draggedId !== item.id) {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow =
                              '0 6px 16px rgba(0,0,0,0.08)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (draggedId !== item.id) {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow =
                              '0 2px 8px rgba(0,0,0,0.04)'
                          }
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: '13px',
                                color: '#64748b',
                                marginBottom: '4px',
                              }}
                            >
                              ⏰ {item.time}
                            </div>
                            <div
                              style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: '#1e293b',
                                marginBottom: '6px',
                              }}
                            >
                              📍 {item.location}
                            </div>
                            {item.description && (
                              <div
                                style={{
                                  fontSize: '14px',
                                  color: '#475569',
                                  lineHeight: 1.6,
                                  marginBottom: item.photos.length > 0 ? '12px' : 0,
                                }}
                              >
                                {item.description}
                              </div>
                            )}
                            {item.photos.length > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                }}
                              >
                                {item.photos.map((photo, idx) => (
                                  <img
                                    key={idx}
                                    src={photo}
                                    alt="行程照片"
                                    onClick={() => setPreviewPhoto(photo)}
                                    style={{
                                      width: '80px',
                                      height: '80px',
                                      objectFit: 'cover',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.transform = 'scale(1.05)'
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.transform = 'scale(1)'
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteItinerary(item.id)}
                            style={{
                              padding: '6px 10px',
                              background: '#fef2f2',
                              color: '#ef4444',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              marginLeft: '12px',
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="expense-col" style={{ width: '40%', flexShrink: 0 }}>
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#1e293b',
                  margin: 0,
                }}
              >
                💰 开销记录
              </h2>
              <button
                onClick={() => setShowAddExpense(true)}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + 添加
              </button>
            </div>

            {trip.expenses.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '14px',
                }}
              >
                还没有开销记录
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '360px',
                  overflowY: 'auto',
                  marginBottom: '16px',
                }}
              >
                {trip.expenses.map(expense => {
                  const info = CATEGORY_INFO[expense.category]
                  return (
                    <div
                      key={expense.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        gap: '12px',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f8fafc'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow =
                          '0 4px 12px rgba(0,0,0,0.06)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: info.color,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          flexShrink: 0,
                        }}
                      >
                        {info.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#1e293b',
                          }}
                        >
                          ¥{expense.amount.toLocaleString()}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {info.label}
                          {expense.note ? ` · ${expense.note}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        style={{
                          padding: '4px 8px',
                          background: 'transparent',
                          color: '#94a3b8',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = '#ef4444'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = '#94a3b8'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div
              style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  fontSize: '14px',
                }}
              >
                <span style={{ color: '#64748b' }}>总花费</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#1e293b',
                    fontSize: '18px',
                  }}
                >
                  ¥{totalExpenses.toLocaleString()}
                </span>
              </div>
              {totalExpenses > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      marginBottom: '8px',
                    }}
                  >
                    各项占比
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {Object.entries(CATEGORY_INFO).map(([cat, info]) => {
                      const amount = expensesByCategory[cat] || 0
                      const widthPercent = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                      return (
                        <div key={cat}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '4px',
                              fontSize: '11px',
                              color: '#64748b',
                            }}
                          >
                            <span>
                              {info.icon} {info.label}
                            </span>
                            <span>¥{amount.toLocaleString()} ({widthPercent.toFixed(0)}%)</span>
                          </div>
                          <div
                            style={{
                              height: '40px',
                              background: '#f1f5f9',
                              borderRadius: '6px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.max(widthPercent, 2)}%`,
                                background: info.color,
                                borderRadius: '6px',
                                transition: 'width 0.3s ease-out',
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: totalExpenses > trip.budget ? '#ef4444' : '#64748b',
                }}
              >
                <span>预算剩余</span>
                <span style={{ fontWeight: 600 }}>
                  ¥{(trip.budget - totalExpenses).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TravelReportGenerator
        trip={trip}
        generating={generatingReport}
        onClick={() => setGeneratingReport(true)}
      />

      {showAddItinerary && (
        <div
          onClick={() => !saving && setShowAddItinerary(false)}
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
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 20px 0' }}>
              添加行程
            </h3>
            <form onSubmit={handleAddItinerary}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>日期</label>
                <input
                  type="date"
                  required
                  value={itineraryForm.date}
                  onChange={e =>
                    setItineraryForm({ ...itineraryForm, date: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>时间</label>
                <input
                  type="time"
                  required
                  value={itineraryForm.time}
                  onChange={e =>
                    setItineraryForm({ ...itineraryForm, time: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>地点</label>
                <input
                  type="text"
                  required
                  placeholder="例如：东京塔"
                  value={itineraryForm.location}
                  onChange={e =>
                    setItineraryForm({ ...itineraryForm, location: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>活动描述</label>
                <textarea
                  rows={3}
                  placeholder="描述这次活动..."
                  value={itineraryForm.description}
                  onChange={e =>
                    setItineraryForm({
                      ...itineraryForm,
                      description: e.target.value,
                    })
                  }
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>上传照片</label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  style={{ ...inputStyle, padding: '8px' }}
                />
                {pendingPhotos.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginTop: '12px',
                    }}
                  >
                    {pendingPhotos.map((photo, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <img
                          src={photo}
                          alt=""
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPendingPhotos(prev => prev.filter((_, i) => i !== idx))
                          }
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setShowAddItinerary(false)
                    setPendingPhotos([])
                  }}
                  style={cancelBtnStyle}
                >
                  取消
                </button>
                <button type="submit" disabled={saving} style={submitBtnStyle}>
                  {saving ? (
                    <>
                      <Spinner />
                      添加中
                    </>
                  ) : (
                    '添加行程'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExpense && (
        <div
          onClick={() => !saving && setShowAddExpense(false)}
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
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              boxSizing: 'border-box',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 20px 0' }}>
              添加开销
            </h3>
            <form onSubmit={handleAddExpense}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>类别</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                  }}
                >
                  {(Object.keys(CATEGORY_INFO) as Expense['category'][]).map(cat => {
                    const info = CATEGORY_INFO[cat]
                    const selected = expenseForm.category === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setExpenseForm({ ...expenseForm, category: cat })}
                        style={{
                          padding: '12px 8px',
                          border: selected
                            ? `2px solid ${info.color}`
                            : '2px solid #e2e8f0',
                          borderRadius: '8px',
                          background: selected ? `${info.color}15` : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>{info.icon}</span>
                        <span
                          style={{
                            fontSize: '12px',
                            color: selected ? info.color : '#64748b',
                            fontWeight: selected ? 600 : 400,
                          }}
                        >
                          {info.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>金额 (元)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={e =>
                    setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>日期</label>
                <input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={e =>
                    setExpenseForm({ ...expenseForm, date: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>备注</label>
                <input
                  type="text"
                  placeholder="可选"
                  value={expenseForm.note}
                  onChange={e =>
                    setExpenseForm({ ...expenseForm, note: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowAddExpense(false)}
                  style={cancelBtnStyle}
                >
                  取消
                </button>
                <button type="submit" disabled={saving} style={submitBtnStyle}>
                  {saving ? (
                    <>
                      <Spinner />
                      添加中
                    </>
                  ) : (
                    '添加开销'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            cursor: 'zoom-out',
          }}
        >
          <img
            src={previewPhoto}
            alt="预览"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '8px',
            }}
          />
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  background: '#f1f5f9',
  color: '#475569',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

const submitBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

export default DetailPage
