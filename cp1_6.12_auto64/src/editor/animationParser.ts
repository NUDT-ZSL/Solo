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

export function generateReverseAnimation(parsed: ParsedAnimation): string {
  const reversedFrames = [...parsed.keyframes]
    .reverse()
    .map((frame) => ({
      ...frame,
      percentage: 100 - frame.percentage,
    }))
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

  css += `}`;
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
