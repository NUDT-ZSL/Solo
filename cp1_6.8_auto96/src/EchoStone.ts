export interface EchoStoneData {
  id: string;
  frequency: number;
  x: number;
  y: number;
  baseRadius: number;
  color: string;
  glowColor: string;
  collected: boolean;
  matching: boolean;
  breathPhase: number;
  collectAnim: number;
  vanishAnim: number;
  label: string;
}

const STONE_COLORS = [
  { color: 'rgba(0, 220, 255, 0.55)', glowColor: 'rgba(0, 220, 255, 0.9)' },
  { color: 'rgba(255, 200, 60, 0.55)', glowColor: 'rgba(255, 200, 60, 0.9)' },
  { color: 'rgba(180, 100, 255, 0.55)', glowColor: 'rgba(180, 100, 255, 0.9)' },
  { color: 'rgba(0, 255, 150, 0.55)', glowColor: 'rgba(0, 255, 150, 0.9)' },
  { color: 'rgba(255, 100, 80, 0.55)', glowColor: 'rgba(255, 100, 80, 0.9)' },
  { color: 'rgba(255, 160, 0, 0.55)', glowColor: 'rgba(255, 160, 0, 0.9)' },
];

export function generateStones(
  frequencies: number[],
  canvasW: number,
  canvasH: number,
): EchoStoneData[] {
  const count = frequencies.length;
  const cx = canvasW / 2;
  const cy = canvasH * 0.38;
  const spreadX = Math.min(canvasW * 0.35, 320);
  const spreadY = Math.min(canvasH * 0.2, 160);

  return frequencies.map((freq, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const radiusBase = count <= 1 ? 0 : (i % 2 === 0 ? 1 : 0.65);
    const x = cx + Math.cos(angle) * spreadX * radiusBase;
    const y = cy + Math.sin(angle) * spreadY * radiusBase;
    const palette = STONE_COLORS[i % STONE_COLORS.length];

    return {
      id: `stone-${freq}-${i}`,
      frequency: freq,
      x,
      y,
      baseRadius: 28 + Math.random() * 12,
      color: palette.color,
      glowColor: palette.glowColor,
      collected: false,
      matching: false,
      breathPhase: Math.random() * Math.PI * 2,
      collectAnim: 0,
      vanishAnim: 0,
      label: `${freq} Hz`,
    };
  });
}

export function updateStone(stone: EchoStoneData, dt: number): EchoStoneData {
  const breathSpeed = 2.0;
  const newPhase = stone.breathPhase + dt * breathSpeed;

  let collectAnim = stone.collectAnim;
  let vanishAnim = stone.vanishAnim;

  if (stone.matching && !stone.collected) {
    collectAnim = Math.min(1, collectAnim + dt * 3.0);
  } else {
    collectAnim = Math.max(0, collectAnim - dt * 4.0);
  }

  if (stone.collected) {
    vanishAnim = Math.min(1, vanishAnim + dt * 2.5);
  }

  return {
    ...stone,
    breathPhase: newPhase,
    collectAnim,
    vanishAnim,
  };
}

export function drawStone(
  ctx: CanvasRenderingContext2D,
  stone: EchoStoneData,
  time: number,
): void {
  if (stone.collected && stone.vanishAnim >= 1) return;

  const breathScale = 1 + Math.sin(stone.breathPhase) * 0.08;
  const matchScale = 1 + stone.collectAnim * 0.35;
  const scale = breathScale * matchScale;
  const r = stone.baseRadius * scale;

  const alpha = stone.collected ? 1 - stone.vanishAnim : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(stone.x, stone.y);

  if (stone.matching && !stone.collected) {
    const glowR = r * (2.2 + Math.sin(time * 6) * 0.3);
    const grad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, glowR);
    grad.addColorStop(0, stone.glowColor);
    grad.addColorStop(0.5, stone.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  const bodyGrad = ctx.createRadialGradient(0, -r * 0.25, r * 0.1, 0, 0, r);
  if (stone.matching && !stone.collected) {
    bodyGrad.addColorStop(0, stone.glowColor);
    bodyGrad.addColorStop(0.7, stone.color);
    bodyGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
  } else {
    bodyGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    bodyGrad.addColorStop(0.5, stone.color);
    bodyGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = stone.matching ? stone.glowColor : 'rgba(255,255,255,0.15)';
  ctx.lineWidth = stone.matching ? 2 : 1;
  ctx.stroke();

  if (!stone.collected) {
    ctx.fillStyle = stone.matching ? '#fff' : 'rgba(255,255,255,0.6)';
    ctx.font = `bold ${Math.max(10, r * 0.35)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stone.label, 0, r * 0.05);
  }

  ctx.restore();
}

export function isStoneVisible(stone: EchoStoneData): boolean {
  return !(stone.collected && stone.vanishAnim >= 1);
}
