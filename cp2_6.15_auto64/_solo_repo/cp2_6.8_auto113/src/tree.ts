export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Branch {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  depth: number;
  maxDepth: number;
  color: RGB;
  opacity: number;
  targetOpacity: number;
  growProgress: number;
  targetGrowProgress: number;
  brightness: number;
  targetBrightness: number;
  thickness: number;
  removed: boolean;
  children: Branch[];
  parent: Branch | null;
  angle: number;
  length: number;
  baseAngle: number;
}

export interface TreeParams {
  maxDepth: number;
  branchAngle: number;
  lengthRatio: number;
  trunkLength: number;
  startHue: number;
  colorStart: RGB;
  colorMid: RGB;
  colorEnd: RGB;
}

export interface Preset {
  name: string;
  colorStart: RGB;
  colorMid: RGB;
  colorEnd: RGB;
  branchAngle: number;
}

export const PRESETS: Record<string, Preset> = {
  jungle: {
    name: '丛林',
    colorStart: hexToRgb('#2D6A4F'),
    colorMid: hexToRgb('#40916C'),
    colorEnd: hexToRgb('#95D5B2'),
    branchAngle: 40,
  },
  aurora: {
    name: '极光',
    colorStart: hexToRgb('#7400B8'),
    colorMid: hexToRgb('#B5179E'),
    colorEnd: hexToRgb('#FF006E'),
    branchAngle: 20,
  },
  desert: {
    name: '沙漠',
    colorStart: hexToRgb('#E85D04'),
    colorMid: hexToRgb('#F48C06'),
    colorEnd: hexToRgb('#FFBA08'),
    branchAngle: 60,
  },
  ocean: {
    name: '海洋',
    colorStart: hexToRgb('#03045E'),
    colorMid: hexToRgb('#0077B6'),
    colorEnd: hexToRgb('#90E0EF'),
    branchAngle: 35,
  },
};

export const DEFAULT_PARAMS: TreeParams = {
  maxDepth: 7,
  branchAngle: 25,
  lengthRatio: 0.65,
  trunkLength: 60,
  startHue: 0,
  colorStart: hexToRgb('#FF6B6B'),
  colorMid: hexToRgb('#339AF0'),
  colorEnd: hexToRgb('#51CF66'),
};

let branchIdCounter = 0;

function genId(): string {
  return `b_${++branchIdCounter}_${Date.now().toString(36)}`;
}

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

export function rgbToHex(rgb: RGB): string {
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
  };
}

export function applyHueShift(color: RGB, hueShift: number): RGB {
  const hsl = rgbToHsl(color);
  hsl.h = (hsl.h + hueShift) % 360;
  if (hsl.h < 0) hsl.h += 360;
  return hslToRgb(hsl);
}

function rgbToHsl(rgb: RGB): { h: number; s: number; l: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s, l };
}

function hslToRgb(hsl: { h: number; s: number; l: number }): RGB {
  const { h, s, l } = hsl;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function adjustBrightness(color: RGB, brightness: number): RGB {
  const factor = brightness / 100;
  return {
    r: Math.min(255, Math.max(0, color.r * factor)),
    g: Math.min(255, Math.max(0, color.g * factor)),
    b: Math.min(255, Math.max(0, color.b * factor)),
  };
}

function getColorForDepth(
  depth: number,
  maxDepth: number,
  params: TreeParams
): RGB {
  const t = depth / maxDepth;
  let color: RGB;
  if (t < 0.5) {
    color = lerpColor(params.colorStart, params.colorMid, t * 2);
  } else {
    color = lerpColor(params.colorMid, params.colorEnd, (t - 0.5) * 2);
  }
  return applyHueShift(color, params.startHue);
}

export function generateTree(
  originX: number,
  originY: number,
  params: TreeParams
): Branch[] {
  const branches: Branch[] = [];

  function recurse(
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
    parent: Branch | null
  ): void {
    if (depth > params.maxDepth) return;

    const angleRad = (angle * Math.PI) / 180;
    const endX = x + Math.cos(angleRad) * length;
    const endY = y + Math.sin(angleRad) * length;

    const thickness = Math.max(1, (params.maxDepth - depth + 1) * 1.2);
    const color = getColorForDepth(depth, params.maxDepth, params);

    const branch: Branch = {
      id: genId(),
      startX: x,
      startY: y,
      endX,
      endY,
      depth,
      maxDepth: params.maxDepth,
      color,
      opacity: 1,
      targetOpacity: 1,
      growProgress: 1,
      targetGrowProgress: 1,
      brightness: 100,
      targetBrightness: 100,
      thickness,
      removed: false,
      children: [],
      parent,
      angle,
      length,
      baseAngle: angle,
    };

    if (parent) {
      parent.children.push(branch);
    }
    branches.push(branch);

    const newLength = length * params.lengthRatio;
    recurse(endX, endY, angle - params.branchAngle, newLength, depth + 1, branch);
    recurse(endX, endY, angle + params.branchAngle, newLength, depth + 1, branch);
  }

  recurse(originX, originY, -90, params.trunkLength, 0, null);
  return branches;
}

export function findBranchAtPoint(
  branches: Branch[],
  px: number,
  py: number,
  radius: number = 10
): Branch | null {
  for (let i = branches.length - 1; i >= 0; i--) {
    const branch = branches[i];
    if (branch.removed) continue;
    const dx = px - branch.endX;
    const dy = py - branch.endY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= radius) {
      return branch;
    }
  }
  return null;
}

export function markBranchRemoved(branch: Branch): void {
  branch.targetOpacity = 0;
  const stack: Branch[] = [branch];
  while (stack.length > 0) {
    const b = stack.pop()!;
    b.removed = true;
    for (const child of b.children) {
      stack.push(child);
    }
  }
}

export function collectDescendants(branch: Branch): Branch[] {
  const result: Branch[] = [];
  const stack: Branch[] = [branch];
  while (stack.length > 0) {
    const b = stack.pop()!;
    result.push(b);
    for (const child of b.children) {
      stack.push(child);
    }
  }
  return result;
}

export function regenerateFromParent(
  branches: Branch[],
  removedBranch: Branch,
  params: TreeParams
): Branch[] {
  const parent = removedBranch.parent;
  if (!parent) {
    return branches;
  }

  const siblings = parent.children.filter((c) => c !== removedBranch);
  const isLeft = removedBranch.angle < parent.angle;
  const siblingsContain = siblings.some(
    (s) => (isLeft ? s.angle < parent.angle : s.angle > parent.angle)
  );

  if (siblingsContain) {
    return branches;
  }

  const newBranches = branches.filter((b) => {
    const descendants = collectDescendants(removedBranch);
    return !descendants.includes(b);
  });

  const newLength = parent.length * params.lengthRatio;
  const offset = isLeft
    ? parent.angle - params.branchAngle
    : parent.angle + params.branchAngle;

  function regrow(
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
    p: Branch | null
  ): void {
    if (depth > params.maxDepth) return;

    const angleRad = (angle * Math.PI) / 180;
    const endX = x + Math.cos(angleRad) * length;
    const endY = y + Math.sin(angleRad) * length;

    const thickness = Math.max(1, (params.maxDepth - depth + 1) * 1.2);
    const color = getColorForDepth(depth, params.maxDepth, params);

    const branch: Branch = {
      id: genId(),
      startX: x,
      startY: y,
      endX,
      endY,
      depth,
      maxDepth: params.maxDepth,
      color,
      opacity: 0,
      targetOpacity: 1,
      growProgress: 0,
      targetGrowProgress: 1,
      brightness: 30,
      targetBrightness: 100,
      thickness,
      removed: false,
      children: [],
      parent: p,
      angle,
      length,
      baseAngle: angle,
    };

    if (p) {
      p.children.push(branch);
    }
    newBranches.push(branch);

    const nl = length * params.lengthRatio;
    regrow(endX, endY, angle - params.branchAngle, nl, depth + 1, branch);
    regrow(endX, endY, angle + params.branchAngle, nl, depth + 1, branch);
  }

  regrow(parent.endX, parent.endY, offset, newLength, removedBranch.depth, parent);
  return newBranches;
}

export function prepareGrowthAnimation(branches: Branch[]): void {
  for (const branch of branches) {
    branch.growProgress = 0;
    branch.targetGrowProgress = 1;
    branch.brightness = 30;
    branch.targetBrightness = 100;
    branch.opacity = 0;
    branch.targetOpacity = 1;
  }
}

export function countVisibleBranches(branches: Branch[]): number {
  return branches.filter((b) => !b.removed && b.opacity > 0.01).length;
}

export interface AnimationState {
  fadeDuration: number;
  growDuration: number;
  growLayerDelay: number;
  lastTime: number;
  growing: boolean;
  paused: boolean;
  growthStartTime: number;
}

export function createAnimationState(): AnimationState {
  return {
    fadeDuration: 500,
    growDuration: 600,
    growLayerDelay: 300,
    lastTime: performance.now(),
    growing: false,
    paused: false,
    growthStartTime: 0,
  };
}

export function updateBranchesAnimation(
  branches: Branch[],
  state: AnimationState,
  now: number
): void {
  const dt = now - state.lastTime;
  state.lastTime = now;

  for (const branch of branches) {
    const fadeSpeed = 1000 / state.fadeDuration;
    if (branch.opacity < branch.targetOpacity) {
      branch.opacity = Math.min(
        branch.targetOpacity,
        branch.opacity + fadeSpeed * (dt / 1000)
      );
    } else if (branch.opacity > branch.targetOpacity) {
      branch.opacity = Math.max(
        branch.targetOpacity,
        branch.opacity - fadeSpeed * (dt / 1000)
      );
    }

    const brightnessSpeed = 100 / (state.growDuration / 1000);
    if (branch.brightness < branch.targetBrightness) {
      branch.brightness = Math.min(
        branch.targetBrightness,
        branch.brightness + brightnessSpeed * (dt / 1000)
      );
    } else if (branch.brightness > branch.targetBrightness) {
      branch.brightness = Math.max(
        branch.targetBrightness,
        branch.brightness - brightnessSpeed * (dt / 1000)
      );
    }

    if (state.growing && !state.paused) {
      const layerDelay = branch.depth * state.growLayerDelay;
      const elapsed = now - state.growthStartTime - layerDelay;
      if (elapsed >= 0) {
        const progress = Math.min(1, elapsed / state.growDuration);
        const eased = easeOutCubic(progress);
        branch.growProgress = eased;
      }
    } else {
      const growSpeed = 1 / (state.growDuration / 1000);
      if (branch.growProgress < branch.targetGrowProgress) {
        branch.growProgress = Math.min(
          branch.targetGrowProgress,
          branch.growProgress + growSpeed * (dt / 1000)
        );
      }
    }
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function getBranchRenderData(branch: Branch): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  thickness: number;
} {
  const t = branch.growProgress;
  const startX = branch.startX;
  const startY = branch.startY;
  const endX = branch.startX + (branch.endX - branch.startX) * t;
  const endY = branch.startY + (branch.endY - branch.startY) * t;

  const brightColor = adjustBrightness(branch.color, branch.brightness);
  const color = `rgba(${Math.round(brightColor.r)}, ${Math.round(
    brightColor.g
  )}, ${Math.round(brightColor.b)}, ${branch.opacity})`;

  return {
    startX,
    startY,
    endX,
    endY,
    color,
    thickness: branch.thickness,
  };
}

export interface TweenState {
  active: boolean;
  startTime: number;
  duration: number;
  startParams: TreeParams;
  targetParams: TreeParams;
}

export function createTweenState(): TweenState {
  return {
    active: false,
    startTime: 0,
    duration: 1500,
    startParams: { ...DEFAULT_PARAMS },
    targetParams: { ...DEFAULT_PARAMS },
  };
}

export function startTween(
  state: TweenState,
  from: TreeParams,
  to: TreeParams,
  now: number
): void {
  state.active = true;
  state.startTime = now;
  state.startParams = { ...from };
  state.targetParams = { ...to };
}

export function updateTween(
  state: TweenState,
  current: TreeParams,
  now: number
): TreeParams | null {
  if (!state.active) return null;
  const elapsed = now - state.startTime;
  const t = Math.min(1, elapsed / state.duration);
  const eased = easeInOutCubic(t);

  if (t >= 1) {
    state.active = false;
    return { ...state.targetParams };
  }

  return {
    maxDepth: current.maxDepth,
    branchAngle: lerp(
      state.startParams.branchAngle,
      state.targetParams.branchAngle,
      eased
    ),
    lengthRatio: lerp(
      state.startParams.lengthRatio,
      state.targetParams.lengthRatio,
      eased
    ),
    trunkLength: lerp(
      state.startParams.trunkLength,
      state.targetParams.trunkLength,
      eased
    ),
    startHue: lerp(
      state.startParams.startHue,
      state.targetParams.startHue,
      eased
    ),
    colorStart: lerpColor(
      state.startParams.colorStart,
      state.targetParams.colorStart,
      eased
    ),
    colorMid: lerpColor(
      state.startParams.colorMid,
      state.targetParams.colorMid,
      eased
    ),
    colorEnd: lerpColor(
      state.startParams.colorEnd,
      state.targetParams.colorEnd,
      eased
    ),
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
