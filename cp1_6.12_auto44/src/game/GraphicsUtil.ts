import Phaser from 'phaser';

export function createRoundedRect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: number,
  fillAlpha?: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  if (fillColor !== undefined) {
    g.fillStyle(fillColor, fillAlpha !== undefined ? fillAlpha : 1);
  }
  g.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius);
  return g;
}

export function createRoundedRectWithStroke(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: number,
  fillAlpha?: number,
  strokeColor?: number,
  strokeAlpha?: number,
  strokeWidth?: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  if (fillColor !== undefined) {
    g.fillStyle(fillColor, fillAlpha !== undefined ? fillAlpha : 1);
    g.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius);
  }
  if (strokeColor !== undefined) {
    g.lineStyle(strokeWidth || 2, strokeColor, strokeAlpha !== undefined ? strokeAlpha : 1);
    g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, radius);
  }
  return g;
}
