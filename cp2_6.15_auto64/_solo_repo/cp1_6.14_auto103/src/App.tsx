import { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import InfoPanel from './components/InfoPanel';
import RouteCard from './components/RouteCard';
import { api, type Route, type Waypoint } from './http';

type ViewMode = 'editor' | 'list';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const data = await api.getRoutes();
      setRoutes(data);
      if (data.length > 0) {
        setCurrentRoute(data[0]);
      }
    } catch (err) {
      console.error('Failed to load routes:', err);
    }
  };

  const handleCreateRoute = async () => {
    try {
      const newRoute = await api.createRoute({
        name: '新路线',
        description: '点击地图添加路点',
        waypoints: [],
      });
      setRoutes((prev) => [...prev, newRoute]);
      setCurrentRoute(newRoute);
      setViewMode('editor');
    } catch (err) {
      console.error('Failed to create route:', err);
    }
  };

  const handleSelectRoute = (route: Route) => {
    setCurrentRoute(route);
    setSelectedWaypointId(null);
    setPlaybackIndex(-1);
    setIsPlaying(false);
    setViewMode('editor');
  };

  const handleAddWaypoint = useCallback(
    async (lat: number, lng: number) => {
      if (!currentRoute) return;
      const newWaypoint: Waypoint = {
        id: `wp_${Date.now()}`,
        lat,
        lng,
        elevation: Math.round(Math.random() * 1000 + 100),
        timestamp: new Date().toISOString(),
        photos: [],
        notes: '',
      };
      const updatedWaypoints = [...currentRoute.waypoints, newWaypoint];
      try {
        const updated = await api.updateRoute(currentRoute.id, {
          waypoints: updatedWaypoints,
        });
        setCurrentRoute(updated);
        setRoutes((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        setSelectedWaypointId(newWaypoint.id);
      } catch (err) {
        console.error('Failed to add waypoint:', err);
      }
    },
    [currentRoute]
  );

  const handleUpdateWaypoint = useCallback(
    async (waypointId: string, updates: Partial<Waypoint>) => {
      if (!currentRoute) return;
      const updatedWaypoints = currentRoute.waypoints.map((w) =>
        w.id === waypointId ? { ...w, ...updates } : w
      );
      try {
        const updated = await api.updateRoute(currentRoute.id, {
          waypoints: updatedWaypoints,
        });
        setCurrentRoute(updated);
        setRoutes((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
      } catch (err) {
        console.error('Failed to update waypoint:', err);
      }
    },
    [currentRoute]
  );

  const handleToggleFavorite = async (routeId: string) => {
    try {
      const updated = await api.toggleFavorite(routeId);
      setRoutes((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      if (currentRoute?.id === routeId) {
        setCurrentRoute(updated);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handlePlaybackIndexChange = useCallback((index: number) => {
    setPlaybackIndex(index);
  }, []);

  const handleIsPlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">RouteRecall</h1>
          <div className="header-actions">
            <button
              className={`header-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              路线列表
            </button>
            <button
              className={`header-btn ${viewMode === 'editor' ? 'active' : ''}`}
              onClick={() => setViewMode('editor')}
            >
              地图编辑
            </button>
            <button className="header-btn primary" onClick={handleCreateRoute}>
              + 新建路线
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'list' ? (
        <div className="routes-list">
          <div className="routes-grid">
            {routes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                onSelect={() => handleSelectRoute(route)}
                onToggleFavorite={() => handleToggleFavorite(route.id)}
              />
            ))}
            {routes.length === 0 && (
              <div className="empty-state">
                <p>暂无路线，点击"新建路线"开始记录你的旅程</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="main-content">
          <div className="map-container">
            <MapView
              waypoints={currentRoute?.waypoints || []}
              selectedWaypointId={selectedWaypointId}
              playbackIndex={playbackIndex}
              isPlaying={isPlaying}
              onMapClick={handleAddWaypoint}
              onMarkerClick={setSelectedWaypointId}
              onPlaybackIndexChange={handlePlaybackIndexChange}
            />
          </div>
          <div className="panel-container">
            <InfoPanel
              route={currentRoute}
              selectedWaypointId={selectedWaypointId}
              playbackIndex={playbackIndex}
              isPlaying={isPlaying}
              onSelectWaypoint={setSelectedWaypointId}
              onUpdateWaypoint={handleUpdateWaypoint}
              onPlaybackIndexChange={handlePlaybackIndexChange}
              onIsPlayingChange={handleIsPlayingChange}
              onToggleFavorite={() =>
                currentRoute && handleToggleFavorite(currentRoute.id)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
