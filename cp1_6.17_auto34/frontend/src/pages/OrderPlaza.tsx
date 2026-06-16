import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GroupOrder, SpecialDrink, User, HiddenMenu } from '../types';
import { fetchSpecials, fetchOrders, createOrder, joinOrder } from '../api';
import {
  validateCreateOrder,
  validateJoinOrder,
  incrementOrderCount,
  getOrderCount,
  formatCountdown,
  hasActiveUserOrder
} from '../logic/orderLogic';
import { checkUnlock } from '../logic/unlockLogic';
import CreateOrderModal from '../components/CreateOrderModal';
import HiddenMenuModal from '../components/HiddenMenuModal';
import './OrderPlaza.css';

interface OrderPlazaProps {
  user: User;
  showToast: (msg: string) => void;
  onHiddenMenuUnlock: (menu: HiddenMenu) => void;
}

const OrderPlaza: React.FC<OrderPlazaProps> = ({ user, showToast, onHiddenMenuUnlock }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [specials, setSpecials] = useState<SpecialDrink[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [unlockedMenu, setUnlockedMenu] = useState<HiddenMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [timeoutOrderIds, setTimeoutOrderIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const [o, s] = await Promise.all([fetchOrders(), fetchSpecials()]);
      setOrders(o);
      setSpecials(s);
    } catch {
      showToast('加载失败');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      setOrders((prev) => {
        const remaining: GroupOrder[] = [];
        const expired: string[] = [];
        for (const o of prev) {
          if (o.status === 'active' && o.deadline <= Date.now()) {
            expired.push(o.id);
          } else {
            remaining.push(o);
          }
        }
        if (expired.length > 0) {
          setTimeoutOrderIds((s) => {
            const next = new Set(s);
            expired.forEach((id) => next.add(id));
            return next;
          });
          setTimeout(() => {
            setTimeoutOrderIds((s) => {
              const next = new Set(s);
              expired.forEach((id) => next.delete(id));
              return next;
            });
            loadData();
          }, 500);
        }
        return remaining;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleCheckUnlock = (count: number) => {
    const unlocked = checkUnlock(user.id, count);
    if (unlocked) {
      setUnlockedMenu(unlocked);
      onHiddenMenuUnlock(unlocked);
    }
  };

  const handleCreate = async (data: { targetDrinkId: string; targetDrinkName: string; duration: number; tableNumber: number }) => {
    const validation = validateCreateOrder(user.id, data.duration, data.tableNumber, orders);
    if (!validation.valid) {
      showToast(validation.error || '发起失败');
      return;
    }
    if (hasActiveUserOrder(user.id, orders)) {
      showToast('您已有进行中的拼单');
      return;
    }
    try {
      const newOrder = await createOrder(data);
      setOrders((prev) => [newOrder, ...prev]);
      setShowCreate(false);
      showToast('拼单已发起！');
      const count = incrementOrderCount(user.id);
      handleCheckUnlock(count);
    } catch (err: any) {
      const msg = err.response?.data?.error || '发起失败';
      showToast(msg);
    }
  };

  const handleJoin = async (order: GroupOrder) => {
    const validation = validateJoinOrder(user.id, order);
    if (!validation.valid) {
      showToast(validation.error || '加入失败');
      return;
    }
    try {
      const drinkId = order.targetDrinkId;
      const drinkName = order.targetDrinkName;
      const updated = await joinOrder(order.id, drinkId, drinkName);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      if (updated.status === 'completed') {
        showToast('拼单成功！已通知所有参与者 🎉');
      } else {
        showToast('已加入拼单！');
      }
      const count = incrementOrderCount(user.id);
      handleCheckUnlock(count);
    } catch (err: any) {
      const msg = err.response?.data?.error || '加入失败';
      showToast(msg);
    }
  };

  const userHasActive = hasActiveUserOrder(user.id, orders);
  const totalCount = getOrderCount(user.id);

  return (
    <div className="page-container">
      <div className="page-content">
        <div className="plaza-header">
          <div>
            <h1 className="page-title">拼单广场</h1>
            <p className="plaza-subtitle">找个人一起分享一杯好咖啡</p>
          </div>
          <button
            className="btn-accent"
            onClick={() => {
              if (userHasActive) {
                showToast('您已有进行中的拼单');
                return;
              }
              setShowCreate(true);
            }}
            disabled={userHasActive}
          >
            + 发起拼单
          </button>
        </div>

        <div className="plaza-stats">
          <span>已完成拼单：<strong>{totalCount}</strong> 次</span>
          <span>当前进行中：<strong>{orders.length}</strong> 个</span>
        </div>

        {loading ? (
          <div className="loading-state">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">☕</div>
            <p className="empty-text">暂无进行中的拼单</p>
            <p className="empty-hint">点击右上角发起一个吧！</p>
          </div>
        ) : (
          <div className="order-list">
            {orders.map((order, idx) => {
              const isTimeout = timeoutOrderIds.has(order.id);
              const isFull = order.participants.length >= order.maxParticipants;
              const isJoined = order.participants.some((p) => p.userId === user.id);
              const countdown = formatCountdown(order.deadline);
              return (
                <div
                  key={order.id}
                  className={`order-card ${isTimeout ? 'timeout' : ''}`}
                  style={{
                    animationDelay: `${idx * 0.05}s`,
                    backgroundColor: idx % 2 === 0 ? '#FFF8E1' : '#FFFDE7'
                  }}
                >
                  <div className="order-card-header">
                    <div className="order-initiator">
                      <div className="order-avatar">{order.initiatorName.charAt(0)}</div>
                      <div>
                        <div className="order-initiator-name">{order.initiatorName}</div>
                        <div className="order-target">目标：{order.targetDrinkName}</div>
                      </div>
                    </div>
                    <div className="order-countdown">{countdown}</div>
                  </div>
                  <div className="order-card-body">
                    <div className="order-info-row">
                      <span className="order-info-label">参与人数</span>
                      <span className="order-info-value">
                        {order.participants.length} / {order.maxParticipants} 人
                      </span>
                    </div>
                    <div className="order-info-row">
                      <span className="order-info-label">碰头桌号</span>
                      <span className="order-info-value highlight">#{order.tableNumber}</span>
                    </div>
                    <div className="order-participants">
                      {order.participants.map((p, i) => (
                        <span key={i} className="participant-tag">{p.userName}</span>
                      ))}
                    </div>
                  </div>
                  <div className="order-card-footer">
                    {isJoined ? (
                      <span className="order-status joined">✓ 已加入</span>
                    ) : isFull ? (
                      <span className="order-status full">已满员</span>
                    ) : (
                      <button className="btn-outline" onClick={() => handleJoin(order)}>
                        加入拼单
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <CreateOrderModal
          open={showCreate}
          specials={specials}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />

        <HiddenMenuModal
          menu={unlockedMenu}
          user={user}
          onClose={() => setUnlockedMenu(null)}
          onShared={() => {}}
          showToast={showToast}
        />
      </div>
    </div>
  );
};

export default OrderPlaza;
