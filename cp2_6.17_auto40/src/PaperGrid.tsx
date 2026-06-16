import { useRef, useEffect, useCallback } from "react";
import { useOrigamiStore } from "./store";
import { findNearestGridPoint, isPointOnPaper, rotate, translate, findNearestCrease } from "./FoldEngine";
import type { Point, FoldLayer, Crease } from "./FoldEngine";

const GRID_SIZE = 20;
const PAPER_SIZE = 400;
const CANVAS_PADDING = 60;

function generateDeformedGridLines(
  layer: FoldLayer,
  gridSize: number
): { horizontal: Point[][]; vertical: Point[][] } {
  const horizontal: Point[][] = [];
  const vertical: Point[][] = [];

  const vertices = layer.vertices;
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const startX = Math.ceil(minX / gridSize) * gridSize;
  const endX = Math.floor(maxX / gridSize) * gridSize;
  const startY = Math.ceil(minY / gridSize) * gridSize;
  const endY = Math.floor(maxY / gridSize) * gridSize;

  for (let x = startX; x <= endX; x += gridSize) {
    const intersections: Point[] = [];
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % n];
      const minEdgeX = Math.min(p1.x, p2.x);
      const maxEdgeX = Math.max(p1.x, p2.x);
      if (x >= minEdgeX && x <= maxEdgeX && Math.abs(p1.x - p2.x) > 0.001) {
        const t = (x - p1.x) / (p2.x - p1.x);
        if (t >= 0 && t <= 1) {
          intersections.push({ x, y: p1.y + t * (p2.y - p1.y) });
        }
      }
    }
    if (intersections.length >= 2) {
      intersections.sort((a, b) => a.y - b.y);
      vertical.push(intersections);
    }
  }

  for (let y = startY; y <= endY; y += gridSize) {
    const intersections: Point[] = [];
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % n];
      const minEdgeY = Math.min(p1.y, p2.y);
      const maxEdgeY = Math.max(p1.y, p2.y);
      if (y >= minEdgeY && y <= maxEdgeY && Math.abs(p1.y - p2.y) > 0.001) {
        const t = (y - p1.y) / (p2.y - p1.y);
        if (t >= 0 && t <= 1) {
          intersections.push({ x: p1.x + t * (p2.x - p1.x), y });
        }
      }
    }
    if (intersections.length >= 2) {
      intersections.sort((a, b) => a.x - b.x);
      horizontal.push(intersections);
    }
  }

  return { horizontal, vertical };
}

function drawDeformedGrid(
  ctx: CanvasRenderingContext2D,
  layer: FoldLayer,
  rotation: number,
  offsetX: number,
  offsetY: number
) {
  const { horizontal, vertical } = generateDeformedGridLines(layer, GRID_SIZE);

  ctx.strokeStyle = "#d3d3d3";

  for (const line of vertical) {
    if (line.length < 2) continue;
    ctx.lineWidth = line[0].x % 100 === 0 ? 1.5 : 0.5;
    ctx.beginPath();
    for (let i = 0; i < line.length; i++) {
      let p = line[i];
      if (rotation !== 0) {
        p = rotate([p], rotation)[0];
      }
      if (offsetX !== 0 || offsetY !== 0) {
        p = translate([p], offsetX, offsetY)[0];
      }
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  }

  for (const line of horizontal) {
    if (line.length < 2) continue;
    ctx.lineWidth = line[0].y % 100 === 0 ? 1.5 : 0.5;
    ctx.beginPath();
    for (let i = 0; i < line.length; i++) {
      let p = line[i];
      if (rotation !== 0) {
        p = rotate([p], rotation)[0];
      }
      if (offsetX !== 0 || offsetY !== 0) {
        p = translate([p], offsetX, offsetY)[0];
      }
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  }
}

function drawCreases(
  ctx: CanvasRenderingContext2D,
  creases: Crease[],
  highlightedCrease: Crease | null,
  rotation: number,
  offsetX: number,
  offsetY: number
) {
  for (const crease of creases) {
    let start = crease.start;
    let end = crease.end;
    if (rotation !== 0) {
      start = rotate([start], rotation)[0];
      end = rotate([end], rotation)[0];
    }
    if (offsetX !== 0 || offsetY !== 0) {
      start = translate([start], offsetX, offsetY)[0];
      end = translate([end], offsetX, offsetY)[0];
    }

    const isHighlighted = highlightedCrease &&
      highlightedCrease.start.x === crease.start.x &&
      highlightedCrease.start.y === crease.start.y &&
      highlightedCrease.end.x === crease.end.x &&
      highlightedCrease.end.y === crease.end.y;

    ctx.save();
    ctx.strokeStyle = isHighlighted ? "#ff6b6b" : "#e74c3c";
    ctx.lineWidth = isHighlighted ? 3 : 2;
    ctx.setLineDash([4, 4]);
    if (isHighlighted) {
      ctx.shadowColor = "rgba(255, 107, 107, 0.6)";
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSelectedPoints(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  rotation: number,
  offsetX: number,
  offsetY: number
) {
  for (const point of points) {
    let p = point;
    if (rotation !== 0) {
      p = rotate([p], rotation)[0];
    }
    if (offsetX !== 0 || offsetY !== 0) {
      p = translate([p], offsetX, offsetY)[0];
    }

    ctx.save();
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

function drawSnapIndicator(
  ctx: CanvasRenderingContext2D,
  gridPoint: Point | null,
  mousePoint: Point | null,
  rotation: number,
  offsetX: number,
  offsetY: number
) {
  if (!gridPoint || !mousePoint) return;

  let gp = gridPoint;
  let mp = mousePoint;

  if (rotation !== 0) {
    gp = rotate([gp], rotation)[0];
    mp = rotate([mp], rotation)[0];
  }
  if (offsetX !== 0 || offsetY !== 0) {
    gp = translate([gp], offsetX, offsetY)[0];
    mp = translate([mp], offsetX, offsetY)[0];
  }

  ctx.save();
  ctx.strokeStyle = "rgba(26, 188, 156, 0.6)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(mp.x, mp.y);
  ctx.lineTo(gp.x, gp.y);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(26, 188, 156, 0.2)";
  ctx.beginPath();
  ctx.arc(gp.x, gp.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1abc9c";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(gp.x, gp.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#1abc9c";
  ctx.fill();
  ctx.restore();
}

function drawCurrentCrease(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  crease: { start: Point; end: Point } | null,
  rotation: number,
  offsetX: number,
  offsetY: number
) {
  if (!crease || points.length < 2) return;

  let start = crease.start;
  let end = crease.end;
  if (rotation !== 0) {
    start = rotate([start], rotation)[0];
    end = rotate([end], rotation)[0];
  }
  if (offsetX !== 0 || offsetY !== 0) {
    start = translate([start], offsetX, offsetY)[0];
    end = translate([end], offsetX, offsetY)[0];
  }

  ctx.save();
  ctx.strokeStyle = "#e74c3c";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.restore();
}

function drawRotationOutline(
  ctx: CanvasRenderingContext2D,
  layers: FoldLayer[],
  rotation: number,
  offsetX: number,
  offsetY: number
) {
  for (const layer of layers) {
    let vertices = layer.vertices;
    if (rotation !== 0) {
      vertices = rotate(vertices, rotation);
    }
    if (offsetX !== 0 || offsetY !== 0) {
      vertices = translate(vertices, offsetX, offsetY);
    }
    if (vertices.length < 3) continue;

    ctx.save();
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

export default function PaperGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    toolMode,
    rotation,
    offsetX,
    offsetY,
    isRotating,
    paperState,
    selectedPoints,
    currentCrease,
    isAnimating,
    animationProgress,
    selectGridPoint,
    executeFold,
    hoverPoint,
    nearestGridPoint,
    highlightedCrease,
    setHoverPoint,
    setNearestGridPoint,
    setHighlightedCrease,
  } = useOrigamiStore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasW = PAPER_SIZE + CANVAS_PADDING * 2;
    const canvasH = PAPER_SIZE + CANVAS_PADDING * 2;

    ctx.clearRect(0, 0, canvasW, canvasH);

    ctx.save();
    ctx.translate(CANVAS_PADDING, CANVAS_PADDING);

    const shadowOffsetX = offsetX * 0.3;
    const shadowOffsetY = offsetY * 0.3 + 2;
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;

    for (const layer of paperState.layers) {
      let vertices = layer.vertices;
      if (rotation !== 0) {
        vertices = rotate(vertices, rotation);
      }
      if (offsetX !== 0 || offsetY !== 0) {
        vertices = translate(vertices, offsetX, offsetY);
      }
      if (vertices.length < 3) continue;

      ctx.save();
      if (isAnimating && layer.opacity < 1) {
        ctx.globalAlpha = layer.opacity * (1 - animationProgress * 0.3);
      } else {
        ctx.globalAlpha = layer.opacity;
      }

      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    for (const layer of paperState.layers) {
      let vertices = layer.vertices;
      if (rotation !== 0) {
        vertices = rotate(vertices, rotation);
      }
      if (offsetX !== 0 || offsetY !== 0) {
        vertices = translate(vertices, offsetX, offsetY);
      }
      if (vertices.length < 3) continue;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();
      ctx.clip();

      drawDeformedGrid(ctx, layer, rotation, offsetX, offsetY);
      ctx.restore();
    }

    drawCreases(ctx, paperState.creases, highlightedCrease, rotation, offsetX, offsetY);
    drawCurrentCrease(ctx, selectedPoints, currentCrease, rotation, offsetX, offsetY);
    drawSelectedPoints(ctx, selectedPoints, rotation, offsetX, offsetY);

    if (toolMode === "fold" && nearestGridPoint && hoverPoint) {
      drawSnapIndicator(ctx, nearestGridPoint, hoverPoint, rotation, offsetX, offsetY);
    }

    if (isRotating) {
      drawRotationOutline(ctx, paperState.layers, rotation, offsetX, offsetY);
    }

    ctx.restore();
  }, [
    paperState,
    rotation,
    offsetX,
    offsetY,
    isRotating,
    selectedPoints,
    currentCrease,
    isAnimating,
    animationProgress,
    toolMode,
    hoverPoint,
    nearestGridPoint,
    highlightedCrease,
  ]);

  useEffect(() => {
    let animFrameId: number;
    const loop = () => {
      draw();
      animFrameId = requestAnimationFrame(loop);
    };
    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasW = PAPER_SIZE + CANVAS_PADDING * 2;
    const canvasH = PAPER_SIZE + CANVAS_PADDING * 2;
    canvas.width = canvasW;
    canvas.height = canvasH;
  }, []);

  const getLocalPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number; localX: number; localY: number; checkPoint: Point } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = (clientX - rect.left) * scaleX - CANVAS_PADDING;
      const clickY = (clientY - rect.top) * scaleY - CANVAS_PADDING;

      const localX = clickX - offsetX;
      const localY = clickY - offsetY;

      let checkPoint = { x: localX, y: localY };
      if (rotation !== 0) {
        const unrotated = rotate([checkPoint], -rotation);
        checkPoint = unrotated[0];
      }

      return { x: clickX, y: clickY, localX, localY, checkPoint };
    },
    [offsetX, offsetY, rotation]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (toolMode !== "fold" || isAnimating) {
        setHoverPoint(null);
        setNearestGridPoint(null);
        setHighlightedCrease(null);
        return;
      }

      const result = getLocalPoint(e.clientX, e.clientY);
      if (!result) return;
      const { x, y, checkPoint } = result;

      const mousePaperPoint = { x, y };
      setHoverPoint(mousePaperPoint);

      const gridPoint = findNearestGridPoint(x, y, GRID_SIZE, 20);
      if (gridPoint && isPointOnPaper(checkPoint, paperState.layers)) {
        setNearestGridPoint(gridPoint);
      } else {
        setNearestGridPoint(null);
      }

      const nearCrease = findNearestCrease(checkPoint, paperState.creases, 8);
      setHighlightedCrease(nearCrease);
    },
    [toolMode, isAnimating, getLocalPoint, paperState, setHoverPoint, setNearestGridPoint, setHighlightedCrease]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverPoint(null);
    setNearestGridPoint(null);
    setHighlightedCrease(null);
  }, [setHoverPoint, setNearestGridPoint, setHighlightedCrease]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (toolMode !== "fold" || isAnimating) return;

      const result = getLocalPoint(e.clientX, e.clientY);
      if (!result) return;
      const { x, y, checkPoint } = result;

      const gridPoint = findNearestGridPoint(x, y, GRID_SIZE, 12);
      if (!gridPoint) return;

      if (!isPointOnPaper(checkPoint, paperState.layers)) return;

      if (selectedPoints.length === 2 && currentCrease) {
        const sidePoint = checkPoint;
        const { start, end } = currentCrease;
        const d1 = Math.sqrt(
          (sidePoint.x - start.x) ** 2 + (sidePoint.y - start.y) ** 2
        );
        const d2 = Math.sqrt(
          (sidePoint.x - end.x) ** 2 + (sidePoint.y - end.y) ** 2
        );
        if (d1 < 5 || d2 < 5) return;

        executeFold(sidePoint);
      } else {
        selectGridPoint(gridPoint);
      }
    },
    [toolMode, isAnimating, getLocalPoint, paperState, selectedPoints, currentCrease, selectGridPoint, executeFold]
  );

  const cursorStyle =
    toolMode === "fold"
      ? "crosshair"
      : toolMode === "rotate"
        ? "grab"
        : "default";

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: cursorStyle, maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  );
}
