import { useState } from 'react';
import dayjs from 'dayjs';
import type { Order } from '../api';
import { updateOrderStatus } from '../api';

interface Props {
  order: Order;
  onUpdate?: () => void;
}

const statusConfig: Record<Order['status'], { color: string; label: string }> = {
  new: { color: '#7c4dff', label: '新订单' },
  processing: { color: '#1976d2', label: '制作中' },
  completed: { color: '#4caf50', label: '已完成' },
};

export default function OrderCard({ order, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (status: 'processing' | 'completed') => {
    try {
      setUpdating(true);
      await updateOrderStatus(order.id, status);
      onUpdate?.();
    } catch (err) {
      console.error('更新订单状态失败:', err);
      alert('更新失败，请重试');
    } finally {
      setUpdating(false);
    }
  };

  const cfg = statusConfig[order.status];

  return (
    <div
      className="order-card"
      style={{
        background: 'linear-gradient(135deg, #fff3e0 0%, #fff9c4 100%)',
        borderLeft: `4px solid ${cfg.color}`,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="card-header">
        <div>
          <span className="order-no">#{order.orderNo}</span>
          <span className="status-tag" style={{ backgroundColor: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        <span className="expand-icon">{expanded ? '−' : '+'}</span>
      </div>

      <div className="card-body">
        <div className="customer-info">
          <span className="customer-name">{order.customerName}</span>
          {order.phone && <span className="customer-phone">📞 {order.phone}</span>}
        </div>

        {expanded && (
          <>
            <ul className="items-list">
              {order.items.map((item, idx) => (
                <li key={idx}>
                  <span className="item-quantity">×{item.quantity}</span>
                  <span className="item-name">{item.name}</span>
                </li>
              ))}
            </ul>

            <div className="order-time">
              🕐 下单时间：{dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')}
            </div>

            {order.status !== 'completed' && (
              <div className="card-actions">
                {order.status === 'new' && (
                  <button
                    className="btn btn-primary"
                    disabled={updating}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange('processing');
                    }}
                  >
                    开始制作
                  </button>
                )}
                {(order.status === 'new' || order.status === 'processing') && (
                  <button
                    className="btn btn-success"
                    disabled={updating}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange('completed');
                    }}
                  >
                    完成
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
