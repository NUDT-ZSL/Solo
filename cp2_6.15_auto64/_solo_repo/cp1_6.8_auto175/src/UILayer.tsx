import { memo } from "react";
import { RotateCcw, Lightbulb } from "lucide-react";

interface UILayerProps {
  level: number;
  resonanceCount: number;
  totalResonance: number;
  levelComplete: boolean;
  onReset: () => void;
  onHint: () => void;
}

const UILayer = memo(function UILayer({
  level,
  resonanceCount,
  totalResonance,
  levelComplete,
  onReset,
  onHint,
}: UILayerProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          background: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 12,
          padding: "16px 24px",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            fontFamily: "Orbitron, sans-serif",
            fontWeight: 900,
            fontSize: 20,
            color: "white",
          }}
        >
          LEVEL {level}
        </div>
        <div
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 600,
            fontSize: 16,
            color: "#69f0ae",
            marginTop: 4,
          }}
        >
          共鸣 {resonanceCount}/{totalResonance}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          display: "flex",
          gap: 12,
        }}
      >
        <button
          onClick={onReset}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 12,
            padding: "10px 20px",
            color: "white",
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            pointerEvents: "auto",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
          }}
        >
          <RotateCcw size={16} />
          重置
        </button>
        <button
          onClick={onHint}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 12,
            padding: "10px 20px",
            color: "white",
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            pointerEvents: "auto",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
          }}
        >
          <Lightbulb size={16} />
          提示
        </button>
      </div>

      {levelComplete && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "Orbitron, sans-serif",
              fontWeight: 900,
              fontSize: 48,
              color: "#ffd740",
              textShadow:
                "0 0 20px rgba(255, 215, 64, 0.6), 0 0 40px rgba(255, 215, 64, 0.3), 0 0 80px rgba(255, 215, 64, 0.15)",
              animation: "levelCompleteIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
          >
            关卡完成!
          </span>
        </div>
      )}

      <style>{`
        @keyframes levelCompleteIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
});

export default UILayer;
