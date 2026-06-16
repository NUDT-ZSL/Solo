import React, { useState, useEffect } from 'react';
import { Route } from '../data/dataStore';

interface RouteCardProps {
  route: Route;
  onClick: (routeId: string) => void;
  index?: number;
}

const RouteCard: React.FC<RouteCardProps> = ({ route, onClick }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const transportPct = (route.budget.transport / route.totalBudget) * 100;
  const accommodationPct = (route.budget.accommodation / route.totalBudget) * 100;
  const foodPct = (route.budget.food / route.totalBudget) * 100;
  const otherPct = (route.budget.other / route.totalBudget) * 100;

  return (
    <div className="route-card" onClick={() => onClick(route.id)}>
      <div className="route-card-left">
        <div className="route-city">{route.city}</div>
        <div className="route-meta">
          <span className="route-days">🗓️ {route.days} 天</span>
          <span className="route-budget">💰 ¥{route.totalBudget.toLocaleString()}</span>
        </div>
        <div className="route-tags">
          {route.dailyPlans.slice(0, 3).map((p, i) => (
            <span key={i} className="route-tag">
              {p.spots[0]}
            </span>
          ))}
        </div>
      </div>
      <div className="route-card-right">
        <div className="budget-label">预算分项</div>
        <div className="budget-progress">
          <div
            className="budget-segment budget-transport"
            style={{ width: mounted ? `${transportPct}%` : '0%' }}
            title={`交通 ¥${route.budget.transport}`}
          />
          <div
            className="budget-segment budget-accommodation"
            style={{ width: mounted ? `${accommodationPct}%` : '0%' }}
            title={`住宿 ¥${route.budget.accommodation}`}
          />
          <div
            className="budget-segment budget-food"
            style={{ width: mounted ? `${foodPct}%` : '0%' }}
            title={`餐饮 ¥${route.budget.food}`}
          />
          <div
            className="budget-segment budget-other"
            style={{ width: mounted ? `${otherPct}%` : '0%' }}
            title={`其他 ¥${route.budget.other}`}
          />
        </div>
        <div className="budget-legend">
          <span>
            <span className="legend-icon">🚗</span> 交通30%
          </span>
          <span>
            <span className="legend-icon">🏨</span> 住宿40%
          </span>
          <span>
            <span className="legend-icon">🍽️</span> 餐饮20%
          </span>
          <span>
            <span className="legend-icon">🎒</span> 其他10%
          </span>
        </div>
      </div>
    </div>
  );
};

export default RouteCard;
