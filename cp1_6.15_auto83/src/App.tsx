import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  addOrder,
  updateOrder,
  deleteOrder,
  getOrders,
  setRating,
  getRating,
  getRecommendation,
  generateMockOrders,
  type Order,
  type Recommendation,
} from './business';

interface FlowerType {
  id: number;
  name: string;
  color: string;
  tag: string;
}

const FLOWER_COLORS: Record<string, string> = {
  '玫瑰': '#E74C3C',
  '百合': '#F5F5DC',
  '郁金香': '#FF69B4',
  '混搭': '#9B59B6',
  '向日葵': '#F1C40F',
  '康乃馨': '#E91E63',
};

const initialForm = {
  customerName: '',
  phone: '',
  flowerType: '玫瑰',
  quantity: 1,
  address: '',
  note: '',
};

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [flowers, setFlowers] = useState<FlowerType[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [flashField, setFlashField] = useState(false);
  const [recVisible, setRecVisible] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/flowers')
      .then(r => r.json())
      .then((data: FlowerType[]) => setFlowers(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    generateMockOrders(50);
    setOrders(getOrders());
  }, []);

  const refreshOrders = useCallback(() => {
    setOrders(getOrders());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim()) return;

    if (editingId) {
      updateOrder(editingId, form);
      setEditingId(null);
    } else {
      addOrder(form);
    }
    setForm(initialForm);
    refreshOrders();
  };

  const handleEdit = (order: Order) => {
    setEditingId(order.id);
    setForm({
      customerName: order.customerName,
      phone: order.phone,
      flowerType: order.flowerType,
      quantity: order.quantity,
      address: order.address,
      note: order.note,
    });
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      deleteOrder(id);
      refreshOrders();
      setDeletingId(null);
    }, 300);
  };

  const handleStarClick = (customerName: string, flowerType: string, rating: number) => {
    setRating(customerName, flowerType, rating);
    refreshOrders();
    if (selectedCustomer === customerName) {
      const recs = getRecommendation(customerName);
      setRecommendations(recs);
      setRecVisible(false);
      setTimeout(() => setRecVisible(true), 50);
    }
  };

  const handleCustomerClick = (customerName: string) => {
    setSelectedCustomer(customerName);
    const recs = getRecommendation(customerName);
    setRecommendations(recs);
    setRecVisible(false);
    setTimeout(() => setRecVisible(true), 50);
  };

  const handleAddToOrder = (flowerType: string) => {
    setForm(prev => ({ ...prev, flowerType }));
    setFlashField(true);
    setTimeout(() => setFlashField(false), 200);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getStarRating = (customerName: string, flowerType: string): number => {
    const ratings = getRating(customerName, flowerType);
    if (ratings.length === 0) return 0;
    return Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>🌸 花店订单管理</h1>
      </header>

      <div className="main-layout" style={styles.mainLayout}>
        <div ref={formRef} className="sidebar" style={styles.sidebar}>
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>{editingId ? '编辑订单' : '新建订单'}</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>
                客户姓名
                <input
                  style={styles.input}
                  value={form.customerName}
                  onChange={e => setForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="请输入客户姓名"
                />
              </label>
              <label style={styles.label}>
                联系电话
                <input
                  style={styles.input}
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="请输入联系电话"
                />
              </label>
              <label style={styles.label}>
                花束类型
                <select
                  style={{
                    ...styles.input,
                    backgroundColor: flashField ? '#FFF3CD' : '#FFFAF0',
                    transition: 'background-color 0.2s',
                  }}
                  value={form.flowerType}
                  onChange={e => setForm(prev => ({ ...prev, flowerType: e.target.value }))}
                >
                  {(flowers.length > 0 ? flowers : Object.keys(FLOWER_COLORS).map((name, i) => ({ id: i + 1, name, color: FLOWER_COLORS[name], tag: name }))).map(f => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                数量
                <input
                  style={styles.input}
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={e => setForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </label>
              <label style={styles.label}>
                配送地址
                <input
                  style={styles.input}
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="请输入配送地址"
                />
              </label>
              <label style={styles.label}>
                备注
                <textarea
                  style={{ ...styles.input, minHeight: 60, resize: 'vertical' }}
                  value={form.note}
                  onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="备注信息"
                />
              </label>
              <div style={styles.formButtons}>
                <button type="submit" style={styles.submitBtn}>
                  {editingId ? '更新订单' : '提交订单'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    style={styles.cancelBtn}
                    onClick={() => {
                      setEditingId(null);
                      setForm(initialForm);
                    }}
                  >
                    取消
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div style={styles.content}>
          <div className="card-grid" style={styles.cardGrid}>
            {orders.map(order => {
              const currentRating = getStarRating(order.customerName, order.flowerType);
              const isDeleting = deletingId === order.id;
              const tagColor = FLOWER_COLORS[order.flowerType] || '#999';

              return (
                <div
                  key={order.id}
                  style={{
                    ...styles.card,
                    transform: isDeleting ? 'translateX(120%)' : 'translateX(0)',
                    opacity: isDeleting ? 0 : 1,
                    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out, box-shadow 0.3s, margin-top 0.3s',
                  }}
                  onMouseEnter={e => {
                    if (!isDeleting) {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 16px rgba(210,105,30,0.45)';
                      (e.currentTarget as HTMLDivElement).style.marginTop = '-2px';
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(210,105,30,0.2)';
                    (e.currentTarget as HTMLDivElement).style.marginTop = '0';
                  }}
                >
                  <div style={styles.cardOrderId}>
                    {order.id}
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>客户：</span>
                      <span
                        style={styles.customerName}
                        onClick={() => handleCustomerClick(order.customerName)}
                      >
                        {order.customerName}
                      </span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>电话：</span>
                      <span>{order.phone}</span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>花束：</span>
                      <span style={{ ...styles.flowerTag, backgroundColor: tagColor, color: tagColor === '#F5F5DC' || tagColor === '#F1C40F' ? '#333' : '#fff' }}>
                        {order.flowerType}
                      </span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>数量：</span>
                      <span>{order.quantity}</span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>地址：</span>
                      <span style={styles.cardAddr}>{order.address}</span>
                    </div>
                    {order.note && (
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>备注：</span>
                        <span>{order.note}</span>
                      </div>
                    )}

                    <div style={styles.starsRow}>
                      <span style={styles.cardLabel}>偏好：</span>
                      {[1, 2, 3, 4, 5].map(star => (
                        <span
                          key={star}
                          style={{
                            ...styles.star,
                            color: star <= currentRating ? '#FFD700' : '#D2B48C',
                            animation: star <= currentRating ? 'starBounce 0.2s ease-out' : 'none',
                          }}
                          onClick={() => handleStarClick(order.customerName, order.flowerType, star)}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    <button style={styles.editBtn} onClick={() => handleEdit(order)}>编辑</button>
                    <button style={styles.deleteBtn} onClick={() => handleDelete(order.id)}>删除</button>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedCustomer && (
            <div style={styles.recommendationSection}>
              <h3 style={styles.recTitle}>
                🎯 {selectedCustomer} 的个性化推荐
              </h3>
              <div style={styles.recGrid}>
                {recommendations.length === 0 && (
                  <p style={styles.noRec}>暂无足够偏好数据，请先为该客户评分</p>
                )}
                {recommendations.map((rec, i) => {
                  const tagColor = FLOWER_COLORS[rec.flowerType] || '#999';
                  return (
                    <div
                      key={rec.flowerType}
                      style={{
                        ...styles.recCard,
                        opacity: recVisible ? 1 : 0,
                        transform: recVisible ? 'translateY(0)' : 'translateY(30px)',
                        transition: `opacity 0.4s ease-out ${i * 0.1}s, transform 0.4s ease-out ${i * 0.1}s`,
                      }}
                    >
                      <span style={{ ...styles.flowerTag, backgroundColor: tagColor, color: tagColor === '#F5F5DC' || tagColor === '#F1C40F' ? '#333' : '#fff', fontSize: 16, padding: '6px 16px' }}>
                        {rec.flowerType}
                      </span>
                      <div style={styles.recStars}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <span
                            key={s}
                            style={{
                              color: s <= Math.round(rec.averageScore) ? '#FFD700' : '#D2B48C',
                              fontSize: 18,
                            }}
                          >
                            ★
                          </span>
                        ))}
                        <span style={styles.recScore}>{rec.averageScore}</span>
                      </div>
                      <button style={styles.addOrderBtn} onClick={() => handleAddToOrder(rec.flowerType)}>
                        加入订单
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes starBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        @media (max-width: 768px) {
          .main-layout {
            flex-direction: column !important;
          }
          .sidebar {
            width: 100% !important;
            min-width: unset !important;
            max-width: unset !important;
          }
          .card-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar {
            width: 40% !important;
            min-width: unset !important;
            max-width: unset !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: '#FFF8DC',
    minHeight: '100vh',
    color: '#3E2723',
  },
  header: {
    backgroundColor: '#A0522D',
    color: '#fff',
    padding: '16px 24px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
  },
  mainLayout: {
    display: 'flex',
    gap: 20,
    padding: 20,
    maxWidth: 1400,
    margin: '0 auto',
  },
  sidebar: {
    width: 300,
    minWidth: 300,
    maxWidth: 300,
    flexShrink: 0,
  },
  formCard: {
    backgroundColor: '#FFFAF0',
    borderRadius: 8,
    padding: 20,
    boxShadow: '0 2px 8px rgba(210,105,30,0.2)',
    position: 'sticky' as const,
    top: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#8B4513',
    marginBottom: 16,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    fontSize: 13,
    fontWeight: 500,
    color: '#5D4037',
    gap: 4,
  },
  input: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #D2B48C',
    fontSize: 14,
    backgroundColor: '#FFFAF0',
    color: '#3E2723',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  formButtons: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  submitBtn: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#A0522D',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  cancelBtn: {
    padding: '10px 16px',
    borderRadius: 6,
    border: '1px solid #A0522D',
    backgroundColor: '#FFFAF0',
    color: '#A0522D',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFAF0',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(210,105,30,0.2)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const,
  },
  cardOrderId: {
    backgroundColor: '#A0522D',
    color: '#fff',
    padding: '8px 12px',
    fontSize: 14,
    fontWeight: 700,
  },
  cardBody: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    flex: 1,
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    lineHeight: 1.5,
  },
  cardLabel: {
    color: '#8B4513',
    fontWeight: 600,
    marginRight: 4,
    whiteSpace: 'nowrap' as const,
  },
  customerName: {
    color: '#DAA520',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  cardAddr: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  flowerTag: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  starsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
    paddingTop: 4,
    borderTop: '1px solid #F5DEB3',
  },
  star: {
    fontSize: 20,
    cursor: 'pointer',
    transition: 'color 0.15s',
    userSelect: 'none' as const,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    padding: '8px 12px',
    borderTop: '1px solid #F5DEB3',
    justifyContent: 'flex-end',
  },
  editBtn: {
    padding: '4px 14px',
    borderRadius: 4,
    border: '1px solid #8B4513',
    backgroundColor: '#FFFAF0',
    color: '#8B4513',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  deleteBtn: {
    padding: '4px 14px',
    borderRadius: 4,
    border: '1px solid #C0392B',
    backgroundColor: '#FFFAF0',
    color: '#C0392B',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  recommendationSection: {
    marginTop: 28,
    padding: 20,
    backgroundColor: '#FFFAF0',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(210,105,30,0.2)',
  },
  recTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#8B4513',
    marginBottom: 16,
  },
  recGrid: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap' as const,
  },
  noRec: {
    color: '#8B4513',
    fontSize: 14,
    fontStyle: 'italic',
  },
  recCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
    border: '1px solid #F5DEB3',
    minWidth: 160,
  },
  recStars: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  recScore: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: 600,
    color: '#8B4513',
  },
  addOrderBtn: {
    padding: '6px 16px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#DAA520',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
