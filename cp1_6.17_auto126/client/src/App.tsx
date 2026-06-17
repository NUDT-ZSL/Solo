import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import BikeLayer from './bike-layer';
import HeatmapLayer from './heatmap-layer';
import ControlPanel from './control-panel';

export interface Bike {
  id: string;
  lat: number;
  lng: number;
  battery: number;
  rented: boolean;
  lastUsed: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface SimulatedData {
  bikes: Bike[];
  heatmap: HeatmapPoint[];
  throttled: boolean;
}

const BEIJING_CENTER: [number, number] = [39.9042, 116.4074];

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const App: React.FC = () => {
  const [bikeData, setBikeData] = useState<Bike[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [throttled, setThrottled] = useState(false);
  const [showBikeLayer, setShowBikeLayer] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<1000 | 3000 | 5000>(3000);
  const [panelOpen, setPanelOpen] = useState(true);
  const [lowFps, setLowFps] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameRef = useRef<number>(performance.now());

  const stats = React.useMemo(() => {
    const total = bikeData.length;
    const avgBattery = total > 0
      ? Math.round(bikeData.reduce((s, b) => s + b.battery, 0) / total)
      : 0;
    const highDensityCount = heatmapData.filter((h) => h.intensity >= 0.7).length;
    return { total, avgBattery, highDensityCount };
  }, [bikeData, heatmapData]);

  const connectWs = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${proto}//${host}:4000/ws`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        const data: SimulatedData = JSON.parse(ev.data);
        setBikeData(data.bikes);
        setHeatmapData(data.heatmap);
        setThrottled(data.throttled);

        const now = performance.now();
        const delta = now - lastFrameRef.current;
        lastFrameRef.current = now;
        frameTimesRef.current.push(delta);
        if (frameTimesRef.current.length > 30) frameTimesRef.current.shift();
        const avgDelta = frameTimesRef.current.reduce((s, t) => s + t, 0) / frameTimesRef.current.length;
        const fps = 1000 / avgDelta;
        setLowFps(fps < 30);
      } catch (_) {
        // ignore parse errors
      }
    };
    ws.onclose = () => {
      setTimeout(() => connectWs(), 2000);
    };
    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWs]);

  const handleIntervalChange = (ms: 1000 | 3000 | 5000) => {
    setRefreshInterval(ms);
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'setInterval', interval: ms }));
    }
    fetch('/api/refresh-interval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interval: ms })
    }).catch(() => {});
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={BEIJING_CENTER}
        zoom={13}
        style={{ width: '100%', height: '100%', background: '#1a1a1a', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showHeatmap && <HeatmapLayer heatmapData={heatmapData} />}
        {showBikeLayer && <BikeLayer bikeData={bikeData} />}
      </MapContainer>

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          fontSize: 20,
          color: '#fff',
          background: '#00000066',
          borderRadius: 8,
          padding: '8px 16px',
          zIndex: 1000,
          fontWeight: 600,
          letterSpacing: 1
        }}
      >
        共享单车实时追踪
      </div>

      {throttled && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: 16,
            background: '#ff6b35cc',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 8,
            zIndex: 1000,
            fontSize: 13
          }}
        >
          ⚠️ 单车数量已达上限（120辆），后端已自动限流
        </div>
      )}

      <ControlPanel
        open={panelOpen}
        onToggle={() => setPanelOpen(!panelOpen)}
        showBikeLayer={showBikeLayer}
        setShowBikeLayer={setShowBikeLayer}
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        refreshInterval={refreshInterval}
        setRefreshInterval={handleIntervalChange}
        stats={stats}
        lowFps={lowFps}
      />

      <style>{`
        .leaflet-control-zoom a {
          background: #2d2d2d !important;
          color: #fff !important;
          border-color: #444 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #444 !important;
        }
        .leaflet-control-attribution {
          background: #1e1e1ecc !important;
          color: #aaa !important;
        }
        .leaflet-control-attribution a {
          color: #6cf !important;
        }
        .bike-marker-icon {
          transition: transform 1.2s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default App;
