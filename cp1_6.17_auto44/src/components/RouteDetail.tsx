import React, { useState, useEffect } from 'react';
import { Route, dataStore, PreferenceType } from '../data/dataStore';

interface RouteDetailProps {
  routeId: string;
  onBack: () => void;
}

const RouteDetail: React.FC<RouteDetailProps> = ({ routeId, onBack }) => {
  const route: Route | undefined = dataStore.getRouteById(routeId);
  const userId = dataStore.getCurrentUserId();

  const [showPanel, setShowPanel] = useState(false);
  const [nickname, setNickname] = useState('');
  const [preference, setPreference] = useState<PreferenceType>('food');
  const [applied, setApplied] = useState(false);
  const [matchInfo, setMatchInfo] = useState(dataStore.checkMatchingStatus(routeId));

  useEffect(() => {
    setApplied(dataStore.hasUserApplied(userId, routeId));
    return dataStore.subscribe(() => {
      setApplied(dataStore.hasUserApplied(userId, routeId));
      setMatchInfo(dataStore.checkMatchingStatus(routeId));
    });
  }, [routeId, userId]);

  if (!route) {
    return (
      <div className="detail-page">
        <div className="not-found">路线不存在</div>
        <button className="btn-primary" onClick={onBack}>
          返回列表
        </button>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!nickname.trim()) return;
    dataStore.applyToRoute(userId, routeId, preference, nickname.trim());
    setShowPanel(false);
  };

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={onBack}>
        ← 返回
      </button>

      <div className="detail-hero" />

      <div className="detail-header">
        <h1>
          {route.city} · {route.days} 日深度游
        </h1>
        <div className="detail-summary">
          <span className="summary-budget">总预算 ¥{route.totalBudget.toLocaleString()}</span>
          <span className="summary-days">全程 {route.days} 天</span>
          {matchInfo.matched && <span className="summary-matched">✅ 已成团 ({matchInfo.count}/5)</span>}
          {!matchInfo.matched && matchInfo.count > 0 && (
            <span className="summary-matching">⏳ 匹配中 ({matchInfo.count}/5)</span>
          )}
        </div>
      </div>

      <div className="timeline">
        {route.dailyPlans.map((plan, idx) => (
          <div key={plan.day} className="timeline-item">
            <div className="timeline-node">
              <div className={`node-dot node-breath ${idx === 0 ? 'node-active' : ''}`} />
              {idx < route.dailyPlans.length - 1 && <div className="node-line" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-day">Day {plan.day}</div>
              <div className="timeline-title">{plan.title}</div>
              <div className="timeline-spots">
                {plan.spots.map((s, i) => (
                  <span key={i} className="spot-chip">
                    📍 {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="detail-action">
        {!applied ? (
          <button className="btn-primary btn-large" onClick={() => setShowPanel(true)}>
            加入路线
          </button>
        ) : (
          <button className="btn-success btn-large" disabled>
            <span className="pulse-ring">已申请</span>
          </button>
        )}
      </div>

      {showPanel && (
        <div className="apply-mask" onClick={(e) => e.target === e.currentTarget && setShowPanel(false)}>
          <div className="apply-panel">
            <h3>提交参团申请</h3>
            <div className="form-row">
              <label>昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="请输入你的昵称"
              />
            </div>
            <div className="form-row">
              <label>打卡点偏好</label>
              <select value={preference} onChange={(e) => setPreference(e.target.value as PreferenceType)}>
                <option value="food">当地美食</option>
                <option value="history">历史遗迹</option>
                <option value="nature">自然风光</option>
              </select>
            </div>
            <div className="panel-actions">
              <button className="btn-ghost" onClick={() => setShowPanel(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={!nickname.trim()}>
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteDetail;
