import { useEffect, useRef, useState, useCallback } from 'react';
import type { Bridge } from '../Bridge';
import type { Building, UIState } from '../types';

interface ColonyCanvasProps {
  bridge: Bridge;
}

interface HoverInfo {
  building: Building;
  x: number;
  y: number;
}

interface MenuInfo {
  building: Building;
  screenX: number;
  screenY: number;
}

export function ColonyCanvas({ bridge }: ColonyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<UIState | null>(null);
  const animationFrameRef = useRef<number>(0);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [menuInfo, setMenuInfo] = useState<MenuInfo | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const placedAnimationsRef = useRef<Map<string, number>>(new Map());

  const updateState = useCallback((state: UIState) => {
    stateRef.current = state;
    requestRender();
  }, []);

  const requestRender = useCallback(() => {
    if (animationFrameRef.current) return;
    animationFrameRef.current = requestAnimationFrame(render);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) {
      animationFrameRef.current = 0;
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = 0;
      return;
    }

    const gridSize = state.gridSize;
    const cellSize = state.cellSize;
    const width = gridSize * cellSize;
    const height = gridSize * cellSize;

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#2a3040';
    ctx.lineWidth = 1;

    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(width, i * cellSize);
      ctx.stroke();
    }

    const now = Date.now();
    const toRemove: string[] = [];

    state.buildings.forEach((building) => {
      const config = state.buildingConfigs[building.type];
      const x = building.x * cellSize;
      const y = building.y * cellSize;
      const padding = 3;

      let alpha = 1;
      const animStartTime = placedAnimationsRef.current.get(building.id);
      if (animStartTime !== undefined) {
        const elapsed = now - animStartTime;
        const duration = 500;
        if (elapsed < duration) {
          alpha = elapsed / duration;
        } else {
          toRemove.push(building.id);
        }
      }

      ctx.globalAlpha = alpha;

      const gradient = ctx.createRadialGradient(
        x + cellSize / 2, y + cellSize / 2, 0,
        x + cellSize / 2, y + cellSize / 2, cellSize / 2
      );
      gradient.addColorStop(0, config.color + '30');
      gradient.addColorStop(1, config.color + '10');

      ctx.fillStyle = gradient;
      ctx.fillRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2);

      ctx.fillStyle = config.color + '40';
      ctx.strokeStyle = config.color + '80';
      ctx.lineWidth = 1.5;

      const bx = x + padding;
      const by = y + padding;
      const bw = cellSize - padding * 2;
      const bh = cellSize - padding * 2;

      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);

      ctx.globalAlpha = alpha;
      ctx.font = `${cellSize * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(config.icon, x + cellSize / 2, y + cellSize / 2);

      if (building.level > 1) {
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#64ffda';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`Lv${building.level}`, x + cellSize - 4, y + 4);
      }

      if (state.selectedBuildingId === building.id) {
        ctx.strokeStyle = '#64ffda';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        ctx.setLineDash([]);
      }

      ctx.globalAlpha = 1;
    });

    toRemove.forEach((id) => placedAnimationsRef.current.delete(id));

    if (mousePos && state.selectedBuildingType) {
      const gx = Math.floor(mousePos.x / cellSize);
      const gy = Math.floor(mousePos.y / cellSize);

      if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
        const hasBuilding = state.buildings.some((b) => b.x === gx && b.y === gy);
        const config = state.buildingConfigs[state.selectedBuildingType];

        ctx.globalAlpha = 0.5;
        ctx.fillStyle = hasBuilding ? '#e57373' : config.color;
        ctx.fillRect(gx * cellSize + 2, gy * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.globalAlpha = 1;

        ctx.strokeStyle = hasBuilding ? '#e57373' : '#64ffda';
        ctx.lineWidth = 2;
        ctx.strokeRect(gx * cellSize + 1, gy * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    }

    animationFrameRef.current = 0;
  }, [mousePos]);

  useEffect(() => {
    const unsubscribe = bridge.subscribe(updateState);
    return unsubscribe;
  }, [bridge, updateState]);

  useEffect(() => {
    requestRender();
  }, [mousePos, requestRender]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setMousePos({ x, y });

    const cellSize = state.cellSize;
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);

    const building = state.buildings.find((b) => b.x === gx && b.y === gy);
    if (building) {
      setHoverInfo({
        building,
        x: e.clientX + 12,
        y: e.clientY + 12,
      });
    } else {
      setHoverInfo(null);
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoverInfo(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const cellSize = state.cellSize;
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);

    const building = state.buildings.find((b) => b.x === gx && b.y === gy);

    if (state.selectedBuildingType) {
      if (!building) {
        bridge.placeBuilding(gx, gy);
        const newBuildingId = `building-${(state.buildings.length + 1)}`;
        placedAnimationsRef.current.set(newBuildingId, Date.now());
      }
    } else if (building) {
      bridge.selectBuilding(building.id);
      setMenuInfo({
        building,
        screenX: e.clientX,
        screenY: e.clientY,
      });
    } else {
      bridge.selectBuilding(null);
      setMenuInfo(null);
    }
  };

  const handleUpgrade = () => {
    if (menuInfo) {
      bridge.upgradeBuilding(menuInfo.building.id);
      setMenuInfo(null);
    }
  };

  const handleDemolish = () => {
    if (menuInfo) {
      bridge.demolishBuilding(menuInfo.building.id);
      setMenuInfo(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setMenuInfo(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const state = stateRef.current;
  const gridPixelSize = state ? state.gridSize * state.cellSize : 600;

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className="colony-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ width: gridPixelSize, height: gridPixelSize }}
      />

      {hoverInfo && !menuInfo && (
        <div
          className="building-tooltip"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          <div className="tooltip-title">
            {state?.buildingConfigs[hoverInfo.building.type]?.name}
          </div>
          <div className="tooltip-level">等级 {hoverInfo.building.level}</div>
          {(() => {
            const config = state?.buildingConfigs[hoverInfo.building.type];
            if (!config) return null;
            const levelMult = Math.pow(config.efficiencyMultiplier, hoverInfo.building.level - 1);
            return (
              <>
                {Object.entries(config.baseProduction).map(([type, amount]) => (
                  <div key={type} className="tooltip-row">
                    <span>产出 {state?.resources[type as keyof typeof state.resources]?.label}</span>
                    <span className="positive">+{((amount || 0) * levelMult).toFixed(1)}/s</span>
                  </div>
                ))}
                {Object.entries(config.baseConsumption).map(([type, amount]) => (
                  <div key={type} className="tooltip-row">
                    <span>消耗 {state?.resources[type as keyof typeof state.resources]?.label}</span>
                    <span className="negative">-{((amount || 0) * levelMult).toFixed(1)}/s</span>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      )}

      {menuInfo && (
        <div
          className="building-menu"
          style={{ left: menuInfo.screenX, top: menuInfo.screenY }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleUpgrade}>升级建筑</button>
          <button className="danger" onClick={handleDemolish}>拆除</button>
        </div>
      )}
    </div>
  );
}
