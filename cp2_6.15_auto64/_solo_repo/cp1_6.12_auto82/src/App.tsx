import { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import { RunningRoute } from './types';
import './App.css';

function App() {
  const [routes, setRoutes] = useState<RunningRoute[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch('/api/routes');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRoutes(data);
      }
    } catch (e) {
      console.error('获取路线失败', e);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const handleAddRoute = (route: RunningRoute) => {
    setRoutes((prev) => [...prev, route]);
    setShowHeatmap(false);
  };

  const handleToggleRouteSelect = (id: string) => {
    setSelectedRouteId((prev) => (prev === id ? null : id));
  };

  const handleToggleHeatmap = () => {
    setShowHeatmap((prev) => !prev);
  };

  return (
    <div className="app-container">
      <div className="map-wrapper">
        <MapView
          routes={routes}
          showHeatmap={showHeatmap}
          selectedRouteId={selectedRouteId}
        />
      </div>
      <aside className="sidebar">
        <Sidebar
          routes={routes}
          selectedRouteId={selectedRouteId}
          onToggleSelect={handleToggleRouteSelect}
          onAddRoute={handleAddRoute}
          showHeatmap={showHeatmap}
          onToggleHeatmap={handleToggleHeatmap}
        />
      </aside>
    </div>
  );
}

export default App;
