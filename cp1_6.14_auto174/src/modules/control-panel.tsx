import { useState, useRef, useEffect } from "react";

interface ControlPanelProps {
  date: string;
  time: string;
  onChange: (date: string, time: string) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  lastUpdated?: string;
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 24,
  right: 0,
  width: 280,
  background: "#0f172a",
  borderRadius: "12px 0 0 12px",
  padding: 20,
  color: "#f8fafc",
  zIndex: 10,
  boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.35)"
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
  color: "#2dd4bf",
  marginBottom: 6
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: "#64748b",
  marginBottom: 18
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 14
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#94a3b8",
  marginBottom: 6
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f8fafc",
  fontSize: 13,
  outline: "none"
};

const btnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: "linear-gradient(135deg, #2dd4bf 0%, #06b6d4 100%)",
  border: "none",
  borderRadius: 8,
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 8,
  transition: "opacity 0.2s, transform 0.2s"
};

const disabledBtnStyle: React.CSSProperties = {
  ...btnStyle,
  opacity: 0.6,
  cursor: "not-allowed"
};

const footerStyle: React.CSSProperties = {
  marginTop: 16,
  paddingTop: 14,
  borderTop: "1px solid #1e293b",
  fontSize: 11,
  color: "#64748b"
};

export function ControlPanel({
  date,
  time,
  onChange,
  onRefresh,
  refreshing = false,
  lastUpdated
}: ControlPanelProps) {
  const [fading, setFading] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, []);

  const triggerRefresh = () => {
    setFading(true);
    setTimeout(() => {
      onRefresh();
      setTimeout(() => setFading(false), 300);
    }, 300);
  };

  const handleDateChange = (newDate: string) => {
    onChange(newDate, time);
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => triggerRefresh(), 600);
  };

  const handleTimeChange = (newTime: string) => {
    onChange(date, newTime);
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => triggerRefresh(), 600);
  };

  const contentStyle: React.CSSProperties = {
    opacity: fading ? 0.3 : 1,
    transition: "opacity 0.3s ease"
  };

  return (
    <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
      <div style={contentStyle}>
        <h3 style={titleStyle}>WaveAtlas 控制面板</h3>
        <p style={subtitleStyle}>全球海浪与潮汐数据可视化</p>

        <div style={fieldStyle}>
          <label style={labelStyle}>日期</label>
          <input
            type="date"
            style={inputStyle}
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>时间</label>
          <input
            type="time"
            style={inputStyle}
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
          />
        </div>

        <button
          style={refreshing ? disabledBtnStyle : btnStyle}
          onClick={triggerRefresh}
          disabled={refreshing}
          onMouseEnter={(e) => {
            if (!refreshing) {
              (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.transform = "translateY(0)";
          }}
        >
          {refreshing ? "正在刷新..." : "刷新数据"}
        </button>

        <div style={footerStyle}>
          {lastUpdated ? `上次更新: ${lastUpdated}` : "等待加载数据..."}
        </div>
      </div>
    </div>
  );
}
