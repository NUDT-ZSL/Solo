import { useEffect, useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useStore, Order, channelLabels, Channel, MenuItem } from '../store'

function generateRandomOrder(menuItems: MenuItem[]): Order {
  const channels: Channel[] = ['dine_in', 'takeout', 'platform']
  const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)]
  const quantity = Math.floor(Math.random() * 3) + 1
  const now = new Date()
  return {
    id: uuidv4(),
    orderNo: `ORD${Date.now().toString().slice(-8)}`,
    channel: channels[Math.floor(Math.random() * channels.length)],
    menuItemId: menuItem.id,
    menuItemName: menuItem.name,
    quantity,
    amount: menuItem.price * quantity,
    timestamp: now,
  }
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function OrderTimeline({ title = true }: { title?: boolean }) {
  const orders = useStore((s) => s.orders)
  const addOrder = useStore((s) => s.addOrder)
  const menuItems = useStore((s) => s.menuItems)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    initialized.current = true
    const interval = setInterval(() => {
      const newOrder = generateRandomOrder(menuItems)
      addOrder(newOrder)
      setNewOrderIds((prev) => {
        const next = new Set(prev)
        next.add(newOrder.id)
        return next
      })
      setTimeout(() => {
        setNewOrderIds((prev) => {
          const next = new Set(prev)
          next.delete(newOrder.id)
          return next
        })
      }, 500)
    }, 5000)

    return () => clearInterval(interval)
  }, [addOrder, menuItems])

  return (
    <div className="order-timeline-container">
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: 0 }}>实时订单流</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}>
            <span className="pulse-dot" />
            每5秒自动生成新订单
          </div>
        </div>
      )}
      <div className="order-timeline-list">
        {orders.map((order) => {
          const isNew = newOrderIds.has(order.id)
          return (
            <div
              key={order.id}
              className={`order-timeline-item ${isNew ? 'order-timeline-item-new' : ''}`}
            >
              <div className="order-timeline-time">
                {formatTime(order.timestamp)}
              </div>
              <div className="order-timeline-line">
                <div
                  className="order-timeline-dot"
                  style={{ background: channelLabels[order.channel].color }}
                />
              </div>
              <div className="order-timeline-content">
                <div className="order-timeline-info">
                  <span
                    className="order-channel-tag"
                    style={{ background: channelLabels[order.channel].color }}
                  >
                    {channelLabels[order.channel].label}
                  </span>
                  <div className="order-timeline-details">
                    <div className="order-timeline-name">
                      {order.menuItemName} × {order.quantity}
                    </div>
                    <div className="order-timeline-no">
                      {order.orderNo}
                    </div>
                  </div>
                </div>
                <div className="order-timeline-amount">
                  ¥{order.amount}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        .order-timeline-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .order-timeline-item {
          display: flex;
          height: 60px;
          align-items: stretch;
          opacity: 1;
          transform: translateX(0);
        }
        .order-timeline-item-new {
          animation: slideInFromRight 0.4s ease-out;
        }
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .order-timeline-time {
          width: 70px;
          flex-shrink: 0;
          color: #94A3B8;
          font-size: 13px;
          padding-top: 18px;
          padding-right: 12px;
          text-align: right;
          font-family: monospace;
        }
        .order-timeline-line {
          width: 2px;
          background: #E2E8F0;
          position: relative;
          margin: 18px 0;
          flex-shrink: 0;
        }
        .order-timeline-dot {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid #fff;
          box-shadow: 0 0 0 1px #E2E8F0;
        }
        .order-timeline-content {
          flex: 1;
          margin: 6px 0 6px 12px;
          background: #F1F5F9;
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .order-timeline-info {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .order-channel-tag {
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 6px;
          color: #fff;
          flex-shrink: 0;
          font-weight: 600;
        }
        .order-timeline-details {
          min-width: 0;
        }
        .order-timeline-name {
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .order-timeline-no {
          font-size: 11px;
          color: #94A3B8;
          font-family: monospace;
        }
        .order-timeline-amount {
          font-size: 15px;
          font-weight: 700;
          color: #10B981;
          flex-shrink: 0;
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          animation: pulseAnim 2s infinite;
          display: inline-block;
        }
        @keyframes pulseAnim {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
