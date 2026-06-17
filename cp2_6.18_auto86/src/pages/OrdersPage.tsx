import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import OrderCard from '../components/OrderCard';
import DateSelector, { DateRange } from '../components/DateSelector';
import { fetchOrders, createOrder, Order, OrderItem } from '../api';

interface OrdersPageProps {
  showPendingOnly?: boolean;
}

interface NewOrderForm {
  customerName: string;
  phone: string;
  items: OrderItem[];
}

export default function OrdersPage({ showPendingOnly = false }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [form, setForm] = useState<NewOrderForm>({
    customerName: '',
    phone: '',
    items: [{ name: '', quantity: 1 }],
  });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (error) {
      console.error('加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleDateChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (showPendingOnly) {
      result = result.filter((o) => o.status !== 'completed');
    }

    if (dateRange) {
      result = result.filter((o) => {
        const orderDate = dayjs(o.createdAt).format('YYYY-MM-DD');
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
      });
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, dateRange, showPendingOnly]);

  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1 }],
    }));
  };

  const removeItemRow = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (idx: number, field: keyof OrderItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSubmit = async () => {
    const validItems = form.items.filter((i) => i.name.trim() && i.quantity > 0);
    if (!form.customerName.trim() || !form.phone.trim() || validItems.length === 0) {
      alert('请填写完整的顾客信息和至少一项商品');
      return;
    }

    const orderNo = 'BK' + dayjs().format('YYYYMMDDHHmmss');

    try {
      await createOrder({
        orderNo,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        items: validItems,
        status: 'new',
      });
      setForm({
        customerName: '',
        phone: '',
        items: [{ name: '', quantity: 1 }],
      });
      setShowModal(false);
      loadOrders();
    } catch (error) {
      console.error('创建订单失败:', error);
      alert('创建订单失败');
    }
  };

  if (loading) {
    return <div className="empty-state"><div className="empty-icon">⏳</div><div className="empty-text">加载中...</div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          {showPendingOnly ? '📋 待处理订单' : '📝 订单管理'}
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <DateSelector onChange={handleDateChange} />
          <button className="btn btn-warn" onClick={() => setShowModal(true)}>
            + 新建订单
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🥖</div>
          <div className="empty-text">暂无订单数据</div>
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} onStatusUpdate={loadOrders} />
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <h3 className="modal-title">新建订单</h3>

            <div className="form-row">
              <div className="form-group">
                <label>顾客姓名</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                  placeholder="请输入姓名"
                />
              </div>
              <div className="form-group">
                <label>联系电话</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="请输入电话"
                />
              </div>
            </div>

            <div className="form-group">
              <label>商品清单</label>
              <div className="dynamic-list">
                {form.items.map((item, idx) => (
                  <div key={idx} className="dynamic-item">
                    <input
                      type="text"
                      className="name-input"
                      placeholder="商品名称"
                      value={item.name}
                      onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    />
                    <input
                      type="number"
                      className="qty-input"
                      placeholder="数量"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                    />
                    <button className="remove-btn" onClick={() => removeItemRow(idx)} disabled={form.items.length === 1}>
                      ×
                    </button>
                  </div>
                ))}
                <button className="add-btn" onClick={addItemRow}>+ 添加商品</button>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-warn" onClick={handleSubmit}>创建订单</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
