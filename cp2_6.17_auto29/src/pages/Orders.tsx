import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import OrderCard from '../components/OrderCard';
import { OrderCardSkeleton } from '../components/Skeleton';
import { ordersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types';
import './Orders.css';

const Orders: React.FC = () => {
  const { member, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchOrders = async () => {
    if (!member) return;
    setLoading(true);
    try {
      const res = await ordersAPI.getAll({ memberId: member.id });
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (member) {
      fetchOrders();
    }
  }, [member]);

  const handleCancel = async (orderId: string) => {
    if (!window.confirm('确定要取消这个订单吗？')) return;
    try {
      await ordersAPI.cancel(orderId);
      fetchOrders();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert('取消订单失败');
    }
  };

  if (authLoading) {
    return <div className="orders-page container">加载中...</div>;
  }

  if (!member) {
    return <Navigate to="/login" />;
  }

  const filteredOrders =
    filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const statusFilters = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待确认' },
    { value: 'confirmed', label: '已确认' },
    { value: 'delivering', label: '配送中' },
    { value: 'delivered', label: '已送达' },
    { value: 'cancelled', label: '已取消' },
  ];

  return (
    <div className="orders-page container">
      <div className="page-header">
        <h1>我的订单</h1>
        <p>共 {orders.length} 个订单</p>
      </div>

      <div className="filter-tabs">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            className={`filter-tab ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="orders-list">
        {loading
          ? [...Array(3)].map((_, i) => <OrderCardSkeleton key={i} />)
          : filteredOrders.length > 0
          ? filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} onCancel={handleCancel} />
            ))
          : <div className="empty-state">
              <span className="empty-icon">📦</span>
              <p>暂无订单</p>
            </div>
          }
      </div>
    </div>
  );
};

export default Orders;
