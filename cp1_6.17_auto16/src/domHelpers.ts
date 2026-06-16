import type { PartConfig } from '../data/partsConfig';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createSVGElement<K extends keyof SVGElementTagNameMap>(
  tagName: K,
  attrs: Record<string, string | number> = {}
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tagName);
  setAttributes(element, attrs);
  return element;
}

export function setAttributes(
  element: SVGElement | HTMLElement,
  attrs: Record<string, string | number>
): void {
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
}

export function applyAnimation(
  element: SVGElement | HTMLElement,
  animationClass: string,
  duration: number = 400
): Promise<void> {
  return new Promise((resolve) => {
    element.classList.add(animationClass);
    const timeout = setTimeout(() => {
      element.classList.remove(animationClass);
      resolve();
    }, duration);
    element.addEventListener('animationend', function handler() {
      clearTimeout(timeout);
      element.removeEventListener('animationend', handler);
      element.classList.remove(animationClass);
      resolve();
    });
  });
}

export function removeAnimation(
  element: SVGElement | HTMLElement,
  animationClass: string
): void {
  element.classList.remove(animationClass);
}

export function getElementCenter(element: SVGElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

export function createPartSVG(part: PartConfig): SVGGElement {
  const group = createSVGElement('g', {
    class: `part part-${part.type}`,
    'data-part-id': part.id,
    'data-part-type': part.type
  });

  const baseRotation = (Math.random() - 0.5) * 2 * part.rotationRange;

  const transform = `translate(${part.positionOffset.x}, ${part.positionOffset.y}) rotate(${baseRotation})`;
  group.setAttribute('transform', transform);
  group.style.setProperty('--base-rotate', `${baseRotation}deg`);

  const scatterX = (Math.random() - 0.5) * 40;
  const scatterY = (Math.random() - 0.5) * 40;
  group.style.setProperty('--scatter-x', `${scatterX}px`);
  group.style.setProperty('--scatter-y', `${scatterY}px`);

  if (part.svgPath.includes('M')) {
    const pathData = part.svgPath.split(/(?=M)/).filter(p => p.trim());
    pathData.forEach((d, index) => {
      const path = createSVGElement('path', {
        d: d.trim(),
        fill: part.fillColor || 'none',
        stroke: part.strokeColor || '#212121',
        'stroke-width': '1',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        class: `part-path part-path-${index}`
      });
      group.appendChild(path);
    });
  }

  return group;
}

export function toggleClass(
  element: HTMLElement | SVGElement,
  className: string,
  force?: boolean
): void {
  if (force === undefined) {
    element.classList.toggle(className);
  } else if (force) {
    element.classList.add(className);
  } else {
    element.classList.remove(className);
  }
}

export function hasClass(element: HTMLElement | SVGElement, className: string): boolean {
  return element.classList.contains(className);
}

export function createCoffeeStainTexture(): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <radialGradient id="stain" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#8D6E63;stop-opacity:0.08" />
          <stop offset="70%" style="stop-color:#8D6E63;stop-opacity:0.03" />
          <stop offset="100%" style="stop-color:#8D6E63;stop-opacity:0" />
        </radialGradient>
      </defs>
      <circle cx="85" cy="95" r="25" fill="url(#stain)" />
      <circle cx="30" cy="110" r="18" fill="url(#stain)" />
      <circle cx="105" cy="35" r="15" fill="url(#stain)" />
    </svg>
  `)}`;
}

export function createGridPattern(): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E0E0E0" stroke-width="0.5"/>
    </svg>
  `)}`;
}

export function createStarSVG(size: number = 24): SVGSVGElement {
  const svg = createSVGElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    class: 'star-icon'
  });
  const path = createSVGElement('path', {
    d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    fill: '#FFD54F',
    stroke: '#FF8F00',
    'stroke-width': '1',
    'stroke-linejoin': 'round'
  });
  svg.appendChild(path);
  return svg;
}

export function createLightningSVG(size: number = 28): SVGSVGElement {
  const svg = createSVGElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    class: 'lightning-icon'
  });
  const path = createSVGElement('path', {
    d: 'M13 0L0 14h9l-4 10 13-14h-9L13 0z',
    fill: '#FFFFFF',
    stroke: 'none'
  });
  svg.appendChild(path);
  return svg;
}

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function raf(callback: (timestamp: number) => void): number {
  return requestAnimationFrame(callback);
}

export function cancelRaf(id: number): void {
  cancelAnimationFrame(id);
}
