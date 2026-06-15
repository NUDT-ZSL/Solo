import { v4 as uuidv4 } from 'uuid';
import { Shape, ShapeType, Gradient, Shadow } from '../types';

const shapeNames: Record<ShapeType, string> = {
  rect: '矩形',
  circle: '圆形',
  triangle: '三角形',
  star: '星形',
};

let shapeCounters: Record<ShapeType, number> = {
  rect: 0,
  circle: 0,
  triangle: 0,
  star: 0,
};

export function generateShapeName(type: ShapeType): string {
  shapeCounters[type]++;
  return `${shapeNames[type]}${shapeCounters[type]}`;
}

export function createDefaultGradient(): Gradient {
  return {
    type: 'linear',
    angle: 90,
    stops: [
      { id: uuidv4(), offset: 0, color: '#6c63ff' },
      { id: uuidv4(), offset: 1, color: '#5048e5' },
    ],
  };
}

export function createDefaultShadow(): Shadow {
  return {
    offsetX: 0,
    offsetY: 4,
    blur: 8,
    color: '#000000',
    opacity: 0.25,
  };
}

export function createShape(type: ShapeType, x: number = 50, y: number = 50): Shape {
  return {
    id: uuidv4(),
    type,
    name: generateShapeName(type),
    x,
    y,
    width: 60,
    height: 60,
    rotation: 0,
    fill: '#6c63ff',
    useGradient: false,
    gradient: createDefaultGradient(),
    shadow: createDefaultShadow(),
    visible: true,
    locked: false,
    zIndex: Object.values(shapeCounters).reduce((a, b) => a + b, 0),
  };
}

export function getShapePath(shape: Shape): string {
  const { type, width, height } = shape;
  
  switch (type) {
    case 'rect':
      return `M0,0 h${width} v${height} h${-width} Z`;
    case 'circle': {
      const cx = width / 2;
      const cy = height / 2;
      const rx = width / 2;
      const ry = height / 2;
      return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0`;
    }
    case 'triangle':
      return `M${width / 2},0 L${width},${height} L0,${height} Z`;
    case 'star': {
      const cx = width / 2;
      const cy = height / 2;
      const outerRadius = Math.min(width, height) / 2;
      const innerRadius = outerRadius * 0.4;
      const points: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        points.push(`${px},${py}`);
      }
      
      return `M${points.join(' L')} Z`;
    }
    default:
      return '';
  }
}

export function getGradientId(shapeId: string): string {
  return `gradient-${shapeId}`;
}

export function getShadowId(shapeId: string): string {
  return `shadow-${shapeId}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export function resetShapeCounters(): void {
  shapeCounters = {
    rect: 0,
    circle: 0,
    triangle: 0,
    star: 0,
  };
}
