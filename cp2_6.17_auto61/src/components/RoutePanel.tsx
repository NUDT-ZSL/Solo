import React, { useState } from 'react';
import { Activity, Waypoint, SupplyPoint } from '../types';
import './RoutePanel.css';

interface RoutePanelProps {
  activity: Activity | null;
  role: 'leader' | 'member';
  currentSegment: number;
  setCurrentSegment: (idx: number) => void;
  onAddWaypoint: () => void;
  onDeleteWaypoint: (wpId: string) => void;
  onEditWaypoint: (wpId: string, data: Partial<Waypoint>) => void;
  onReorderWaypoints: (newOrder: Waypoint[]) => void;
  onStartActivity: () => void;
  onCompleteActivity: () => void;
  onApproveSupplyPoint: (spId: string) => void;
  onRejectSupplyPoint: (spId: string) => void;
  editingWaypoint: string | null;
  setEditingWaypoint: (id: string | null) => void;
  onBack: () => void;
}

export default function RoutePanel({
  activity,
  role,
  currentSegment,
  setCurrentSegment,
  onAddWaypoint,
  onDeleteWaypoint,
  onEditWaypoint,
  onReorderWaypoints,
  onStartActivity,
  onCompleteActivity,
  onApproveSupplyPoint,
  onRejectSupplyPoint,
  editingWaypoint,
  setEditingWaypoint,
  onBack,
}: RoutePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; altitude: number; note: string }>({ name: '', altitude: 0, note: '' });

  if (!activity) return null;

  const sortedWaypoints = [...activity.waypoints].sort((a, b) => a.order - b.order);
  const pendingSupplyPoints = activity.supplyPoints.filter(sp => !sp.approved);
  const approvedSupplyPoints = activity.supplyPoints.filter(sp => sp.approved);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newWaypoints = [...sortedWaypoints];
    const [removed] = newWaypoints.splice(dragIndex, 1);
    newWaypoints.splice(index, 0, removed);
    onReorderWaypoints(newWaypoints);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const startEdit = (wp: Waypoint) => {
    setEditingWaypoint(wp.id);
    setEditForm({ name: wp.name, altitude: wp.altitude, note: wp.note });
  };

  const saveEdit = (wpId: string) => {
    onEditWaypoint(wpId, editForm);
    setEditingWaypoint(null);
  };

  const difficultyLabel = activity.difficulty === 'easy' ? '简单' : activity.difficulty === 'moderate' ? '中等' : activity.difficulty === 'hard' ? '困难' : '专家';
  const statusLabel = activity.status === 'planning' ? '规划中' : activity.status === 'active' ? '进行中' : '已结束';

  return (
    <>
      <div className={`route-panel ${collapsed ? 'collapsed' : ''}`}>
        <div className="panel-header">
          <div className="header-top">
            <button className="btn-back" onClick={onBack}>←</button>
            <div className="header-info">
              <h2>{activity.name}</h2>
              <div className="header-meta">
                <span className={`diff-badge ${activity.difficulty}`}>{difficultyLabel}</span>
                <span className="dist-badge">{activity.totalDistance}km</span>
                <span className={`status-badge-sm ${activity.status}`}>{statusLabel}</span>
              </div>
            </div>
            <button className="btn-collapse" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? '▼' : '▲'}
            </button>
          </div>
          {!collapsed && (
            <div className="header-actions">
              {role === 'leader' && activity.status === 'planning' && (
                <button className="btn btn-primary btn-sm" onClick={onStartActivity}>▶ 开始活动</button>
              )}
              {role === 'leader' && activity.status === 'active' && (
                <button className="btn btn-danger btn-sm" onClick={onCompleteActivity}>⏹ 结束活动</button>
              )}
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="panel-body">
            <div className="panel-section">
              <div className="section-header">
                <h3>📍 途经点 ({sortedWaypoints.length})</h3>
              </div>
              <div className="waypoint-list">
                {sortedWaypoints.map((wp, index) => (
                  <div
                    key={wp.id}
                    className={`waypoint-card ${index === currentSegment ? 'current' : ''} ${editingWaypoint === wp.id ? 'editing' : ''}`}
                    draggable={role === 'leader'}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setCurrentSegment(index)}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {editingWaypoint === wp.id ? (
                      <div className="wp-edit-form">
                        <input
                          value={editForm.name}
                          onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="名称"
                          className="wp-edit-input"
                        />
                        <input
                          type="number"
                          value={editForm.altitude}
                          onChange={e => setEditForm(prev => ({ ...prev, altitude: parseFloat(e.target.value) || 0 }))}
                          placeholder="海拔(m)"
                          className="wp-edit-input"
                        />
                        <input
                          value={editForm.note}
                          onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                          placeholder="备注"
                          className="wp-edit-input"
                        />
                        <div className="wp-edit-actions">
                          <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); saveEdit(wp.id); }}>保存</button>
                          <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setEditingWaypoint(null); }}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="wp-left">
                          <span className="wp-order">{index + 1}</span>
                          <div className="wp-info">
                            <span className="wp-name">{wp.name}</span>
                            <span className="wp-eta">预计: {wp.estimatedArrival || `~${Math.round(index * 0.5 * 60)}分钟`}</span>
                          </div>
                        </div>
                        <div className="wp-actions">
                          {role === 'leader' && (
                            <>
                              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); startEdit(wp); }} title="编辑">✏️</button>
                              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onDeleteWaypoint(wp.id); }} title="删除">🗑️</button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {sortedWaypoints.length === 0 && <p className="empty-hint">暂无途经点，在地图上添加</p>}
              </div>
            </div>

            {role === 'leader' && pendingSupplyPoints.length > 0 && (
              <div className="panel-section">
                <div className="section-header">
                  <h3>🔔 待审批补给点 ({pendingSupplyPoints.length})</h3>
                </div>
                <div className="supply-approval-list">
                  {pendingSupplyPoints.map(sp => (
                    <div key={sp.id} className="supply-approval-card pending">
                      <div className="sp-info">
                        <span className="sp-name">{sp.name}</span>
                        <span className="sp-details">💧 {sp.waterLiters}L / 🍞 {sp.foodPortions}份</span>
                        <span className="sp-time">{new Date(sp.addedAt).toLocaleTimeString('zh-CN')}</span>
                      </div>
                      <div className="sp-approval-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => onApproveSupplyPoint(sp.id)}>✓ 通过</button>
                        <button className="btn btn-danger btn-sm" onClick={() => onRejectSupplyPoint(sp.id)}>✕ 驳回</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approvedSupplyPoints.length > 0 && (
              <div className="panel-section">
                <div className="section-header">
                  <h3>💧 已审批补给点 ({approvedSupplyPoints.length})</h3>
                </div>
                <div className="supply-approved-list">
                  {approvedSupplyPoints.map(sp => (
                    <div key={sp.id} className="supply-approval-card approved">
                      <div className="sp-info">
                        <span className="sp-name">{sp.name}</span>
                        <span className="sp-details">💧 {sp.waterLiters}L / 🍞 {sp.foodPortions}份</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {collapsed && (
        <div className="collapsed-banner" onClick={() => setCollapsed(false)}>
          <span className="banner-name">{activity.name}</span>
          <span className="banner-segment">当前: 第{currentSegment + 1}段</span>
          <span className="banner-expand">展开 ▼</span>
        </div>
      )}
    </>
  );
}
