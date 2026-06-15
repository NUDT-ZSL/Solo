import { useState, useEffect, useCallback } from 'react';
import type { Order } from './types';
import { getOrderHistory, updateOrderStatus } from './api';

interface AdminOrdersProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  preparing: '制作中',
  completed: '已完成',
};

const STATUS_FLOW: Record<string, string | null> = {
  pending: 'preparing',
  preparing: 'completed',
  completed: null,
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  pending: '开始制作',
  preparing: '标记完成',
};

export default function AdminOrders({ showToast }: AdminOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrderHistory();
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrders(sorted);
    } catch {
      showToast('加载订单失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    try {
      const updated = await updateOrderStatus(orderId, nextStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updated : o))
      );
      showToast(`订单已更新为「${STATUS_LABELS[nextStatus]}」`);
    } catch {
      showToast('更新状态失败', 'error');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="page-container">
      <h1 className="page-title font-display">订单管理</h1>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8d6e63' }}>
          加载中...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8d6e63' }}>
          暂无订单
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`order-card ${order.status}`}
            >
              <div className="order-header">
                <div>
                  <div className="order-id">订单号：{order.id}</div>
                  <div className="order-date">{formatDate(order.createdAt)}</div>
                </div>
                <span className={`order-status ${order.status}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="order-items">
                {order.items.map((item, idx) => (
                  <div key={idx} className="order-item-line">
                    {item.name} × {item.quantity} — ¥{(item.price * item.quantity).toFixed(2)}
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div className="order-total">
                  合计：¥{order.total.toFixed(2)}
                  <span style={{ fontSize: '13px', marginLeft: '12px', color: '#8d6e63' }}>
                    +{order.pointsEarned} 积分
                  </span>
                </div>
                <div className="order-actions">
                  {order.status === 'preparing' && (
                    <button
                      className="order-action-btn secondary"
                      onClick={() => handleStatusChange(order.id, 'pending')}
                    >
                      退回待处理
                    </button>
                  )}
                  {STATUS_FLOW[order.status] && (
                    <button
                      className="order-action-btn primary"
                      onClick={() =>
                        handleStatusChange(order.id, STATUS_FLOW[order.status]!)
                      }
                    >
                      {NEXT_STATUS_LABEL[order.status]}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
