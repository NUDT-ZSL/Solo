import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { fetchOrders, createOrder, type Order, type OrderItem } from '../api';
import OrderCard from '../components/OrderCard';
import DateSelector from '../components/DateSelector';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ name: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      console.error('加载订单失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (dateRange) {
      const d = dayjs(o.createdAt).format('YYYY-MM-DD');
      if (d < dateRange.start || d > dateRange.end) return false;
    }
    return true;
  });

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'name' | 'quantity', value: string | number) => {
    const next = [...items];
    (next[index] as Record<string, string | number>)[field] = value;
    setItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.name.trim() && it.quantity > 0);
    if (!customerName.trim()) {
      alert('请输入顾客姓名');
      return;
    }
    if (validItems.length === 0) {
      alert('请至少填写一个物品');
      return;
    }
    try {
      setSubmitting(true);
      await createOrder({
        customerName: customerName.trim(),
        phone: phone.trim(),
        items: validItems,
      });
      setCustomerName('');
      setPhone('');
      setItems([{ name: '', quantity: 1 }]);
      setShowForm(false);
      loadOrders();
    } catch (err) {
      console.error('创建订单失败:', err);
      alert('创建订单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const statusButtons = [
    { value: 'all', label: '全部', color: '#666' },
    { value: 'new', label: '新订单', color: '#7c4dff' },
    { value: 'processing', label: '制作中', color: '#1976d2' },
    { value: 'completed', label: '已完成', color: '#4caf50' },
  ];

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1 className="page-title">订单管理</h1>
        <button className="btn btn-primary btn-large" onClick={() => setShowForm(!showForm)}>
          {showForm ? '取消' : '+ 新建订单'}
        </button>
      </div>

      {showForm && (
        <form className="order-form card" onSubmit={handleSubmit}>
          <h3 className="form-title">📝 新建订单</h3>
          <div className="form-row">
            <div className="form-group">
              <label>顾客姓名 *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>
            <div className="form-group">
              <label>联系电话</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="可选"
              />
            </div>
          </div>

          <div className="form-group">
            <label>物品清单 *</label>
            <div className="items-editor">
              {items.map((item, idx) => (
                <div key={idx} className="item-row">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    placeholder="物品名称"
                    className="item-name-input"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="item-qty-input"
                  />
                  <button
                    type="button"
                    className="btn-remove-item"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="btn-add-item" onClick={handleAddItem}>
                + 添加物品
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '提交中...' : '确认下单'}
            </button>
          </div>
        </form>
      )}

      <div className="filters card">
        <div className="filter-row">
          <span className="filter-label">状态筛选：</span>
          {statusButtons.map((btn) => (
            <button
              key={btn.value}
              className={`status-filter-btn ${statusFilter === btn.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(btn.value)}
              style={{
                borderColor: statusFilter === btn.value ? btn.color : '#ddd',
                color: statusFilter === btn.value ? btn.color : '#666',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="filter-row mt-16">
          <span className="filter-label">日期筛选：</span>
          <DateSelector onChange={setDateRange} />
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">暂无符合条件的订单</div>
      ) : (
        <>
          <div className="count-badge">共 {filteredOrders.length} 条订单</div>
          <div className="cards-grid">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} onUpdate={loadOrders} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
