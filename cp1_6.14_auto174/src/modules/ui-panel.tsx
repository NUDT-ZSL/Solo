import { useEffect, useState } from "react";
import type { StationData } from "./data-service";

interface InfoPanelProps {
  station: StationData | null;
  onClose?: () => void;
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 24,
  left: 24,
  width: 280,
  background: "rgba(30, 41, 59, 0.85)",
  backdropFilter: "blur(8px)",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
  color: "#f8fafc",
  zIndex: 20,
  opacity: 0,
  transform: "translateY(20px)",
  transition: "opacity 0.2s ease-out, transform 0.2s ease-out",
  pointerEvents: "none"
};

const visibleStyle: React.CSSProperties = {
  opacity: 1,
  transform: "translateY(0)",
  pointerEvents: "auto"
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 600,
  color: "#f59e0b",
  marginBottom: 4
};

const subStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "#94a3b8",
  marginBottom: 16
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
  fontSize: 13
};

const labelStyle: React.CSSProperties = {
  color: "#94a3b8"
};

const valueStyle: React.CSSProperties = {
  color: "#f8fafc",
  fontWeight: 500
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 24,
  height: 24,
  border: "none",
  background: "transparent",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: "24px",
  padding: 0,
  borderRadius: 6
};

export function InfoPanel({ station, onClose }: InfoPanelProps) {
  const [animKey, setAnimKey] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (station) {
      setAnimKey((k) => k + 1);
      setShow(false);
      const t1 = requestAnimationFrame(() => {
        const t2 = requestAnimationFrame(() => setShow(true));
        () => cancelAnimationFrame(t2);
      });
      return () => cancelAnimationFrame(t1);
    } else {
      setShow(false);
    }
  }, [station?.id]);

  const s: React.CSSProperties = {
    ...panelStyle,
    transform: show ? "translateY(0)" : "translateY(20px)",
    opacity: show ? 1 : 0,
    pointerEvents: show ? "auto" : "none"
  };

  if (!station) {
    return null;
  }

  return (
    <div
      key={animKey}
      style={s}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
    >
      <button style={closeBtnStyle} onClick={onClose} title="关闭">
        ×
      </button>
      <h3 style={titleStyle}>{station.name}</h3>
      <p style={subStyle}>
        {station.lat.toFixed(2)}°N, {station.lon.toFixed(2)}°E
      </p>
      <div style={rowStyle}>
        <span style={labelStyle}>当前海浪高度</span>
        <span style={valueStyle}>{station.waveHeight.toFixed(1)} m</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>预计潮汐</span>
        <span style={valueStyle}>
          {station.tideTime} {station.tideType}
        </span>
      </div>
      <div style={{ ...rowStyle, borderBottom: "none" }}>
        <span style={labelStyle}>风向风力</span>
        <span style={valueStyle}>
          {station.windDirection} {station.windLevel}级
        </span>
      </div>
    </div>
  );
}
