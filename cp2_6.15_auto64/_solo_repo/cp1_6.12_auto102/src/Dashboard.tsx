import React from 'react';
import type { Stats } from './api';

type DashboardProps = {
  stats: Stats | null;
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateGradient(name: string): string {
  const hue = hashString(name) % 360;
  const sat = 60 + (hashString(name + 'sat') % 20);
  return `linear-gradient(90deg, hsl(${hue}, ${sat}%, 45%), hsl(${(hue + 30) % 360}, ${sat}%, 60%))`;
}

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  if (!stats) {
    return <div className="dashboard"><p className="dashboard-empty">暂无统计数据</p></div>;
  }

  const { totalOrders, completedOrders, pendingOrders, itemStats } = stats;

  return (
    <div className="dashboard">
      <div className="dashboard-stats">
        <div className="stat-card stat-total">
          <span className="stat-number">{totalOrders}</span>
          <span className="stat-label">总订单数</span>
        </div>
        <div className="stat-card stat-completed">
          <span className="stat-number">{completedOrders}</span>
          <span className="stat-label">已完成分拣</span>
        </div>
        <div className="stat-card stat-pending">
          <span className="stat-number">{pendingOrders}</span>
          <span className="stat-label">未完成分拣</span>
        </div>
      </div>

      <div className="dashboard-progress-section">
        <h3 className="progress-title">商品分拣进度</h3>
        {itemStats.length === 0 ? (
          <p className="progress-empty">暂无商品数据</p>
        ) : (
          <ul className="progress-list">
            {itemStats.map((item) => {
              const pct = item.total_qty > 0 ? (item.picked_qty / item.total_qty) * 100 : 0;
              const isComplete = pct >= 100;
              const gradient = isComplete
                ? 'linear-gradient(90deg, #38A169, #68D391)'
                : generateGradient(item.item_name);
              return (
                <li key={item.item_name} className="progress-item">
                  <div className="progress-item-header">
                    <span className="progress-item-name">{item.item_name}</span>
                    <span className="progress-item-qty">
                      <span className="qty-picked">{item.picked_qty}</span>
                      <span className="qty-sep">/</span>
                      <span className="qty-total">{item.total_qty}</span>
                    </span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: gradient,
                      }}
                    />
                    {isComplete && <span className="progress-check">✓</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
