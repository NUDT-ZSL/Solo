import { useRef, useEffect } from "react";
import { Epoch } from "./dataLoader";

interface TimeSliderProps {
  value: number;
  min: number;
  max: number;
  epochs: Epoch[];
  onChange: (time: number) => void;
  onChangeComplete?: (time: number) => void;
}

const formatTime = (t: number): string => {
  if (t === 0) return "现代";
  if (t >= 1000) return `${(t / 1000).toFixed(1)} 十亿年前`;
  return `${t.toFixed(0)} 百万年前`;
};

export default function TimeSlider({
  value,
  min,
  max,
  epochs,
  onChange,
  onChangeComplete,
}: TimeSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const rafId = useRef<number>();

  const percent = ((value - min) / (max - min)) * 100;

  const getPercentFromClientX = (clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    let p = (clientX - rect.left) / rect.width;
    if (p < 0) p = 0;
    if (p > 1) p = 1;
    return p;
  };

  const updateFromEvent = (clientX: number) => {
    const p = getPercentFromClientX(clientX);
    const t = Math.round((min + p * (max - min)) * 100) / 100;
    onChange(t);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      cancelAnimationFrame(rafId.current || 0);
      rafId.current = requestAnimationFrame(() => updateFromEvent(e.clientX));
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      const p = getPercentFromClientX(e.clientX);
      const t = Math.round((min + p * (max - min)) * 100) / 100;
      onChangeComplete?.(t);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(rafId.current || 0);
    };
  }, [min, max, onChange, onChangeComplete]);

  const epochTicks = epochs.filter((e) => e.time >= min && e.time <= max);

  const typeName = (cn: string) => {
    const typeMap: Record<string, string> = {
      convergent: "汇聚边界",
      divergent: "离散边界",
      transform: "转换边界",
    };
    return typeMap[cn] || cn;
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 80,
        background: "rgba(18, 18, 32, 0.78)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 20,
        padding: "0 40px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        borderTop: "1px solid rgba(108, 92, 231, 0.15)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          color: "#a0a0b0",
          fontSize: 12,
          pointerEvents: "none",
        }}
      >
        <span>冥古宙 · 45亿年前</span>
        <span style={{ color: "#e0e0e0", fontWeight: 600, fontSize: 14 }}>
          {formatTime(value)}
        </span>
        <span>现代 · 今天</span>
      </div>
      <div
        ref={trackRef}
        style={{
          position: "relative",
          width: "100%",
          height: 28,
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          touchAction: "none",
        }}
        onMouseDown={(e) => {
          dragging.current = true;
          document.body.style.cursor = "grabbing";
          updateFromEvent(e.clientX);
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            marginTop: -2,
            height: 4,
            borderRadius: 2,
            background: "#2a2a3a",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${percent}%`,
            top: "50%",
            marginTop: -2,
            height: 4,
            borderRadius: 2,
            background: "#6c5ce7",
            boxShadow: "0 0 8px rgba(108, 92, 231, 0.5)",
            pointerEvents: "none",
          }}
        />
        {epochTicks.map((ep, idx) => {
          const pct = ((ep.time - min) / (max - min)) * 100;
          return (
            <div
              key={idx}
              title={`${ep.name} (${formatTime(ep.time)})`}
              style={{
                position: "absolute",
                left: `${pct}%`,
                top: "50%",
                width: 1,
                height: 8,
                background: "rgba(224, 224, 224, 0.25)",
                marginTop: -4,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: "#8888a0",
                  fontSize: 10,
                  whiteSpace: "nowrap",
                  fontFamily: "Georgia, serif",
                }}
              >
                {ep.name}
              </div>
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: `calc(${percent}% - 12px)`,
            top: "50%",
            width: 24,
            height: 24,
            marginTop: -12,
            borderRadius: "50%",
            background: "#a29bfe",
            boxShadow:
              "0 0 0 4px rgba(162, 155, 254, 0.15), 0 2px 8px rgba(108, 92, 231, 0.5)",
            cursor: "grab",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            userSelect: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = "scale(1.17)";
          }}
          onMouseLeave={(e) => {
            if (!dragging.current) {
              (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
            }
          }}
          onMouseDown={(e) => {
            dragging.current = true;
            document.body.style.cursor = "grabbing";
            (e.currentTarget as HTMLDivElement).style.transform = "scale(1.17)";
            e.stopPropagation();
          }}
        />
      </div>
    </div>
  );
}
