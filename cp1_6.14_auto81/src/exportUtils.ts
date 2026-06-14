import { AnnotationElement, ImagePosition } from './types';

interface ExportOptions {
  image: string | null;
  imagePosition: ImagePosition;
  elements: AnnotationElement[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor?: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function svgToImage(svgElement: SVGSVGElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function downloadFile(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function renderToCanvas(
  options: ExportOptions
): Promise<HTMLCanvasElement> {
  const { image, imagePosition, elements, canvasWidth, canvasHeight, backgroundColor = '#1a1a1a' } = options;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (image) {
    const img = await loadImage(image);
    const drawWidth = img.width * imagePosition.scale;
    const drawHeight = img.height * imagePosition.scale;
    ctx.drawImage(img, imagePosition.x, imagePosition.y, drawWidth, drawHeight);
  }

  const tempSvg = createSvgFromElements(elements, canvasWidth, canvasHeight);
  const svgImg = await svgToImage(tempSvg);
  ctx.drawImage(svgImg, 0, 0);

  return canvas;
}

function createSvgFromElements(
  elements: AnnotationElement[],
  width: number,
  height: number
): SVGSVGElement {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', width.toString());
  svg.setAttribute('height', height.toString());
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const anchorElements = elements.filter(e => e.type === 'anchor');
  for (let i = 0; i < anchorElements.length - 1; i++) {
    const current = anchorElements[i];
    const next = anchorElements[i + 1];
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', current.x.toString());
    line.setAttribute('y1', current.y.toString());
    line.setAttribute('x2', next.x.toString());
    line.setAttribute('y2', next.y.toString());
    line.setAttribute('stroke', '#e53935');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '6,4');
    svg.appendChild(line);
  }

  elements.forEach(element => {
    switch (element.type) {
      case 'anchor': {
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', element.x.toString());
        circle.setAttribute('cy', element.y.toString());
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', '#e53935');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        svg.appendChild(circle);
        break;
      }
      case 'text': {
        const foreignObject = document.createElementNS(svgNS, 'foreignObject');
        foreignObject.setAttribute('x', element.x.toString());
        foreignObject.setAttribute('y', element.y.toString());
        foreignObject.setAttribute('width', (element.width || 150).toString());
        foreignObject.setAttribute('height', (element.height || 40).toString());
        
        const div = document.createElement('div');
        div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        div.style.cssText = `
          background: rgba(255, 255, 255, 0.5);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: ${element.fontSize}px;
          color: ${element.color};
          font-family: system-ui, -apple-system, sans-serif;
          min-width: 100px;
          min-height: 24px;
          word-break: break-word;
        `;
        div.textContent = element.content || '文本';
        foreignObject.appendChild(div);
        svg.appendChild(foreignObject);
        break;
      }
      case 'arrow': {
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', element.x.toString());
        line.setAttribute('y1', element.y.toString());
        line.setAttribute('x2', element.endX.toString());
        line.setAttribute('y2', element.endY.toString());
        line.setAttribute('stroke', element.color);
        line.setAttribute('stroke-width', element.lineWidth.toString());
        svg.appendChild(line);

        const angle = Math.atan2(element.endY - element.y, element.endX - element.x);
        const arrowLength = 12;
        const arrowAngle = Math.PI / 6;
        
        const p1x = element.endX - arrowLength * Math.cos(angle - arrowAngle);
        const p1y = element.endY - arrowLength * Math.sin(angle - arrowAngle);
        const p2x = element.endX - arrowLength * Math.cos(angle + arrowAngle);
        const p2y = element.endY - arrowLength * Math.sin(angle + arrowAngle);

        const polygon = document.createElementNS(svgNS, 'polygon');
        polygon.setAttribute('points', `${element.endX},${element.endY} ${p1x},${p1y} ${p2x},${p2y}`);
        polygon.setAttribute('fill', element.color);
        svg.appendChild(polygon);

        const startCircle = document.createElementNS(svgNS, 'circle');
        startCircle.setAttribute('cx', element.x.toString());
        startCircle.setAttribute('cy', element.y.toString());
        startCircle.setAttribute('r', '4');
        startCircle.setAttribute('fill', element.color);
        svg.appendChild(startCircle);

        const endCircle = document.createElementNS(svgNS, 'circle');
        endCircle.setAttribute('cx', element.endX.toString());
        endCircle.setAttribute('cy', element.endY.toString());
        endCircle.setAttribute('r', '4');
        endCircle.setAttribute('fill', element.color);
        svg.appendChild(endCircle);
        break;
      }
      case 'ruler': {
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', element.x.toString());
        line.setAttribute('y1', element.y.toString());
        line.setAttribute('x2', element.endX.toString());
        line.setAttribute('y2', element.endY.toString());
        line.setAttribute('stroke', element.color);
        line.setAttribute('stroke-width', element.lineWidth.toString());
        svg.appendChild(line);

        const dx = element.endX - element.x;
        const dy = element.endY - element.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6;

        const sp1x = element.x + arrowLength * Math.cos(angle - arrowAngle);
        const sp1y = element.y + arrowLength * Math.sin(angle - arrowAngle);
        const sp2x = element.x + arrowLength * Math.cos(angle + arrowAngle);
        const sp2y = element.y + arrowLength * Math.sin(angle + arrowAngle);

        const startArrow = document.createElementNS(svgNS, 'polygon');
        startArrow.setAttribute('points', `${element.x},${element.y} ${sp1x},${sp1y} ${sp2x},${sp2y}`);
        startArrow.setAttribute('fill', element.color);
        svg.appendChild(startArrow);

        const ep1x = element.endX - arrowLength * Math.cos(angle - arrowAngle);
        const ep1y = element.endY - arrowLength * Math.sin(angle - arrowAngle);
        const ep2x = element.endX - arrowLength * Math.cos(angle + arrowAngle);
        const ep2y = element.endY - arrowLength * Math.sin(angle + arrowAngle);

        const endArrow = document.createElementNS(svgNS, 'polygon');
        endArrow.setAttribute('points', `${element.endX},${element.endY} ${ep1x},${ep1y} ${ep2x},${ep2y}`);
        endArrow.setAttribute('fill', element.color);
        svg.appendChild(endArrow);

        const midX = (element.x + element.endX) / 2;
        const midY = (element.y + element.endY) / 2;

        const perpAngle = angle + Math.PI / 2;
        const labelX = midX + 15 * Math.cos(perpAngle);
        const labelY = midY + 15 * Math.sin(perpAngle);

        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', labelX.toString());
        text.setAttribute('y', labelY.toString());
        text.setAttribute('fill', element.color);
        text.setAttribute('font-size', '12');
        text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.textContent = `${Math.round(length)}px`;
        svg.appendChild(text);

        const tickCount = Math.floor(length / 50);
        for (let i = 1; i <= tickCount; i++) {
          const t = i / (tickCount + 1);
          const tx = element.x + dx * t;
          const ty = element.y + dy * t;
          const tickLength = 6;
          
          const tickLine = document.createElementNS(svgNS, 'line');
          tickLine.setAttribute('x1', (tx + tickLength * Math.cos(perpAngle)).toString());
          tickLine.setAttribute('y1', (ty + tickLength * Math.sin(perpAngle)).toString());
          tickLine.setAttribute('x2', (tx - tickLength * Math.cos(perpAngle)).toString());
          tickLine.setAttribute('y2', (ty - tickLength * Math.sin(perpAngle)).toString());
          tickLine.setAttribute('stroke', element.color);
          tickLine.setAttribute('stroke-width', '1');
          svg.appendChild(tickLine);
        }
        break;
      }
    }
  });

  return svg;
}

export async function exportToPNG(
  svgElement: SVGSVGElement,
  options: ExportOptions
): Promise<void> {
  try {
    const canvas = await renderToCanvas(options);
    const dataUrl = canvas.toDataURL('image/png');
    downloadFile(dataUrl, `graphique-annotator-${generateId()}.png`);
  } catch (error) {
    console.error('PNG export failed:', error);
    throw error;
  }
}

export async function exportToJPG(
  svgElement: SVGSVGElement,
  options: ExportOptions
): Promise<void> {
  try {
    const canvas = await renderToCanvas({ ...options, backgroundColor: '#ffffff' });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    downloadFile(dataUrl, `graphique-annotator-${generateId()}.jpg`);
  } catch (error) {
    console.error('JPG export failed:', error);
    throw error;
  }
}

export function exportToSVG(
  svgElement: SVGSVGElement,
  image: string | null
): void {
  try {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    downloadFile(url, `graphique-annotator-${generateId()}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('SVG export failed:', error);
    throw error;
  }
}
