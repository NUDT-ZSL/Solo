import { FlowchartData } from '../types';

export function formatTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}${s}`;
}

export function exportToJson(data: FlowchartData): void {
  const exportData: FlowchartData = {
    version: data.version || '1.0.0',
    exportedAt: new Date().toISOString(),
    nodes: data.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: { ...node.position },
      size: { ...node.size },
      label: node.label,
      connections: [...node.connections],
      cornerRadius: node.cornerRadius,
      createdAt: node.createdAt,
    })),
    connections: data.connections.map(conn => ({
      id: conn.id,
      sourceNodeId: conn.sourceNodeId,
      targetNodeId: conn.targetNodeId,
      sourceAnchor: { ...conn.sourceAnchor },
      targetAnchor: { ...conn.targetAnchor },
      controlPoints: conn.controlPoints.map(p => ({ ...p })),
      isBezier: conn.isBezier,
      createdAt: conn.createdAt,
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `flowchart_${formatTimestamp()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateJsonPreview(data: FlowchartData): string {
  const preview = {
    version: data.version || '1.0.0',
    nodes: data.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      size: node.size,
      label: node.label || '(untitled)',
      connections: node.connections,
    })),
    connections: data.connections.map(conn => ({
      id: conn.id,
      source: conn.sourceNodeId || 'free',
      target: conn.targetNodeId || 'free',
      sourceAnchor: conn.sourceAnchor,
      targetAnchor: conn.targetAnchor,
    })),
  };
  return JSON.stringify(preview, null, 2);
}
