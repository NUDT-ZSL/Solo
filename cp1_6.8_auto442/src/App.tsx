import React, { useState, useCallback, useEffect, useRef } from "react";
import { GraphCanvas } from "./GraphCanvas";
import { CardEditor } from "./CardEditor";
import { api, Card, Connection, VitalityData } from "./api";

const COLOR_TAGS = [
  { label: "柔蓝", value: "#6c8cff" },
  { label: "淡紫", value: "#b47cff" },
  { label: "薄荷", value: "#5ce0b8" },
  { label: "暖橙", value: "#ff9a5c" },
  { label: "樱粉", value: "#ff7ca8" },
  { label: "柠黄", value: "#ffe05c" },
];

export const App: React.FC = () => {
  const [cards, setCards] = useState<Record<string, Card>>({});
  const [connections, setConnections] = useState<Record<string, Connection>>({});
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [vitality, setVitality] = useState<VitalityData | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    cardId?: string;
    connectionId?: string;
  } | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadGraph = useCallback(async () => {
    try {
      const data = await api.getGraph();
      setCards(data.cards);
      setConnections(data.connections);
    } catch {
      setCards({});
      setConnections({});
    }
  }, []);

  const loadVitality = useCallback(async () => {
    try {
      const v = await api.getVitality();
      setVitality(v);
    } catch {}
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    loadVitality();
  }, [cards, connections, loadVitality]);

  const handleCreateCard = useCallback(
    async (x: number, y: number) => {
      const colorIndex = Object.keys(cards).length % COLOR_TAGS.length;
      const card = await api.createCard({
        title: "新灵感",
        description: "",
        color: COLOR_TAGS[colorIndex].value,
        x,
        y,
      });
      setCards((prev) => ({ ...prev, [card.id]: card }));
    },
    [cards]
  );

  const handleUpdateCard = useCallback(async (id: string, data: Partial<Card>) => {
    setCards((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...data },
    }));
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await api.updateCard(id, data);
      } catch {}
    }, 300);
  }, []);

  const handleDeleteCard = useCallback(
    async (id: string) => {
      await api.deleteCard(id);
      setCards((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setConnections((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((cid) => {
          if (next[cid].source_id === id || next[cid].target_id === id) {
            delete next[cid];
          }
        });
        return next;
      });
    },
    []
  );

  const handleCreateConnection = useCallback(async (source_id: string, target_id: string) => {
    const conn = await api.createConnection({ source_id, target_id });
    setConnections((prev) => ({ ...prev, [conn.id]: conn }));
  }, []);

  const handleUpdateConnection = useCallback(async (id: string, data: Partial<Connection>) => {
    setConnections((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...data },
    }));
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await api.updateConnection(id, data);
      } catch {}
    }, 300);
  }, []);

  const handleDeleteConnection = useCallback(async (id: string) => {
    await api.deleteConnection(id);
    setConnections((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleSaveCard = useCallback(
    async (data: { title: string; description: string; color: string }) => {
      if (!editingCard) return;
      await handleUpdateCard(editingCard.id, data);
      setEditingCard(null);
    },
    [editingCard, handleUpdateCard]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, data: { cardId?: string; connectionId?: string }) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, ...data });
    },
    []
  );

  const handleContextAction = useCallback(
    (action: string) => {
      if (action === "deleteCard" && contextMenu?.cardId) {
        handleDeleteCard(contextMenu.cardId);
      }
      if (action === "deleteConnection" && contextMenu?.connectionId) {
        handleDeleteConnection(contextMenu.connectionId);
      }
      if (action === "editCard" && contextMenu?.cardId) {
        const card = cards[contextMenu.cardId];
        if (card) setEditingCard(card);
      }
      setContextMenu(null);
    },
    [contextMenu, handleDeleteCard, handleDeleteConnection, cards]
  );

  const filteredCardIds = filterColor
    ? Object.values(cards)
        .filter((c) => c.color === filterColor)
        .map((c) => c.id)
    : null;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #2d2d44 50%, #1a1a2e 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
      onClick={() => setContextMenu(null)}
    >
      <GraphCanvas
        cards={cards}
        connections={connections}
        filterColor={filterColor}
        filteredCardIds={filteredCardIds}
        onCreateCard={handleCreateCard}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
        onCreateConnection={handleCreateConnection}
        onUpdateConnection={handleUpdateConnection}
        onDeleteConnection={handleDeleteConnection}
        onEditCard={(card) => setEditingCard(card)}
        onContextMenu={handleContextMenu}
      />

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          display: "flex",
          gap: 8,
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            padding: "8px 16px",
            color: "rgba(255,255,255,0.85)",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 2,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          ✦ 灵感图谱
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          gap: 6,
          alignItems: "center",
          zIndex: 10,
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
          borderRadius: 12,
          padding: "6px 12px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginRight: 4 }}>
          筛选:
        </span>
        <button
          onClick={() => setFilterColor(null)}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: filterColor === null ? "2px solid #fff" : "2px solid rgba(255,255,255,0.2)",
            background: "linear-gradient(135deg, #667, #889)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        />
        {COLOR_TAGS.map((tag) => (
          <button
            key={tag.value}
            onClick={() => setFilterColor(filterColor === tag.value ? null : tag.value)}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: filterColor === tag.value ? "2px solid #fff" : "2px solid rgba(255,255,255,0.15)",
              background: tag.value,
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: filterColor === tag.value ? `0 0 8px ${tag.value}` : "none",
            }}
            title={tag.label}
          />
        ))}
      </div>

      {vitality && (
        <VitalityRing vitality={vitality.vitality} />
      )}

      {contextMenu && (
        <div
          style={{
            position: "absolute",
            left: contextMenu.x,
            top: contextMenu.y,
            background: "rgba(30,30,50,0.95)",
            backdropFilter: "blur(16px)",
            borderRadius: 10,
            padding: "4px 0",
            minWidth: 140,
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 1000,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {contextMenu.cardId && (
            <>
              <ContextMenuItem label="✏️ 编辑卡片" onClick={() => handleContextAction("editCard")} />
              <ContextMenuItem label="🗑️ 删除卡片" onClick={() => handleContextAction("deleteCard")} />
            </>
          )}
          {contextMenu.connectionId && (
            <ContextMenuItem label="🗑️ 删除连接" onClick={() => handleContextAction("deleteConnection")} />
          )}
        </div>
      )}

      {editingCard && (
        <CardEditor
          card={editingCard}
          onSave={handleSaveCard}
          onClose={() => setEditingCard(null)}
          colorTags={COLOR_TAGS}
        />
      )}
    </div>
  );
};

const ContextMenuItem: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      padding: "8px 16px",
      color: "rgba(255,255,255,0.85)",
      fontSize: 13,
      cursor: "pointer",
      transition: "background 0.15s",
    }}
    onMouseEnter={(e) => {
      (e.target as HTMLElement).style.background = "rgba(255,255,255,0.1)";
    }}
    onMouseLeave={(e) => {
      (e.target as HTMLElement).style.background = "transparent";
    }}
  >
    {label}
  </div>
);

const VitalityRing: React.FC<{ vitality: number }> = ({ vitality }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Array<{
    angle: number;
    speed: number;
    radius: number;
    size: number;
    alpha: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const size = 120;
    canvas.width = size * 2;
    canvas.height = size * 2;

    const particleCount = Math.floor(vitality / 5) + 5;
    if (particlesRef.current.length !== particleCount) {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        angle: Math.random() * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.02 * (vitality / 100),
        radius: size * 0.7 + (Math.random() - 0.5) * 20,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.4 + Math.random() * 0.6,
      }));
    }

    const hue = 220 + (vitality / 100) * 80;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.15)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.08)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      particlesRef.current.forEach((p) => {
        p.angle += p.speed;
        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${p.alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${p.alpha * 0.2})`;
        ctx.fill();
      });

      ctx.fillStyle = `hsla(${hue}, 70%, 80%, 0.9)`;
      ctx.font = "bold 22px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(Math.round(vitality).toString(), cx, cy - 6);

      ctx.fillStyle = `hsla(${hue}, 50%, 70%, 0.6)`;
      ctx.font = "10px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("活力值", cx, cy + 14);

      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animRef.current);
  }, [vitality]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 10,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: 120,
          height: 120,
          filter: "drop-shadow(0 0 12px rgba(108,140,255,0.3))",
        }}
      />
    </div>
  );
};

export default App;
