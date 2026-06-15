export type FurnitureType = 'armchair' | 'roundtable' | 'floorlamp';

export interface FurniturePart {
  type: 'rect' | 'circle' | 'triangle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  strokeColor?: string;
  texture?: 'fabric' | 'wood' | 'metal';
}

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  rotation: number;
  targetRotation: number;
  rotationAnimStart: number;
  width: number;
  height: number;
  parts: FurniturePart[];
}

let furnitureIdCounter = 0;

function createArmchairParts(): FurniturePart[] {
  return [
    { type: 'rect', x: 0, y: 0, width: 80, height: 10, color: '#8B7355', texture: 'fabric' },
    { type: 'rect', x: 0, y: 10, width: 10, height: 60, color: '#7A6548', texture: 'fabric' },
    { type: 'rect', x: 70, y: 10, width: 10, height: 60, color: '#7A6548', texture: 'fabric' },
    { type: 'rect', x: 10, y: 10, width: 60, height: 60, color: '#9C8465', texture: 'fabric' },
    { type: 'rect', x: 10, y: 0, width: 60, height: 10, color: '#8B7355', texture: 'fabric' },
    { type: 'rect', x: 15, y: 15, width: 20, height: 20, color: '#A09080', texture: 'fabric' },
    { type: 'rect', x: 45, y: 15, width: 20, height: 20, color: '#A09080', texture: 'fabric' },
    { type: 'circle', x: 20, y: 55, radius: 5, color: '#6B5B45' },
    { type: 'circle', x: 60, y: 55, radius: 5, color: '#6B5B45' },
    { type: 'circle', x: 20, y: 65, radius: 5, color: '#6B5B45' },
    { type: 'circle', x: 60, y: 65, radius: 5, color: '#6B5B45' },
  ];
}

function createRoundTableParts(): FurniturePart[] {
  return [
    { type: 'circle', x: 40, y: 40, radius: 40, color: '#8B6914', texture: 'wood' },
    { type: 'circle', x: 40, y: 40, radius: 6, color: '#6B4F12', texture: 'wood' },
    { type: 'rect', x: 36, y: 40, width: 8, height: 35, color: '#5C4210', texture: 'wood' },
  ];
}

function createFloorLampParts(): FurniturePart[] {
  return [
    { type: 'rect', x: 22, y: 60, width: 16, height: 8, color: '#78909C', texture: 'metal' },
    { type: 'rect', x: 28, y: 20, width: 4, height: 45, color: '#90A4AE', texture: 'metal' },
    { type: 'triangle', x: 30, y: 5, radius: 18, color: '#B0BEC5', texture: 'metal' },
  ];
}

export function createFurniture(type: FurnitureType, x: number, y: number): FurnitureItem {
  let parts: FurniturePart[];
  let width: number;
  let height: number;

  switch (type) {
    case 'armchair':
      parts = createArmchairParts();
      width = 80;
      height = 70;
      break;
    case 'roundtable':
      parts = createRoundTableParts();
      width = 80;
      height = 80;
      break;
    case 'floorlamp':
      parts = createFloorLampParts();
      width = 60;
      height = 68;
      break;
  }

  return {
    id: `furniture_${++furnitureIdCounter}`,
    type,
    x,
    y,
    rotation: 0,
    targetRotation: 0,
    rotationAnimStart: 0,
    width,
    height,
    parts,
  };
}

export function drawFurniturePart(
  ctx: CanvasRenderingContext2D,
  part: FurniturePart,
  offsetX: number,
  offsetY: number
): void {
  ctx.save();
  ctx.translate(offsetX, offsetY);

  if (part.type === 'rect' && part.width !== undefined && part.height !== undefined) {
    ctx.fillStyle = part.color;
    ctx.fillRect(part.x, part.y, part.width, part.height);

    if (part.texture === 'fabric') {
      drawFabricTexture(ctx, part.x, part.y, part.width, part.height);
    } else if (part.texture === 'wood') {
      drawWoodTexture(ctx, part.x, part.y, part.width, part.height);
    } else if (part.texture === 'metal') {
      drawMetalTexture(ctx, part.x, part.y, part.width, part.height);
    }
  } else if (part.type === 'circle' && part.radius !== undefined) {
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
    ctx.fillStyle = part.color;
    ctx.fill();

    if (part.texture === 'fabric') {
      drawFabricTexture(ctx, part.x - part.radius, part.y - part.radius, part.radius * 2, part.radius * 2);
    } else if (part.texture === 'wood') {
      drawWoodTexture(ctx, part.x - part.radius, part.y - part.radius, part.radius * 2, part.radius * 2);
    } else if (part.texture === 'metal') {
      drawMetalTexture(ctx, part.x - part.radius, part.y - part.radius, part.radius * 2, part.radius * 2);
    }
  } else if (part.type === 'triangle' && part.radius !== undefined) {
    ctx.beginPath();
    ctx.moveTo(part.x, part.y);
    ctx.lineTo(part.x - (part.radius ?? 18), part.y + (part.radius ?? 18));
    ctx.lineTo(part.x + (part.radius ?? 18), part.y + (part.radius ?? 18));
    ctx.closePath();
    ctx.fillStyle = part.color;
    ctx.fill();

    if (part.texture === 'metal') {
      const r = part.radius;
      drawMetalTexture(ctx, part.x - r, part.y, r * 2, r);
    }
  }

  ctx.restore();
}

function drawFabricTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 0.5;

  const step = 4;
  for (let iy = y; iy < y + h; iy += step) {
    ctx.beginPath();
    for (let ix = x; ix < x + w; ix += 2) {
      const offset = Math.sin(ix * 0.3 + iy * 0.1) * 0.8;
      if (ix === x) {
        ctx.moveTo(ix, iy + offset);
      } else {
        ctx.lineTo(ix, iy + offset);
      }
    }
    ctx.stroke();
  }

  for (let ix = x; ix < x + w; ix += step) {
    ctx.beginPath();
    for (let iy = y; iy < y + h; iy += 2) {
      const offset = Math.cos(iy * 0.3 + ix * 0.1) * 0.8;
      if (iy === y) {
        ctx.moveTo(ix + offset, iy);
      } else {
        ctx.lineTo(ix + offset, iy);
      }
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 8; i++) {
    const dx = x + Math.random() * w;
    const dy = y + Math.random() * h;
    ctx.beginPath();
    ctx.arc(dx, dy, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawWoodTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#4a3000';
  ctx.lineWidth = 0.6;

  for (let iy = y; iy < y + h; iy += 3) {
    ctx.beginPath();
    const amp = 1.5 + Math.sin(iy * 0.05) * 1;
    for (let ix = x; ix < x + w; ix += 2) {
      const yy = iy + Math.sin(ix * 0.08 + iy * 0.02) * amp;
      if (ix === x) {
        ctx.moveTo(ix, yy);
      } else {
        ctx.lineTo(ix, yy);
      }
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#2a1a00';
  for (let i = 0; i < 3; i++) {
    const kx = x + Math.random() * w * 0.8;
    const ky = y + Math.random() * h;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 2, 5 + Math.random() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawMetalTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();

  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, 'rgba(255,255,255,0.08)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);

  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.3;
  for (let ix = x; ix < x + w; ix += 2) {
    ctx.beginPath();
    ctx.moveTo(ix, y);
    ctx.lineTo(ix, y + h);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawFurniture(
  ctx: CanvasRenderingContext2D,
  furniture: FurnitureItem
): void {
  const now = performance.now();
  if (furniture.rotation !== furniture.targetRotation) {
    const elapsed = now - furniture.rotationAnimStart;
    const duration = 300;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    furniture.rotation = furniture.rotation + (furniture.targetRotation - furniture.rotation) * eased;
    if (progress >= 1) {
      furniture.rotation = furniture.targetRotation;
    }
  }

  const cx = furniture.x + furniture.width / 2;
  const cy = furniture.y + furniture.height / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((furniture.rotation * Math.PI) / 180);
  ctx.translate(-furniture.width / 2, -furniture.height / 2);

  for (const part of furniture.parts) {
    drawFurniturePart(ctx, part, 0, 0);
  }

  ctx.restore();
}

export function drawFurnitureThumbnail(
  ctx: CanvasRenderingContext2D,
  type: FurnitureType,
  w: number,
  h: number
): void {
  const furniture = createFurniture(type, 0, 0);
  const scale = Math.min((w - 8) / furniture.width, (h - 8) / furniture.height);
  const ox = (w - furniture.width * scale) / 2;
  const oy = (h - furniture.height * scale) / 2;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  for (const part of furniture.parts) {
    drawFurniturePart(ctx, part, 0, 0);
  }

  ctx.restore();
}

export function hitTestFurniture(
  furniture: FurnitureItem,
  px: number,
  py: number
): boolean {
  const cx = furniture.x + furniture.width / 2;
  const cy = furniture.y + furniture.height / 2;
  const rad = (-furniture.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  const localX = dx * cos - dy * sin + furniture.width / 2;
  const localY = dx * sin + dy * cos + furniture.height / 2;

  return localX >= 0 && localX <= furniture.width && localY >= 0 && localY <= furniture.height;
}

export function getFurnitureOutline(type: FurnitureType): 'rect' | 'circle' | 'composite' {
  if (type === 'roundtable') return 'circle';
  if (type === 'floorlamp') return 'composite';
  return 'rect';
}

export function getFurnitureOutlinePoints(furniture: FurnitureItem): { x: number; y: number }[] {
  const cx = furniture.x + furniture.width / 2;
  const cy = furniture.y + furniture.height / 2;

  if (furniture.type === 'roundtable') {
    const r = furniture.width / 2;
    const points: { x: number; y: number }[] = [];
    const segments = 32;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
    return points;
  }

  const hw = furniture.width / 2;
  const hh = furniture.height / 2;
  const rad = (furniture.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  return corners.map(c => ({
    x: cx + c.x * cos - c.y * sin,
    y: cy + c.x * sin + c.y * cos,
  }));
}
