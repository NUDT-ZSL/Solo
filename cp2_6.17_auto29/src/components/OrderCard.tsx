import React, { useState } from 'react';
import dayjs from 'dayjs';
import type { Order } from '../types';
import './OrderCard.css';

interface OrderCardProps {
  order: Order;
  onCancel?: (orderId: string) => void;
  showMemberInfo?: boolean;
}

const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待确认', color: '#f59e0b', bgColor: '#fef3c7' },
  confirmed: { label: '已确认', color: '#3b82f6', bgColor: '#dbeafe' },
  delivering: { label: '配送中', color: '#8b5cf6', bgColor: '#ede9fe' },
  delivered: { label: '已送达', color: '#22c55e', bgColor: '#dcfce7' },
  cancelled: { label: '已取消', color: '#6b7280', bgColor: '#f3f4f6' },
};

const frequencyMap = {
  weekly: '每周配送',
  biweekly: '每两周配送',
};

const OrderCard: React.FC<OrderCardProps> = ({ order, onCancel, showMemberInfo = false }) => {
  const [expanded, setExpanded] = useState(false);
  const status = statusMap[order.status];

  const canCancel = order.status === 'pending' || order.status === 'confirmed';

  return (
    <div className={`order-card ${expanded ? 'expanded' : ''}`}>
      <div className="order-header" onClick={() => setExpanded(!expanded)}>
        <div className="order-info">
          <div className="order-title">
            <span className="order-id">订单号：{order.id.slice(-8)}</span>
            <span
              className="status-badge"
              style={{ color: status.color, backgroundColor: status.bgColor }}
            >
              {status.label}
            </span>
          </div>
          <div className="order-meta">
            <span>配送日期：{dayjs(order.deliveryDate).format('YYYY年MM月DD日')}</span>
            <span className="dot">·</span>
            <span>{frequencyMap[order.frequency]}</span>
          </div>
          {showMemberInfo && (
            <div className="member-info">
              <span>收件人：{order.memberName}</span>
              <span className="dot">·</span>
              <span>{order.phone}</span>
            </div>
          )}
        </div>
        <div className="order-summary">
          <span className="total-price">¥{order.totalPrice}</span>
          <span className="expand-icon">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <div className={`order-details ${expanded ? 'show' : ''}`}>
        <div className="detail-section">
          <h4>商品清单</h4>
          {order.items.map((item, idx) => (
            <div key={idx} className="order-item">
              <span className="item-name">{item.boxName} × {item.quantity}</span>
              <span className="item-price">¥{item.price * item.quantity}</span>
            </div>
          ))}
          {order.items.some((i) => i.swaps.length > 0) && (
            <div className="swap-list">
              {order.items.map((item, idx) =>
                item.swaps.map((swap, sIdx) => (
                  <div key={`${idx}-${sIdx}`} className="swap-item">
                    <span className="swap-label">替换：</span>
                    <span>{swap.from} → {swap.to}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="detail-section">
          <h4>配送信息</h4>
          <p>配送地址：{order.address}</p>
          <p>联系电话：{order.phone}</p>
          {order.note && <p>备注：{order.note}</p>}
        </div>

        <div className="detail-footer">
          <span>下单时间：{dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')}</span>
          {canCancel && onCancel && (
            <button
              className="btn btn-outline btn-sm cancel-btn"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(order.id);
              }}
            >
              取消订单
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
