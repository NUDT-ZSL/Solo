import type { Node, Edge, LayoutOptions, LayoutResult } from '@/types';

interface LayoutNode extends Node {
  vx: number;
  vy: number;
}

export function calculateForceLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): LayoutResult {
  const { width, height, iterations, nodeDistance } = options;

  const layoutNodes: LayoutNode[] = nodes.map((node) => ({
    ...node,
    vx: 0,
    vy: 0,
  }));

  const nodeMap = new Map<string, LayoutNode>();
  layoutNodes.forEach((node) => nodeMap.set(node.id, node));

  const centerX = width / 2;
  const centerY = height / 2;

  for (let i = 0; i < iterations; i++) {
    layoutNodes.forEach((nodeA) => {
      if (nodeA.isRoot) return;

      layoutNodes.forEach((nodeB) => {
        if (nodeA.id === nodeB.id) return;

        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const repulsion = (nodeDistance * nodeDistance) / dist;
        const fx = (dx / dist) * repulsion;
        const fy = (dy / dist) * repulsion;

        nodeA.vx += fx * 0.5;
        nodeA.vy += fy * 0.5;
      });
    });

    edges.forEach((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const attraction = (dist - nodeDistance) * 0.08;
      const fx = (dx / dist) * attraction;
      const fy = (dy / dist) * attraction;

      if (!source.isRoot) {
        source.vx += fx;
        source.vy += fy;
      }
      if (!target.isRoot) {
        target.vx -= fx;
        target.vy -= fy;
      }
    });

    layoutNodes.forEach((node) => {
      if (node.isRoot) return;

      node.vx *= 0.85;
      node.vy *= 0.85;

      node.x += node.vx;
      node.y += node.vy;

      const dx = centerX - node.x;
      const dy = centerY - node.y;
      node.x += dx * 0.001;
      node.y += dy * 0.001;

      const padding = 50;
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    });
  }

  return {
    nodes: layoutNodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
    })),
  };
}

let worker: Worker | null = null;

export function createLayoutWorker(): Worker {
  if (worker) return worker;

  const workerCode = `
    importScripts('');
    function calculateForceLayout(nodes, edges, options) {
      const { width, height, iterations, nodeDistance } = options;
      
      const layoutNodes = nodes.map(node => ({
        ...node,
        vx: 0,
        vy: 0,
      }));
      
      const nodeMap = new Map();
      layoutNodes.forEach(node => nodeMap.set(node.id, node));
      
      const centerX = width / 2;
      const centerY = height / 2;
      
      for (let i = 0; i < iterations; i++) {
        layoutNodes.forEach(nodeA => {
          if (nodeA.isRoot) return;
          
          layoutNodes.forEach(nodeB => {
            if (nodeA.id === nodeB.id) return;
            
            const dx = nodeA.x - nodeB.x;
            const dy = nodeA.y - nodeB.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            const repulsion = (nodeDistance * nodeDistance) / dist;
            const fx = (dx / dist) * repulsion;
            const fy = (dy / dist) * repulsion;
            
            nodeA.vx += fx * 0.5;
            nodeA.vy += fy * 0.5;
          });
        });
        
        edges.forEach(edge => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (!source || !target) return;
          
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const attraction = (dist - nodeDistance) * 0.08;
          const fx = (dx / dist) * attraction;
          const fy = (dy / dist) * attraction;
          
          if (!source.isRoot) {
            source.vx += fx;
            source.vy += fy;
          }
          if (!target.isRoot) {
            target.vx -= fx;
            target.vy -= fy;
          }
        });
        
        layoutNodes.forEach(node => {
          if (node.isRoot) return;
          
          node.vx *= 0.85;
          node.vy *= 0.85;
          
          node.x += node.vx;
          node.y += node.vy;
          
          const dx = centerX - node.x;
          const dy = centerY - node.y;
          node.x += dx * 0.001;
          node.y += dy * 0.001;
          
          const padding = 50;
          node.x = Math.max(padding, Math.min(width - padding, node.x));
          node.y = Math.max(padding, Math.min(height - padding, node.y));
        });
      }
      
      return {
        nodes: layoutNodes.map(node => ({
          id: node.id,
          x: node.x,
          y: node.y,
        })),
      };
    }
    
    self.onmessage = function(e) {
      const { nodes, edges, options } = e.data;
      const result = calculateForceLayout(nodes, edges, options);
      self.postMessage(result);
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  worker = new Worker(url);

  return worker;
}

export function terminateLayoutWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
