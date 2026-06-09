import Phaser from 'phaser';

const GEAR_TEETH = 12;
const GEAR_RADIUS = 10;

export function createGearTexture(
  scene: Phaser.Scene,
  key: string,
  radius: number = GEAR_RADIUS,
  teeth: number = GEAR_TEETH,
  color: number = 0xffd700,
  highlightColor: number = 0xfff8dc
): void {
  if (scene.textures.exists(key)) return;

  const size = (radius + 4) * 2;
  const graphics = scene.add.graphics();
  const cx = size / 2;
  const cy = size / 2;

  graphics.fillStyle(color, 1);
  graphics.beginPath();

  for (let i = 0; i < teeth; i++) {
    const angle = (i / teeth) * Math.PI * 2;
    const nextAngle = ((i + 0.5) / teeth) * Math.PI * 2;
    const nextFullAngle = ((i + 1) / teeth) * Math.PI * 2;

    const toothOuterX = cx + Math.cos(angle) * (radius + 3);
    const toothOuterY = cy + Math.sin(angle) * (radius + 3);

    const toothInnerX = cx + Math.cos(nextAngle) * radius;
    const toothInnerY = cy + Math.sin(nextAngle) * radius;

    const nextOuterX = cx + Math.cos(nextFullAngle) * (radius + 3);
    const nextOuterY = cy + Math.sin(nextFullAngle) * (radius + 3);

    if (i === 0) {
      graphics.moveTo(toothOuterX, toothOuterY);
    } else {
      graphics.lineTo(toothOuterX, toothOuterY);
    }
    graphics.lineTo(toothInnerX, toothInnerY);
    graphics.lineTo(nextOuterX, nextOuterY);
  }
  graphics.closePath();
  graphics.fillPath();

  graphics.fillStyle(0x8b6914, 0.6);
  graphics.fillCircle(cx, cy, radius * 0.65);

  graphics.fillStyle(color, 1);
  graphics.fillCircle(cx, cy, radius * 0.35);

  graphics.fillStyle(0x5c4a0a, 0.8);
  graphics.fillCircle(cx, cy, radius * 0.12);

  const highlightAngle = -Math.PI / 4;
  const hx = cx + Math.cos(highlightAngle) * radius * 0.4;
  const hy = cy + Math.sin(highlightAngle) * radius * 0.4;
  graphics.fillStyle(highlightColor, 0.5);
  graphics.fillCircle(hx, hy, radius * 0.25);

  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

export function createArrowTexture(
  scene: Phaser.Scene,
  key: string,
  direction: 'up' | 'down' | 'left' | 'right',
  color: number = 0xffffff
): void {
  if (scene.textures.exists(key)) return;

  const size = 40;
  const graphics = scene.add.graphics();
  const cx = size / 2;
  const cy = size / 2;
  const len = 15;

  graphics.fillStyle(color, 0.5);
  graphics.beginPath();

  let points: Phaser.Geom.Point[] = [];
  switch (direction) {
    case 'up':
      points = [
        new Phaser.Geom.Point(cx, cy - len),
        new Phaser.Geom.Point(cx - len * 0.8, cy + len * 0.5),
        new Phaser.Geom.Point(cx + len * 0.8, cy + len * 0.5)
      ];
      break;
    case 'down':
      points = [
        new Phaser.Geom.Point(cx, cy + len),
        new Phaser.Geom.Point(cx - len * 0.8, cy - len * 0.5),
        new Phaser.Geom.Point(cx + len * 0.8, cy - len * 0.5)
      ];
      break;
    case 'left':
      points = [
        new Phaser.Geom.Point(cx - len, cy),
        new Phaser.Geom.Point(cx + len * 0.5, cy - len * 0.8),
        new Phaser.Geom.Point(cx + len * 0.5, cy + len * 0.8)
      ];
      break;
    case 'right':
      points = [
        new Phaser.Geom.Point(cx + len, cy),
        new Phaser.Geom.Point(cx - len * 0.5, cy - len * 0.8),
        new Phaser.Geom.Point(cx - len * 0.5, cy + len * 0.8)
      ];
      break;
  }

  graphics.moveTo(points[0].x, points[0].y);
  graphics.lineTo(points[1].x, points[1].y);
  graphics.lineTo(points[2].x, points[2].y);
  graphics.closePath();
  graphics.fillPath();

  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

export function createWoodTexture(scene: Phaser.Scene, key: string, width: number, height: number): void {
  if (scene.textures.exists(key)) return;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const baseColor = { r: 139, g: 90, b: 43 };
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const noise = noise2D(x * 0.08, y * 0.08);
      const grain = noise2D(x * 0.5, y * 2.5) * 30;
      const lineNoise = Math.abs(noise2D(x * 0.02, y * 0.15)) * 40;

      const variation = noise * 40 + grain - lineNoise;
      const r = Math.max(0, Math.min(255, baseColor.r + variation));
      const g = Math.max(0, Math.min(255, baseColor.g + variation * 0.7));
      const b = Math.max(0, Math.min(255, baseColor.b + variation * 0.4));

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  scene.textures.addCanvas(key, canvas);
}

function noise2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

export function createShardTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;

  const size = 16;
  const graphics = scene.add.graphics();
  const cx = size / 2;
  const cy = size / 2;

  graphics.fillStyle(0xffd700, 1);
  graphics.beginPath();
  graphics.moveTo(cx, cy - 4);
  graphics.lineTo(cx + 4, cy);
  graphics.lineTo(cx, cy + 4);
  graphics.lineTo(cx - 4, cy);
  graphics.closePath();
  graphics.fillPath();

  graphics.fillStyle(0xfff8dc, 0.7);
  graphics.beginPath();
  graphics.moveTo(cx - 1, cy - 3);
  graphics.lineTo(cx + 2, cy - 1);
  graphics.lineTo(cx, cy + 1);
  graphics.closePath();
  graphics.fillPath();

  graphics.generateTexture(key, size, size);
  graphics.destroy();
}
