export interface DayData {
  dayIndex: number;
  steps: number;
  heartRate: number;
  screenHours: number;
}

export interface TreeParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  breathePhase: number;
}

export interface Ripple {
  y: number;
  speed: number;
  phase: number;
  size: number;
  alpha: number;
}

export interface Tree {
  id: number;
  dayIndex: number;
  x: number;
  baseY: number;
  trunkHeight: number;
  trunkWidth: number;
  crownRadiusX: number;
  crownRadiusY: number;
  rippleCount: number;
  ripples: Ripple[];
  particles: TreeParticle[];
  mainColor: string;
  trunkBottomColor: string;
  trunkTopColor: string;
  particleColor: string;
  hovered: boolean;
  hoverProgress: number;
  explosionPhase: number;
  goldSparks: GoldSpark[];
  ripplePaused: boolean;
}

export interface GoldSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  progress: number;
  targetX: number;
  targetY: number;
}

export interface ForestResult {
  trees: Tree[];
  groundColorStart: string;
  groundColorEnd: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

function saturateColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const l = (max + min) / 2 / 255;
  if (l === 0 || l === 1) return hex;

  const factor = amount;
  return rgbToHex(
    rgb.r + (rgb.r - l * 255) * factor,
    rgb.g + (rgb.g - l * 255) * factor,
    rgb.b + (rgb.b - l * 255) * factor
  );
}

function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(rgb.r * (1 - amount), rgb.g * (1 - amount), rgb.b * (1 - amount));
}

function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount
  );
}

const SPRING_GREEN = '#7CFC00';
const AUTUMN_ORANGE = '#FFA500';
const GROUND_START = '#228B22';
const GROUND_END = '#CD853F';

export function generateForest(
  data: DayData[],
  canvasWidth: number,
  canvasHeight: number
): ForestResult {
  const groundY = canvasHeight * 0.85;
  const trees: Tree[] = [];
  const minSpacing = 30;
  const padding = 60;
  const usableWidth = canvasWidth - padding * 2;
  const stepX = usableWidth / (data.length + 1);

  const sortedData = [...data].sort((a, b) => a.dayIndex - b.dayIndex);

  sortedData.forEach((d, idx) => {
    const dayT = d.dayIndex / 6;
    const mainColor = lerpColor(SPRING_GREEN, AUTUMN_ORANGE, dayT);
    const trunkBottom = darkenColor(mainColor, 0.5);
    const trunkTop = lightenColor(mainColor, 0.25);
    const particleCol = saturateColor(mainColor, 0.15);

    const trunkHeight = d.steps / 200;
    const crownRadiusX = d.screenHours * 8;
    const crownRadiusY = crownRadiusX * 0.7;
    const rippleCount = Math.floor(d.heartRate / 10);
    const trunkWidth = Math.max(8, trunkHeight * 0.1);

    let treeX = padding + stepX * (idx + 1);
    for (let i = 0; i < trees.length; i++) {
      const prev = trees[i];
      const combinedWidth =
        (crownRadiusX * 2 + (prev.crownRadiusX || 0) * 2) / 2 + minSpacing;
      if (Math.abs(treeX - prev.x) < combinedWidth) {
        treeX = prev.x + combinedWidth;
      }
    }
    treeX = Math.min(canvasWidth - padding - crownRadiusX, Math.max(padding + crownRadiusX, treeX));

    const ripples: Ripple[] = [];
    for (let r = 0; r < rippleCount; r++) {
      ripples.push({
        y: (r / rippleCount) * trunkHeight,
        speed: 0.5 + (d.heartRate / 150) * 1.5,
        phase: (r / rippleCount) * Math.PI * 2,
        size: 3 + Math.random() * 2,
        alpha: 0.6 + Math.random() * 0.4
      });
    }

    const particles: TreeParticle[] = [];
    const maxParticles = 80;
    const particleCount = Math.min(maxParticles, Math.floor(crownRadiusX * crownRadiusY / 15));
    for (let p = 0; p < particleCount; p++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * crownRadiusX;
      const ellipseY = Math.sqrt(Math.random()) * crownRadiusY;
      const sign = Math.random() > 0.5 ? 1 : -1;
      const px = Math.cos(angle) * radius;
      const py = sign * ellipseY;
      particles.push({
        x: px,
        y: py,
        baseX: px,
        baseY: py,
        vx: 0,
        vy: 0,
        size: 2 + Math.random() * 3,
        alpha: 0.5 + Math.random() * 0.5,
        color: particleCol,
        breathePhase: Math.random() * Math.PI * 2
      });
    }

    trees.push({
      id: d.dayIndex,
      dayIndex: d.dayIndex,
      x: treeX,
      baseY: groundY,
      trunkHeight,
      trunkWidth,
      crownRadiusX,
      crownRadiusY,
      rippleCount,
      ripples,
      particles,
      mainColor,
      trunkBottomColor: trunkBottom,
      trunkTopColor: trunkTop,
      particleColor: particleCol,
      hovered: false,
      hoverProgress: 0,
      explosionPhase: 0,
      goldSparks: [],
      ripplePaused: false
    });
  });

  const avgT = sortedData.reduce((s, d) => s + d.dayIndex, 0) / sortedData.length / 6;
  const groundStart = lerpColor(GROUND_START, GROUND_END, avgT * 0.7);
  const groundEnd = lerpColor(darkenColor(GROUND_START, 0.2), darkenColor(GROUND_END, 0.2), avgT * 0.7);

  return { trees, groundColorStart: groundStart, groundColorEnd: groundEnd };
}
