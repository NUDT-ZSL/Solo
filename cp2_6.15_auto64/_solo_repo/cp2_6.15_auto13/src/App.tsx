import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Map from './components/Map';
import LogEntry from './components/LogEntry';
import { getWeather, weatherMap } from './utils/weatherService';
import type { Route, RoutePoint, RouteWithPoints, LogData, WeatherType } from './types';

const App: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteWithPoints | null>(null);
  const [logs, setLogs] = useState<LogData[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<LogData | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<RoutePoint | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'routes' | 'logs'>('routes');
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [defaultWeather, setDefaultWeather] = useState<WeatherType>('sunny');
  const [showNewRouteModal, setShowNewRouteModal] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setIsSidebarCollapsed(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await axios.get<Route[]>('/api/routes');
      setRoutes(response.data);
      if (response.data.length > 0) {
        await selectRoute(response.data[0]);
      }
    } catch (error) {
      console.error('获取路线列表失败:', error);
      const mockRoutes: RouteWithPoints[] = [
        {
          id: 1,
          name: '香山徒步路线',
          date: '2024-01-15',
          createdAt: '2024-01-15T08:00:00.000Z',
          points: [
            { id: 1, routeId: 1, name: '起点', note: '香山公园东门', lat: 39.9937, lng: 116.1890, orderIndex: 0, confirmed: true },
            { id: 2, routeId: 1, name: '半山腰', note: '休息点', lat: 39.9978, lng: 116.1856, orderIndex: 1, confirmed: true },
            { id: 3, routeId: 1, name: '山顶', note: '香炉峰', lat: 39.9999, lng: 116.1820, orderIndex: 2, confirmed: true },
          ],
        },
        {
          id: 2,
          name: '西湖骑行路线',
          date: '2024-02-20',
          createdAt: '2024-02-20T08:00:00.000Z',
          points: [
            { id: 4, routeId: 2, name: '断桥', note: '起点', lat: 30.2575, lng: 120.1480, orderIndex: 0, confirmed: true },
            { id: 5, routeId: 2, name: '雷峰塔', note: '中途休息', lat: 30.2315, lng: 120.1470, orderIndex: 1, confirmed: true },
            { id: 6, routeId: 2, name: '苏堤', note: '终点', lat: 30.2450, lng: 120.1360, orderIndex: 2, confirmed: true },
          ],
        },
      ];
      setRoutes(mockRoutes);
      if (mockRoutes.length > 0) {
        setSelectedRoute(mockRoutes[0]);
        fetchLogs(mockRoutes[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectRoute = async (route: Route) => {
    try {
      const response = await axios.get<RouteWithPoints>(`/api/routes/${route.id}`);
      setSelectedRoute(response.data);
      fetchLogs(route.id);
    } catch (error) {
      console.error('获取路线详情失败:', error);
    }
  };

  const fetchLogs = async (routeId: number) => {
    try {
      const response = await axios.get<LogData[]>(`/api/logs?routeId=${routeId}`);
      setLogs(response.data);
    } catch (error) {
      console.error('获取日志列表失败:', error);
      const mockLogs: LogData[] = [
        {
          id: 1,
          pointId: 1,
          routeId: 1,
          content: '今天天气很好，从东门出发，开始徒步之旅。沿途风景秀丽，空气清新。',
          weather: 'sunny',
          imagePath: null,
          createdAt: '2024-01-15T09:30:00.000Z',
        },
        {
          id: 2,
          pointId: 2,
          routeId: 1,
          content: '到达半山腰休息，有点累了，但是心情很好。',
          weather: 'cloudy',
          imagePath: null,
          createdAt: '2024-01-15T11:45:00.000Z',
        },
      ];
      setLogs(mockLogs);
    }
  };

  const handleRouteClick = useCallback((route: Route) => {
    selectRoute(route);
    if (isMobile) {
      setIsSidebarCollapsed(true);
    }
  }, [isMobile]);

  const handleAddPoint = useCallback(
    async (point: Omit<RoutePoint, 'id' | 'orderIndex' | 'confirmed'>) => {
      if (!selectedRoute) return;
      try {
        const orderIndex = selectedRoute.points.length;
        const response = await axios.post<RoutePoint>(
          `/api/routes/${selectedRoute.id}/points`,
          { ...point, orderIndex }
        );
        const newPoint = { ...response.data, confirmed: true };
        const updatedPoints = [...selectedRoute.points, newPoint];
        setSelectedRoute({ ...selectedRoute, points: updatedPoints });
      } catch (error) {
        console.error('添加探险点失败:', error);
        const newPoint: RoutePoint = {
          ...point,
          id: Date.now(),
          orderIndex: selectedRoute.points.length,
          confirmed: true,
        };
        const updatedPoints = [...selectedRoute.points, newPoint];
        setSelectedRoute({ ...selectedRoute, points: updatedPoints });
      }
    },
    [selectedRoute]
  );

  const handleUpdatePoint = useCallback(
    async (point: RoutePoint) => {
      if (!selectedRoute) return;
      try {
        await axios.put(`/api/routes/${selectedRoute.id}/points/${point.id}`, point);
        const updatedPoints = selectedRoute.points.map((p) =>
          p.id === point.id ? point : p
        );
        setSelectedRoute({ ...selectedRoute, points: updatedPoints });
      } catch (error) {
        console.error('更新探险点失败:', error);
        const updatedPoints = selectedRoute.points.map((p) =>
          p.id === point.id ? point : p
        );
        setSelectedRoute({ ...selectedRoute, points: updatedPoints });
      }
    },
    [selectedRoute]
  );

  const handlePointRightClick = useCallback(
    async (point: RoutePoint) => {
      setSelectedPoint(point);
      setEditingLog(null);
      const weather = await getWeather(point.lat, point.lng);
      setDefaultWeather(weather);
      setShowLogModal(true);
    },
    []
  );

  const handleSaveLog = async (formData: FormData) => {
    if (selectedRoute) {
      formData.append('routeId', String(selectedRoute.id));
    }
    if (selectedPoint) {
      formData.append('pointId', String(selectedPoint.id));
    }

    try {
      if (editingLog) {
        const response = await axios.put<LogData>(`/api/logs/${editingLog.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setLogs(logs.map((l) => (l.id === editingLog.id ? response.data : l)));
      } else {
        const response = await axios.post<LogData>('/api/logs', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setLogs([response.data, ...logs]);
      }
    } catch (error) {
      console.error('保存日志失败:', error);
      const content = formData.get('content') as string;
      const weather = formData.get('weather') as string;
      if (editingLog) {
        const updatedLog: LogData = {
          ...editingLog,
          content,
          weather,
        };
        setLogs(logs.map((l) => (l.id === editingLog.id ? updatedLog : l)));
      } else {
        const newLog: LogData = {
          id: Date.now(),
          pointId: selectedPoint?.id || null,
          routeId: selectedRoute?.id || null,
          content,
          weather,
          imagePath: null,
          createdAt: new Date().toISOString(),
        };
        setLogs([newLog, ...logs]);
      }
    }
    setShowLogModal(false);
    setEditingLog(null);
    setSelectedPoint(null);
  };

  const handleEditLog = (log: LogData) => {
    setEditingLog(log);
    setShowLogModal(true);
  };

  const handleDeleteClick = (logId: number) => {
    setDeletingLogId(logId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingLogId === null) return;
    try {
      await axios.delete(`/api/logs/${deletingLogId}`);
      setLogs(logs.filter((l) => l.id !== deletingLogId));
    } catch (error) {
      console.error('删除日志失败:', error);
      setLogs(logs.filter((l) => l.id !== deletingLogId));
    }
    setShowDeleteConfirm(false);
    setDeletingLogId(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingLogId(null);
  };

  const handleCreateRoute = async () => {
    if (!newRouteName.trim()) {
      alert('请输入路线名称');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.post<Route>('/api/routes', {
        name: newRouteName,
        date: today,
      });
      const newRoute: RouteWithPoints = { ...response.data, points: [] };
      setRoutes([response.data, ...routes]);
      setSelectedRoute(newRoute);
      setLogs([]);
      setShowNewRouteModal(false);
      setNewRouteName('');
    } catch (error) {
      console.error('创建路线失败:', error);
      alert('创建路线失败，请重试');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const sortedPoints = selectedRoute
    ? [...selectedRoute.points].sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  const getWeatherInfo = (weather: string | null) => {
    if (!weather) return { label: '未知', icon: '❓' };
    return weatherMap[weather as WeatherType] || { label: weather, icon: '🌤️' };
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        .leaflet-container {
          background: #e8e8e8;
        }
      `}</style>

      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            backgroundColor: '#f0f2f5',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            animation: 'slideDown 0.3s ease',
          }}
        >
          <h2 style={{ fontSize: 16, color: '#333', margin: 0 }}>户外探险</h2>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'background-color 0.2s ease',
            }}
          >
            {isSidebarCollapsed ? '展开' : '收起'}
          </button>
        </div>
      )}

      {!isSidebarCollapsed && (
        <div
          style={{
            width: 320,
            backgroundColor: '#f0f2f5',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #e0e0e0',
            height: isMobile ? 'calc(100% - 56px)' : '100%',
            marginTop: isMobile ? 56 : 0,
            position: isMobile ? 'fixed' : 'relative',
            left: 0,
            top: 0,
            zIndex: isMobile ? 99 : 1,
            animation: isMobile ? 'slideIn 0.3s ease' : undefined,
          }}
        >
          {!isMobile && (
            <div
              style={{
                padding: 20,
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: 'white',
              }}
            >
              <h1 style={{ fontSize: 20, color: '#333', fontWeight: 600, margin: 0 }}>户外探险</h1>
            </div>
          )}

          <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
            <button
              onClick={() => setActiveTab('routes')}
              style={{
                flex: 1,
                padding: '12px 0',
                border: 'none',
                backgroundColor: activeTab === 'routes' ? 'white' : 'transparent',
                color: activeTab === 'routes' ? '#2196f3' : '#666',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderBottom: activeTab === 'routes' ? '2px solid #2196f3' : '2px solid transparent',
              }}
            >
              路线列表
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              style={{
                flex: 1,
                padding: '12px 0',
                border: 'none',
                backgroundColor: activeTab === 'logs' ? 'white' : 'transparent',
                color: activeTab === 'logs' ? '#2196f3' : '#666',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderBottom: activeTab === 'logs' ? '2px solid #2196f3' : '2px solid transparent',
              }}
            >
              日志记录
            </button>
          </div>

          {activeTab === 'routes' && (
            <div style={{ padding: 12, borderBottom: '1px solid #e0e0e0' }}>
              <button
                onClick={() => setShowNewRouteModal(true)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#388e3c')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4caf50')}
              >
                + 新建路线
              </button>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {activeTab === 'routes' && (
              <div>
                {loading && <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>加载中...</div>}
                {routes.map((route) => (
                  <div
                    key={route.id}
                    onClick={() => handleRouteClick(route)}
                    style={{
                      padding: 14,
                      backgroundColor: selectedRoute?.id === route.id ? '#e3f2fd' : 'white',
                      borderRadius: 8,
                      marginBottom: 10,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedRoute?.id === route.id
                        ? '0 2px 8px rgba(33, 150, 243, 0.2)'
                        : '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                    onMouseOver={(e) => {
                      if (selectedRoute?.id !== route.id) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (selectedRoute?.id !== route.id) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: '#2196f3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                        }}
                      >
                        🗺️
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 500,
                            color: '#333',
                            marginBottom: 4,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {route.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#999' }}>{route.date}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'logs' && (
              <div>
                {logs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 14 }}>
                    暂无日志记录
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      右键点击地图上的探险点添加日志
                    </div>
                  </div>
                )}
                {logs.map((log) => {
                  const weatherInfo = getWeatherInfo(log.weather);
                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: 14,
                        backgroundColor: '#ffffff',
                        borderRadius: 8,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        marginBottom: 12,
                        transition: 'box-shadow 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      }}
                    >
                      {log.imagePath && (
                        <img
                          src={log.imagePath}
                          alt="日志图片"
                          style={{
                            width: '100%',
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 6,
                            marginBottom: 10,
                          }}
                        />
                      )}
                      <p style={{ fontSize: 15, color: '#333', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                        {log.content}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: 8,
                          borderTop: '1px solid #f0f0f0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: '#999' }}>{formatTime(log.createdAt)}</span>
                          <span style={{ fontSize: 14 }}>
                            {weatherInfo.icon}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleEditLog(log)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: 'transparent',
                              color: '#2196f3',
                              border: '1px solid #2196f3',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = '#2196f3';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#2196f3';
                            }}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteClick(log.id)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: 'transparent',
                              color: '#e74c3c',
                              border: '1px solid #e74c3c',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = '#e74c3c';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#e74c3c';
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          height: '100%',
          marginTop: isMobile ? 56 : 0,
          position: 'relative',
        }}
      >
        <Map
          route={selectedRoute}
          points={sortedPoints}
          onAddPoint={handleAddPoint}
          onUpdatePoint={handleUpdatePoint}
          onPointRightClick={handlePointRightClick}
        />
      </div>

      {showLogModal && (
        <LogEntry
          log={editingLog}
          pointName={selectedPoint?.name}
          defaultWeather={defaultWeather}
          onSave={handleSaveLog}
          onClose={() => {
            setShowLogModal(false);
            setEditingLog(null);
            setSelectedPoint(null);
          }}
        />
      )}

      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={handleCancelDelete}
        >
          <div
            style={{
              width: 320,
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#333' }}>确认删除</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 14, color: '#666' }}>
              确定要删除这条日志吗？
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#7f8c8d')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#95a5a6')}
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#c0392b')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#e74c3c')}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewRouteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setShowNewRouteModal(false)}
        >
          <div
            style={{
              width: 360,
              backgroundColor: '#fafafa',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#333' }}>新建路线</h3>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#555' }}>
                路线名称
              </label>
              <input
                type="text"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                placeholder="请输入路线名称"
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 15,
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2196f3')}
                onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateRoute();
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setShowNewRouteModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#7f8c8d')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#95a5a6')}
              >
                取消
              </button>
              <button
                onClick={handleCreateRoute}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#388e3c')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4caf50')}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
