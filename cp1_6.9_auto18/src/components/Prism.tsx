import React, { useRef, useEffect, useCallback, useState } from 'react';
import { SpectrumColor, SPECTRUM_ORDER, SPECTRUM_COLORS } from '../utils/audio';

export interface ColorBand {
  color: SpectrumColor;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  startPoint: { x: number; y: number };
  endPoint1: { x: number; y: number };
  endPoint2: { x: number; y: number };
  widthRatio: number;
  isActive: boolean;
  refractionIndex: number;
}

export interface PrismProps {
  canvasWidth: number;
  canvasHeight: number;
  refractiveIndex: number;
  rotation: number;
  prismSize: number;
  beamColor: string;
  onRotationChange: (rotation: number) => void;
  onSizeChange: (size: number) => void;
  onColorBandsChange: (bands: ColorBand[]) => void;
}

const COLOR_REFRACTION_OFFSETS: Record<SpectrumColor, number> = {
  red: -0.02,
  orange: -0.012,
  yellow: -0.004,
  green: 0.004,
  blue: 0.012,
  indigo: 0.018,
  violet: 0.028
};

interface Point {
  x: number;
  y: number;
}

function lineLineIntersection(
  p1: Point, d1: Point, p3: Point, p4: Point
): { point: Point; t: number } | null {
  const p2 = { x: p1.x + d1.x * 10000, y: p1.y + d1.y * 10000 };
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-10) return null;

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ub < 0 || ub > 1 || ua < 0) return null;

  return {
    point: {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y)
    },
    t: ua
  };
}

function normalize(v: Point): Point {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len < 1e-10) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function snellRefract(
  incident: Point, normal: Point, n1: number, n2: number
): { direction: Point; totalReflection: boolean } {
  const cosi = -dot(incident, normal);
  const etai_over_etat = n1 / n2;
  const sin2t = etai_over_etat * etai_over_etat * (1 - cosi * cosi);

  if (sin2t > 1.0) {
    const reflectDir = {
      x: incident.x + 2 * cosi * normal.x,
      y: incident.y + 2 * cosi * normal.y
    };
    return { direction: normalize(reflectDir), totalReflection: true };
  }

  const cost = Math.sqrt(1 - sin2t);
  const refractDir = {
    x: etai_over_etat * incident.x + (etai_over_etat * cosi - cost) * normal.x,
    y: etai_over_etat * incident.y + (etai_over_etat * cosi - cost) * normal.y
  };
  return { direction: normalize(refractDir), totalReflection: false };
}

function getPrismVertices(center: Point, size: number, rotationDeg: number): Point[] {
  const rotation = (rotationDeg * Math.PI) / 180;
  const vertices: Point[] = [];
  for (let i = 0; i < 3; i++) {
    const angle = rotation + (i * 2 * Math.PI) / 3 - Math.PI / 2;
    vertices.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle)
    });
  }
  return vertices;
}

function getEdgeNormal(vertices: Point[], edgeIndex: number, inward: boolean): Point {
  const p1 = vertices[edgeIndex];
  const p2 = vertices[(edgeIndex + 1) % 3];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;
  return inward ? { x: -nx, y: -ny } : { x: nx, y: ny };
}

const Prism: React.FC<PrismProps> = ({
  canvasWidth,
  canvasHeight,
  refractiveIndex,
  rotation,
  prismSize,
  beamColor,
  onRotationChange,
  onSizeChange,
  onColorBandsChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartAngle, setDragStartAngle] = useState(0);
  const [prismRotation, setPrismRotation] = useState(rotation);
  const [size, setSize] = useState(prismSize);
  const animFrameRef = useRef<number>(0);
  const hueShiftRef = useRef(0);

  const getPrismCenter = useCallback((): Point => {
    return {
      x: canvasWidth * 0.38,
      y: canvasHeight * 0.48
    };
  }, [canvasWidth, canvasHeight]);

  const getBeamStart = useCallback((): Point => {
    return {
      x: canvasWidth * 0.05,
      y: canvasHeight * 0.15
    };
  }, [canvasWidth, canvasHeight]);

  const getScreenRight = useCallback((): number => {
    return canvasWidth * 0.95;
  }, [canvasWidth]);

  const computeRefraction = useCallback((n: number): ColorBand[] | null => {
    const prismCenter = getPrismCenter();
    const vertices = getPrismVertices(prismCenter, size, prismRotation);
    const beamStart = getBeamStart();
    const screenRight = getScreenRight();
    const screenTop = canvasHeight * 0.08;
    const screenBottom = canvasHeight * 0.92;

    const targetPt = {
      x: prismCenter.x,
      y: prismCenter.y
    };
    const beamDir = normalize({
      x: targetPt.x - beamStart.x,
      y: targetPt.y - beamStart.y
    });

    let entryIntersection: { point: Point; edgeIndex: number } | null = null;
    let minT = Infinity;

    for (let i = 0; i < 3; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % 3];
      const result = lineLineIntersection(beamStart, beamDir, p1, p2);
      if (result && result.t < minT && result.t > 0.0001) {
        minT = result.t;
        entryIntersection = { point: result.point, edgeIndex: i };
      }
    }

    if (!entryIntersection) {
      return computeFallbackRefraction(n, prismCenter, vertices, beamStart, screenRight, screenTop, screenBottom);
    }

    const entryNormalOut = getEdgeNormal(vertices, entryIntersection.edgeIndex, false);

    const toCenter = {
      x: prismCenter.x - entryIntersection.point.x,
      y: prismCenter.y - entryIntersection.point.y
    };
    if (dot(entryNormalOut, toCenter) < 0) {
      entryNormalOut.x = -entryNormalOut.x;
      entryNormalOut.y = -entryNormalOut.y;
    }
    const entryNormalIn = { x: -entryNormalOut.x, y: -entryNormalOut.y };

    const bands: ColorBand[] = [];

    SPECTRUM_ORDER.forEach((color, idx) => {
      const colorN = n + COLOR_REFRACTION_OFFSETS[color];

      const refract1 = snellRefract(beamDir, entryNormalIn, 1.0, colorN);

      let exitDir: Point;
      let exitPoint: Point;

      if (!refract1.totalReflection) {
        let exitIntersection: { point: Point; normal: Point } | null = null;
        let exitMinT = Infinity;

        for (let i = 0; i < 3; i++) {
          if (i === entryIntersection!.edgeIndex) continue;
          const p1 = vertices[i];
          const p2 = vertices[(i + 1) % 3];
          const result = lineLineIntersection(entryIntersection!.point, refract1.direction, p1, p2);
          if (result && result.t < exitMinT && result.t > 0.0001) {
            exitMinT = result.t;
            const normalOut = getEdgeNormal(vertices, i, false);
            const toOutside = {
              x: result.point.x - prismCenter.x,
              y: result.point.y - prismCenter.y
            };
            if (dot(normalOut, toOutside) < 0) {
              normalOut.x = -normalOut.x;
              normalOut.y = -normalOut.y;
            }
            exitIntersection = { point: result.point, normal: normalOut };
          }
        }

        if (exitIntersection) {
          const exitNormalIn = { x: -exitIntersection.normal.x, y: -exitIntersection.normal.y };
          const refract2 = snellRefract(refract1.direction, exitNormalIn, colorN, 1.0);
          exitPoint = exitIntersection.point;
          exitDir = refract2.direction;
        } else {
          const midDir = normalize({
            x: prismCenter.x + 200 - entryIntersection!.point.x,
            y: prismCenter.y + (idx - 3) * 20 - entryIntersection!.point.y
          });
          exitPoint = {
            x: prismCenter.x + midDir.x * size * 0.9,
            y: prismCenter.y + midDir.y * size * 0.9
          };
          exitDir = midDir;
        }
      } else {
        const angleBase = Math.atan2(beamDir.y, beamDir.x);
        const spread = (idx - 3) * 0.08 * (n - 1.3) + 0.05;
        exitPoint = {
          x: entryIntersection!.point.x + beamDir.x * size * 0.8,
          y: entryIntersection!.point.y + beamDir.y * size * 0.8
        };
        exitDir = {
          x: Math.cos(angleBase + spread),
          y: Math.sin(angleBase + spread)
        };
      }

      if (exitDir.x <= 0.02) {
        const spread = (idx - 3) * 0.06 * (n - 1.3) + 0.03;
        const baseAngle = 0.15;
        exitDir = {
          x: Math.cos(baseAngle + spread),
          y: Math.sin(baseAngle + spread)
        };
        const exitEdges: Point[] = [];
        for (let i = 0; i < 3; i++) {
          if (i === entryIntersection!.edgeIndex) continue;
          exitEdges.push(vertices[i]);
          exitEdges.push(vertices[(i + 1) % 3]);
        }
        if (exitEdges.length > 0) {
          let best = exitEdges[0];
          for (const ep of exitEdges) {
            if (ep.x > best.x) best = ep;
          }
          exitPoint = {
            x: best.x + 4,
            y: best.y + (idx - 3) * 2
          };
        } else {
          exitPoint = {
            x: prismCenter.x + size * 0.6,
            y: prismCenter.y + (idx - 3) * 8
          };
        }
      }

      const tRight = Math.max(50, (screenRight - exitPoint.x) / Math.max(0.02, exitDir.x));
      const midEnd = {
        x: exitPoint.x + exitDir.x * tRight,
        y: exitPoint.y + exitDir.y * tRight
      };

      if (midEnd.y < screenTop - 150 || midEnd.y > screenBottom + 150) {
        const clampedY = Math.max(screenTop + 20, Math.min(screenBottom - 20, midEnd.y));
        const ratio = (clampedY - exitPoint.y) / (midEnd.y - exitPoint.y || 1);
        midEnd.x = exitPoint.x + (midEnd.x - exitPoint.x) * Math.max(0.5, ratio);
        midEnd.y = clampedY;
      }

      const halfAngleSpread = 0.012 + (n - 1.3) * 0.008;
      const baseAngle = Math.atan2(midEnd.y - exitPoint.y, midEnd.x - exitPoint.x);
      const startAngle = baseAngle - halfAngleSpread;
      const endAngle = baseAngle + halfAngleSpread;
      const tToScreen = Math.sqrt((midEnd.x - exitPoint.x) ** 2 + (midEnd.y - exitPoint.y) ** 2);

      const endPt1 = {
        x: exitPoint.x + Math.cos(startAngle) * tToScreen,
        y: exitPoint.y + Math.sin(startAngle) * tToScreen
      };
      const endPt2 = {
        x: exitPoint.x + Math.cos(endAngle) * tToScreen,
        y: exitPoint.y + Math.sin(endAngle) * tToScreen
      };

      const screenHeight = screenBottom - screenTop;
      const bandHeight = Math.max(8, Math.abs(endPt2.y - endPt1.y));
      const widthRatio = Math.min(1, bandHeight / (screenHeight * 0.1));

      bands.push({
        color,
        startAngle,
        endAngle,
        midAngle: baseAngle,
        startPoint: exitPoint,
        endPoint1: endPt1,
        endPoint2: endPt2,
        widthRatio,
        isActive: true,
        refractionIndex: colorN
      });
    });

    if (bands.length < 4) {
      return computeFallbackRefraction(n, prismCenter, vertices, beamStart, screenRight, screenTop, screenBottom);
    }

    return bands;
  }, [canvasHeight, getBeamStart, getPrismCenter, getScreenRight, prismRotation, size]);

  const computeFallbackRefraction = useCallback((
    n: number,
    prismCenter: Point,
    _vertices: Point[],
    _beamStart: Point,
    screenRight: number,
    screenTop: number,
    screenBottom: number
  ): ColorBand[] => {
    void _vertices;
    void _beamStart;
    const bands: ColorBand[] = [];
    const rotationRad = (prismRotation * Math.PI) / 180;

    const exitPoint = {
      x: prismCenter.x + Math.cos(rotationRad + 0.3) * size * 0.8,
      y: prismCenter.y + Math.sin(rotationRad + 0.3) * size * 0.8
    };

    const baseSpread = 0.4 + (n - 1.3) * 0.3;
    const centerAngle = rotationRad * 0.3 + 0.1;

    SPECTRUM_ORDER.forEach((color, idx) => {
      const colorN = n + COLOR_REFRACTION_OFFSETS[color];
      const offset = (idx - 3) / 3;
      const spreadAngle = centerAngle + offset * baseSpread * 0.5;

      const dir = {
        x: Math.cos(spreadAngle),
        y: Math.sin(spreadAngle)
      };

      const tRight = (screenRight - exitPoint.x) / Math.max(0.1, dir.x);
      const midEnd = {
        x: exitPoint.x + dir.x * tRight,
        y: exitPoint.y + dir.y * tRight
      };

      const clampedMidY = Math.max(screenTop + 40, Math.min(screenBottom - 40, midEnd.y));
      if (clampedMidY !== midEnd.y) {
        const ratio = (clampedMidY - exitPoint.y) / (midEnd.y - exitPoint.y || 1);
        midEnd.x = exitPoint.x + (midEnd.x - exitPoint.x) * Math.max(0.6, Math.abs(ratio));
        midEnd.y = clampedMidY;
      }

      const baseAngle = Math.atan2(midEnd.y - exitPoint.y, midEnd.x - exitPoint.x);
      const halfSpread = 0.01 + (n - 1.3) * 0.008;
      const startAngle = baseAngle - halfSpread;
      const endAngle = baseAngle + halfSpread;
      const tDist = Math.sqrt((midEnd.x - exitPoint.x) ** 2 + (midEnd.y - exitPoint.y) ** 2);

      bands.push({
        color,
        startAngle,
        endAngle,
        midAngle: baseAngle,
        startPoint: { ...exitPoint },
        endPoint1: {
          x: exitPoint.x + Math.cos(startAngle) * tDist,
          y: exitPoint.y + Math.sin(startAngle) * tDist
        },
        endPoint2: {
          x: exitPoint.x + Math.cos(endAngle) * tDist,
          y: exitPoint.y + Math.sin(endAngle) * tDist
        },
        widthRatio: 0.6 + Math.abs(offset) * 0.4,
        isActive: true,
        refractionIndex: colorN
      });
    });

    return bands;
  }, [prismRotation, size]);

  useEffect(() => {
    setPrismRotation(rotation);
  }, [rotation]);

  useEffect(() => {
    setSize(prismSize);
  }, [prismSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const center = getPrismCenter();
    const dx = x - center.x;
    const dy = y - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= size * 1.2) {
      setIsDragging(true);
      const currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      setDragStartAngle(currentAngle - prismRotation);
    }
  }, [canvasWidth, canvasHeight, getPrismCenter, prismRotation, size]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const center = getPrismCenter();
    const dx = x - center.x;
    const dy = y - center.y;
    const currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    let newRotation = currentAngle - dragStartAngle;
    newRotation = ((newRotation % 360) + 360) % 360;
    setPrismRotation(newRotation);
    onRotationChange(newRotation);
  }, [canvasWidth, canvasHeight, dragStartAngle, getPrismCenter, isDragging, onRotationChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -4 : 4;
    const newSize = Math.max(80, Math.min(160, size + delta));
    setSize(newSize);
    onSizeChange(newSize);
  }, [onSizeChange, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      hueShiftRef.current = (hueShiftRef.current + 0.5) % 360;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      drawStarfield(ctx, canvasWidth, canvasHeight, hueShiftRef.current);

      const prismCenter = getPrismCenter();
      const vertices = getPrismVertices(prismCenter, size, prismRotation);
      const beamStart = getBeamStart();

      drawScreen(ctx, canvasWidth, canvasHeight);

      const bands = computeRefraction(refractiveIndex);
      if (bands) {
        drawRefractedBeams(ctx, bands, beamStart);
        onColorBandsChange(bands);
      } else {
        onColorBandsChange([]);
      }

      drawPrism(ctx, vertices, hueShiftRef.current);

      drawIncidentBeam(ctx, beamStart, prismCenter, size, prismRotation, beamColor, vertices);

      drawBeamSource(ctx, beamStart, beamColor);

      animFrameRef.current = requestAnimationFrame(render);
      void dt;
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [canvasWidth, canvasHeight, getPrismCenter, getBeamStart, size, prismRotation, refractiveIndex, beamColor, computeRefraction, onColorBandsChange]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="main-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent<HTMLCanvasElement>);
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent<HTMLCanvasElement>);
      }}
      onTouchEnd={handleMouseUp}
    />
  );
};

function drawStarfield(ctx: CanvasRenderingContext2D, w: number, h: number, hue: number): void {
  const seed = 12345;
  for (let i = 0; i < 150; i++) {
    const pseudoRand = ((Math.sin(seed + i * 99.13) + 1) / 2);
    const x = pseudoRand * w;
    const y = ((Math.sin(seed + i * 137.51) + 1) / 2) * h;
    const brightness = 0.3 + 0.7 * ((Math.sin(hue * 0.02 + i * 0.5) + 1) / 2);
    const size = 0.5 + 1.5 * ((Math.sin(seed + i * 47.7) + 1) / 2);
    const hueOffset = (hue + i * 3) % 360;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hueOffset}, 30%, ${60 + brightness * 30}%, ${0.4 + brightness * 0.4})`;
    ctx.fill();
  }
}

function drawScreen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const screenX = w * 0.62;
  const screenY = h * 0.08;
  const screenW = w * 0.32;
  const screenH = h * 0.84;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(screenX, screenY, screenW, screenH);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(screenX + 0.5, screenY + 0.5, screenW - 1, screenH - 1);
  ctx.restore();

  ctx.save();
  const screenLeft = screenX;
  for (let y = screenY + 40; y < screenY + screenH; y += 40) {
    ctx.beginPath();
    ctx.moveTo(screenLeft + 8, y);
    ctx.lineTo(screenLeft + screenW - 8, y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPrism(ctx: CanvasRenderingContext2D, vertices: Point[], hue: number): void {
  const center = {
    x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
    y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3
  };

  ctx.save();
  const gradient = ctx.createLinearGradient(
    vertices[0].x, vertices[0].y,
    vertices[2].x, vertices[2].y
  );
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const h = (hue + t * 120) % 360;
    gradient.addColorStop(t, `hsla(${h}, 80%, 60%, 0.22)`);
  }
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  ctx.lineTo(vertices[1].x, vertices[1].y);
  ctx.lineTo(vertices[2].x, vertices[2].y);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 8; i++) {
    const t1 = (i / 8 + hue * 0.001) % 1;
    const t2 = ((i + 1) / 8 + hue * 0.001) % 1;
    const startX = center.x + (vertices[0].x - center.x) * (1 - t1) + (vertices[1].x - center.x) * t1 * 0.5;
    const startY = center.y + (vertices[0].y - center.y) * (1 - t1) + (vertices[1].y - center.y) * t1 * 0.5;
    const endX = center.x + (vertices[2].x - center.x) * 0.5 + (vertices[1].x - center.x) * (1 - t2) * 0.5;
    const endY = center.y + (vertices[2].y - center.y) * 0.5 + (vertices[1].y - center.y) * (1 - t2) * 0.5;
    const gradHue = (hue + i * 20) % 360;
    const lineGrad = ctx.createLinearGradient(startX, startY, endX, endY);
    lineGrad.addColorStop(0, `hsla(${gradHue}, 90%, 70%, 0)`);
    lineGrad.addColorStop(0.5, `hsla(${gradHue}, 90%, 75%, 0.12)`);
    lineGrad.addColorStop(1, `hsla(${gradHue}, 90%, 70%, 0)`);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  ctx.lineTo(vertices[1].x, vertices[1].y);
  ctx.lineTo(vertices[2].x, vertices[2].y);
  ctx.closePath();
  const edgeGradient = ctx.createLinearGradient(vertices[0].x, vertices[0].y, vertices[2].x, vertices[2].y);
  for (let i = 0; i <= 3; i++) {
    const t = i / 3;
    const h = (hue + t * 180) % 360;
    edgeGradient.addColorStop(t, `hsla(${h}, 90%, 70%, 0.7)`);
  }
  ctx.strokeStyle = edgeGradient;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = `hsla(${hue}, 80%, 60%, 0.5)`;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.restore();
}

function drawIncidentBeam(
  ctx: CanvasRenderingContext2D,
  start: Point,
  prismCenter: Point,
  size: number,
  rotationDeg: number,
  beamColor: string,
  vertices: Point[]
): void {
  const rotation = (rotationDeg * Math.PI) / 180;
  const tempDir = {
    x: prismCenter.x - start.x,
    y: prismCenter.y - start.y - size * 0.15
  };
  const beamDir = normalize(tempDir);

  let entryPoint: Point | null = null;
  let minT = Infinity;

  for (let i = 0; i < 3; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % 3];
    const result = lineLineIntersection(start, beamDir, p1, p2);
    if (result && result.t < minT && result.t > 0.001) {
      minT = result.t;
      entryPoint = result.point;
    }
  }

  if (!entryPoint) {
    const dist = Math.sqrt((prismCenter.x - start.x) ** 2 + (prismCenter.y - start.y) ** 2);
    entryPoint = {
      x: start.x + beamDir.x * dist * 0.8,
      y: start.y + beamDir.y * dist * 0.8
    };
  }

  void rotation;

  const dx = entryPoint.x - start.x;
  const dy = entryPoint.y - start.y;
  const steps = Math.ceil(Math.sqrt(dx * dx + dy * dy) / 2);

  ctx.save();
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const tNext = Math.min(1, (i + 1) / steps);
    const x1 = start.x + dx * t;
    const y1 = start.y + dy * t;
    const x2 = start.x + dx * tNext;
    const y2 = start.y + dy * tNext;
    const width = 3 - t * 2;
    const alpha = 0.9 - t * 0.3;

    let color: string;
    if (beamColor === '#FFD700') {
      color = `rgba(255, 215, 0, ${alpha})`;
    } else if (beamColor === '#00BFFF') {
      color = `rgba(0, 191, 255, ${alpha})`;
    } else {
      const hue = (t * 60) % 360;
      color = `hsla(${hue}, 100%, 75%, ${alpha})`;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(entryPoint.x, entryPoint.y, 6, 0, Math.PI * 2);
  const hitGrad = ctx.createRadialGradient(entryPoint.x, entryPoint.y, 0, entryPoint.x, entryPoint.y, 6);
  hitGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  hitGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = hitGrad;
  ctx.fill();
  ctx.restore();
}

function drawBeamSource(ctx: CanvasRenderingContext2D, start: Point, beamColor: string): void {
  ctx.save();
  const outerGrad = ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, 30);
  outerGrad.addColorStop(0, beamColor === '#FFD700' ? 'rgba(255, 215, 0, 0.4)' : beamColor === '#00BFFF' ? 'rgba(0, 191, 255, 0.4)' : 'rgba(255, 255, 255, 0.35)');
  outerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.arc(start.x, start.y, 30, 0, Math.PI * 2);
  ctx.fillStyle = outerGrad;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
  const innerGrad = ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, 8);
  if (beamColor === '#FFD700') {
    innerGrad.addColorStop(0, '#FFFFFF');
    innerGrad.addColorStop(0.5, '#FFD700');
    innerGrad.addColorStop(1, 'rgba(255, 215, 0, 0.5)');
  } else if (beamColor === '#00BFFF') {
    innerGrad.addColorStop(0, '#FFFFFF');
    innerGrad.addColorStop(0.5, '#00BFFF');
    innerGrad.addColorStop(1, 'rgba(0, 191, 255, 0.5)');
  } else {
    innerGrad.addColorStop(0, '#FFFFFF');
    innerGrad.addColorStop(0.5, '#F0F0F0');
    innerGrad.addColorStop(1, 'rgba(240, 240, 240, 0.5)');
  }
  ctx.fillStyle = innerGrad;
  ctx.shadowColor = beamColor;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();
}

function drawRefractedBeams(ctx: CanvasRenderingContext2D, bands: ColorBand[], beamStart: Point): void {
  ctx.save();

  for (let i = bands.length - 1; i >= 0; i--) {
    const band = bands[i];
    const colorHex = SPECTRUM_COLORS[band.color];

    const grad = ctx.createLinearGradient(
      band.startPoint.x, band.startPoint.y,
      (band.endPoint1.x + band.endPoint2.x) / 2,
      (band.endPoint1.y + band.endPoint2.y) / 2
    );
    grad.addColorStop(0, hexToRgba(colorHex, 0.0));
    grad.addColorStop(0.15, hexToRgba(colorHex, 0.35));
    grad.addColorStop(0.5, hexToRgba(colorHex, 0.55));
    grad.addColorStop(1, hexToRgba(colorHex, 0.75));

    ctx.beginPath();
    ctx.moveTo(band.startPoint.x, band.startPoint.y);
    ctx.lineTo(band.endPoint1.x, band.endPoint1.y);
    ctx.lineTo(band.endPoint2.x, band.endPoint2.y);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  bands.forEach((band) => {
    const colorHex = SPECTRUM_COLORS[band.color];
    const midEnd = {
      x: (band.endPoint1.x + band.endPoint2.x) / 2,
      y: (band.endPoint1.y + band.endPoint2.y) / 2
    };

    ctx.beginPath();
    ctx.moveTo(band.startPoint.x, band.startPoint.y);
    ctx.lineTo(midEnd.x, midEnd.y);
    ctx.strokeStyle = hexToRgba(colorHex, 0.85);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 10;
    ctx.stroke();
  });

  ctx.restore();
  void beamStart;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default Prism;
