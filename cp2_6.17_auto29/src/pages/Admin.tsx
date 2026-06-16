import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import OrderCard from '../components/OrderCard';
import { OrderCardSkeleton } from '../components/Skeleton';
import { ordersAPI, boxesAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import type { Order, Box, Veggie } from '../types';
import './Admin.css';

const Admin: React.FC = () => {
  const { member, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'boxes'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [showBoxModal, setShowBoxModal] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.getAll({ date: selectedDate });
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoxes = async () => {
    setLoading(true);
    try {
      const res = await boxesAPI.getAll(false);
      setBoxes(res.data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (member?.isAdmin) {
      if (activeTab === 'orders') {
        fetchOrders();
      } else {
        fetchBoxes();
      }
    }
  }, [member, activeTab, selectedDate]);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleBatchDeliver = async () => {
    if (selectedOrders.length === 0) return;
    if (!window.confirm(`确定将 ${selectedOrders.length} 个订单标记为配送中吗？`)) return;
    try {
      await ordersAPI.batchUpdateStatus(selectedOrders, 'delivering');
      setSelectedOrders([]);
      fetchOrders();
    } catch (error) {
      console.error('Failed to batch update:', error);
      alert('批量操作失败');
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await ordersAPI.updateStatus(orderId, 'delivered');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddBox = () => {
    const newBox: Box = {
      id: '',
      name: '',
      size: 'small',
      price: 0,
      description: '',
      veggies: [],
      swapOptions: [],
      isActive: true,
      sortOrder: boxes.length + 1,
    };
    setEditingBox(newBox);
    setShowBoxModal(true);
  };

  const handleEditBox = (box: Box) => {
    setEditingBox({ ...box });
    setShowBoxModal(true);
  };

  const handleSaveBox = async () => {
    if (!editingBox) return;
    try {
      if (editingBox.id) {
        await boxesAPI.update(editingBox.id, editingBox);
      } else {
        const { id, sortOrder, isActive, ...boxData } = editingBox;
        await boxesAPI.create(boxData as Omit<Box, 'id' | 'sortOrder' | 'isActive'>);
      }
      setShowBoxModal(false);
      setEditingBox(null);
      fetchBoxes();
    } catch (error) {
      console.error('Failed to save box:', error);
      alert('保存失败');
    }
  };

  const handleDeleteBox = async (boxId: string) => {
    if (!window.confirm('确定要下架这个蔬菜箱吗？')) return;
    try {
      await boxesAPI.remove(boxId);
      fetchBoxes();
    } catch (error) {
      console.error('Failed to delete box:', error);
      alert('下架失败');
    }
  };

  const handleAddVeggie = () => {
    if (!editingBox) return;
    const newVeggie: Veggie = {
      id: `v-${Date.now()}`,
      name: '',
      icon: '🥬',
      color: '#86efac',
    };
    setEditingBox({ ...editingBox, veggies: [...editingBox.veggies, newVeggie] });
  };

  const handleUpdateVeggie = (index: number, field: keyof Veggie, value: string) => {
    if (!editingBox) return;
    const newVeggies = [...editingBox.veggies];
    newVeggies[index] = { ...newVeggies[index], [field]: value };
    setEditingBox({ ...editingBox, veggies: newVeggies });
  };

  const handleRemoveVeggie = (index: number) => {
    if (!editingBox) return;
    const newVeggies = editingBox.veggies.filter((_, i) => i !== index);
    setEditingBox({ ...editingBox, veggies: newVeggies });
  };

  const handleMoveVeggie = (fromIndex: number, toIndex: number) => {
    if (!editingBox) return;
    if (toIndex < 0 || toIndex >= editingBox.veggies.length) return;
    const newVeggies = [...editingBox.veggies];
    const [removed] = newVeggies.splice(fromIndex, 1);
    newVeggies.splice(toIndex, 0, removed);
    setEditingBox({ ...editingBox, veggies: newVeggies });
  };

  if (authLoading) {
    return <div className="admin-page container">加载中...</div>;
  }

  if (!member || !member.isAdmin) {
    return <Navigate to="/" />;
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed');

  return (
    <div className="admin-page container">
      <div className="page-header">
        <h1>管理后台</h1>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          订单管理
        </button>
        <button
          className={`admin-tab ${activeTab === 'boxes' ? 'active' : ''}`}
          onClick={() => setActiveTab('boxes')}
        >
          蔬菜箱管理
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="orders-section">
          <div className="section-toolbar">
            <div className="date-selector">
              <label>配送日期：</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="batch-actions">
              <span className="selected-count">
                已选择 {selectedOrders.length} 项
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleBatchDeliver}
                disabled={selectedOrders.length === 0}
              >
                批量标记配送中
              </button>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-value">{orders.length}</span>
              <span className="stat-label">今日总订单</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{pendingOrders.length}</span>
              <span className="stat-label">待配送</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {orders.filter((o) => o.status === 'delivering').length}
              </span>
              <span className="stat-label">配送中</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {orders.filter((o) => o.status === 'delivered').length}
              </span>
              <span className="stat-label">已送达</span>
            </div>
          </div>

          <div className="orders-list">
            {loading
              ? [...Array(3)].map((_, i) => <OrderCardSkeleton key={i} />)
              : orders.length > 0
              ? orders.map((order) => (
                  <div key={order.id} className="admin-order-item">
                    <div className="order-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        disabled={order.status === 'delivered' || order.status === 'cancelled'}
                      />
                    </div>
                    <div className="order-card-wrapper">
                      <OrderCard order={order} showMemberInfo />
                    </div>
                    <div className="order-actions">
                      {order.status === 'delivering' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleMarkDelivered(order.id)}
                        >
                          标记送达
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => ordersAPI.updateStatus(order.id, 'delivering').then(fetchOrders)}
                        >
                          开始配送
                        </button>
                      )}
                    </div>
                  </div>
                ))
              : <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <p>该日期暂无订单</p>
                </div>
              }
          </div>
        </div>
      ) : (
        <div className="boxes-section">
          <div className="section-toolbar">
            <h2>蔬菜箱列表</h2>
            <button className="btn btn-primary" onClick={handleAddBox}>
              + 新增蔬菜箱
            </button>
          </div>

          <div className="boxes-admin-list">
            {loading
              ? [...Array(3)].map((_, i) => (
                  <div key={i} className="box-admin-card skeleton-box">
                    <div className="skeleton" style={{ width: 60, height: 20 }} />
                    <div className="skeleton" style={{ width: 100, height: 24, margin: '8px 0' }} />
                    <div className="skeleton" style={{ width: '100%', height: 40 }} />
                  </div>
                ))
              : boxes.map((box) => (
                  <div key={box.id} className={`box-admin-card ${!box.isActive ? 'inactive' : ''}`}>
                    <div className="box-admin-header">
                      <div>
                        <span className="size-badge">
                          {box.size === 'small' ? '小箱' : box.size === 'medium' ? '中箱' : '大箱'}
                        </span>
                        <h3>{box.name}</h3>
                        <span className="price">¥{box.price}/箱</span>
                      </div>
                      <div className="box-admin-actions">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleEditBox(box)}
                        >
                          编辑
                        </button>
                        {box.isActive && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteBox(box.id)}
                          >
                            下架
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="box-veggies-preview">
                      {box.veggies.map((v) => (
                        <span
                          key={v.id}
                          className="veggie-chip"
                          style={{ backgroundColor: v.color }}
                          title={v.name}
                        >
                          {v.icon}
                        </span>
                      ))}
                    </div>
                    <p className="box-desc">{box.description}</p>
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {showBoxModal && editingBox && (
        <div className="modal-overlay" onClick={() => setShowBoxModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBox.id ? '编辑蔬菜箱' : '新增蔬菜箱'}</h2>
              <button className="close-btn" onClick={() => setShowBoxModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>名称</label>
                  <input
                    type="text"
                    value={editingBox.name}
                    onChange={(e) =>
                      setEditingBox({ ...editingBox, name: e.target.value })
                    }
                    placeholder="蔬菜箱名称"
                  />
                </div>
                <div className="form-group">
                  <label>规格</label>
                  <select
                    value={editingBox.size}
                    onChange={(e) =>
                      setEditingBox({
                        ...editingBox,
                        size: e.target.value as 'small' | 'medium' | 'large',
                      })
                    }
                  >
                    <option value="small">小箱</option>
                    <option value="medium">中箱</option>
                    <option value="large">大箱</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>价格（元）</label>
                  <input
                    type="number"
                    value={editingBox.price}
                    onChange={(e) =>
                      setEditingBox({ ...editingBox, price: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea
                  value={editingBox.description}
                  onChange={(e) =>
                    setEditingBox({ ...editingBox, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="form-group">
                <div className="field-header">
                  <label>蔬菜清单（拖拽排序）</label>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleAddVeggie}
                  >
                    + 添加
                  </button>
                </div>
                <div className="veggie-editor-list">
                  {editingBox.veggies.map((veggie, idx) => (
                    <div key={veggie.id} className="veggie-editor-item">
                      <div className="drag-handle">⋮⋮</div>
                      <input
                        type="text"
                        className="veggie-icon-input"
                        value={veggie.icon}
                        onChange={(e) => handleUpdateVeggie(idx, 'icon', e.target.value)}
                        maxLength={2}
                      />
                      <input
                        type="text"
                        className="veggie-name-input"
                        value={veggie.name}
                        onChange={(e) => handleUpdateVeggie(idx, 'name', e.target.value)}
                        placeholder="蔬菜名称"
                      />
                      <input
                        type="color"
                        className="veggie-color-input"
                        value={veggie.color}
                        onChange={(e) => handleUpdateVeggie(idx, 'color', e.target.value)}
                      />
                      <div className="move-buttons">
                        <button
                          type="button"
                          onClick={() => handleMoveVeggie(idx, idx - 1)}
                          disabled={idx === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveVeggie(idx, idx + 1)}
                          disabled={idx === editingBox.veggies.length - 1}
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => handleRemoveVeggie(idx)}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setShowBoxModal(false)}
              >
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSaveBox}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
