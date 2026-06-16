import { Plant, EnvironmentThreat } from './types';

interface RenderState {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
  threat: EnvironmentThreat | null;
}

interface Branch {
  x: number;
  y: number;
  angle: number;
  length: number;
  thickness: number;
  depth: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hslToRgb(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s * 100}%, ${l * 100}%)`;
}

function drawSeed(state: RenderState, plant: Plant) {
  const { ctx, time } = state;
  const pulse = 1 + Math.sin(time * 0.003) * 0.05;
  const r = 10 * pulse;

  ctx.save();
  ctx.beginPath();
  const grad = ctx.createRadialGradient(plant.x, plant.y, 0, plant.x, plant.y, r);
  grad.addColorStop(0, '#7a4a28');
  grad.addColorStop(1, '#5c3a1e');
  ctx.fillStyle = grad;
  ctx.arc(plant.x, plant.y, r, 0, Math.PI * 2);
  ctx.fill();

  if (plant.grayLevel > 0.1) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(128,128,128,${plant.grayLevel})`;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function generateBranches(
  startX: number,
  startY: number,
  stemLength: number,
  stemThickness: number,
  branchCount: number,
  progress: number,
  time: number,
  windAngle: number
): Branch[] {
  const branches: Branch[] = [];
  const swayBase = Math.sin(time * 0.001) * 3;
  const mainStemAngle = -Math.PI / 2 + (windAngle * Math.PI) / 180 + (swayBase * Math.PI) / 180;

  branches.push({
    x: startX,
    y: startY,
    angle: mainStemAngle,
    length: stemLength * progress,
    thickness: stemThickness,
    depth: 0,
  });

  const currentBranches = [branches[0]];

  for (let depth = 1; depth <= 2 && depth <= Math.ceil(branchCount / 4); depth++) {
    const nextBranches: Branch[] = [];
    for (const parent of currentBranches) {
      const endX = parent.x + Math.cos(parent.angle) * parent.length;
      const endY = parent.y + Math.sin(parent.angle) * parent.length;

      const subBranches = depth === 1 ? Math.min(branchCount, 4) : Math.max(2, Math.ceil(branchCount / 3));
      for (let i = 0; i < subBranches; i++) {
        const t = subBranches === 1 ? 0.5 : (i + 0.5) / subBranches;
        const spread = 60 + (depth * 20);
        const angleOffset = lerp(-spread, spread, t) * (Math.PI / 180);
        const subLength = parent.length * (0.5 + Math.random() * 0.3);

        nextBranches.push({
          x: endX,
          y: endY,
          angle: parent.angle + angleOffset,
          length: subLength * progress,
          thickness: Math.max(1, parent.thickness * 0.6),
          depth,
        });
      }
    }
    branches.push(...nextBranches);
    currentBranches.splice(0, currentBranches.length, ...nextBranches);
  }

  return branches;
}

function drawStem(state: RenderState, plant: Plant, progress: number, windAngle: number): Branch[] {
  const { ctx } = state;
  const genes = plant.genes;
  const stemThickness = lerp(2, 8, genes.stemToughness / 255);
  const stemLength = 150 * progress;
  const branchCount = Math.round(lerp(2, 8, genes.stemToughness / 255));

  const branches = generateBranches(
    plant.x,
    plant.y,
    stemLength,
    stemThickness,
    branchCount,
    progress,
    state.time,
    windAngle
  );

  const colorGray = plant.grayLevel > 0.05;

  for (const b of branches) {
    ctx.save();
    ctx.strokeStyle = colorGray ? `rgb(${lerp(90, 128, plant.grayLevel)}, ${lerp(70, 128, plant.grayLevel)}, ${lerp(40, 128, plant.grayLevel)})` : `rgb(${90}, ${70}, ${40})`;
    ctx.lineWidth = b.thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    const endX = b.x + Math.cos(b.angle) * b.length;
    const endY = b.y + Math.sin(b.angle) * b.length;
    const cpX = b.x + Math.cos(b.angle + (b.depth % 2 === 0 ? 0.2 : -0.2)) * b.length * 0.7;
    const cpY = b.y + Math.sin(b.angle + (b.depth % 2 === 0 ? 0.2 : -0.2)) * b.length * 0.7;
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.stroke();
    ctx.restore();
  }

  return branches;
}

function drawLeaves(state: RenderState, plant: Plant, branches: Branch[]) {
  const { ctx } = state;
  const genes = plant.genes;
  const leafSize = lerp(10, 30, genes.leafArea / 255);
  const colorT = genes.leafArea / 255;

  const leafGray = plant.grayLevel > 0.05;
  const gStart = { r: 74, g: 222, b: 128 };
  const gEnd = { r: 37, g: 99, b: 235 };
  const baseR = Math.round(lerp(gStart.r, gEnd.r, colorT));
  const baseG = Math.round(lerp(gStart.g, gEnd.g, colorT));
  const baseB = Math.round(lerp(gStart.b, gEnd.b, colorT));

  const leafEnds: { x: number; y: number; angle: number }[] = [];

  for (const b of branches) {
    if (b.depth >= 1) {
      const endX = b.x + Math.cos(b.angle) * b.length;
      const endY = b.y + Math.sin(b.angle) * b.length;
      leafEnds.push({ x: endX, y: endY, angle: b.angle });

      if (b.length > 20) {
        const midT = 0.6;
        const midX = b.x + Math.cos(b.angle) * b.length * midT;
        const midY = b.y + Math.sin(b.angle) * b.length * midT;
        leafEnds.push({ x: midX, y: midY, angle: b.angle + 0.5 });
      }
    }
  }

  for (const leaf of leafEnds) {
    const { x, y, angle } = leaf;
    const size = leafSize;
    const perpAngle = angle + Math.PI / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const leafColor = leafGray
      ? `rgb(${lerp(baseR, 128, plant.grayLevel)}, ${lerp(baseG, 128, plant.grayLevel)}, ${lerp(baseB, 128, plant.grayLevel)})`
      : hslToRgb(120 - colorT * 80, 0.6, 0.45 + colorT * 0.1);

    ctx.beginPath();
    ctx.moveTo(-size * 0.8, 0);
    ctx.lineTo(0, -size * 0.5);
    ctx.lineTo(size * 0.2, 0);
    ctx.lineTo(0, size * 0.5);
    ctx.closePath();

    const leafGrad = ctx.createLinearGradient(-size, 0, size, 0);
    leafGrad.addColorStop(0, leafColor);
    leafGrad.addColorStop(1, baseR < 100 ? `rgba(${baseR + 30},${baseG + 30},${baseB + 30},1)` : `rgb(${baseR},${baseG},${baseB})`);
    ctx.fillStyle = leafColor;
    ctx.fill();

    ctx.strokeStyle = `rgba(0,0,0,0.2)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-size * 0.7, 0);
    ctx.lineTo(size * 0.15, 0);
    ctx.stroke();

    ctx.restore();
    void perpAngle;
  }

  return leafEnds;
}

function drawFlowers(state: RenderState, plant: Plant, leafEnds: { x: number; y: number; angle: number }[]) {
  const { ctx, time } = state;
  const genes = plant.genes;
  const flowerSaturation = genes.flowerColor / 255;
  const petalRadius = lerp(8, 16, genes.flowerColor / 255);

  const flowerGray = plant.grayLevel > 0.05;
  const hue = (genes.flowerColor * 360) / 255;

  const tipBranches = leafEnds.slice(-Math.min(3, leafEnds.length));
  if (tipBranches.length === 0) return;

  const topLeaf = tipBranches.reduce((a, b) => (a.y < b.y ? a : b));
  const fx = topLeaf.x;
  const fy = topLeaf.y;

  const sway = Math.sin(time * 0.002 + plant.x) * 2;

  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 + sway * 0.02;
    const px = fx + Math.cos(angle) * petalRadius;
    const py = fy + Math.sin(angle) * petalRadius;

    ctx.save();
    ctx.beginPath();

    const saturation = flowerGray ? 0 : flowerSaturation;
    const lightness = flowerGray ? 0.4 + plant.grayLevel * 0.2 : 0.45 + flowerSaturation * 0.15;

    ctx.fillStyle = flowerGray
      ? `rgb(${100 + plant.grayLevel * 50}, ${100 + plant.grayLevel * 50}, ${100 + plant.grayLevel * 50})`
      : hslToRgb((hue + i * 10) % 360, saturation, lightness);

    ctx.arc(px, py, petalRadius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = flowerGray ? `rgb(140, 140, 140)` : `hsl(${hue}, ${flowerSaturation * 100}%, 70%)`;
  ctx.arc(fx, fy, petalRadius * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFrostTexture(state: RenderState, plant: Plant, progress: number) {
  if (!state.threat || state.threat.type !== 'FROST') return;
  const { ctx, time } = state;
  const frostAlpha = Math.min(1, (state.time - state.threat.startTime) / 2000) * 0.7;

  const crystals = 6;
  for (let i = 0; i < crystals; i++) {
    const angle = (i / crystals) * Math.PI * 2 + time * 0.0005;
    const r = 40 + i * 5;
    const cx = plant.x + Math.cos(angle) * r;
    const cy = plant.y - 100 * progress + Math.sin(angle) * r;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = `rgba(220, 240, 255, ${frostAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    const size = 8 + (i % 3) * 3;
    for (let j = 0; j < 6; j++) {
      ctx.save();
      ctx.rotate((j / 6) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.5, -size * 0.2);
      ctx.lineTo(size * 0.7, 0);
      ctx.lineTo(size * 0.5, size * 0.2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}

interface PestParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}
const pestParticles: PestParticle[] = [];

function drawThreatEffects(state: RenderState, plants: Plant[]) {
  const { ctx, width, height, time, threat } = state;
  if (!threat) return;

  const threatProgress = Math.min(1, (time - threat.startTime) / 1500);

  switch (threat.type) {
    case 'DROUGHT': {
      const groundY = height - 80;
      ctx.save();
      ctx.strokeStyle = `rgba(139, 90, 43, ${0.5 * threatProgress})`;
      ctx.lineWidth = 2;
      const cracks = 12;
      for (let i = 0; i < cracks; i++) {
        const startX = (i / cracks) * width + Math.sin(i * 1.5) * 20;
        ctx.beginPath();
        ctx.moveTo(startX, groundY);
        let cx = startX;
        let cy = groundY;
        for (let s = 0; s < 6; s++) {
          cx += Math.sin(i + s * 0.8 + time * 0.0002) * 8;
          cy += 6 + Math.cos(i + s) * 2;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(255, 180, 80, ${0.06 * threatProgress})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      break;
    }

    case 'PEST': {
      if (pestParticles.length < 150) {
        for (let i = pestParticles.length; i < 150; i++) {
          const target = plants[i % Math.max(1, plants.length)];
          pestParticles.push({
            x: target ? target.x + (Math.random() - 0.5) * 300 : width / 2,
            y: target ? target.y - 50 + (Math.random() - 0.5) * 200 : height / 2,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            size: 2 + Math.random() * 3,
          });
        }
      }
      ctx.save();
      for (const p of pestParticles) {
        p.vx += (Math.random() - 0.5) * 0.2;
        p.vy += (Math.random() - 0.5) * 0.2;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = `rgba(90, 50, 30, ${0.8 * threatProgress})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 1.2, p.size * 0.8, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(60, 30, 20, ${0.9 * threatProgress})`;
        ctx.beginPath();
        ctx.arc(p.x + p.vx * 2, p.y + p.vy * 2, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 'WIND': {
      ctx.save();
      ctx.strokeStyle = `rgba(200, 220, 255, ${0.25 * threatProgress})`;
      ctx.lineWidth = 1.5;
      const lines = 30;
      for (let i = 0; i < lines; i++) {
        const ly = (i / lines) * height + ((time * 0.3 + i * 50) % height);
        const lx = ((time * 0.6 + i * 80) % (width + 200)) - 100;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + 40, ly + 2);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(180, 200, 230, ${0.03 * threatProgress})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      break;
    }

    case 'FROST': {
      ctx.save();
      ctx.fillStyle = `rgba(200, 230, 255, ${0.08 * threatProgress})`;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = `rgba(180, 210, 255, ${0.4 * threatProgress})`;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 40; i++) {
        const fx = (i * 73 + time * 0.05) % width;
        const fy = ((i * 137) % (height - 100)) + Math.sin(time * 0.001 + i) * 10;
        ctx.beginPath();
        for (let j = 0; j < 4; j++) {
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + Math.cos((j * Math.PI) / 2) * 5, fy + Math.sin((j * Math.PI) / 2) * 5);
        }
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
  }
}

function drawBackground(state: RenderState) {
  const { ctx, width, height } = state;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0b1120');
  bgGrad.addColorStop(0.6, '#101a30');
  bgGrad.addColorStop(1, '#1a2744');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const groundY = height - 80;
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
  groundGrad.addColorStop(0, '#2a3f2a');
  groundGrad.addColorStop(0.3, '#1e2e1e');
  groundGrad.addColorStop(1, '#142014');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, width, height - groundY);

  ctx.strokeStyle = 'rgba(60, 100, 60, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 80; i++) {
    const gx = (i / 80) * width + Math.sin(i) * 5;
    const gh = 3 + (i % 4) * 2;
    ctx.beginPath();
    ctx.moveTo(gx, groundY);
    ctx.lineTo(gx + (i % 2 === 0 ? 1 : -1), groundY - gh);
    ctx.stroke();
  }
}

function getWindAngle(threat: EnvironmentThreat | null, time: number): number {
  if (!threat || threat.type !== 'WIND') return 0;
  const intensity = threat.intensity;
  return (Math.sin(time * 0.002) * 0.5 + 0.5) * lerp(5, 15, intensity) * (Math.sin(time * 0.0005) > 0 ? 1 : -1);
}

export function render(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  plants: Plant[],
  threat: EnvironmentThreat | null,
  time: number,
  hoveredPlantId: string | null
) {
  const state: RenderState = { ctx, width, height, time, threat };

  drawBackground(state);

  const windAngle = getWindAngle(threat, time);

  const sortedPlants = [...plants].sort((a, b) => a.x - b.x);

  for (const plant of sortedPlants) {
    const selected = plant.isSelected;
    const hovered = hoveredPlantId === plant.id;

    if (hovered || selected) {
      ctx.save();
      ctx.strokeStyle = selected ? '#fbbf24' : '#60a5fa';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(plant.x, plant.y - 80 * plant.growthProgress, 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    const progress = plant.growthProgress;

    if (progress < 0.1) {
      drawSeed(state, plant);
      continue;
    }

    const branches = drawStem(state, plant, progress, windAngle);
    const leafEnds = drawLeaves(state, plant, branches);
    if (progress > 0.7) {
      drawFlowers(state, plant, leafEnds);
    }

    if (threat?.type === 'FROST') {
      drawFrostTexture(state, plant, progress);
    }
  }

  drawThreatEffects(state, plants);
}

export function getPlantAt(
  plants: Plant[],
  x: number,
  y: number,
  width: number,
  height: number
): Plant | null {
  const hitRadius = 80;
  void width;
  void height;

  for (let i = plants.length - 1; i >= 0; i--) {
    const p = plants[i];
    const cy = p.y - 80 * p.growthProgress;
    const dx = x - p.x;
    const dy = y - cy;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      return p;
    }
  }
  return null;
}

export function computeCanvasSize(windowW: number, windowH: number): { w: number; h: number } {
  const minW = 800;
  const minH = 600;
  const maxW = 1920;
  const maxH = 1080;
  return {
    w: Math.max(minW, Math.min(maxW, windowW)),
    h: Math.max(minH, Math.min(maxH, windowH)),
  };
}
