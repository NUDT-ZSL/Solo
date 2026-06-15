import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  ToolType,
  LevelElement,
  EnemySpawn,
  Cover,
  PathNode,
} from './types';
import { startSimulation, stopSimulation } from './gameEngine';

let nextId = 1;
function uid(): string {
  return `el_${nextId++}`;
}

const TOOL_CONFIG: { type: ToolType; label: string; icon: string }[] = [
  { type: ToolType.SELECT, label: '选择', icon: '⊹' },
  { type: ToolType.ENEMY_SPAWN, label: '敌人出生点', icon: '☠' },
  { type: ToolType.COVER, label: '掩体', icon: '▭' },
  { type: ToolType.AMMO_BOX, label: '弹药箱', icon: '⬡' },
  { type: ToolType.EXIT, label: '出口', icon: '◎' },
];

function drawEditorGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  offsetX: number,
  offsetY: number,
  zoom: number
) {
  ctx.save();
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 1;
  const step = 40 * zoom;
  const startX = offsetX % step;
  const startY = offsetY % step;
  for (let x = startX; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = startY; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLineOfSight(
  ctx: CanvasRenderingContext2D,
  cover: Cover,
  _w: number,
  _h: number
) {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ff4444';

  const cx = cover.x;
  const cy = cover.y;
  const hw = cover.width / 2;
  const hh = cover.height / 2;

  const dirs = [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },
  ];

  for (const d of dirs) {
    const cornerX = cx + d.x * hw;
    const cornerY = cy + d.y * hh;
    const spread = 0.35;
    const baseAngle = Math.atan2(d.y, d.x);
    ctx.beginPath();
    ctx.moveTo(cornerX, cornerY);
    const dist = 200;
    ctx.arc(cornerX, cornerY, dist, baseAngle - spread, baseAngle + spread);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawCover(ctx: CanvasRenderingContext2D, cover: Cover, selected: boolean) {
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = selected ? '#5a5a7e' : '#4a4a5e';
  const x = cover.x - cover.width / 2;
  const y = cover.y - cover.height / 2;
  ctx.fillRect(x, y, cover.width, cover.height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = selected ? '#aaaacc' : '#8a8a9e';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, cover.width, cover.height);
  ctx.setLineDash([]);

  ctx.fillStyle = '#c0c0d0';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${cover.width}×${cover.height}`, cover.x, cover.y + 4);
  ctx.restore();
}

function drawEnemySpawn(ctx: CanvasRenderingContext2D, spawn: EnemySpawn, selected: boolean) {
  ctx.save();
  ctx.fillStyle = selected ? '#ff8888' : '#ff6b6b';
  ctx.beginPath();
  ctx.arc(spawn.x, spawn.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cc4444';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('E', spawn.x, spawn.y);

  if (spawn.pathNodes.length >= 2) {
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(spawn.pathNodes[0].x, spawn.pathNodes[0].y);
    for (let i = 1; i < spawn.pathNodes.length; i++) {
      ctx.lineTo(spawn.pathNodes[i].x, spawn.pathNodes[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const node of spawn.pathNodes) {
    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2266cc';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawAmmoBox(ctx: CanvasRenderingContext2D, el: LevelElement, selected: boolean) {
  ctx.save();
  ctx.fillStyle = selected ? '#8bc34a' : '#7cb342';
  const size = 18;
  ctx.fillRect(el.x - size / 2, el.y - size / 2, size, size);
  ctx.strokeStyle = '#558b2f';
  ctx.lineWidth = 2;
  ctx.strokeRect(el.x - size / 2, el.y - size / 2, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', el.x, el.y);
  ctx.restore();
}

function drawExit(ctx: CanvasRenderingContext2D, el: LevelElement, selected: boolean) {
  ctx.save();
  ctx.fillStyle = selected ? '#ce93d8' : '#ab47bc';
  ctx.beginPath();
  ctx.arc(el.x, el.y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7b1fa2';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EX', el.x, el.y);
  ctx.restore();
}

function renderEditor(
  ctx: CanvasRenderingContext2D,
  elements: LevelElement[],
  camera: { offsetX: number; offsetY: number; zoom: number },
  selectedId: string | null,
  w: number,
  h: number
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0d0d15';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(camera.offsetX, camera.offsetY);
  ctx.scale(camera.zoom, camera.zoom);

  drawEditorGrid(ctx, w / camera.zoom, h / camera.zoom, 0, 0, 1);

  for (const el of elements) {
    if (el.type === ToolType.COVER) {
      drawLineOfSight(ctx, el as Cover, w, h);
    }
  }

  for (const el of elements) {
    const sel = el.id === selectedId;
    switch (el.type) {
      case ToolType.COVER:
        drawCover(ctx, el as Cover, sel);
        break;
      case ToolType.ENEMY_SPAWN:
        drawEnemySpawn(ctx, el as EnemySpawn, sel);
        break;
      case ToolType.AMMO_BOX:
        drawAmmoBox(ctx, el, sel);
        break;
      case ToolType.EXIT:
        drawExit(ctx, el, sel);
        break;
    }
  }

  ctx.restore();
}

export default function LevelEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const simStateRef = useRef<ReturnType<typeof startSimulation> | null>(null);

  const [currentTool, setCurrentTool] = useState(ToolType.SELECT);
  const [elements, setElements] = useState<LevelElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedCoverSize, setSelectedCoverSize] = useState({ w: 80, h: 60 });

  const cameraRef = useRef({ offsetX: 0, offsetY: 0, zoom: 1 });
  const dragRef = useRef<{
    type: 'none' | 'pan' | 'element' | 'node';
    startX: number;
    startY: number;
    elId?: string;
    nodeId?: string;
    elStartX?: number;
    elStartY?: number;
    camStartX?: number;
    camStartY?: number;
  }>({ type: 'none', startX: 0, startY: 0 });

  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const cam = cameraRef.current;
      return {
        x: (sx - cam.offsetX) / cam.zoom,
        y: (sy - cam.offsetY) / cam.zoom,
      };
    },
    []
  );

  const findElementAt = useCallback(
    (wx: number, wy: number): LevelElement | null => {
      for (let i = elementsRef.current.length - 1; i >= 0; i--) {
        const el = elementsRef.current[i];
        switch (el.type) {
          case ToolType.COVER: {
            const c = el as Cover;
            if (
              wx >= c.x - c.width / 2 &&
              wx <= c.x + c.width / 2 &&
              wy >= c.y - c.height / 2 &&
              wy <= c.y + c.height / 2
            )
              return el;
            break;
          }
          case ToolType.ENEMY_SPAWN: {
            const s = el as EnemySpawn;
            const dx = wx - s.x;
            const dy = wy - s.y;
            if (dx * dx + dy * dy < 16 * 16) return el;
            for (const n of s.pathNodes) {
              const ndx = wx - n.x;
              const ndy = wy - n.y;
              if (ndx * ndx + ndy * ndy < 8 * 8) return el;
            }
            break;
          }
          default: {
            const dx = wx - el.x;
            const dy = wy - el.y;
            if (dx * dx + dy * dy < 16 * 16) return el;
          }
        }
      }
      return null;
    },
    []
  );

  const findPathNode = useCallback(
    (wx: number, wy: number): { spawnId: string; node: PathNode } | null => {
      for (const el of elementsRef.current) {
        if (el.type === ToolType.ENEMY_SPAWN) {
          const s = el as EnemySpawn;
          for (const n of s.pathNodes) {
            const dx = wx - n.x;
            const dy = wy - n.y;
            if (dx * dx + dy * dy < 10 * 10) {
              return { spawnId: s.id, node: n };
            }
          }
        }
      }
      return null;
    },
    []
  );

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderEditor(ctx, elementsRef.current, cameraRef.current, selectedIdRef.current, canvas.width, canvas.height);
    animRef.current = requestAnimationFrame(renderLoop);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    animRef.current = requestAnimationFrame(renderLoop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, [renderLoop]);

  useEffect(() => {
    if (selectedId) {
      const el = elements.find((e) => e.id === selectedId);
      if (el && el.type === ToolType.COVER) {
        const c = el as Cover;
        setSelectedCoverSize({ w: c.width, h: c.height });
      }
    }
  }, [selectedId, elements]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isSimulating) return;
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        dragRef.current = {
          type: 'pan',
          startX: sx,
          startY: sy,
          camStartX: cameraRef.current.offsetX,
          camStartY: cameraRef.current.offsetY,
        };
        return;
      }

      if (currentTool === ToolType.SELECT) {
        const nodeHit = findPathNode(world.x, world.y);
        if (nodeHit) {
          dragRef.current = {
            type: 'node',
            startX: sx,
            startY: sy,
            elId: nodeHit.spawnId,
            nodeId: nodeHit.node.id,
          };
          setSelectedId(nodeHit.spawnId);
          return;
        }

        const hit = findElementAt(world.x, world.y);
        if (hit) {
          dragRef.current = {
            type: 'element',
            startX: sx,
            startY: sy,
            elId: hit.id,
            elStartX: hit.x,
            elStartY: hit.y,
          };
          setSelectedId(hit.id);
        } else {
          dragRef.current = {
            type: 'pan',
            startX: sx,
            startY: sy,
            camStartX: cameraRef.current.offsetX,
            camStartY: cameraRef.current.offsetY,
          };
          setSelectedId(null);
        }
        return;
      }

      if (currentTool === ToolType.ENEMY_SPAWN) {
        const spawn: EnemySpawn = {
          id: uid(),
          type: ToolType.ENEMY_SPAWN,
          x: world.x,
          y: world.y,
          pathNodes: [
            { id: uid(), x: world.x + 80, y: world.y },
            { id: uid(), x: world.x - 80, y: world.y },
          ],
          patrolSpeed: 80,
        };
        setElements((prev) => [...prev, spawn]);
        return;
      }

      if (currentTool === ToolType.COVER) {
        const cover: Cover = {
          id: uid(),
          type: ToolType.COVER,
          x: world.x,
          y: world.y,
          width: 80,
          height: 60,
        };
        setElements((prev) => [...prev, cover]);
        return;
      }

      if (currentTool === ToolType.AMMO_BOX) {
        setElements((prev) => [
          ...prev,
          { id: uid(), type: ToolType.AMMO_BOX, x: world.x, y: world.y },
        ]);
        return;
      }

      if (currentTool === ToolType.EXIT) {
        setElements((prev) => [
          ...prev,
          { id: uid(), type: ToolType.EXIT, x: world.x, y: world.y },
        ]);
        return;
      }
    },
    [currentTool, isSimulating, screenToWorld, findElementAt, findPathNode]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isSimulating) return;
      const drag = dragRef.current;
      if (drag.type === 'none') return;

      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (drag.type === 'pan') {
        const dx = sx - drag.startX;
        const dy = sy - drag.startY;
        cameraRef.current.offsetX = drag.camStartX! + dx;
        cameraRef.current.offsetY = drag.camStartY! + dy;
        return;
      }

      if (drag.type === 'element' && drag.elId) {
        const cam = cameraRef.current;
        const dx = (sx - drag.startX) / cam.zoom;
        const dy = (sy - drag.startY) / cam.zoom;
        setElements((prev) =>
          prev.map((el) =>
            el.id === drag.elId
              ? { ...el, x: drag.elStartX! + dx, y: drag.elStartY! + dy }
              : el
          )
        );
        return;
      }

      if (drag.type === 'node' && drag.elId && drag.nodeId) {
        const world = screenToWorld(sx, sy);
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== drag.elId || el.type !== ToolType.ENEMY_SPAWN) return el;
            const spawn = el as EnemySpawn;
            return {
              ...spawn,
              pathNodes: spawn.pathNodes.map((n) =>
                n.id === drag.nodeId ? { ...n, x: world.x, y: world.y } : n
              ),
            };
          })
        );
      }
    },
    [isSimulating, screenToWorld]
  );

  const handleCanvasMouseUp = useCallback(() => {
    dragRef.current = { type: 'none', startX: 0, startY: 0 };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (isSimulating) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const cam = cameraRef.current;
    const oldZoom = cam.zoom;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(2.0, oldZoom * delta));

    const worldX = (mx - cam.offsetX) / oldZoom;
    const worldY = (my - cam.offsetY) / oldZoom;

    cam.zoom = newZoom;
    cam.offsetX = mx - worldX * newZoom;
    cam.offsetY = my - worldY * newZoom;
  }, [isSimulating]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isSimulating) return;
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);

      const hit = findElementAt(world.x, world.y);
      if (hit && hit.type === ToolType.ENEMY_SPAWN) {
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== hit.id || el.type !== ToolType.ENEMY_SPAWN) return el;
            const spawn = el as EnemySpawn;
            const lastNode = spawn.pathNodes[spawn.pathNodes.length - 1];
            const newNode: PathNode = {
              id: uid(),
              x: lastNode.x + 60,
              y: lastNode.y,
            };
            return { ...spawn, pathNodes: [...spawn.pathNodes, newNode] };
          })
        );
      }
    },
    [isSimulating, screenToWorld, findElementAt]
  );

  const handleCoverWidthChange = useCallback(
    (val: number) => {
      setSelectedCoverSize((prev) => ({ ...prev, w: val }));
      if (selectedId) {
        setElements((prev) =>
          prev.map((el) =>
            el.id === selectedId && el.type === ToolType.COVER
              ? { ...(el as Cover), width: val }
              : el
          )
        );
      }
    },
    [selectedId]
  );

  const handleCoverHeightChange = useCallback(
    (val: number) => {
      setSelectedCoverSize((prev) => ({ ...prev, h: val }));
      if (selectedId) {
        setElements((prev) =>
          prev.map((el) =>
            el.id === selectedId && el.type === ToolType.COVER
              ? { ...(el as Cover), height: val }
              : el
          )
        );
      }
    },
    [selectedId]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedId) {
      setElements((prev) => prev.filter((el) => el.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId]);

  const handleTestRun = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (elements.length === 0) return;

    cancelAnimationFrame(animRef.current);
    setIsSimulating(true);

    simStateRef.current = startSimulation(canvas, elements, () => {
      setIsSimulating(false);
      animRef.current = requestAnimationFrame(renderLoop);
    });
  }, [elements, renderLoop]);

  const handleStopSim = useCallback(() => {
    if (simStateRef.current) {
      stopSimulation(simStateRef.current);
      simStateRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDeleteSelected]);

  const selectedEl = elements.find((el) => el.id === selectedId);

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#0d0d15',
      }}
    >
      <div
        style={{
          width: 200,
          minWidth: 200,
          background: '#1e1e2e',
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          gap: 12,
          borderRight: '1px solid #2a2a3e',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#e0e0e0',
            marginBottom: 4,
            letterSpacing: 1,
          }}
        >
          工具面板
        </div>

        {TOOL_CONFIG.map((t) => (
          <button
            key={t.type}
            onClick={() => setCurrentTool(t.type)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 6,
              border: 'none',
              background: currentTool === t.type ? '#ff6b6b' : '#3a3a4e',
              color: '#e0e0e0',
              fontSize: 18,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (currentTool !== t.type) {
                (e.currentTarget as HTMLButtonElement).style.background = '#4a4a5e';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentTool !== t.type) {
                (e.currentTarget as HTMLButtonElement).style.background = '#3a3a4e';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }
            }}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}

        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
          当前: {TOOL_CONFIG.find((t) => t.type === currentTool)?.label}
        </div>

        <div
          style={{
            width: '100%',
            height: 1,
            background: '#2a2a3e',
            margin: '8px 0',
          }}
        />

        <button
          onClick={isSimulating ? handleStopSim : handleTestRun}
          style={{
            width: 100,
            height: 40,
            borderRadius: 8,
            border: 'none',
            background: isSimulating ? '#ff6b6b' : '#4fc3f7',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              isSimulating ? '#ff5252' : '#29b6f6';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              isSimulating ? '#ff6b6b' : '#4fc3f7';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {isSimulating ? '停止测试' : '测试运行'}
        </button>

        {isSimulating && (
          <div style={{ fontSize: 11, color: '#4fc3f7', marginTop: 4 }}>
            WASD移动 | 鼠标射击<br />Esc退出
          </div>
        )}

        <div
          style={{
            width: '100%',
            height: 1,
            background: '#2a2a3e',
            margin: '8px 0',
          }}
        />

        {selectedEl && (
          <div style={{ fontSize: 11, color: '#aaa' }}>
            <div style={{ marginBottom: 6, color: '#e0e0e0', fontWeight: 600 }}>
              已选中: {TOOL_CONFIG.find((t) => t.type === selectedEl.type)?.label}
            </div>
            <div>
              x: {Math.round(selectedEl.x)}, y: {Math.round(selectedEl.y)}
            </div>
            {selectedEl.type === ToolType.COVER && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>
                  宽: {selectedCoverSize.w}
                </label>
                <input
                  type="range"
                  min={60}
                  max={120}
                  value={selectedCoverSize.w}
                  onChange={(e) => handleCoverWidthChange(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <label style={{ display: 'block', marginBottom: 4, marginTop: 6 }}>
                  高: {selectedCoverSize.h}
                </label>
                <input
                  type="range"
                  min={40}
                  max={80}
                  value={selectedCoverSize.h}
                  onChange={(e) => handleCoverHeightChange(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            )}
            {selectedEl.type === ToolType.ENEMY_SPAWN && (
              <div style={{ marginTop: 6, color: '#4488ff' }}>
                双击添加路径节点<br />拖拽节点调整位置
              </div>
            )}
            <button
              onClick={handleDeleteSelected}
              style={{
                marginTop: 10,
                width: '100%',
                height: 28,
                borderRadius: 4,
                border: '1px solid #ff6b6b',
                background: 'transparent',
                color: '#ff6b6b',
                fontSize: 11,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#ff6b6b';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = '#ff6b6b';
              }}
            >
              删除元素
            </button>
          </div>
        )}

        {!selectedEl && !isSimulating && (
          <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
            <div style={{ color: '#888', fontWeight: 600, marginBottom: 4 }}>操作提示</div>
            选择工具 → 点击画布放置<br />
            选择模式 → 拖拽移动元素<br />
            鼠标拖拽空白区 → 平移<br />
            滚轮 → 缩放<br />
            Delete → 删除选中
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor:
              currentTool === ToolType.SELECT
                ? 'default'
                : 'crosshair',
          }}
        />

        {isSimulating && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(30, 30, 46, 0.85)',
              padding: '6px 20px',
              borderRadius: 6,
              color: '#4fc3f7',
              fontSize: 13,
              fontWeight: 600,
              pointerEvents: 'none',
              border: '1px solid rgba(79, 195, 247, 0.3)',
            }}
          >
            模拟运行中 — WASD移动 | 鼠标点击射击 | Esc退出
          </div>
        )}
      </div>
    </div>
  );
}
