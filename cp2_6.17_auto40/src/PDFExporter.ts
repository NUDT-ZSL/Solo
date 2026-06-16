import jsPDF from "jspdf";
import type { Point, PaperState } from "./FoldEngine";
import { rotate, translate } from "./FoldEngine";

export interface ExportOptions {
  paperSize: "A4" | "Letter" | "Custom";
  customWidth?: number;
  customHeight?: number;
}

function getPaperDimensions(options: ExportOptions): { width: number; height: number } {
  switch (options.paperSize) {
    case "A4":
      return { width: 210, height: 297 };
    case "Letter":
      return { width: 215.9, height: 279.4 };
    case "Custom":
      return { width: options.customWidth || 210, height: options.customHeight || 297 };
  }
}

function transformVertices(
  vertices: Point[],
  rotation: number,
  offsetX: number,
  offsetY: number
): Point[] {
  let pts = rotate(vertices, rotation);
  pts = translate(pts, offsetX, offsetY);
  return pts;
}

export function exportToPDF(state: PaperState, options: ExportOptions): void {
  const dims = getPaperDimensions(options);
  const doc = new jsPDF({
    orientation: dims.width > dims.height ? "landscape" : "portrait",
    unit: "mm",
    format: [dims.width, dims.height],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const drawWidth = pageWidth - margin * 2;
  const drawHeight = pageHeight - margin * 2;
  const scale = Math.min(drawWidth / 400, drawHeight / 400);
  const ox = margin + (drawWidth - 400 * scale) / 2;
  const oy = margin + (drawHeight - 400 * scale) / 2;

  function tx(p: Point): { x: number; y: number } {
    const transformed = transformVertices([p], state.rotation, state.offsetX, state.offsetY)[0];
    return {
      x: ox + transformed.x * scale,
      y: oy + transformed.y * scale,
    };
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);

  for (const layer of state.layers) {
    const pts = layer.vertices.map(tx);
    if (pts.length < 3) continue;

    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      doc.line(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
    }
  }

  doc.setLineDashPattern([2, 2], 0);
  for (const crease of state.creases) {
    const p1 = tx(crease.start);
    const p2 = tx(crease.end);
    doc.line(p1.x, p1.y, p2.x, p2.y);
  }
  doc.setLineDashPattern([], 0);

  const allVertices = state.layers[0]?.vertices || [];
  const corners = [
    allVertices[0],
    allVertices[1],
    allVertices[2],
    allVertices[3],
  ].filter(Boolean);
  const labels = ["A", "B", "C", "D"];
  doc.setFontSize(14);
  corners.forEach((corner, i) => {
    if (corner) {
      const tp = tx(corner);
      doc.text(labels[i], tp.x - 4, tp.y - 3);
    }
  });

  doc.save("origami-template.pdf");
}
