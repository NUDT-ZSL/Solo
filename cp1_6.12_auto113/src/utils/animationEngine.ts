import { v4 as uuidv4 } from 'uuid';

export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface PropertyChange {
  id: string;
  property:
    | 'translateX'
    | 'translateY'
    | 'rotate'
    | 'scale'
    | 'scaleX'
    | 'scaleY'
    | 'opacity';
  value: number;
  unit?: string;
}

export interface KeyframeNode {
  id: string;
  timePercent: number;
  properties: PropertyChange[];
  easing: EasingType;
}

export interface AnimationData {
  id: string;
  name: string;
  durationMs: number;
  keyframes: KeyframeNode[];
}

export const EASING_MAP: Record<EasingType, string> = {
  linear: 'linear',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
};

export const PROPERTY_DEFAULTS: Record<PropertyChange['property'], { value: number; unit: string }> = {
  translateX: { value: 0, unit: 'px' },
  translateY: { value: 0, unit: 'px' },
  rotate: { value: 0, unit: 'deg' },
  scale: { value: 1, unit: '' },
  scaleX: { value: 1, unit: '' },
  scaleY: { value: 1, unit: '' },
  opacity: { value: 1, unit: '' },
};

export function createDefaultAnimation(name = 'New Animation'): AnimationData {
  const kf0: KeyframeNode = {
    id: uuidv4(),
    timePercent: 0,
    properties: [
      { id: uuidv4(), property: 'translateX', value: 0, unit: 'px' },
      { id: uuidv4(), property: 'opacity', value: 1, unit: '' },
    ],
    easing: 'linear',
  };
  const kf100: KeyframeNode = {
    id: uuidv4(),
    timePercent: 100,
    properties: [
      { id: uuidv4(), property: 'translateX', value: 100, unit: 'px' },
      { id: uuidv4(), property: 'opacity', value: 0.5, unit: '' },
    ],
    easing: 'linear',
  };
  return {
    id: uuidv4(),
    name,
    durationMs: 2000,
    keyframes: [kf0, kf100],
  };
}

export function createKeyframeNode(timePercent: number): KeyframeNode {
  return {
    id: uuidv4(),
    timePercent: Math.max(0, Math.min(100, timePercent)),
    properties: [],
    easing: 'linear',
  };
}

export function createPropertyChange(
  property: PropertyChange['property'] = 'translateX'
): PropertyChange {
  const defaults = PROPERTY_DEFAULTS[property];
  return {
    id: uuidv4(),
    property,
    value: defaults.value,
    unit: defaults.unit,
  };
}

export function sortKeyframes(keyframes: KeyframeNode[]): KeyframeNode[] {
  return [...keyframes].sort((a, b) => a.timePercent - b.timePercent);
}

export function formatPropertyValue(prop: PropertyChange): string {
  const { value, unit = '' } = prop;
  if (prop.property === 'opacity') {
    return Math.max(0, Math.min(1, value)).toFixed(2);
  }
  if (prop.property === 'scale' || prop.property === 'scaleX' || prop.property === 'scaleY') {
    return value.toFixed(2);
  }
  if (prop.property === 'rotate') {
    return `${value}${unit}`;
  }
  return `${value}${unit}`;
}

function groupTransformProperties(props: PropertyChange[]): {
  transformParts: string[];
  otherParts: string[];
} {
  const transformParts: string[] = [];
  const otherParts: string[] = [];

  for (const p of props) {
    const val = formatPropertyValue(p);
    switch (p.property) {
      case 'translateX':
        transformParts.push(`translateX(${val})`);
        break;
      case 'translateY':
        transformParts.push(`translateY(${val})`);
        break;
      case 'rotate':
        transformParts.push(`rotate(${val})`);
        break;
      case 'scale':
        transformParts.push(`scale(${val})`);
        break;
      case 'scaleX':
        transformParts.push(`scaleX(${val})`);
        break;
      case 'scaleY':
        transformParts.push(`scaleY(${val})`);
        break;
      case 'opacity':
        otherParts.push(`  opacity: ${val};`);
        break;
    }
  }
  return { transformParts, otherParts };
}

interface PercentageGroup {
  timePercent: number;
  keyframes: KeyframeNode[];
}

export function groupKeyframesByPercent(
  keyframes: KeyframeNode[]
): PercentageGroup[] {
  const map = new Map<number, KeyframeNode[]>();
  for (const kf of keyframes) {
    const rounded = Math.round(kf.timePercent * 100) / 100;
    if (!map.has(rounded)) {
      map.set(rounded, []);
    }
    map.get(rounded)!.push(kf);
  }
  return Array.from(map.entries())
    .map(([timePercent, keyframes]) => ({ timePercent, keyframes }))
    .sort((a, b) => a.timePercent - b.timePercent);
}

export function keyframesToCSS(
  keyframes: KeyframeNode[],
  animationName = 'keyframe-flow-animation'
): string {
  if (keyframes.length === 0) {
    return `@keyframes ${animationName} {\n}`;
  }

  const sorted = sortKeyframes(keyframes);
  const groups = groupKeyframesByPercent(sorted);

  let output = `@keyframes ${animationName} {\n`;

  for (const group of groups) {
    const percentLabel = formatPercent(group.timePercent);

    const allProperties: PropertyChange[] = [];
    let easingForBlock: EasingType = 'linear';

    for (const kf of group.keyframes) {
      allProperties.push(...kf.properties);
      if (kf.easing !== 'linear') {
        easingForBlock = kf.easing;
      }
    }

    const { transformParts, otherParts } = groupTransformProperties(allProperties);

    output += `  ${percentLabel} {\n`;

    if (transformParts.length > 0) {
      output += `    transform: ${transformParts.join(' ')};\n`;
    }

    for (const line of otherParts) {
      output += `  ${line}\n`;
    }

    if (easingForBlock !== 'linear') {
      output += `    animation-timing-function: ${EASING_MAP[easingForBlock]};\n`;
    }

    output += `  }\n`;
  }

  output += `}\n`;
  return output;
}

export function formatPercent(value: number): string {
  if (Math.abs(value - Math.round(value)) < 0.01) {
    return `${Math.round(value)}%`;
  }
  return `${value.toFixed(2)}%`;
}

export function buildInlineAnimationStyle(
  keyframes: KeyframeNode[],
  durationMs: number,
  animationName = 'keyframe-flow-animation'
): { cssText: string; keyframesCSS: string } {
  const keyframesCSS = keyframesToCSS(keyframes, animationName);
  const cssText = `animation: ${animationName} ${durationMs}ms linear infinite both;`;
  return { cssText, keyframesCSS };
}

export function getKeyframeAtPercent(
  keyframes: KeyframeNode[],
  percent: number,
  tolerance = 0.5
): KeyframeNode | undefined {
  return keyframes.find((k) => Math.abs(k.timePercent - percent) < tolerance);
}

export function validateKeyframes(keyframes: KeyframeNode[]): boolean {
  if (keyframes.length === 0) return false;
  const hasStart = keyframes.some((k) => k.timePercent === 0);
  const hasEnd = keyframes.some((k) => k.timePercent === 100);
  return hasStart && hasEnd;
}

export function addKeyframeToData(
  data: AnimationData,
  timePercent: number
): AnimationData {
  const newKf = createKeyframeNode(timePercent);
  return {
    ...data,
    keyframes: sortKeyframes([...data.keyframes, newKf]),
  };
}

export function removeKeyframeById(
  data: AnimationData,
  id: string
): AnimationData {
  return {
    ...data,
    keyframes: data.keyframes.filter((k) => k.id !== id),
  };
}

export function duplicateKeyframe(
  data: AnimationData,
  id: string
): AnimationData {
  const original = data.keyframes.find((k) => k.id === id);
  if (!original) return data;
  const newTime = Math.min(100, original.timePercent + 10);
  const copy: KeyframeNode = {
    ...original,
    id: uuidv4(),
    timePercent: newTime,
    properties: original.properties.map((p) => ({ ...p, id: uuidv4() })),
  };
  return {
    ...data,
    keyframes: sortKeyframes([...data.keyframes, copy]),
  };
}

export function updateKeyframeById(
  data: AnimationData,
  id: string,
  updates: Partial<Omit<KeyframeNode, 'id'>>
): AnimationData {
  const updated = data.keyframes.map((k) =>
    k.id === id
      ? {
          ...k,
          ...updates,
          timePercent: updates.timePercent
            ? Math.max(0, Math.min(100, updates.timePercent))
            : k.timePercent,
        }
      : k
  );
  return {
    ...data,
    keyframes: updates.timePercent ? sortKeyframes(updated) : updated,
  };
}

export function updatePropertyInKeyframe(
  data: AnimationData,
  keyframeId: string,
  propertyId: string,
  updates: Partial<PropertyChange>
): AnimationData {
  return {
    ...data,
    keyframes: data.keyframes.map((k) =>
      k.id === keyframeId
        ? {
            ...k,
            properties: k.properties.map((p) =>
              p.id === propertyId ? { ...p, ...updates } : p
            ),
          }
        : k
    ),
  };
}

export function addPropertyToKeyframe(
  data: AnimationData,
  keyframeId: string,
  property: PropertyChange['property']
): AnimationData {
  return {
    ...data,
    keyframes: data.keyframes.map((k) =>
      k.id === keyframeId
        ? { ...k, properties: [...k.properties, createPropertyChange(property)] }
        : k
    ),
  };
}

export function removePropertyFromKeyframe(
  data: AnimationData,
  keyframeId: string,
  propertyId: string
): AnimationData {
  return {
    ...data,
    keyframes: data.keyframes.map((k) =>
      k.id === keyframeId
        ? { ...k, properties: k.properties.filter((p) => p.id !== propertyId) }
        : k
    ),
  };
}

export function durationForSpeed(
  baseDurationMs: number,
  speedMultiplier: number
): number {
  if (speedMultiplier <= 0) return baseDurationMs;
  return Math.round(baseDurationMs / speedMultiplier);
}
