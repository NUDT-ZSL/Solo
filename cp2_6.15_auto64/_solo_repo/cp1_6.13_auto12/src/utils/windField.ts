import { Vector2D, WindNode } from './physics';

export function addNode(nodes: WindNode[], node: WindNode): WindNode[] {
  if (nodes.length >= 20) return nodes;
  return [...nodes, node];
}

export function removeNode(nodes: WindNode[], nodeId: string): WindNode[] {
  return nodes.filter((n) => n.id !== nodeId);
}

export function updateNode(
  nodes: WindNode[],
  nodeId: string,
  updates: Partial<WindNode>
): WindNode[] {
  return nodes.map((n) =>
    n.id === nodeId ? { ...n, ...updates } : n
  );
}

export function getWindForceAtPoint(
  point: Vector2D,
  nodes: WindNode[]
): Vector2D {
  let totalX = 0;
  let totalY = 0;

  for (const node of nodes) {
    const dx = point.x - node.position.x;
    const dy = point.y - node.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < node.radius) {
      const falloff = 1 - distance / node.radius;
      const strength = node.strength * falloff * falloff;

      totalX += Math.cos(node.direction) * strength;
      totalY += Math.sin(node.direction) * strength;
    }
  }

  return { x: totalX, y: totalY };
}

export function getWindColor(strength: number): string {
  const t = Math.min(1, Math.max(0, strength / 5));
  const r = Math.round(107 + (255 - 107) * t);
  const g = Math.round(163 + (77 - 163) * t);
  const b = Math.round(255 + (77 - 255) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getWindColorRgba(strength: number, alpha: number): string {
  const t = Math.min(1, Math.max(0, strength / 5));
  const r = Math.round(107 + (255 - 107) * t);
  const g = Math.round(163 + (77 - 163) * t);
  const b = Math.round(255 + (77 - 255) * t);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function generateParticleCountForNode(node: WindNode): number {
  const baseCount = 8;
  const areaFactor = (node.radius * node.radius * Math.PI) / (120 * 120 * Math.PI);
  return Math.max(4, Math.floor(baseCount * areaFactor));
}
