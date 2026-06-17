import { useState } from 'react';
import dayjs from 'dayjs';
import { Order, updateOrderStatus } from '../api';

interface OrderCardProps {
  order: Order;
  onStatusUpdate?: () => void;
}

const statusText: Record<Order['status'], string> = {
  new: '新订单',
  making: '制作中',
  completed: '已完成',
};

export default function OrderCard({ order, onStatusUpdate }: OrderCardProps) {
  const [updating, setUpdating] = useState(false);

  const handleUpdateStatus = async (newStatus: Order['status']) => {
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      onStatusUpdate?.();
    } catch (error) {
      console.error('更新订单状态失败:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={`order-card status-${order.status}`}>
      <div className="order-card-header">
        <span className="order-no">#{order.orderNo}</span>
        <span className={`order-status status-badge-${order.status}`}>
          {statusText[order.status]}
        </span>
      </div>

      <div className="order-customer">👤 {order.customerName}</div>
      <div className="order-phone">📞 {order.phone}</div>

      <ul className="order-items">
        {order.items.map((item, idx) => (
          <li key={idx} className="order-item">
            <span className="item-qty">×{item.quantity}</span>
            <span>{item.name}</span>
          </li>
        ))}
      </ul>

      <div className="order-time">
        下单时间: {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')}
      </div>

      {order.status !== 'completed' && (
        <div className="order-actions">
          {order.status === 'new' && (
            <button
              className="btn btn-primary"
              onClick={() => handleUpdateStatus('making')}
              disabled={updating}
            >
              开始制作
            </button>
          )}
          {order.status === 'making' && (
            <button
              className="btn btn-success"
              onClick={() => handleUpdateStatus('completed')}
              disabled={updating}
            >
              完成
            </button>
          )}
        </div>
      )}
    </div>
  );
}
