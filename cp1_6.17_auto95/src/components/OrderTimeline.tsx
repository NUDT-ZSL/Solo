import { useEffect, useState } from 'react'
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
  const [animatedId, setAnimatedId] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const newOrder = generateRandomOrder(menuItems)
      addOrder(newOrder)
      setAnimatedId(newOrder.id)
      setTimeout(() => setAnimatedId(null), 400)
    }, 5000)

    return () => clearInterval(interval)
  }, [addOrder, menuItems])

  return (
    <div>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: 0 }}>实时订单流</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
            每5秒自动生成新订单
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {orders.map((order, index) => (
          <div
            key={order.id}
            style={{
              display: 'flex',
              height: 60,
              alignItems: 'stretch',
              transform: animatedId === order.id ? 'translateX(0)' : undefined,
              opacity: animatedId === order.id ? 1 : undefined,
              animation: animatedId === order.id ? 'slideIn 0.4s ease-out' : undefined,
            }}
          >
            <div
              style={{
                width: 70,
                flexShrink: 0,
                color: '#94A3B8',
                fontSize: 13,
                paddingTop: 18,
                paddingRight: 12,
                textAlign: 'right',
                fontFamily: 'monospace',
              }}
            >
              {formatTime(order.timestamp)}
            </div>
            <div
              style={{
                width: 2,
                background: '#E2E8F0',
                position: 'relative',
                margin: '18px 0',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: channelLabels[order.channel].color,
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 1px #E2E8F0',
                }}
              />
            </div>
            <div
              style={{
                flex: 1,
                margin: '6px 0 6px 12px',
                background: '#F1F5F9',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 12,
                    padding: '3px 8px',
                    borderRadius: 6,
                    color: '#fff',
                    background: channelLabels[order.channel].color,
                    flexShrink: 0,
                    fontWeight: 600,
                  }}
                >
                  {channelLabels[order.channel].label}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.menuItemName} × {order.quantity}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
                    {order.orderNo}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#10B981', flexShrink: 0 }}>
                ¥{order.amount}
              </div>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
