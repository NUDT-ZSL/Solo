import React, { useState, useEffect } from 'react';
import {
  Order,
  OrderStatus,
  PET_TYPE_LABELS,
  PET_TYPE_COLORS,
  SERVICE_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS
} from '../types';
import { api } from '../data/api';

const petIcons: Record<string, string> = {
  dog: '🐕',
  cat: '🐱',
  rabbit: '🐰',
  hamster: '🐹'
};

const statusEmoji: Record<OrderStatus, string> = {
  pending: '⏳',
  confirmed: '✅',
  completed: '🎉',
  cancelled: '❌'
};

const StarInput: React.FC<{
  rating: number;
  onRatingChange: (r: number) => void;
  disabled?: boolean;
}> = ({ rating, onRatingChange, disabled }) => {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => !disabled && setHover(0)}
          onClick={() => !disabled && onRatingChange(star)}
          style={{
            fontSize: '32px',
            cursor: disabled ? 'default' : 'pointer',
            color: (hover || rating) >= star ? '#FFD700' : '#D3D3D3',
            transition: 'all 0.15s ease',
            transform: !disabled && (hover || rating) >= star ? 'scale(1.1)' : 'scale(1)',
            userSelect: 'none'
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  return (
    <span
      className="status-badge-transition"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: ORDER_STATUS_COLORS[status] + '20',
        color: ORDER_STATUS_COLORS[status],
        border: `1px solid ${ORDER_STATUS_COLORS[status]}50`,
        transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: `0 0 0 0 ${ORDER_STATUS_COLORS[status]}00`
      }}
    >
      {statusEmoji[status]} {ORDER_STATUS_LABELS[status]}
    </span>
  );
};

interface ReviewModalProps {
  order: Order;
  onClose: () => void;
  onSubmitted: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ order, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(order.rating || 0);
  const [review, setReview] = useState(order.review || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!order.rating);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await api.addOrderReview(order.id, rating, review);
      setSubmitted(true);
      setTimeout(() => {
        onSubmitted();
        handleClose();
      }, 1000);
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div onClick={handleClose} style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease'
      }} />
      <div style={{
        position: 'relative',
        width: '90%', maxWidth: '480px',
        backgroundColor: '#FFFEF7',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.25s ease'
      }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#5C4A32', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {submitted ? '🎉 评价已提交' : '💬 写评价'}
        </h3>

        <div style={{
          padding: '12px 16px', borderRadius: '10px',
          backgroundColor: '#F5DEB340', border: '1px solid #DEB88760',
          marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '28px' }}>
            {petIcons[order.petType]}
          </span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#5C4A32' }}>
              {order.petName} · {order.caregiverName}
            </div>
            <div style={{ fontSize: '12px', color: '#8B7355' }}>
              {SERVICE_TYPE_LABELS[order.serviceType]} · {order.startDate} ~ {order.endDate}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', color: '#8B7355', marginBottom: '12px', fontWeight: 600 }}>
            您的评分 <span style={{ color: '#FFD700', fontSize: '12px', fontWeight: 400 }}>(点击星星评分)</span>
          </div>
          <StarInput
            rating={rating}
            onRatingChange={setRating}
            disabled={submitted || submitting}
          />
          {rating > 0 && (
            <div style={{ marginTop: '6px', fontSize: '13px', color: '#FFD700', fontWeight: 600 }}>
              {rating}.0 分
            </div>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', color: '#8B7355', marginBottom: '10px', fontWeight: 600 }}>
            文字评价 <span style={{ color: '#A08870', fontSize: '12px', fontWeight: 400 }}>(可选)</span>
          </div>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            disabled={submitted || submitting}
            rows={4}
            placeholder="分享您的寄养体验给其他宠物主人..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E8DCC8',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              color: '#5C4A32',
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#DEB887')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#E8DCC8')}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {!submitted && (
            <button
              onClick={handleClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #DEB887',
                backgroundColor: 'transparent',
                color: '#8B7355',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              取消
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitted || submitting}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: submitted ? '#A9A9A9' : '#B22222',
              color: '#FFFFFF',
              cursor: rating === 0 || submitted || submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'background-color 0.3s ease'
            }}
          >
            {submitting ? '提交中...' : submitted ? '已评价' : '提交评价'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MyBookings: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      const data = await api.getOrders({ ownerId: 'u1' });
      setOrders(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancel = async (orderId: string) => {
    if (!window.confirm('确定要取消这个预约吗？')) return;
    setCancellingId(orderId);
    try {
      await api.updateOrderStatus(orderId, 'cancelled');
      await loadOrders();
    } catch (e) {
      alert('取消失败，请重试');
    }
    setCancellingId(null);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const calcDays = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (loading) {
    return (
      <div style={{
        padding: '60px 20px', textAlign: 'center', fontSize: '16px',
        color: '#8B7355', backgroundColor: '#FFFEF7',
        borderRadius: '12px', border: '1px solid #E8DCC8'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
        加载预约中...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{
        padding: '80px 20px', textAlign: 'center',
        backgroundColor: '#FFFEF7', borderRadius: '12px',
        border: '1px solid #E8DCC8'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '16px' }}>📭</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#5C4A32' }}>暂无预约记录</h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#A08870' }}>
          快去搜索合适的寄养人，为您的爱宠安排一次温馨的寄养体验吧～
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '10px 4px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          margin: 0, fontSize: '26px', fontWeight: 700,
          color: '#8B7355', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          📋 我的预约
          <span style={{
            fontSize: '14px', fontWeight: 500, color: '#A08870',
            backgroundColor: '#F5DEB340', padding: '4px 12px',
            borderRadius: '12px'
          }}>
            共 {orders.length} 条记录
          </span>
        </h2>
      </div>

      <div style={{ position: 'relative', paddingLeft: '8px' }}>
        <div style={{
          position: 'absolute',
          left: '15px',
          top: '10px',
          bottom: '10px',
          width: '4px',
          backgroundColor: '#87CEEB',
          borderRadius: '2px',
          boxShadow: '0 0 6px rgba(135,206,235,0.5)'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((order, index) => {
            const days = calcDays(order.startDate, order.endDate);
            return (
              <div
                key={order.id}
                style={{
                  position: 'relative',
                  paddingLeft: '40px',
                  opacity: 0,
                  animation: `fadeInLeft 0.4s ease ${index * 0.08}s forwards`
                }}
              >
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '20px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: `3px solid ${PET_TYPE_COLORS[order.petType]}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 2
                }}>
                  {petIcons[order.petType]}
                </div>

                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #E8DCC8',
                  boxShadow: '0 2px 8px rgba(139, 115, 85, 0.06)',
                  transition: 'box-shadow 0.2s ease'
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 20px rgba(139, 115, 85, 0.12)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 115, 85, 0.06)')}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#A08870', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🕐 {formatDate(order.createdAt)}
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: '16px',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}
                    className="order-info-grid"
                  >
                    <div style={{
                      width: '56px', height: '56px',
                      borderRadius: '12px',
                      backgroundColor: PET_TYPE_COLORS[order.petType] + '25',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '30px',
                      flexShrink: 0
                    }}>
                      {petIcons[order.petType]}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '17px', fontWeight: 700, color: '#5C4A32',
                        marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px'
                      }}>
                        {order.petName}
                        <span style={{
                          fontSize: '12px', fontWeight: 400,
                          padding: '2px 8px', borderRadius: '8px',
                          backgroundColor: PET_TYPE_COLORS[order.petType] + '20',
                          color: PET_TYPE_COLORS[order.petType]
                        }}>
                          {PET_TYPE_LABELS[order.petType]}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#8B7355', marginBottom: '4px' }}>
                        🏡 寄养人: <span style={{ fontWeight: 600 }}>{order.caregiverName}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#A08870' }}>
                        🛎️ {SERVICE_TYPE_LABELS[order.serviceType]} · {days}天
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#228B22' }}>
                        ¥{order.totalPrice}
                      </div>
                      <div style={{ fontSize: '11px', color: '#A08870', marginTop: '2px' }}>
                        ¥{Math.round(order.totalPrice / days)}/天
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#FFF8F0',
                    border: '1px solid #F5DEB360',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ fontSize: '13px', color: '#8B7355' }}>
                      📅 {order.startDate} → {order.endDate}
                    </div>
                    <div style={{ fontSize: '13px', color: '#5C4A32', fontWeight: 600 }}>
                      共 {days} 天
                    </div>
                  </div>

                  {order.rating && (
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#FFD70015',
                      border: '1px solid #FFD70040',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#8B7355', fontWeight: 600 }}>我的评价:</span>
                        <span style={{ color: '#FFD700', fontSize: '14px', letterSpacing: '2px' }}>
                          {'★'.repeat(order.rating)}{'☆'.repeat(5 - order.rating)}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFD700' }}>
                          {order.rating}.0
                        </span>
                      </div>
                      {order.review && (
                        <div style={{ fontSize: '13px', color: '#5C4A32', lineHeight: 1.6 }}>
                          "{order.review}"
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={cancellingId === order.id}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: '1px solid #FF6347',
                          backgroundColor: '#FF634710',
                          color: '#B22222',
                          cursor: cancellingId === order.id ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          fontWeight: 500,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (cancellingId !== order.id) {
                            e.currentTarget.style.backgroundColor = '#FF634725';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF634710';
                        }}
                      >
                        {cancellingId === order.id ? '处理中...' : '取消预约'}
                      </button>
                    )}
                    {order.status === 'completed' && !order.rating && (
                      <button
                        onClick={() => setReviewOrder(order)}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#DEB887',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C8A065')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#DEB887')}
                      >
                        ✍️ 写评价
                      </button>
                    )}
                    {order.status === 'completed' && order.rating && (
                      <span style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        backgroundColor: '#F5DEB340',
                        color: '#A08870',
                        fontSize: '13px',
                        fontWeight: 500
                      }}>
                        ✓ 已评价
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSubmitted={loadOrders}
        />
      )}
    </div>
  );
};

export default MyBookings;
