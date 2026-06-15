import type { FlowNode, FlowEdge } from '../types';

export function exportSVG(
  svgElement: SVGSVGElement,
  nodes: FlowNode[],
  edges: FlowEdge[]
) {
  const minX = Math.min(...nodes.map((n) => n.x - n.width / 2)) - 50;
  const minY = Math.min(...nodes.map((n) => n.y - n.height / 2)) - 50;
  const maxX = Math.max(...nodes.map((n) => n.x + n.width / 2)) + 50;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height / 2)) + 50;
  const width = maxX - minX;
  const height = maxY - minY;

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);
  svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flowchart.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPNG(
  svgElement: SVGSVGElement,
  nodes: FlowNode[],
  edges: FlowEdge[]
) {
  const minX = Math.min(...nodes.map((n) => n.x - n.width / 2)) - 50;
  const minY = Math.min(...nodes.map((n) => n.y - n.height / 2)) - 50;
  const maxX = Math.max(...nodes.map((n) => n.x + n.width / 2)) + 50;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height / 2)) + 50;
  const width = maxX - minX;
  const height = maxY - minY;

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'flowchart.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };
  img.src = url;
}
