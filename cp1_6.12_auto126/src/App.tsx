import { useState, useEffect, useMemo } from 'react'
import UploadZone from './UploadZone'
import ReceiptCard from './ReceiptCard'

export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Receipt {
  _id: string
  merchantName: string
  purchaseDate: string
  items: ReceiptItem[]
  totalAmount: number
  category: string
  imageUrl: string
  createdAt: string
  rawText?: string
}

interface SummaryCategory {
  name: string
  amount: number
  percentage: number
}

interface Summary {
  totalCount: number
  totalAmount: number
  categories: SummaryCategory[]
  month: string | null
}

const CHART_COLORS = [
  '#5B8DEF', '#38A169', '#ED8936', '#E53E3E',
  '#805AD5', '#319795', '#D69E2E', '#3182CE'
]

function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parseSuccess, setParseSuccess] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [activeTab, setActiveTab] = useState<'list' | 'summary'>('list')

  const fetchReceipts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/receipts')
      const json = await res.json()
      if (json.success) {
        setReceipts(json.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const url = selectedMonth
        ? `/api/receipts/summary?month=${encodeURIComponent(selectedMonth)}`
        : '/api/receipts/summary'
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setSummary(json.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchReceipts()
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [receipts, selectedMonth])

  const handleUpload = async (file: File) => {
    setIsParsing(true)
    setParseError('')
    setParseSuccess('')
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await fetch('/api/receipts/parse', {
        method: 'POST',
        body: formData
      })
      const json = await res.json()
      if (json.success) {
        setReceipts(prev => [json.data, ...prev])
        setParseSuccess('解析成功！已添加到小票列表')
        setTimeout(() => setParseSuccess(''), 2500)
      } else {
        setParseError(json.error || '解析失败')
      }
    } catch (e: any) {
      setParseError(e.message || '网络错误，请重试')
    } finally {
      setIsParsing(false)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<Receipt>) => {
    try {
      const res = await fetch(`/api/receipts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const json = await res.json()
      if (json.success) {
        setReceipts(prev => prev.map(r => r._id === id ? { ...r, ...updates } : r))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这张小票吗？')) return
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setReceipts(prev => prev.filter(r => r._id !== id))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const monthOptions = useMemo(() => {
    const months = new Set<string>()
    receipts.forEach(r => {
      if (r.purchaseDate) {
        const m = r.purchaseDate.substring(0, 7)
        if (m) months.add(m)
      }
    })
    months.add(currentMonth)
    return Array.from(months).sort().reverse()
  }, [receipts, currentMonth])

  const renderPieChart = (categories: SummaryCategory[]) => {
    if (categories.length === 0) return null
    const total = categories.reduce((s, c) => s + c.amount, 0)
    if (total === 0) return null

    let cumulative = 0
    const radius = 70
    const cx = 90
    const cy = 90
    const paths = categories.map((cat, i) => {
      const startAngle = (cumulative / total) * Math.PI * 2
      cumulative += cat.amount
      const endAngle = (cumulative / total) * Math.PI * 2
      const x1 = cx + radius * Math.sin(startAngle)
      const y1 = cy - radius * Math.cos(startAngle)
      const x2 = cx + radius * Math.sin(endAngle)
      const y2 = cy - radius * Math.cos(endAngle)
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
      const color = CHART_COLORS[i % CHART_COLORS.length]
      const d = cat.amount === total
        ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.001} ${cy - radius} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
      return { d, color, name: cat.name, amount: cat.amount, pct: cat.percentage }
    })

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth="2">
              <title>{p.name}: ¥{p.amount.toFixed(2)} ({p.pct}%)</title>
            </path>
          ))}
          <circle cx={cx} cy={cy} r="38" fill="#fff" />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="12" fill="#718096">总支出</text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="16" fontWeight="700" fill="#2D3748">
            ¥{total.toFixed(2)}
          </text>
        </svg>
        <div style={{ flex: 1, minWidth: 200 }}>
          {paths.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', padding: '8px 0',
              borderBottom: i < paths.length - 1 ? '1px solid #f0f0f0' : 'none'
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: 3,
                backgroundColor: p.color, marginRight: 10, flexShrink: 0
              }} />
              <span style={{ flex: 1, fontSize: 14, color: '#2D3748' }}>{p.name}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#2D3748', marginRight: 12 }}>
                ¥{p.amount.toFixed(2)}
              </span>
              <span style={{ fontSize: 12, color: '#718096', width: 50, textAlign: 'right' }}>
                {p.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e8e8e8',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg, #5B8DEF, #2B6CB0)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22
            }}>🧾</div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c', margin: 0 }}>
                ReceiptLens
              </h1>
              <p style={{ fontSize: 12, color: '#718096', margin: 0 }}>智能小票识别 & 消费管理</p>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#F7FAFC',
            borderRadius: 8,
            padding: 4,
            border: '1px solid #E2E8F0'
          }}>
            <button
              onClick={() => setActiveTab('list')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'list' ? '#ffffff' : 'transparent',
                color: activeTab === 'list' ? '#2B6CB0' : '#4A5568',
                boxShadow: activeTab === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 200ms'
              }}
            >
              📋 小票列表
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'summary' ? '#ffffff' : 'transparent',
                color: activeTab === 'summary' ? '#2B6CB0' : '#4A5568',
                boxShadow: activeTab === 'summary' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 200ms'
              }}
            >
              📊 月度报表
            </button>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '28px 24px 80px'
      }}>
        {activeTab === 'list' && (
          <>
            <UploadZone
              onUpload={handleUpload}
              isParsing={isParsing}
              error={parseError}
              success={parseSuccess}
            />

            {parseError && (
              <div className="fade-in" style={{
                marginTop: 20,
                padding: '14px 18px',
                background: '#FFF5F5',
                border: '1px solid #FEB2B2',
                borderRadius: 8,
                color: '#C53030',
                fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span>⚠️</span>
                <span>{parseError}</span>
              </div>
            )}
            {parseSuccess && (
              <div className="fade-in" style={{
                marginTop: 20,
                padding: '14px 18px',
                background: '#F0FFF4',
                border: '1px solid #9AE6B4',
                borderRadius: 8,
                color: '#22543D',
                fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span>✅</span>
                <span>{parseSuccess}</span>
              </div>
            )}

            <div style={{
              marginTop: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20
            }}>
              <h2 style={{
                fontSize: 18, fontWeight: 600, color: '#1a202c', margin: 0
              }}>
                小票记录
                {receipts.length > 0 && (
                  <span style={{
                    fontSize: 13, fontWeight: 400, color: '#718096',
                    marginLeft: 10, background: '#E2E8F0',
                    padding: '3px 10px', borderRadius: 20
                  }}>
                    {receipts.length} 张
                  </span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#A0AEC0' }}>
                <div className="spinner" style={{
                  width: 28, height: 28, border: '3px solid #E2E8F0',
                  borderTopColor: '#5B8DEF', borderRadius: '50%',
                  margin: '0 auto 16px'
                }} />
                加载中...
              </div>
            ) : receipts.length === 0 ? (
              <div className="fade-in" style={{
                textAlign: 'center', padding: '60px 20px',
                border: '2px dashed #E2E8F0',
                borderRadius: 12
              }}>
                <div style={{ fontSize: 72, marginBottom: 20, opacity: 0.7 }}>
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="25" y="10" width="50" height="80" rx="4" stroke="#5B8DEF" strokeWidth="2.5" fill="#EBF4FF" />
                    <rect x="32" y="22" width="36" height="4" rx="2" fill="#5B8DEF" opacity="0.8" />
                    <rect x="32" y="32" width="28" height="3" rx="1.5" fill="#2B6CB0" opacity="0.6" />
                    <rect x="32" y="42" width="32" height="3" rx="1.5" fill="#2B6CB0" opacity="0.6" />
                    <rect x="32" y="52" width="24" height="3" rx="1.5" fill="#2B6CB0" opacity="0.6" />
                    <rect x="32" y="62" width="36" height="4" rx="2" fill="#5B8DEF" opacity="0.8" />
                    <circle cx="32" cy="90" r="2" fill="#5B8DEF" />
                    <circle cx="40" cy="90" r="2" fill="#5B8DEF" />
                    <circle cx="48" cy="90" r="2" fill="#5B8DEF" />
                    <circle cx="56" cy="90" r="2" fill="#5B8DEF" />
                    <circle cx="64" cy="90" r="2" fill="#5B8DEF" />
                    <circle cx="72" cy="90" r="2" fill="#5B8DEF" />
                  </svg>
                </div>
                <p style={{ fontSize: 16, color: '#888', fontWeight: 500, margin: 0 }}>暂无小票</p>
                <p style={{ fontSize: 13, color: '#A0AEC0', marginTop: 8, margin: 0 }}>
                  上传一张小票图片开始智能识别吧
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 20 }}>
                {receipts.map((receipt) => (
                  <div key={receipt._id} className="fade-in">
                    <ReceiptCard
                      receipt={receipt}
                      onUpdate={(updates) => handleUpdate(receipt._id, updates)}
                      onDelete={() => handleDelete(receipt._id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'summary' && (
          <div className="fade-in">
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 24, flexWrap: 'wrap', gap: 16
            }}>
              <h2 style={{
                fontSize: 20, fontWeight: 600, color: '#1a202c', margin: 0
              }}>
                📊 月度消费报表
              </h2>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '10px 16px',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#2D3748',
                  background: '#ffffff',
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              >
                <option value="">全部时间</option>
                {monthOptions.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {summary && summary.totalCount > 0 ? (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                  marginBottom: 28
                }}>
                  <div style={{
                    padding: 20,
                    background: 'linear-gradient(135deg, #EBF4FF, #F7FAFC)',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0'
                  }}>
                    <div style={{ fontSize: 13, color: '#4A5568', marginBottom: 8 }}>小票数量</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#2B6CB0' }}>
                      {summary.totalCount} <span style={{ fontSize: 14, fontWeight: 400 }}>张</span>
                    </div>
                  </div>
                  <div style={{
                    padding: 20,
                    background: 'linear-gradient(135deg, #F0FFF4, #F7FAFC)',
                    borderRadius: 10,
                    border: '1px solid #C6F6D5'
                  }}>
                    <div style={{ fontSize: 13, color: '#4A5568', marginBottom: 8 }}>消费总金额</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#22543D' }}>
                      ¥{summary.totalAmount.toFixed(2)}
                    </div>
                  </div>
                  <div style={{
                    padding: 20,
                    background: 'linear-gradient(135deg, #FAF5FF, #F7FAFC)',
                    borderRadius: 10,
                    border: '1px solid #E9D8FD'
                  }}>
                    <div style={{ fontSize: 13, color: '#4A5568', marginBottom: 8 }}>消费分类</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#553C9A' }}>
                      {summary.categories.length} <span style={{ fontSize: 14, fontWeight: 400 }}>类</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e8e8e8',
                  borderRadius: 12,
                  padding: 28
                }}>
                  <h3 style={{
                    fontSize: 16, fontWeight: 600, color: '#1a202c',
                    marginBottom: 24, marginTop: 0
                  }}>分类占比</h3>
                  {renderPieChart(summary.categories)}
                </div>
              </>
            ) : (
              <div className="fade-in" style={{
                textAlign: 'center', padding: '80px 20px',
                border: '2px dashed #E2E8F0',
                borderRadius: 12
              }}>
                <div style={{ fontSize: 72, marginBottom: 20, opacity: 0.7 }}>📊</div>
                <p style={{ fontSize: 16, color: '#888', fontWeight: 500, margin: 0 }}>暂无消费数据</p>
                <p style={{ fontSize: 13, color: '#A0AEC0', marginTop: 8, margin: 0 }}>
                  上传小票后即可查看消费统计
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
