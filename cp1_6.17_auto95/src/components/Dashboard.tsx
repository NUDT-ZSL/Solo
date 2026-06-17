import { useState, useEffect, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useStore, channelLabels, MenuItem } from '../store'
import { OrderTimeline } from './OrderTimeline'

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const prevValue = useRef(value)

  useEffect(() => {
    if (prevValue.current === value) return
    setIsAnimating(true)
    const startValue = prevValue.current
    const endValue = value
    const duration = 300
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(startValue + (endValue - startValue) * easeOut)
      setDisplayValue(current)
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }
    requestAnimationFrame(animate)
    prevValue.current = value
  }, [value])

  return (
    <span
      className="animated-number"
      style={{
        display: 'inline-block',
        transform: isAnimating ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.15s ease-out',
      }}
    >
      {prefix}{displayValue.toLocaleString()}
    </span>
  )
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { amount: number; yesterdayAmount: number } }>; label?: string }) {
  if (active && payload && payload.length) {
    const { amount, yesterdayAmount } = payload[0].payload
    const diff = yesterdayAmount > 0 ? ((amount - yesterdayAmount) / yesterdayAmount) * 100 : 0
    const diffColor = diff >= 0 ? '#10B981' : '#EF4444'
    const diffSign = diff >= 0 ? '+' : ''
    return (
      <div
        style={{
          background: '#1E293B',
          color: '#fff',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ marginBottom: 4, fontWeight: 600 }}>{label}</div>
        <div style={{ marginBottom: 2 }}>营收: ¥{amount.toLocaleString()}</div>
        <div style={{ color: diffColor }}>
          同比昨日: {diffSign}{diff.toFixed(1)}%
        </div>
      </div>
    )
  }
  return null
}

function CustomDot(props: any) {
  const { cx, cy, stroke, payload, active } = props
  const isActive = active
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isActive ? 4 : 0}
      fill="#6366F1"
      stroke="#fff"
      strokeWidth={2}
      style={{ transition: 'r 0.15s ease-out' }}
    />
  )
}

function ActiveDot() {
  return null
}

function DataCards() {
  const revenue = useStore((s) => s.revenue)
  const menuItems = useStore((s) => s.menuItems)
  const lowStockItems = menuItems.filter((item) => item.stock < 10)

  const cards = [
    {
      title: '今日总营收',
      value: revenue.total,
      prefix: '¥',
      bg: '#10B981',
      icon: '💰',
    },
    {
      title: '今日订单数',
      value: revenue.totalOrders,
      prefix: '',
      bg: '#3B82F6',
      icon: '📋',
    },
    {
      title: '库存不足提醒',
      value: lowStockItems.length,
      prefix: '',
      bg: '#F59E0B',
      icon: '⚠️',
      suffix: lowStockItems.length > 0 ? ` (${lowStockItems.map((i) => i.name).join('、')})` : '',
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
      }}
      className="cards-grid"
    >
      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            background: card.bg,
            borderRadius: 12,
            padding: '24px 24px',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: 120,
            transition: 'transform 0.2s',
            cursor: 'default',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{card.icon}</span>
            <span style={{ fontSize: 14, opacity: 0.9 }}>{card.title}</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden' }}>
            <AnimatedNumber value={card.value} prefix={card.prefix} />
          </div>
          {card.suffix && (
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>{card.suffix}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function RevenueChart() {
  const revenue = useStore((s) => s.revenue)

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0 }}>今日营收趋势</h2>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>单位: 元</span>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenue.hourly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `¥${v}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#6366F1"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StockModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const updateStock = useStore((s) => s.updateMenuItemStock)
  const currentStock = useStore((s) => s.menuItems.find((m) => m.id === item.id)?.stock ?? item.stock)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 28,
          width: 360,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>调整库存</h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
          >
            ✕
          </button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 15, color: '#64748B', marginBottom: 6 }}>{item.name}</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: currentStock < 10 ? '#F59E0B' : '#1E293B' }}>
            {currentStock}
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8' }}>当前库存数量</div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => updateStock(item.id, -1)}
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              border: 'none',
              background: '#F1F5F9',
              fontSize: 24,
              fontWeight: 700,
              cursor: 'pointer',
              color: '#1E293B',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.background = '#E2E8F0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = '#F1F5F9'
            }}
          >
            −
          </button>
          <button
            onClick={() => updateStock(item.id, 1)}
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              border: 'none',
              background: '#3B82F6',
              fontSize: 24,
              fontWeight: 700,
              cursor: 'pointer',
              color: '#fff',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.background = '#2563EB'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = '#3B82F6'
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

function MenuPage() {
  const menuItems = useStore((s) => s.menuItems)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0, marginBottom: 4 }}>菜单管理</h1>
        <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>点击菜品卡片可调整库存数量</p>
      </div>
      <div className="menu-grid">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`menu-card ${item.stock < 10 ? 'menu-card-low-stock' : ''}`}
            onClick={() => setSelectedItem(item)}
          >
            <div className="menu-card-category">{item.category}</div>
            <div className="menu-card-icon">🍽️</div>
            <div className="menu-card-name">{item.name}</div>
            <div className="menu-card-footer">
              <div className="menu-card-price">¥{item.price}</div>
              <div className="menu-card-stats">
                <div className="menu-card-sales">今日 {item.todaySales} 份</div>
                <div className={`menu-card-stock ${item.stock < 10 ? 'menu-card-stock-low' : ''}`}>
                  库存 {item.stock}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {selectedItem && <StockModal item={selectedItem} onClose={() => setSelectedItem(null)} />}

      <style>{`
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, 300px);
          gap: 20px;
          justify-content: flex-start;
        }
        .menu-card {
          width: 300px;
          height: 200px;
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-sizing: border-box;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          border: 1px solid #F1F5F9;
        }
        .menu-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.12);
        }
        .menu-card-category {
          position: absolute;
          top: 16px;
          right: 16px;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 6px;
          background: #F1F5F9;
          color: #64748B;
        }
        .menu-card-icon {
          font-size: 36px;
          margin-bottom: 8px;
        }
        .menu-card-name {
          font-size: 16px;
          font-weight: 700;
          color: #1E293B;
          margin-bottom: 8px;
        }
        .menu-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }
        .menu-card-price {
          font-size: 18px;
          font-weight: 700;
          color: #10B981;
        }
        .menu-card-stats {
          text-align: right;
        }
        .menu-card-sales {
          font-size: 12px;
          color: #6366F1;
          font-weight: 600;
        }
        .menu-card-stock {
          font-size: 12px;
          color: #64748B;
          font-weight: 600;
        }
        .menu-card-stock-low {
          color: #F59E0B !important;
        }
        @media (max-width: 768px) {
          .menu-grid {
            grid-template-columns: 1fr !important;
          }
          .menu-card {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}

function OrdersPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0, marginBottom: 4 }}>订单流水</h1>
        <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>实时展示所有渠道订单，每5秒自动生成新订单</p>
      </div>
      <OrderTimeline title={false} />
    </div>
  )
}

function ExportPage() {
  const { exportReport } = useDashboardExport()

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0, marginBottom: 4 }}>导出报告</h1>
        <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>生成当前日期范围的营收分析报告（CSV格式）</p>
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 40,
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>营收数据报告</h3>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
          报告包含：各渠道营收统计、订单数量汇总、菜品销量排行等核心数据
        </p>
        <button
          onClick={exportReport}
          style={{
            background: '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 32px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)'
            e.currentTarget.style.background = '#2563EB'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.background = '#3B82F6'
          }}
        >
          📥 导出CSV报告
        </button>
      </div>
    </div>
  )
}

function useDashboardExport() {
  const selectedDate = useStore((s) => s.selectedDate)
  const orders = useStore((s) => s.orders)
  const menuItems = useStore((s) => s.menuItems)
  const revenue = useStore((s) => s.revenue)

  const exportReport = () => {
    const byChannel: Record<string, { orders: number; amount: number }> = {
      dine_in: { orders: 0, amount: 0 },
      takeout: { orders: 0, amount: 0 },
      platform: { orders: 0, amount: 0 },
    }
    orders.forEach((o) => {
      byChannel[o.channel].orders += 1
      byChannel[o.channel].amount += o.amount
    })

    const sortedMenu = [...menuItems].sort((a, b) => b.todaySales - a.todaySales)
    const topItems = sortedMenu.slice(0, 5).map((m) => `${m.name}(${m.todaySales})`).join(' | ')

    const rows = [
      ['日期', '渠道', '订单数', '总金额', '最受欢迎菜品TOP5'],
      ...Object.entries(byChannel).map(([ch, data]) => [
        selectedDate,
        channelLabels[ch as keyof typeof channelLabels].label,
        data.orders.toString(),
        `¥${data.amount.toLocaleString()}`,
        '',
      ]),
      [selectedDate, '合计', revenue.totalOrders.toString(), `¥${revenue.total.toLocaleString()}`, topItems],
    ]

    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `营收报表_${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return { exportReport }
}

function DashboardHome() {
  const selectedDate = useStore((s) => s.selectedDate)
  const setSelectedDate = useStore((s) => s.setSelectedDate)
  const refreshRevenueData = useStore((s) => s.refreshRevenueData)
  const { exportReport } = useDashboardExport()

  useEffect(() => {
    const interval = setInterval(() => {
      refreshRevenueData()
    }, 200)
    return () => clearInterval(interval)
  }, [refreshRevenueData])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0, marginBottom: 4 }}>仪表盘</h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>实时监控门店运营数据</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: 14,
              color: '#1E293B',
              background: '#fff',
              cursor: 'pointer',
            }}
          />
          <button
            onClick={exportReport}
            style={{
              background: '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s, background 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)'
              e.currentTarget.style.background = '#2563EB'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = '#3B82F6'
            }}
          >
            📥 导出报告
          </button>
        </div>
      </div>

      <DataCards />
      <RevenueChart />

      <div style={{ marginTop: 20, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <OrderTimeline />
      </div>
    </div>
  )
}

export function Dashboard() {
  const currentPage = useStore((s) => s.currentPage)

  return (
    <div>
      {currentPage === 'dashboard' && <DashboardHome />}
      {currentPage === 'menu' && <MenuPage />}
      {currentPage === 'orders' && <OrdersPage />}
      {currentPage === 'export' && <ExportPage />}
    </div>
  )
}
