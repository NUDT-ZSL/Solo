import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Waypoint, SupplyPoint, WSMessage } from './types';
import MapView from './components/MapView';
import RoutePanel from './components/RoutePanel';
import './App.css';

const WS_URL = `ws://${window.location.hostname}:3002/ws`;

function generateMemberId() {
  let id = localStorage.getItem('hike_member_id');
  if (!id) {
    id = 'member_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('hike_member_id', id);
  }
  return id;
}

export default function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [role, setRole] = useState<'leader' | 'member'>('leader');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [view, setView] = useState<'list' | 'activity'>('list');
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<any>(null);
  const memberId = useRef(generateMemberId());
  const [currentSegment, setCurrentSegment] = useState(0);
  const [memberGps, setMemberGps] = useState<{ lat: number; lng: number } | null>(null);
  const [supplyPointMode, setSupplyPointMode] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<string | null>(null);

  const connectWs = useCallback(() => {
    const socket = new WebSocket(WS_URL);
    socket.onopen = () => {
      console.log('WebSocket connected');
      setWs(socket);
    };
    socket.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };
    socket.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(() => connectWs(), 2000);
    };
    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }, []);

  useEffect(() => {
    connectWs();
    fetchActivities();
  }, []);

  const handleWsMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case 'ACTIVITY_STATE':
        setCurrentActivity(msg.payload);
        break;
      case 'ROUTE_UPDATE':
        setCurrentActivity(prev => prev ? { ...prev, waypoints: msg.payload.waypoints, status: msg.payload.status || prev.status, startedAt: msg.payload.startedAt || prev.startedAt, completedAt: msg.payload.completedAt || prev.completedAt } : null);
        break;
      case 'SUPPLY_POINT_ADD':
        setCurrentActivity(prev => prev ? { ...prev, supplyPoints: [...prev.supplyPoints, msg.payload] } : null);
        break;
      case 'SUPPLY_POINT_APPROVE':
      case 'SUPPLY_POINT_REJECT':
        setCurrentActivity(prev => {
          if (!prev) return null;
          const supplyPoints = msg.type === 'SUPPLY_POINT_APPROVE'
            ? prev.supplyPoints.map(sp => sp.id === msg.payload.id ? { ...sp, approved: true } : sp)
            : prev.supplyPoints.filter(sp => sp.id !== msg.payload.id);
          return { ...prev, supplyPoints };
        });
        break;
      case 'MEMBER_GPS':
        setMemberGps(msg.payload);
        break;
    }
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      setActivities(data);
    } catch (e) {
      console.error('Fetch activities error:', e);
    }
  };

  const createActivity = async (data: { name: string; startLat: number; startLng: number; endLat: number; endLng: number; totalDistance: number; difficulty: string }) => {
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const activity = await res.json();
    setActivities(prev => [...prev, activity]);
    return activity;
  };

  const joinActivity = (activityId: string, joinRole: 'leader' | 'member') => {
    setRole(joinRole);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'JOIN_ACTIVITY',
        activityId,
        senderId: memberId.current,
        payload: { role: joinRole },
      }));
    }
    setView('activity');
  };

  const updateWaypoints = (waypoints: Waypoint[]) => {
    if (!currentActivity) return;
    const updated = { ...currentActivity, waypoints };
    setCurrentActivity(updated);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ROUTE_UPDATE',
        activityId: currentActivity.id,
        senderId: memberId.current,
        payload: { waypoints, status: currentActivity.status },
      }));
    }
  };

  const addWaypoint = async (lat: number, lng: number) => {
    if (!currentActivity) return;
    const res = await fetch(`/api/activities/${currentActivity.id}/waypoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    });
    const wp = await res.json();
    const newWaypoints = [...currentActivity.waypoints, wp];
    const updated = { ...currentActivity, waypoints: newWaypoints };
    setCurrentActivity(updated);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ROUTE_UPDATE',
        activityId: currentActivity.id,
        senderId: memberId.current,
        payload: { waypoints: newWaypoints, status: currentActivity.status },
      }));
    }
  };

  const deleteWaypoint = async (wpId: string) => {
    if (!currentActivity) return;
    await fetch(`/api/activities/${currentActivity.id}/waypoints/${wpId}`, { method: 'DELETE' });
    const newWaypoints = currentActivity.waypoints.filter(w => w.id !== wpId).map((w, i) => ({ ...w, order: i }));
    updateWaypoints(newWaypoints);
  };

  const editWaypoint = async (wpId: string, data: Partial<Waypoint>) => {
    if (!currentActivity) return;
    await fetch(`/api/activities/${currentActivity.id}/waypoints/${wpId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const newWaypoints = currentActivity.waypoints.map(w => w.id === wpId ? { ...w, ...data } : w);
    updateWaypoints(newWaypoints);
  };

  const reorderWaypoints = (newOrder: Waypoint[]) => {
    const reordered = newOrder.map((w, i) => ({ ...w, order: i }));
    updateWaypoints(reordered);
  };

  const addSupplyPoint = (data: { name: string; lat: number; lng: number; waterLiters: number; foodPortions: number }) => {
    if (!currentActivity) return;
    const sp: SupplyPoint = {
      id: 'sp_' + Math.random().toString(36).substr(2, 9),
      name: data.name,
      lat: data.lat,
      lng: data.lng,
      waterLiters: data.waterLiters,
      foodPortions: data.foodPortions,
      addedAt: new Date().toISOString(),
      approved: false,
      addedBy: memberId.current,
    };
    setCurrentActivity(prev => prev ? { ...prev, supplyPoints: [...prev.supplyPoints, sp] } : null);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'SUPPLY_POINT_ADD',
        activityId: currentActivity.id,
        senderId: memberId.current,
        payload: sp,
      }));
    }
  };

  const approveSupplyPoint = (spId: string) => {
    if (!currentActivity) return;
    setCurrentActivity(prev => {
      if (!prev) return null;
      const supplyPoints = prev.supplyPoints.map(sp => sp.id === spId ? { ...sp, approved: true } : sp);
      return { ...prev, supplyPoints };
    });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'SUPPLY_POINT_APPROVE',
        activityId: currentActivity.id,
        senderId: memberId.current,
        payload: { id: spId },
      }));
    }
  };

  const rejectSupplyPoint = (spId: string) => {
    if (!currentActivity) return;
    setCurrentActivity(prev => {
      if (!prev) return null;
      const supplyPoints = prev.supplyPoints.filter(sp => sp.id !== spId);
      return { ...prev, supplyPoints };
    });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'SUPPLY_POINT_REJECT',
        activityId: currentActivity.id,
        senderId: memberId.current,
        payload: { id: spId },
      }));
    }
  };

  const startActivity = () => {
    if (!currentActivity) return;
    const updated = { ...currentActivity, status: 'active' as const, startedAt: new Date().toISOString() };
    setCurrentActivity(updated);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ROUTE_UPDATE',
        activityId: currentActivity.id,
        senderId: memberId.current,
        payload: { waypoints: currentActivity.waypoints, status: 'active', startedAt: updated.startedAt },
      }));
    }
  };

  const completeActivity = async () => {
    if (!currentActivity) return;
    const completedAt = new Date().toISOString();
    const updated = { ...currentActivity, status: 'completed' as const, completedAt };
    setCurrentActivity(updated);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ROUTE_UPDATE',
        activityId: currentActivity.id,
        senderId: memberId.current,
        payload: { waypoints: currentActivity.waypoints, status: 'completed', completedAt },
      }));
    }
    try {
      const res = await fetch(`/api/activities/${currentActivity.id}/report`);
      const reportData = await res.json();
      setReport(reportData);
      setShowReport(true);
    } catch (e) {
      console.error('Report error:', e);
    }
  };

  const sendGpsLocation = (lat: number, lng: number) => {
    if (!currentActivity || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'MEMBER_GPS',
      activityId: currentActivity.id,
      senderId: memberId.current,
      payload: { lat, lng, memberId: memberId.current },
    }));
  };

  if (view === 'list') {
    return (
      <div className="activity-list-page">
        <div className="activity-list-header">
          <h1>🏔️ 户外徒步路线协调系统</h1>
          <p>创建或加入徒步活动，实时协调路线与补给</p>
        </div>
        <CreateActivityForm onCreate={async (data) => {
          const activity = await createActivity(data);
          setCurrentActivity(activity);
          joinActivity(activity.id, 'leader');
        }} />
        <div className="activity-list">
          <h2>现有活动</h2>
          {activities.length === 0 && <p className="empty-hint">暂无活动，请创建一个新活动</p>}
          {activities.map(act => (
            <div key={act.id} className="activity-card">
              <div className="activity-card-info">
                <h3>{act.name}</h3>
                <div className="activity-card-meta">
                  <span className={`difficulty-badge ${act.difficulty}`}>{act.difficulty === 'easy' ? '简单' : act.difficulty === 'moderate' ? '中等' : act.difficulty === 'hard' ? '困难' : '专家'}</span>
                  <span>{act.totalDistance}km</span>
                  <span className={`status-badge ${act.status}`}>{act.status === 'planning' ? '规划中' : act.status === 'active' ? '进行中' : '已结束'}</span>
                </div>
              </div>
              <div className="activity-card-actions">
                <button className="btn btn-primary" onClick={() => { setCurrentActivity(act); joinActivity(act.id, 'leader'); }}>以领队加入</button>
                <button className="btn btn-secondary" onClick={() => { setCurrentActivity(act); joinActivity(act.id, 'member'); }}>以队员加入</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <RoutePanel
        activity={currentActivity}
        role={role}
        currentSegment={currentSegment}
        setCurrentSegment={setCurrentSegment}
        onAddWaypoint={() => {}}
        onDeleteWaypoint={deleteWaypoint}
        onEditWaypoint={editWaypoint}
        onReorderWaypoints={reorderWaypoints}
        onStartActivity={startActivity}
        onCompleteActivity={completeActivity}
        onApproveSupplyPoint={approveSupplyPoint}
        onRejectSupplyPoint={rejectSupplyPoint}
        editingWaypoint={editingWaypoint}
        setEditingWaypoint={setEditingWaypoint}
        onBack={() => { setView('list'); setCurrentActivity(null); }}
      />
      <div className="map-container">
        <MapView
          activity={currentActivity}
          role={role}
          currentSegment={currentSegment}
          memberGps={memberGps}
          supplyPointMode={supplyPointMode}
          setSupplyPointMode={setSupplyPointMode}
          onAddWaypoint={addWaypoint}
          onWaypointDrag={(wpId, lat, lng) => editWaypoint(wpId, { lat, lng })}
          onAddSupplyPoint={addSupplyPoint}
          onSegmentChange={setCurrentSegment}
          onGpsUpdate={sendGpsLocation}
        />
      </div>
      {showReport && report && (
        <ReportModal report={report} activityId={currentActivity?.id || ''} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

function CreateActivityForm({ onCreate }: { onCreate: (data: any) => void }) {
  const [name, setName] = useState('');
  const [totalDistance, setTotalDistance] = useState('');
  const [difficulty, setDifficulty] = useState('moderate');
  const [startLat, setStartLat] = useState('39.9042');
  const [startLng, setStartLng] = useState('116.4074');
  const [endLat, setEndLat] = useState('39.9142');
  const [endLng, setEndLng] = useState('116.4274');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name,
      startLat: parseFloat(startLat),
      startLng: parseFloat(startLng),
      endLat: parseFloat(endLat),
      endLng: parseFloat(endLng),
      totalDistance: parseFloat(totalDistance),
      difficulty,
    });
  };

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <h2>创建新活动</h2>
      <div className="form-row">
        <input placeholder="路线名称" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="form-row two-col">
        <input placeholder="起点纬度" value={startLat} onChange={e => setStartLat(e.target.value)} type="number" step="any" />
        <input placeholder="起点经度" value={startLng} onChange={e => setStartLng(e.target.value)} type="number" step="any" />
      </div>
      <div className="form-row two-col">
        <input placeholder="终点纬度" value={endLat} onChange={e => setEndLat(e.target.value)} type="number" step="any" />
        <input placeholder="终点经度" value={endLng} onChange={e => setEndLng(e.target.value)} type="number" step="any" />
      </div>
      <div className="form-row two-col">
        <input placeholder="总距离(km)" value={totalDistance} onChange={e => setTotalDistance(e.target.value)} type="number" step="any" required />
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          <option value="easy">简单</option>
          <option value="moderate">中等</option>
          <option value="hard">困难</option>
          <option value="expert">专家</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary btn-full">创建活动</button>
    </form>
  );
}

function ReportModal({ report, activityId, onClose }: { report: any; activityId: string; onClose: () => void }) {
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${activityId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 路线回顾报表</h2>
          <button className="btn btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="report-body">
          <div className="report-section">
            <h3>基本信息</h3>
            <div className="report-grid">
              <div className="report-item">
                <span className="report-label">活动名称</span>
                <span className="report-value">{report.activityName}</span>
              </div>
              <div className="report-item">
                <span className="report-label">总耗时</span>
                <span className="report-value">{Math.round(report.totalDuration)} 分钟</span>
              </div>
              <div className="report-item">
                <span className="report-label">计划距离</span>
                <span className="report-value">{report.plannedDistance.toFixed(2)} km</span>
              </div>
              <div className="report-item">
                <span className="report-label">实际距离</span>
                <span className="report-value">{report.actualDistance.toFixed(2)} km</span>
              </div>
              <div className="report-item">
                <span className="report-label">距离偏差</span>
                <span className={`report-value ${report.deviationPercent > 10 ? 'warn' : ''}`}>{report.deviationPercent}%</span>
              </div>
            </div>
          </div>
          <div className="report-section">
            <h3>分段信息</h3>
            <div className="segments-list">
              {report.segments.map((seg: any, i: number) => (
                <div key={i} className="segment-item">
                  <span className="seg-route">{seg.from} → {seg.to}</span>
                  <span className="seg-dist">{(seg.distance * 1000).toFixed(0)} m</span>
                </div>
              ))}
            </div>
          </div>
          <div className="report-section">
            <h3>补给点清单</h3>
            <div className="supply-list">
              {report.supplyPoints.map((sp: any) => (
                <div key={sp.id} className={`supply-report-item ${sp.approved ? 'approved' : 'pending'}`}>
                  <span className="sp-name">{sp.name}</span>
                  <span className="sp-status">{sp.approved ? '✅ 已审批' : '⏳ 未审批'}</span>
                  <span className="sp-water">💧 {sp.waterLiters}L</span>
                  <span className="sp-food">🍞 {sp.foodPortions}份</span>
                </div>
              ))}
              {report.supplyPoints.length === 0 && <p className="empty-hint">无补给点</p>}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={exportJson}>导出 JSON</button>
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
