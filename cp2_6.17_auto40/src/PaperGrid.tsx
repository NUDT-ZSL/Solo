import { useRef, useEffect, useCallback } from "react";
import { useOrigamiStore } from "./store";
import { findNearestGridPoint, isPointOnPaper, rotate, translate } from "./FoldEngine";
import type { Point, FoldLayer } from "./FoldEngine";

const GRID_SIZE = 20;
const PAPER_SIZE = 400;
const CANVAS_PADDING = 60;

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = "#d3d3d3";
  for (let x = 0; x <= PAPER_SIZE; x += GRID_SIZE) {
    ctx.lineWidth = x % 100 === 0 ? 1.5 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, PAPER_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= PAPER_SIZE; y += GRID_SIZE) {
    ctx.lineWidth = y % 100 === 0 ? 1.5 : 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(PAPER_SIZE, y);
    ctx.stroke();
  }
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: FoldLayer,
  rotation: number,
  offsetX: number,
  offsetY: number,
  animationProgress: number,
  isAnimating: boolean
) {
  let vertices = layer.vertices;
  if (rotation !== 0) {
    vertices = rotate(vertices, rotation);
  }
  if (offsetX !== 0 || offsetY !== 0) {
    vertices = translate(vertices, offsetX, offsetY);
  }

  if (vertices.length < 3) return;

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

function drawCreases(
  ctx: CanvasRenderingContext2D,
  creases: { start: Point; end: Point; isFolded: boolean }[],
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
    setIsAnimating,
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

      drawGrid(ctx, PAPER_SIZE, PAPER_SIZE);
      ctx.restore();
    }

    drawCreases(ctx, paperState.creases, rotation, offsetX, offsetY);
    drawCurrentCrease(ctx, selectedPoints, currentCrease, rotation, offsetX, offsetY);
    drawSelectedPoints(ctx, selectedPoints, rotation, offsetX, offsetY);

    if (isRotating) {
      drawRotationOutline(ctx, paperState.layers, rotation, offsetX, offsetY);
    }

    ctx.restore();
  }, [paperState, rotation, offsetX, offsetY, isRotating, selectedPoints, currentCrease, isAnimating, animationProgress]);

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

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (toolMode !== "fold" || isAnimating) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX - CANVAS_PADDING;
      const clickY = (e.clientY - rect.top) * scaleY - CANVAS_PADDING;

      const gridPoint = findNearestGridPoint(clickX, clickY, GRID_SIZE, 12);
      if (!gridPoint) return;

      const localX = gridPoint.x - offsetX;
      const localY = gridPoint.y - offsetY;

      let checkPoint = { x: localX, y: localY };
      if (rotation !== 0) {
        const unrotated = rotate([checkPoint], -rotation);
        checkPoint = unrotated[0];
      }

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
    [toolMode, isAnimating, offsetX, offsetY, rotation, paperState, selectedPoints, currentCrease, selectGridPoint, executeFold]
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
        style={{ cursor: cursorStyle, maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  );
}
