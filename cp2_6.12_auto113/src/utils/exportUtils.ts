import { saveAs } from 'file-saver';
import type { Node, Edge, KnowledgeGraph } from '@/types';
import { COLOR_MAP } from './constants';

export function exportToJSON(nodes: Node[], edges: Edge[]): void {
  const graphData: KnowledgeGraph = {
    nodes,
    edges,
    version: 1,
    lastModified: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(graphData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  saveAs(blob, `knowledge-graph-${timestamp}.json`);
}

export async function exportToPNG(
  svgElement: SVGSVGElement,
  width: number,
  height: number
): Promise<void> {
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

  svgClone.setAttribute('width', String(width));
  svgClone.setAttribute('height', String(height));
  svgClone.style.background = '#ffffff';

  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', '#ffffff');
  svgClone.insertBefore(bgRect, svgClone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgClone);

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load SVG image'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        saveAs(blob, `knowledge-graph-${timestamp}.png`);
      }
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export function getNodeColorHex(color: string): string {
  return COLOR_MAP[color as keyof typeof COLOR_MAP] || '#9e9e9e';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
