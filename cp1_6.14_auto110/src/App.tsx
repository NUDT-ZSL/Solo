import React, { useState, useEffect, useRef, useCallback } from "react";
import TimeSlider from "./TimeSlider";
import { init, loadData, updateContinents, flyToPlate, setViewMode, dispose } from "./ThreeScene";
import { ConfigData, PlateBoundaryData, Epoch, getCurrentEpoch, loadConfig } from "./dataLoader";

type ViewMode = "free" | "paleo";

interface InfoCardState {
  data: PlateBoundaryData;
  x: number;
  y: number;
  visible: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  convergent: "汇聚边界",
  divergent: "离散边界",
  transform: "转换边界",
};

const TYPE_COLOR: Record<string, string> = {
  convergent: "#ff6b6b",
  divergent: "#51cf66",
  transform: "#ffd43b",
};

const TYPE_ICON: Record<string, string> = {
  convergent: "⇆",
  divergent: "⇄",
  transform: "⇌",
};

function formatEpochTime(t: number): string {
  if (t === 0) return "距今 0 年（现代）";
  if (t >= 1000) return `距今 ${(t / 1000).toFixed(1)} 十亿年`;
  return `距今 ${t.toFixed(0)} 百万年`;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentEpoch, setCurrentEpoch] = useState<Epoch | null>(null);
  const [infoCard, setInfoCard] = useState<InfoCardState | null>(null);
  const [hoverCard, setHoverCard] = useState<InfoCardState | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>("free");
  const [initialized, setInitialized] = useState(false);
  const infoCardRef = useRef<InfoCardState | null>(null);

  const handleClickBoundary = useCallback((data: PlateBoundaryData, x: number, y: number) => {
    const newState = { data, x, y, visible: true };
    infoCardRef.current = newState;
    setInfoCard(newState);
    setHoverCard(null);
  }, []);

  const handleHoverBoundary = useCallback((data: PlateBoundaryData | null, x: number, y: number) => {
    if (infoCardRef.current && infoCardRef.current.visible) {
      return;
    }
    if (data) {
      setHoverCard({ data, x, y, visible: true });
    } else {
      setHoverCard(null);
    }
  }, []);

  const handleDoubleClickContinent = useCallback((continentId: string) => {
    flyToPlate(continentId);
    setViewModeState("free");
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadConfig().then((cfg) => {
      if (cancelled) return;
      setConfig(cfg);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !config || initialized) return;
    init(containerRef.current, {
      onClickBoundary: handleClickBoundary,
      onHoverBoundary: handleHoverBoundary,
      onDoubleClickContinent: handleDoubleClickContinent,
    });
    loadData(config);
    setInitialized(true);
    return () => {
      dispose();
    };
  }, [config, initialized, handleClickBoundary, handleHoverBoundary, handleDoubleClickContinent]);

  useEffect(() => {
    if (!config) return;
    setCurrentEpoch(getCurrentEpoch(config.epochs, currentTime));
  }, [config, currentTime]);

  useEffect(() => {
    if (!initialized) return;
    updateContinents(currentTime);
  }, [initialized, currentTime]);

  useEffect(() => {
    if (!initialized) return;
    setViewMode(viewMode);
  }, [viewMode, initialized]);

  const activeCard = infoCard || hoverCard;

  const handleSceneClick = () => {
    if (infoCardRef.current) {
      infoCardRef.current = null;
      setInfoCard(null);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 100%)",
        overflow: "hidden",
        fontFamily: "sans-serif",
      }}
      onClick={handleSceneClick}
    >
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
        }}
      />

      {currentEpoch && (
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 28,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 28,
              color: "#d4d4d8",
              marginBottom: 6,
              letterSpacing: "0.02em",
              textShadow: "0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            {currentEpoch.name}
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#a0a0b0",
              letterSpacing: "0.01em",
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            }}
          >
            {formatEpochTime(currentEpoch.time)}
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: 24,
          right: 28,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: 4,
            background: "rgba(18, 18, 32, 0.78)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderRadius: 10,
            border: "1px solid rgba(108, 92, 231, 0.15)",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewModeState("free");
            }}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              background: viewMode === "free" ? "#6c5ce7" : "transparent",
              color: viewMode === "free" ? "#fff" : "#c0c0d0",
              transition: "all 0.2s ease",
              fontWeight: viewMode === "free" ? 600 : 400,
              fontFamily: "sans-serif",
            }}
            onMouseEnter={(e) => {
              if (viewMode !== "free") {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(108, 92, 231, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== "free") {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }
            }}
          >
            自由视角
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewModeState("paleo");
            }}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              background: viewMode === "paleo" ? "#6c5ce7" : "transparent",
              color: viewMode === "paleo" ? "#fff" : "#c0c0d0",
              transition: "all 0.2s ease",
              fontWeight: viewMode === "paleo" ? 600 : 400,
              fontFamily: "sans-serif",
            }}
            onMouseEnter={(e) => {
              if (viewMode !== "paleo") {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(108, 92, 231, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== "paleo") {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }
            }}
          >
            古地理俯视
          </button>
        </div>

        <div
          style={{
            background: "rgba(18, 18, 32, 0.78)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderRadius: 10,
            border: "1px solid rgba(108, 92, 231, 0.15)",
            padding: "12px 16px",
            minWidth: 200,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#8888a0",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            板块边界图例
          </div>
          {["convergent", "divergent", "transform"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "3px 0",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 3,
                  borderRadius: 2,
                  background: TYPE_COLOR[t],
                  boxShadow: `0 0 6px ${TYPE_COLOR[t]}88`,
                }}
              />
              <div style={{ fontSize: 12, color: "#d0d0d8" }}>
                <span style={{ marginRight: 6, fontSize: 14 }}>{TYPE_ICON[t]}</span>
                {TYPE_LABEL[t]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 92,
          left: 28,
          zIndex: 10,
          background: "rgba(18, 18, 32, 0.78)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderRadius: 10,
          border: "1px solid rgba(108, 92, 231, 0.15)",
          padding: "10px 14px",
          color: "#a0a0b0",
          fontSize: 11,
          lineHeight: 1.7,
          maxWidth: 300,
          pointerEvents: "none",
        }}
      >
        <div style={{ color: "#c8c8d8", fontWeight: 600, marginBottom: 4, fontSize: 12 }}>操作提示</div>
        <div>• 拖拽旋转 · 滚轮缩放</div>
        <div>• 悬停板块边界查看信息</div>
        <div>• 点击板块边界锁定详情</div>
        <div>• 双击大陆板块聚焦相机</div>
      </div>

      {activeCard && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: activeCard.x,
            top: activeCard.y,
            zIndex: 30,
            transform: `translate(-50%, calc(-100% - 18px))`,
            pointerEvents: infoCard ? "auto" : "none",
            animation: "cardExpand 0.3s ease-out both",
          }}
        >
          <div
            style={{
              width: 260,
              padding: "14px 16px",
              borderRadius: 12,
              background: "#1e1e2e",
              color: "#e0e0e0",
              fontSize: 14,
              lineHeight: 1.55,
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(108, 92, 231, 0.18), 0 0 24px rgba(108, 92, 231, 0.08)",
              border: `1px solid ${TYPE_COLOR[activeCard.data.type]}55`,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              fontFamily: "sans-serif",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
                paddingBottom: 10,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: `${TYPE_COLOR[activeCard.data.type]}22`,
                  border: `1px solid ${TYPE_COLOR[activeCard.data.type]}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: TYPE_COLOR[activeCard.data.type],
                  fontWeight: 700,
                }}
              >
                {TYPE_ICON[activeCard.data.type]}
              </div>
              <div>
                <div
                  style={{
                    color: TYPE_COLOR[activeCard.data.type],
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
                  {TYPE_LABEL[activeCard.data.type]}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: "#8888a0", fontSize: 11, marginBottom: 3 }}>相邻板块</div>
              <div style={{ color: "#e8e8ef", fontSize: 13, fontWeight: 500 }}>
                {activeCard.data.plateA}
                <span style={{ color: TYPE_COLOR[activeCard.data.type], margin: "0 6px" }}>
                  {TYPE_ICON[activeCard.data.type]}
                </span>
                {activeCard.data.plateB}
              </div>
            </div>
            <div>
              <div style={{ color: "#8888a0", fontSize: 11, marginBottom: 3 }}>地质特征</div>
              <div style={{ color: "#c8c8d8", fontSize: 13, lineHeight: 1.6 }}>
                {activeCard.data.description}
              </div>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: -7,
              width: 14,
              height: 14,
              background: "#1e1e2e",
              transform: "translateX(-50%) rotate(45deg)",
              borderRight: `1px solid ${TYPE_COLOR[activeCard.data.type]}55`,
              borderBottom: `1px solid ${TYPE_COLOR[activeCard.data.type]}55`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes cardExpand {
          0% {
            opacity: 0;
            transform: translate(-50%, calc(-100% - 8px)) scaleY(0.85);
            transform-origin: bottom center;
          }
          100% {
            opacity: 1;
            transform: translate(-50%, calc(-100% - 18px)) scaleY(1);
            transform-origin: bottom center;
          }
        }
      `}</style>

      {config && (
        <TimeSlider
          value={currentTime}
          min={0}
          max={4500}
          epochs={config.epochs}
          onChange={setCurrentTime}
          onChangeComplete={setCurrentTime}
        />
      )}
    </div>
  );
}
