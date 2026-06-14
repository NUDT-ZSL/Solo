import { useEffect, useRef, useState } from "react";
import { createTerrain, type TerrainContext } from "./modules/terrain-module";
import {
  getWaveForecast,
  subscribeWaveUpdates,
  type StationData,
  type WaveForecastResponse
} from "./modules/data-service";
import { InfoPanel } from "./modules/ui-panel";
import { ControlPanel } from "./modules/control-panel";

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowTimeStr(): string {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

const containerStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  width: "100%",
  height: "100%"
};

const headerStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 15,
  textAlign: "center",
  pointerEvents: "none"
};

const brandStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: 2,
  background: "linear-gradient(135deg, #2dd4bf 0%, #06b6d4 50%, #f8fafc 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text"
};

const brandSub: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 11,
  color: "#64748b",
  letterSpacing: 3
};

export default function App() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const terrainRef = useRef<TerrainContext | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const [selected, setSelected] = useState<StationData | null>(null);
  const [hovered, setHovered] = useState<StationData | null>(null);
  const [data, setData] = useState<WaveForecastResponse | null>(null);
  const [date, setDate] = useState<string>(todayStr());
  const [time, setTime] = useState<string>(nowTimeStr());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = createTerrain(canvasRef.current);
    terrainRef.current = ctx;
    ctx.onStationClick((s) => setSelected(s));
    ctx.onStationHover((s) => setHovered(s));

    const unsub = subscribeWaveUpdates((res) => {
      setData(res);
      ctx.updateTerrain(res);
    });
    unsubRef.current = unsub;

    return () => {
      unsub?.();
      ctx.dispose();
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getWaveForecast(30, 120, `${date}T${time}`);
      setData(res);
      terrainRef.current?.updateTerrain(res);
    } finally {
      setRefreshing(false);
    }
  };

  const active = selected ?? hovered;

  return (
    <div style={containerStyle}>
      <div ref={canvasRef} style={{ width: "100%", height: "100%" }} />

      <div style={headerStyle}>
        <h1 style={brandStyle}>WAVE ATLAS</h1>
        <p style={brandSub}>GLOBAL OCEAN WAVE VISUALIZATION</p>
      </div>

      <InfoPanel station={active} onClose={() => setSelected(null)} />

      <ControlPanel
        date={date}
        time={time}
        onChange={(d, t) => {
          setDate(d);
          setTime(t);
        }}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        lastUpdated={data?.timestamp ? formatTs(data.timestamp) : undefined}
      />
    </div>
  );
}
