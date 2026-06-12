export interface KeyframeData {
  percentage: number;
  properties: Record<string, string>;
}

export interface ParsedAnimation {
  name: string;
  keyframes: KeyframeData[];
  duration: number;
  timingFunction: string;
  iterationCount: number | 'infinite';
}

export interface TransformValue {
  func: string;
  args: string[];
  raw: string;
}

export function parseKeyframes(cssText: string): ParsedAnimation | null {
  const keyframesMatch = cssText.match(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\}\s*$|\}\s*$/);
  if (!keyframesMatch) {
    return null;
  }

  const name = keyframesMatch[1];
  const body = extractKeyframesBody(cssText, name);
  if (!body) return null;

  const keyframes = extractKeyframeData(body);
  if (keyframes.length === 0) return null;

  return {
    name,
    keyframes: keyframes.sort((a, b) => a.percentage - b.percentage),
    duration: 1000,
    timingFunction: 'ease',
    iterationCount: 'infinite',
  };
}

function extractKeyframesBody(cssText: string, name: string): string | null {
  const regex = new RegExp(`@keyframes\\s+${name}\\s*\\{`, 'i');
  const match = cssText.match(regex);
  if (!match || match.index === undefined) return null;

  let start = match.index + match[0].length;
  let depth = 1;
  let end = start;

  while (end < cssText.length && depth > 0) {
    if (cssText[end] === '{') depth++;
    else if (cssText[end] === '}') depth--;
    end++;
  }

  return cssText.slice(start, end - 1);
}

function extractKeyframeData(body: string): KeyframeData[] {
  const frames: KeyframeData[] = [];

  const blockRegex = /([^{}]+)\{([^{}]*)\}/g;
  let match;

  while ((match = blockRegex.exec(body)) !== null) {
    const selectorStr = match[1].trim();
    const propsStr = match[2].trim();

    const percentages = parseSelector(selectorStr);
    const properties = parseProperties(propsStr);

    for (const pct of percentages) {
      frames.push({ percentage: pct, properties: { ...properties } });
    }
  }

  return frames;
}

function parseSelector(selector: string): number[] {
  const result: number[] = [];
  const parts = selector.split(',').map((s) => s.trim());

  for (const part of parts) {
    if (part === 'from') result.push(0);
    else if (part === 'to') result.push(100);
    else {
      const numMatch = part.match(/(\d+(?:\.\d+)?)%/);
      if (numMatch) result.push(parseFloat(numMatch[1]));
    }
  }

  return result;
}

function parseProperties(propsStr: string): Record<string, string> {
  const props: Record<string, string> = {};
  const declarations = propsStr.split(';').filter((d) => d.trim());

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const property = decl.slice(0, colonIdx).trim();
    const value = decl.slice(colonIdx + 1).trim();
    if (property && value) {
      props[property] = value;
    }
  }

  return props;
}

/* ========== transform 属性逐值解析与反转 ========== */

export function parseTransform(transformStr: string): TransformValue[] {
  const result: TransformValue[] = [];
  const funcRegex = /([a-zA-Z-]+)\s*\(([^)]*)\)/g;
  let match;

  while ((match = funcRegex.exec(transformStr)) !== null) {
    const func = match[1].trim();
    const argsStr = match[2].trim();
    const args = argsStr
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    result.push({ func, args, raw: match[0] });
  }

  return result;
}

export function stringifyTransform(transforms: TransformValue[]): string {
  return transforms.map((t) => `${t.func}(${t.args.join(', ')})`).join(' ');
}

function isNumericUnitValue(arg: string): boolean {
  return /^-?\d*\.?\d+(px|%|em|rem|vh|vw|deg|rad|turn|ms|s)?$/.test(arg.trim());
}

function negateNumericArg(arg: string): string {
  const trimmed = arg.trim();
  const match = trimmed.match(/^(-?\d*\.?\d+)(.*)$/);
  if (!match) return trimmed;
  const [, numStr, unit] = match;
  const num = parseFloat(numStr);
  const negated = -num;
  const negatedStr = Number.isInteger(negated) ? String(negated) : String(parseFloat(negated.toFixed(6)));
  return `${negatedStr}${unit}`;
}

function reverseTransformValue(
  startTransforms: TransformValue[],
  endTransforms: TransformValue[],
): { start: TransformValue[]; end: TransformValue[] } {
  const reversedStart: TransformValue[] = [];
  const reversedEnd: TransformValue[] = [];

  const funcMap = new Map<string, TransformValue[]>();
  for (const t of startTransforms) {
    if (!funcMap.has(t.func)) funcMap.set(t.func, []);
    funcMap.get(t.func)!.push(t);
  }

  for (const endT of endTransforms) {
    const candidates = funcMap.get(endT.func);
    if (candidates && candidates.length > 0) {
      const startT = candidates.shift()!;
      reversedStart.push({
        func: endT.func,
        args: endT.args.map((arg, i) =>
          isNumericUnitValue(arg) && startT.args[i] !== undefined ? arg : arg,
        ),
        raw: '',
      });
      reversedEnd.push({
        func: startT.func,
        args: startT.args.map((arg, i) =>
          isNumericUnitValue(arg) && endT.args[i] !== undefined ? arg : arg,
        ),
        raw: '',
      });
    } else {
      reversedStart.push(endT);
      reversedEnd.push(endT);
    }
  }

  for (const remaining of funcMap.values()) {
    for (const t of remaining) {
      const reversedArgs = t.args.map((arg) =>
        isNumericUnitValue(arg) ? negateNumericArg(arg) : arg,
      );
      reversedStart.push({ ...t, args: reversedArgs });
      reversedEnd.push(t);
    }
  }

  return { start: reversedStart, end: reversedEnd };
}

function reverseNumericPropertyValues(startVal: string, endVal: string): { start: string; end: string } {
  const parseNumeric = (str: string) => {
    const parts = str.split(/\s+/);
    return parts.map((p) => {
      if (isNumericUnitValue(p)) {
        return p;
      }
      return p;
    });
  };

  const startParts = parseNumeric(startVal);
  const endParts = parseNumeric(endVal);
  const maxLen = Math.max(startParts.length, endParts.length);

  const reversedStart: string[] = [];
  const reversedEnd: string[] = [];

  for (let i = 0; i < maxLen; i++) {
    const s = startParts[i] ?? endParts[i] ?? '0';
    const e = endParts[i] ?? startParts[i] ?? '0';
    reversedStart.push(e);
    reversedEnd.push(s);
  }

  return { start: reversedStart.join(' '), end: reversedEnd.join(' ') };
}

export function generateReverseAnimation(parsed: ParsedAnimation): string {
  if (parsed.keyframes.length < 2) {
    const reverseName = `${parsed.name}-reverse`;
    let css = `@keyframes ${reverseName} {\n`;
    for (const frame of parsed.keyframes) {
      const label = frame.percentage === 0 ? '  from' : frame.percentage === 100 ? '  to' : `  ${100 - frame.percentage}%`;
      const props = Object.entries(frame.properties)
        .map(([k, v]) => `    ${k}: ${v};`)
        .join('\n');
      css += `${label} {\n${props}\n  }\n`;
    }
    css += '}';
    return css;
  }

  const sortedFrames = [...parsed.keyframes].sort((a, b) => a.percentage - b.percentage);
  const firstFrame = sortedFrames[0];
  const lastFrame = sortedFrames[sortedFrames.length - 1];

  const reversedFrameProperties: Map<number, Record<string, string>> = new Map();

  for (const frame of sortedFrames) {
    reversedFrameProperties.set(100 - frame.percentage, { ...frame.properties });
  }

  const allPropertyNames = new Set<string>();
  for (const frame of sortedFrames) {
    for (const key of Object.keys(frame.properties)) {
      allPropertyNames.add(key);
    }
  }

  for (const propName of allPropertyNames) {
    const frameValues: Array<{ pct: number; value: string }> = [];
    for (const frame of sortedFrames) {
      if (propName in frame.properties) {
        frameValues.push({ pct: frame.percentage, value: frame.properties[propName] });
      }
    }
    if (frameValues.length < 2) continue;

    const startVal = frameValues[0].value;
    const endVal = frameValues[frameValues.length - 1].value;

    if (propName === 'transform') {
      const startTransforms = parseTransform(startVal);
      const endTransforms = parseTransform(endVal);
      const { start: revStart, end: revEnd } = reverseTransformValue(startTransforms, endTransforms);

      const firstRevPct = 100 - frameValues[frameValues.length - 1].pct;
      const lastRevPct = 100 - frameValues[0].pct;

      if (reversedFrameProperties.has(firstRevPct)) {
        reversedFrameProperties.get(firstRevPct)![propName] = stringifyTransform(revStart);
      }
      if (reversedFrameProperties.has(lastRevPct)) {
        reversedFrameProperties.get(lastRevPct)![propName] = stringifyTransform(revEnd);
      }

      if (frameValues.length > 2) {
        for (let i = 1; i < frameValues.length - 1; i++) {
          const midFrame = frameValues[i];
          const revPct = 100 - midFrame.pct;
          const midTransforms = parseTransform(midFrame.value);
          if (reversedFrameProperties.has(revPct)) {
            reversedFrameProperties.get(revPct)![propName] = stringifyTransform(midTransforms);
          }
        }
      }
    } else if (
      propName === 'opacity' ||
      propName.startsWith('scale') ||
      propName.startsWith('translate') ||
      propName === 'left' ||
      propName === 'right' ||
      propName === 'top' ||
      propName === 'bottom' ||
      propName === 'width' ||
      propName === 'height' ||
      propName.startsWith('margin') ||
      propName.startsWith('padding')
    ) {
      const { start: revStartVal, end: revEndVal } = reverseNumericPropertyValues(startVal, endVal);

      const firstRevPct = 100 - frameValues[frameValues.length - 1].pct;
      const lastRevPct = 100 - frameValues[0].pct;

      if (reversedFrameProperties.has(firstRevPct)) {
        reversedFrameProperties.get(firstRevPct)![propName] = revStartVal;
      }
      if (reversedFrameProperties.has(lastRevPct)) {
        reversedFrameProperties.get(lastRevPct)![propName] = revEndVal;
      }

      if (frameValues.length > 2) {
        for (let i = 1; i < frameValues.length - 1; i++) {
          const midFrame = frameValues[i];
          const revPct = 100 - midFrame.pct;
          if (reversedFrameProperties.has(revPct)) {
            reversedFrameProperties.get(revPct)![propName] = midFrame.value;
          }
        }
      }
    }
  }

  const reversedFrames = Array.from(reversedFrameProperties.entries())
    .map(([pct, properties]) => ({ percentage: pct, properties }))
    .sort((a, b) => a.percentage - b.percentage);

  const reverseName = `${parsed.name}-reverse`;
  let css = `@keyframes ${reverseName} {\n`;

  for (const frame of reversedFrames) {
    const label =
      frame.percentage === 0
        ? '  from'
        : frame.percentage === 100
        ? '  to'
        : `  ${frame.percentage}%`;

    const props = Object.entries(frame.properties)
      .map(([k, v]) => `    ${k}: ${v};`)
      .join('\n');

    css += `${label} {\n${props}\n  }\n`;
  }

  css += '}';
  return css;
}

export function injectStylesheet(animationCss: string, id: string): void {
  let styleEl = document.getElementById(id) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = id;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = animationCss;
}

export function removeStylesheet(id: string): void {
  const styleEl = document.getElementById(id);
  if (styleEl) {
    styleEl.remove();
  }
}
