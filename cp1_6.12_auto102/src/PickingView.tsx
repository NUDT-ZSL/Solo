import React, { useCallback, useRef, useEffect } from 'react';
import type { Order, OrderItem } from './api';
import { batchUpdateItems } from './api';

type PickingViewProps = {
  orders: Order[];
  onPickedChange: () => void;
};

type PendingUpdate = {
  id: number;
  picked: boolean;
};

const PickingView: React.FC<PickingViewProps> = ({ orders, onPickedChange }) => {
  const pendingRef = useRef<PendingUpdate[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const batch = pendingRef.current.slice();
    pendingRef.current = [];
    if (batch.length === 0) return;
    try {
      await batchUpdateItems(batch);
      onPickedChange();
    } catch (err) {
      console.error('批量更新分拣状态失败:', err);
    }
  }, [onPickedChange]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(flush, 300);
  }, [flush]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCheck = useCallback(
    (itemId: number, picked: boolean) => {
      pendingRef.current.push({ id: itemId, picked });
      scheduleFlush();
    },
    [scheduleFlush]
  );

  return (
    <div className="picking-view">
      {orders.length === 0 ? (
        <p className="picking-empty">暂无包裹数据</p>
      ) : (
        orders.map((order) => {
          const pickedCount = order.items.filter(
            (it) => it.picked_qty >= it.qty
          ).length;
          const totalItems = order.items.length;
          const allDone = totalItems > 0 && pickedCount >= totalItems;
          return (
            <div
              key={order.order_id}
              className={`package-card ${allDone ? 'package-card-complete' : ''}`}
            >
              <div className="package-card-header">
                <div className="package-card-info">
                  <span className="package-order-id">{order.order_id}</span>
                  <span className="package-customer">{order.customer_name}</span>
                </div>
                <div className="package-card-count">
                  <span className="count-label">本包裹完成数</span>
                  <span className={`count-value ${allDone ? 'count-done' : ''}`}>
                    {pickedCount}/{totalItems}
                  </span>
                </div>
              </div>
              <ul className="package-items">
                {order.items.map((item: OrderItem) => {
                  const itemDone = item.picked_qty >= item.qty;
                  return (
                    <li
                      key={item.id}
                      className={`package-item ${itemDone ? 'package-item-done' : ''}`}
                    >
                      <label className="custom-checkbox-wrapper">
                        <input
                          type="checkbox"
                          className="custom-checkbox-input"
                          checked={itemDone}
                          onChange={() => handleCheck(item.id, !itemDone)}
                        />
                        <span className={`custom-checkbox-visual ${itemDone ? 'checked' : ''}`}>
                          {itemDone && <span className="checkbox-tick">✓</span>}
                        </span>
                      </label>
                      <span className="package-item-name">{item.item_name}</span>
                      <span className="package-item-qty">×{item.qty}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
};

export default PickingView;
