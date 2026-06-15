import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeData, EdgeData, Tag, Character } from '../types';

interface CanvasProps {
  nodes: NodeData[];
  edges: EdgeData[];
  tags: Tag[];
  characters: Character[];
  onNodeCreate: (node: Partial<NodeData>) => void;
  onNodeUpdate: (id: string, updates: Partial<NodeData>) => void;
  onNodeDelete: (id: string) => void;
  onEdgeCreate: (edge: Partial<EdgeData>) => void;
  onEdgeDelete: (id: string) => void;
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 150;
const TIMELINE_HEIGHT = 80;
const TIMELINE_SNAP_INTERVAL = 120;
const SNAP_THRESHOLD_PX = 40;

const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  tags,
  characters,
  onNodeCreate,
  onNodeUpdate,
  onNodeDelete,
  onEdgeCreate,
  onEdgeDelete,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const viewportHeightRef = useRef(0);

  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [connecting, setConnecting] = useState<{
    sourceId: string;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [openTagSelector, setOpenTagSelector] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);

  const getTagById = (id?: string) => tags.find((t) => t.id === id);
  const getCharacterById = (id?: string) => characters.find((c) => c.id === id);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      if (!viewportRef.current) return { x: 0, y: 0 };
      const rect = viewportRef.current.getBoundingClientRect();
      const x = (screenX - rect.left - offset.x) / scale;
      const y = (screenY - rect.top - offset.y) / scale;
      return { x, y };
    },
    [offset, scale]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        setSpacePressed(true);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => {
        const next = Math.min(2.0, Math.max(0.5, prev * delta));
        return next;
      });
    },
    []
  );

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== viewportRef.current) return;
    if (spacePressed) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setOffset({
        x: panStartRef.current.offsetX + dx,
        y: panStartRef.current.offsetY + dy,
      });
      return;
    }

    if (connecting) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      setConnecting({ ...connecting, mouseX: x, mouseY: y });
    }

    if (draggingNode) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const newX = x - dragOffsetRef.current.x;
      const newY = y - dragOffsetRef.current.y;

      const viewportHeight = viewportRef.current
        ? viewportRef.current.clientHeight
        : 600;
      const viewportBottomY = viewportHeight / scale;
      const snapThreshold = SNAP_THRESHOLD_PX / scale;
      const cardBottomY = newY + CARD_HEIGHT;
      const distanceToTimeline = viewportBottomY - cardBottomY;

      let timelinePosition: number | undefined = undefined;
      let finalX = newX;
      let finalY = newY;

      if (Math.abs(distanceToTimeline) <= snapThreshold) {
        const centerX = newX + CARD_WIDTH / 2;
        const snapPos =
          Math.round(centerX / TIMELINE_SNAP_INTERVAL) * TIMELINE_SNAP_INTERVAL;
        timelinePosition = snapPos;
        finalX = snapPos - CARD_WIDTH / 2;
        finalY = viewportBottomY - CARD_HEIGHT;
      }

      onNodeUpdate(draggingNode, {
        x: finalX,
        y: finalY,
        timelinePosition,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
    if (connecting) {
      setConnecting(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== viewportRef.current) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    onNodeCreate({
      x: x - CARD_WIDTH / 2,
      y: y - CARD_HEIGHT / 2,
      title: '新节点',
      description: '',
    });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    dragOffsetRef.current = {
      x: x - node.x,
      y: y - node.y,
    };
    setDraggingNode(nodeId);
    setOpenTagSelector(null);
  };

  const handleHandleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setConnecting({
      sourceId: nodeId,
      mouseX: node.x + CARD_WIDTH,
      mouseY: node.y + CARD_HEIGHT / 2,
    });
  };

  const handleNodeMouseUp = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connecting && connecting.sourceId !== nodeId) {
      const exists = edges.some(
        (ed) => ed.source === connecting.sourceId && ed.target === nodeId
      );
      if (!exists) {
        onEdgeCreate({
          source: connecting.sourceId,
          target: nodeId,
          label: '关联',
        });
      }
      setConnecting(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    const characterData = e.dataTransfer.getData('character');
    if (characterData) {
      const char: Character = JSON.parse(characterData);
      onNodeCreate({
        x: x - CARD_WIDTH / 2,
        y: y - CARD_HEIGHT / 2,
        title: char.name,
        description: char.description || '',
        characterId: char.id,
      });
      return;
    }
  };

  const handleNodeDrop = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const tagData = e.dataTransfer.getData('tag');
    if (tagData) {
      const tag: Tag = JSON.parse(tagData);
      onNodeUpdate(nodeId, { tagId: tag.id });
    }
  };

  const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  const getArrowMarker = (color: string) => {
    const id = `arrow-${color.replace('#', '')}`;
    return `url(#${id})`;
  };

  const handleTagSelect = (nodeId: string, tagId: string | undefined) => {
    onNodeUpdate(nodeId, { tagId });
    setOpenTagSelector(null);
  };

  const toggleTagSelector = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setOpenTagSelector(openTagSelector === nodeId ? null : nodeId);
  };

  const handleDescriptionChange = (nodeId: string, text: string) => {
    onNodeUpdate(nodeId, { description: text });
  };

  const handleTitleChange = (nodeId: string, text: string) => {
    onNodeUpdate(nodeId, { title: text });
  };

  const timelineNodes = nodes.filter((n) => n.timelinePosition !== undefined);

  return (
    <div className="canvas-container" ref={canvasRef}>
      <div
        ref={viewportRef}
        className={`canvas-viewport ${spacePressed ? 'panning-cursor' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className="canvas-content"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          <svg className="edges-layer">
            <defs>
              {['#dfe6e9', '#6c5ce7'].map((color) => (
                <marker
                  key={color}
                  id={`arrow-${color.replace('#', '')}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  fill={color}
                >
                  <polygon points="0 0, 10 3, 0 6" />
                </marker>
              ))}
            </defs>

            {edges.map((edge) => {
              const source = nodes.find((n) => n.id === edge.source);
              const target = nodes.find((n) => n.id === edge.target);
              if (!source || !target) return null;
              const x1 = source.x + CARD_WIDTH;
              const y1 = source.y + CARD_HEIGHT / 2;
              const x2 = target.x;
              const y2 = target.y + CARD_HEIGHT / 2;
              const isHovered = hoveredEdge === edge.id;
              const color = isHovered ? '#6c5ce7' : '#dfe6e9';
              const width = isHovered ? 4 : 2;

              return (
                <g key={edge.id}>
                  <path
                    d={getBezierPath(x1, y1, x2, y2)}
                    stroke={color}
                    strokeWidth={width}
                    fill="none"
                    markerEnd={getArrowMarker(color)}
                    style={{ transition: 'all 0.15s ease' }}
                    onMouseEnter={() => setHoveredEdge(edge.id)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                  {isHovered && (
                    <g>
                      <rect
                        x={(x1 + x2) / 2 - 30}
                        y={(y1 + y2) / 2 - 14}
                        width="60"
                        height="20"
                        rx="4"
                        fill="#2d3436"
                        opacity="0.9"
                      />
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        dominantBaseline="middle"
                      >
                        {edge.label || '关联'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {connecting && connecting.sourceId && (
              <path
                d={getBezierPath(
                  (nodes.find((n) => n.id === connecting.sourceId)?.x ??
                    0) + CARD_WIDTH,
                  (nodes.find((n) => n.id === connecting.sourceId)?.y ??
                    0) +
                    CARD_HEIGHT / 2,
                  connecting.mouseX,
                  connecting.mouseY
                )}
                stroke="#6c5ce7"
                strokeWidth="2"
                strokeDasharray="6,6"
                fill="none"
              />
            )}
          </svg>

          {nodes.map((node) => {
            const tag = getTagById(node.tagId);
            const character = getCharacterById(node.characterId);
            const isDragging = draggingNode === node.id;
            const isTagOpen = openTagSelector === node.id;

            return (
              <div
                key={node.id}
                className={`node-card ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleNodeDrop(e, node.id)}
                onClick={() => setOpenTagSelector(null)}
              >
                {tag && (
                  <div
                    className="tag-indicator"
                    style={{ backgroundColor: tag.color }}
                    title={tag.name}
                  />
                )}

                {character && (
                  <div className="char-avatar-small" title={character.name} />
                )}

                <div
                  className="card-title"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    handleTitleChange(node.id, e.currentTarget.textContent || '')
                  }
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {node.title}
                </div>

                <div
                  className="card-desc"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    handleDescriptionChange(
                      node.id,
                      e.currentTarget.textContent || ''
                    )
                  }
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {node.description || '点击编辑描述...'}
                </div>

                <div className="card-toolbar">
                  <button className="tool-btn" title="加粗">
                    B
                  </button>
                  <button className="tool-btn" title="斜体">
                    I
                  </button>
                  <button className="tool-btn" title="删除线">
                    S
                  </button>
                  <div className="tag-selector-wrapper">
                    <button
                      className="tag-selector-btn"
                      onClick={(e) => toggleTagSelector(e, node.id)}
                      title="选择标签"
                    >
                      🏷️
                    </button>
                    {isTagOpen && (
                      <div
                        className="tag-dropdown"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className="tag-option"
                          onClick={() => handleTagSelect(node.id, undefined)}
                        >
                          <span className="tag-dot none"></span>
                          无标签
                        </div>
                        {tags.map((t) => (
                          <div
                            key={t.id}
                            className="tag-option"
                            onClick={() => handleTagSelect(node.id, t.id)}
                          >
                            <span
                              className="tag-dot"
                              style={{ backgroundColor: t.color }}
                            ></span>
                            {t.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="connect-handle"
                  onMouseDown={(e) => handleHandleMouseDown(e, node.id)}
                  title="拖拽连线"
                >
                  ✥
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="timeline">
        <div className="timeline-track">
          {timelineNodes.map((node) => {
            const pos = node.timelinePosition ?? 0;
            const screenX = pos * scale + offset.x;
            return (
              <div
                key={node.id}
                className="timeline-anchor"
                style={{ left: screenX }}
                title={node.title}
              />
            );
          })}
        </div>
        <div className="timeline-label">时间轴 · 拖拽卡片到此处吸附</div>
      </div>

      <style>{`
        .canvas-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          min-width: 0;
        }

        .canvas-viewport {
          flex: 1;
          background: #f5f5fa;
          position: relative;
          overflow: hidden;
          cursor: default;
          min-height: 0;
        }

        .canvas-viewport.panning-cursor {
          cursor: grab;
        }

        .canvas-viewport.panning-cursor:active {
          cursor: grabbing;
        }

        .canvas-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .edges-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .edges-layer path {
          pointer-events: stroke;
          cursor: pointer;
        }

        .node-card {
          position: absolute;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          padding: 16px;
          cursor: grab;
          transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
          user-select: none;
        }

        .node-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }

        .node-card.dragging {
          transform: scale(1.05);
          box-shadow: 0 8px 30px rgba(0,0,0,0.2);
          cursor: grabbing;
          z-index: 10;
        }

        .tag-indicator {
          position: absolute;
          top: 8px;
          left: 8px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .char-avatar-small {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: #b2bec3;
        }

        .card-title {
          font-size: 16px;
          font-weight: 700;
          color: #2d3436;
          margin-bottom: 8px;
          margin-top: 8px;
          outline: none;
          min-height: 22px;
        }

        .card-title:focus {
          background: #f5f5fa;
          border-radius: 4px;
          padding: 2px 4px;
          margin: -2px -4px 6px;
        }

        .card-desc {
          font-size: 13px;
          color: #636e72;
          line-height: 1.5;
          min-height: 36px;
          outline: none;
          margin-bottom: 10px;
        }

        .card-desc:focus {
          background: #f5f5fa;
          border-radius: 4px;
          padding: 4px;
          margin: -4px -4px 6px;
        }

        .card-toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding-top: 8px;
          border-top: 1px solid #f0f0f0;
        }

        .tool-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: #b2bec3;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .tool-btn:hover {
          background: #f5f5fa;
          color: #636e72;
        }

        .tag-selector-wrapper {
          margin-left: auto;
          position: relative;
        }

        .tag-selector-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          font-size: 12px;
          transition: background 0.2s ease;
        }

        .tag-selector-btn:hover {
          background: #f5f5fa;
        }

        .tag-dropdown {
          position: absolute;
          bottom: 28px;
          right: 0;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          padding: 4px;
          z-index: 20;
          min-width: 100px;
        }

        .tag-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          color: #2d3436;
          transition: background 0.15s ease;
        }

        .tag-option:hover {
          background: #f5f5fa;
        }

        .tag-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .tag-dot.none {
          background: #dfe6e9;
          border: 1px dashed #b2bec3;
        }

        .connect-handle {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: crosshair;
          color: #b2bec3;
          font-size: 14px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .connect-handle:hover {
          color: #6c5ce7;
          background: #f5f5fa;
        }

        .timeline {
          height: ${TIMELINE_HEIGHT}px;
          background: #ffffff;
          border-top: 1px solid #e8e8e8;
          position: relative;
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .timeline-track {
          position: absolute;
          top: 50%;
          left: 0;
          width: 100%;
          height: 2px;
          background: #dfe6e9;
        }

        .timeline-anchor {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #b2bec3;
        }

        .timeline-label {
          position: absolute;
          bottom: 8px;
          left: 16px;
          font-size: 12px;
          color: #b2bec3;
        }
      `}</style>
    </div>
  );
};

export default Canvas;
