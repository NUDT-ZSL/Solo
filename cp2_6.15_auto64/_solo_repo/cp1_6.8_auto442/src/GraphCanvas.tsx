import React, { useRef, useState, useCallback, useEffect } from "react";
import { Card, Connection } from "./api";

const CARD_W = 200;
const CARD_H = 100;

interface Props {
  cards: Record<string, Card>;
  connections: Record<string, Connection>;
  filterColor: string | null;
  filteredCardIds: string[] | null;
  onCreateCard: (x: number, y: number) => void;
  onUpdateCard: (id: string, data: Partial<Card>) => void;
  onDeleteCard: (id: string) => void;
  onCreateConnection: (sourceId: string, targetId: string) => void;
  onUpdateConnection: (id: string, data: Partial<Connection>) => void;
  onDeleteConnection: (id: string) => void;
  onEditCard: (card: Card) => void;
  onContextMenu: (e: React.MouseEvent, data: { cardId?: string; connectionId?: string }) => void;
}

interface DragState {
  type: "card" | "pan" | "connect" | "endpoint";
  cardId?: string;
  connectionId?: string;
  endpoint?: "source" | "target";
  startX: number;
  startY: number;
  offsetX?: number;
  offsetY?: number;
}

interface DestroyingCard {
  id: string;
  x: number;
  y: number;
  color: string;
  title: string;
  startTime: number;
}

interface CreatingCard {
  id: string;
  startTime: number;
}

function getCardEdgePoint(
  card: Card,
  targetX: number,
  targetY: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  const cx = card.x + CARD_W / 2 + offsetX;
  const cy = card.y + CARD_H / 2 + offsetY;
  const dx = targetX - cx;
  const dy = targetY - cy;
  const angle = Math.atan2(dy, dx);
  const hw = CARD_W / 2;
  const hh = CARD_H / 2;

  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));

  let ex: number, ey: number;
  if (hw * absSin <= hh * absCos) {
    ex = cx + Math.sign(Math.cos(angle)) * hw;
    ey = cy + hw * Math.tan(angle) * Math.sign(Math.cos(angle));
  } else {
    ex = cx + (hh / Math.tan(angle)) * Math.sign(Math.sin(angle));
    ey = cy + Math.sign(Math.sin(angle)) * hh;
  }
  return { x: ex, y: ey };
}

function bezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

export const GraphCanvas: React.FC<Props> = ({
  cards,
  connections,
  filterColor,
  filteredCardIds,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onCreateConnection,
  onUpdateConnection,
  onEditCard,
  onContextMenu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectMouse, setConnectMouse] = useState<{ x: number; y: number } | null>(null);
  const [hoverCard, setHoverCard] = useState<string | null>(null);
  const [destroyingCards, setDestroyingCards] = useState<DestroyingCard[]>([]);
  const [creatingCards, setCreatingCards] = useState<CreatingCard[]>([]);
  const prevCardsRef = useRef<Record<string, Card>>({});
  const particleTimeRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (sx - rect.left - pan.x) / zoom,
        y: (sy - rect.top - pan.y) / zoom,
      };
    },
    [zoom, pan]
  );

  useEffect(() => {
    const prevCards = prevCardsRef.current;
    const currentIds = new Set(Object.keys(cards));
    const prevIds = new Set(Object.keys(prevCards));

    const newIds = [...currentIds].filter((id) => !prevIds.has(id));
    const removedIds = [...prevIds].filter((id) => !currentIds.has(id));

    if (newIds.length > 0) {
      setCreatingCards((prev) => [
        ...prev,
        ...newIds.map((id) => ({ id, startTime: Date.now() })),
      ]);
      setTimeout(() => {
        setCreatingCards((prev) => prev.filter((c) => !newIds.includes(c.id)));
      }, 400);
    }

    if (removedIds.length > 0) {
      setDestroyingCards((prev) => [
        ...prev,
        ...removedIds
          .filter((id) => prevCards[id])
          .map((id) => ({
            id,
            x: prevCards[id].x,
            y: prevCards[id].y,
            color: prevCards[id].color,
            title: prevCards[id].title,
            startTime: Date.now(),
          })),
      ]);
      setTimeout(() => {
        setDestroyingCards((prev) => prev.filter((c) => !removedIds.includes(c.id)));
      }, 600);
    }

    prevCardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    const animate = () => {
      particleTimeRef.current += 0.008;
      if (svgRef.current) {
        svgRef.current.querySelectorAll(".conn-particle").forEach((el) => {
          const t = ((particleTimeRef.current + parseFloat(el.getAttribute("data-offset") || "0")) % 1);
          el.setAttribute("data-t", t.toString());
        });
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = Math.max(0.2, Math.min(3, zoom * factor));
      const newPanX = mx - (mx - pan.x) * (newZoom / zoom);
      const newPanY = my - (my - pan.y) * (newZoom / zoom);
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom, pan]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setDragState({ type: "pan", startX: e.clientX - pan.x, startY: e.clientY - pan.y });
        return;
      }

      if (e.button === 0) {
        const target = e.target as HTMLElement;
        const connectBtn = target.closest("[data-connect]");
        if (connectBtn) {
          const cardId = connectBtn.getAttribute("data-connect");
          if (cardId) {
            setConnectingFrom(cardId);
            const world = screenToWorld(e.clientX, e.clientY);
            setConnectMouse(world);
            setDragState({
              type: "connect",
              cardId,
              startX: e.clientX,
              startY: e.clientY,
            });
          }
          return;
        }

        const endpointHandle = target.closest("[data-endpoint]");
        if (endpointHandle) {
          const connId = endpointHandle.getAttribute("data-conn-id");
          const endpoint = endpointHandle.getAttribute("data-endpoint") as "source" | "target";
          if (connId && endpoint) {
            setDragState({
              type: "endpoint",
              connectionId: connId,
              endpoint,
              startX: e.clientX,
              startY: e.clientY,
            });
            return;
          }
        }

        const cardEl = target.closest("[data-card-id]");
        if (cardEl) {
          const cardId = cardEl.getAttribute("data-card-id");
          if (cardId) {
            const card = cards[cardId];
            if (card) {
              setDragState({
                type: "card",
                cardId,
                startX: e.clientX,
                startY: e.clientY,
                offsetX: e.clientX / zoom - card.x - pan.x / zoom,
                offsetY: e.clientY / zoom - card.y - pan.y / zoom,
              });
            }
          }
          return;
        }

        setDragState({
          type: "pan",
          startX: e.clientX - pan.x,
          startY: e.clientY - pan.y,
        });
      }
    },
    [pan, zoom, cards, screenToWorld]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState) return;

      if (dragState.type === "pan") {
        setPan({ x: e.clientX - dragState.startX, y: e.clientY - dragState.startY });
      } else if (dragState.type === "card" && dragState.cardId) {
        const world = screenToWorld(e.clientX, e.clientY);
        const ox = dragState.offsetX || 0;
        const oy = dragState.offsetY || 0;
        onUpdateCard(dragState.cardId, {
          x: world.x - ox,
          y: world.y - oy,
        });
      } else if (dragState.type === "connect") {
        const world = screenToWorld(e.clientX, e.clientY);
        setConnectMouse(world);
      } else if (dragState.type === "endpoint" && dragState.connectionId && dragState.endpoint) {
        const world = screenToWorld(e.clientX, e.clientY);
        const conn = connections[dragState.connectionId];
        if (conn) {
          const card = cards[dragState.endpoint === "source" ? conn.source_id : conn.target_id];
          if (card) {
            const offsetX = world.x - card.x - CARD_W / 2;
            const offsetY = world.y - card.y - CARD_H / 2;
            onUpdateConnection(dragState.connectionId, {
              [`${dragState.endpoint}_offset_x`]: offsetX,
              [`${dragState.endpoint}_offset_y`]: offsetY,
            });
          }
        }
      }
    },
    [dragState, screenToWorld, onUpdateCard, onUpdateConnection, connections, cards]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (dragState?.type === "connect" && connectingFrom) {
        const target = e.target as HTMLElement;
        const cardEl = target.closest("[data-card-id]");
        if (cardEl) {
          const targetId = cardEl.getAttribute("data-card-id");
          if (targetId && targetId !== connectingFrom) {
            onCreateConnection(connectingFrom, targetId);
          }
        }
        setConnectingFrom(null);
        setConnectMouse(null);
      }
      setDragState(null);
    },
    [dragState, connectingFrom, onCreateConnection]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const cardEl = target.closest("[data-card-id]");
      if (cardEl) {
        const cardId = cardEl.getAttribute("data-card-id");
        if (cardId && cards[cardId]) {
          onEditCard(cards[cardId]);
          return;
        }
      }
      const world = screenToWorld(e.clientX, e.clientY);
      onCreateCard(world.x - CARD_W / 2, world.y - CARD_H / 2);
    },
    [cards, onEditCard, onCreateCard, screenToWorld]
  );

  const handleCardContextMenu = useCallback(
    (e: React.MouseEvent, cardId: string) => {
      onContextMenu(e, { cardId });
    },
    [onContextMenu]
  );

  const isCardFiltered = useCallback(
    (cardId: string) => {
      if (!filteredCardIds) return true;
      return filteredCardIds.includes(cardId);
    },
    [filteredCardIds]
  );

  const isConnectionFiltered = useCallback(
    (conn: Connection) => {
      if (!filteredCardIds) return true;
      return filteredCardIds.includes(conn.source_id) && filteredCardIds.includes(conn.target_id);
    },
    [filteredCardIds]
  );

  const getConnectionPath = useCallback(
    (conn: Connection) => {
      const sourceCard = cards[conn.source_id];
      const targetCard = cards[conn.target_id];
      if (!sourceCard || !targetCard) return null;

      const sourceCenter = {
        x: sourceCard.x + CARD_W / 2 + conn.source_offset_x,
        y: sourceCard.y + CARD_H / 2 + conn.source_offset_y,
      };
      const targetCenter = {
        x: targetCard.x + CARD_W / 2 + conn.target_offset_x,
        y: targetCard.y + CARD_H / 2 + conn.target_offset_y,
      };

      const sourcePt = getCardEdgePoint(sourceCard, targetCenter.x, targetCenter.y, conn.source_offset_x, conn.source_offset_y);
      const targetPt = getCardEdgePoint(targetCard, sourceCenter.x, sourceCenter.y, conn.target_offset_x, conn.target_offset_y);

      const dx = targetPt.x - sourcePt.x;
      const dy = targetPt.y - sourcePt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const curvature = Math.min(dist * 0.4, 120);

      const cp1 = {
        x: sourcePt.x + dx * 0.3 + dy * 0.15 * (curvature / 80),
        y: sourcePt.y + dy * 0.3 - dx * 0.15 * (curvature / 80),
      };
      const cp2 = {
        x: sourcePt.x + dx * 0.7 - dy * 0.15 * (curvature / 80),
        y: sourcePt.y + dy * 0.7 + dx * 0.15 * (curvature / 80),
      };

      return { sourcePt, targetPt, cp1, cp2 };
    },
    [cards]
  );

  const renderConnections = () => {
    return Object.values(connections).map((conn) => {
      const path = getConnectionPath(conn);
      if (!path) return null;
      const { sourcePt, targetPt, cp1, cp2 } = path;
      const filtered = isConnectionFiltered(conn);
      const opacity = filtered ? 1 : 0.15;
      const pathD = `M ${sourcePt.x} ${sourcePt.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${targetPt.x} ${targetPt.y}`;

      const sourceCard = cards[conn.source_id];
      const targetCard = cards[conn.target_id];
      const lineColor = sourceCard ? sourceCard.color : "#6c8cff";

      const arrowSize = 8;
      const t = 0.98;
      const nearTarget = bezierPoint(sourcePt, cp1, cp2, targetPt, t);
      const arrowAngle = Math.atan2(targetPt.y - nearTarget.y, targetPt.x - nearTarget.x);

      const numParticles = 3;
      const particles = Array.from({ length: numParticles }, (_, i) => {
        const offset = i / numParticles;
        return { offset, key: `${conn.id}-p-${i}` };
      });

      return (
        <g key={conn.id} style={{ opacity, transition: "opacity 0.4s ease" }}>
          <defs>
            <filter id={`glow-${conn.id}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
            strokeOpacity={0.6}
            filter={`url(#glow-${conn.id})`}
          />
          <path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth={1}
            strokeOpacity={0.3}
          />
          <polygon
            points={`${targetPt.x},${targetPt.y} ${targetPt.x - arrowSize * Math.cos(arrowAngle - 0.4)},${targetPt.y - arrowSize * Math.sin(arrowAngle - 0.4)} ${targetPt.x - arrowSize * Math.cos(arrowAngle + 0.4)},${targetPt.y - arrowSize * Math.sin(arrowAngle + 0.4)}`}
            fill={lineColor}
            fillOpacity={0.8}
          />
          {particles.map((p) => {
            const pt = bezierPoint(sourcePt, cp1, cp2, targetPt, p.offset);
            return (
              <circle
                key={p.key}
                cx={pt.x}
                cy={pt.y}
                r={2.5}
                fill={lineColor}
                fillOpacity={0.8}
                className="conn-particle"
                data-offset={p.offset}
              />
            );
          })}
          {hoverCard === conn.source_id || hoverCard === conn.target_id ? (
            <>
              <circle
                cx={sourcePt.x}
                cy={sourcePt.y}
                r={6}
                fill="rgba(255,255,255,0.3)"
                stroke="#fff"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
                data-conn-id={conn.id}
                data-endpoint="source"
              />
              <circle
                cx={targetPt.x}
                cy={targetPt.y}
                r={6}
                fill="rgba(255,255,255,0.3)"
                stroke="#fff"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
                data-conn-id={conn.id}
                data-endpoint="target"
              />
            </>
          ) : null}
        </g>
      );
    });
  };

  const renderConnectingLine = () => {
    if (!connectingFrom || !connectMouse) return null;
    const sourceCard = cards[connectingFrom];
    if (!sourceCard) return null;
    const sourcePt = getCardEdgePoint(sourceCard, connectMouse.x, connectMouse.y, 0, 0);
    const dx = connectMouse.x - sourcePt.x;
    const dy = connectMouse.y - sourcePt.y;
    const cp1 = { x: sourcePt.x + dx * 0.4, y: sourcePt.y + dy * 0.2 };
    const cp2 = { x: sourcePt.x + dx * 0.6, y: sourcePt.y + dy * 0.8 };

    return (
      <path
        d={`M ${sourcePt.x} ${sourcePt.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${connectMouse.x} ${connectMouse.y}`}
        fill="none"
        stroke="rgba(180,124,255,0.6)"
        strokeWidth={2}
        strokeDasharray="6 4"
        filter="url(#connect-glow)"
      />
    );
  };

  const renderCards = () => {
    return Object.values(cards).map((card) => {
      const filtered = isCardFiltered(card.id);
      const isCreating = creatingCards.some((c) => c.id === card.id);
      const opacity = filtered ? 1 : 0.15;
      const isDragging = dragState?.type === "card" && dragState.cardId === card.id;
      const scale = isCreating ? 0.6 : 1;
      const creatingAnim = isCreating
        ? "cardCreate 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
        : "none";

      return (
        <div
          key={card.id}
          data-card-id={card.id}
          style={{
            position: "absolute",
            left: card.x,
            top: card.y,
            width: CARD_W,
            height: CARD_H,
            opacity,
            transform: `scale(${scale})${isDragging ? " rotate(1deg)" : ""}`,
            transition: isDragging
              ? "none"
              : "opacity 0.4s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            animation: creatingAnim,
            cursor: isDragging ? "grabbing" : "grab",
            zIndex: isDragging ? 100 : hoverCard === card.id ? 50 : 10,
          }}
          onMouseEnter={() => setHoverCard(card.id)}
          onMouseLeave={() => setHoverCard(null)}
          onContextMenu={(e) => handleCardContextMenu(e, card.id)}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: 14,
              border: `1.5px solid ${card.color}44`,
              boxShadow: `0 0 16px ${card.color}22, 0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)`,
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              overflow: "hidden",
              transition: "box-shadow 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${card.color}44, 0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)`;
              (e.currentTarget as HTMLElement).style.borderColor = `${card.color}88`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${card.color}22, 0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)`;
              (e.currentTarget as HTMLElement).style.borderColor = `${card.color}44`;
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: card.color,
                  boxShadow: `0 0 6px ${card.color}`,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontSize: 13,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {card.title}
              </div>
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 11,
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                flex: 1,
              }}
            >
              {card.description || "双击编辑..."}
            </div>
            <div
              data-connect={card.id}
              style={{
                position: "absolute",
                right: -6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: card.color,
                opacity: hoverCard === card.id ? 0.8 : 0,
                cursor: "crosshair",
                transition: "opacity 0.2s",
                boxShadow: `0 0 8px ${card.color}`,
              }}
            />
          </div>
        </div>
      );
    });
  };

  const renderDestroyingCards = () => {
    return destroyingCards.map((dc) => {
      const elapsed = Date.now() - dc.startTime;
      const progress = Math.min(elapsed / 600, 1);
      const fragments = 8;

      return (
        <div
          key={`destroy-${dc.id}`}
          style={{ position: "absolute", left: dc.x, top: dc.y, pointerEvents: "none" }}
        >
          {Array.from({ length: fragments }).map((_, i) => {
            const angle = (i / fragments) * Math.PI * 2;
            const dist = progress * 80;
            const fx = Math.cos(angle) * dist;
            const fy = Math.sin(angle) * dist;
            const rot = progress * 180 * (i % 2 === 0 ? 1 : -1);
            const fragOpacity = 1 - progress;
            const fragScale = 1 - progress * 0.5;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: (i % 3) * (CARD_W / 3),
                  top: Math.floor(i / 3) * (CARD_H / 3),
                  width: CARD_W / 3,
                  height: CARD_H / 3,
                  background: `${dc.color}33`,
                  borderRadius: 4,
                  transform: `translate(${fx}px, ${fy}px) rotate(${rot}deg) scale(${fragScale})`,
                  opacity: fragOpacity,
                  transition: "none",
                }}
              />
            );
          })}
        </div>
      );
    });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" && hoverCard) {
        onDeleteCard(hoverCard);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [hoverCard, onDeleteCard]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        cursor: dragState?.type === "pan" ? "grabbing" : dragState?.type === "connect" ? "crosshair" : "default",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
      >
        <svg
          ref={svgRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <defs>
            <filter id="connect-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {renderConnections()}
          {renderConnectingLine()}
        </svg>

        <div style={{ position: "relative" }}>{renderCards()}</div>
        {renderDestroyingCards()}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          display: "flex",
          gap: 8,
          alignItems: "center",
          zIndex: 10,
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
          borderRadius: 10,
          padding: "6px 14px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            color: "rgba(255,255,255,0.6)",
            padding: "2px 8px",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          重置
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.3)",
          fontSize: 11,
          zIndex: 10,
          pointerEvents: "none",
          textAlign: "center",
        }}
      >
        双击空白处添加卡片 · 拖拽右侧圆点连接卡片 · 滚轮缩放 · Alt+拖拽平移
      </div>

      <style>{`
        @keyframes cardCreate {
          from {
            transform: scale(0.3);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
