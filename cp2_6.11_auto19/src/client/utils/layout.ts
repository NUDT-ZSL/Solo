/**
 * 图谱布局算法工具
 * 包含圆形布局、力导向布局、碰撞检测等
 */

import { GraphNode, GraphEdge } from '../../shared/types';

/**
 * 圆形布局 - 将节点围绕中心点均匀分布
 */
export function radialLayout(
  nodes: GraphNode[],
  centerX: number,
  centerY: number,
  radius: number = 150
): GraphNode[] {
  const count = nodes.length;
  if (count === 0) return nodes;

  const angleStep = (Math.PI * 2) / count;
  const startAngle = -Math.PI / 2; // 从顶部开始

  return nodes.map((node, index) => {
    const angle = startAngle + index * angleStep;
    const levelRadius = radius + node.level * 30;
    return {
      ...node,
      x: centerX + Math.cos(angle) * levelRadius,
      y: centerY + Math.sin(angle) * levelRadius,
      targetX: centerX + Math.cos(angle) * levelRadius,
      targetY: centerY + Math.sin(angle) * levelRadius,
    };
  });
}

/**
 * 力导向布局单步迭代
 * 应用库仑斥力和胡克引力，使节点自然分布
 * 性能优化：时间复杂度 O(n²)，n<=500 时可接受
 */
export function forceDirectedStep(
  nodes: GraphNode[],
  edges: GraphEdge[],
  params: {
    repulsion: number;    // 斥力系数
    attraction: number;   // 引力系数
    damping: number;      // 阻尼系数
    centerGravity: number; // 中心引力
    centerX: number;
    centerY: number;
  }
): GraphNode[] {
  const { repulsion, attraction, damping, centerGravity, centerX, centerY } = params;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 初始化速度
  nodes.forEach(node => {
    if (node.vx === undefined) node.vx = 0;
    if (node.vy === undefined) node.vy = 0;
  });

  // 1. 计算节点间斥力 (库仑定律)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const n1 = nodes[i];
      const n2 = nodes[j];

      if (n1.isDragging || n2.isDragging) continue;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < 1) continue; // 避免除以零

      // 斥力大小 = k / 距离²
      const force = repulsion / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      n1.vx! -= fx;
      n1.vy! -= fy;
      n2.vx! += fx;
      n2.vy! += fy;
    }
  }

  // 2. 计算边的引力 (胡克定律)
  edges.forEach(edge => {
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);

    if (!source || !target) return;
    if (source.isDragging && target.isDragging) return;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return;

    // 理想距离
    const idealDist = 100 + edge.strength * 50;
    // 引力大小 = k * (实际距离 - 理想距离)
    const force = attraction * (dist - idealDist);
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    if (!source.isDragging) {
      source.vx! += fx;
      source.vy! += fy;
    }
    if (!target.isDragging) {
      target.vx! -= fx;
      target.vy! -= fy;
    }
  });

  // 3. 中心引力，防止节点漂太远
  nodes.forEach(node => {
    if (node.isDragging) return;
    const dx = centerX - node.x;
    const dy = centerY - node.y;
    node.vx! += dx * centerGravity;
    node.vy! += dy * centerGravity;
  });

  // 4. 更新位置，应用阻尼
  return nodes.map(node => {
    if (node.isDragging) return node;

    // 限制最大速度，防止爆炸
    const maxSpeed = 15;
    const speed = Math.sqrt(node.vx! ** 2 + node.vy! ** 2);
    if (speed > maxSpeed) {
      node.vx = (node.vx! / speed) * maxSpeed;
      node.vy = (node.vy! / speed) * maxSpeed;
    }

    const newX = node.x + node.vx!;
    const newY = node.y + node.vy!;

    // 应用阻尼
    node.vx! *= damping;
    node.vy! *= damping;

    return {
      ...node,
      x: newX,
      y: newY,
    };
  });
}

/**
 * 节点展开动画插值
 * 从父节点位置动画扩散到目标位置
 */
export function animateExpandStep(
  nodes: GraphNode[],
  progress: number  // 0-1
): GraphNode[] {
  // 弹性缓动函数
  const easeOutElastic = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  };

  const eased = easeOutElastic(progress);

  return nodes.map(node => {
    if (node.targetX === undefined || node.targetY === undefined) return node;
    // 从初始位置(父节点)插值到目标位置
    return {
      ...node,
      x: node.x + (node.targetX - node.x) * eased,
      y: node.y + (node.targetY - node.y) * eased,
    };
  });
}

/**
 * 空间网格索引 - 加速节点命中检测
 * 性能优化：将画布划分为网格，点击时只需检查附近网格内的节点
 */
export class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, GraphNode[]>;

  constructor(cellSize: number = 50) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  /** 重建索引 */
  rebuild(nodes: GraphNode[]): void {
    this.grid.clear();
    nodes.forEach(node => {
      const key = this.getKey(node.x, node.y);
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key)!.push(node);
    });
  }

  /** 查询点附近的节点 */
  queryNearby(x: number, y: number): GraphNode[] {
    const result: GraphNode[] = [];
    const { cellSize } = this;
    // 检查当前网格和相邻8个网格
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this.getKey(
          Math.floor(x / cellSize) * cellSize + dx * cellSize,
          Math.floor(y / cellSize) * cellSize + dy * cellSize
        );
        const cell = this.grid.get(key);
        if (cell) {
          result.push(...cell);
        }
      }
    }
    return result;
  }

  private getKey(x: number, y: number): string {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    return `${gx},${gy}`;
  }
}

/**
 * 检测点是否在节点内
 */
export function hitTestNode(
  px: number,
  py: number,
  node: GraphNode,
  scale: number = 1
): boolean {
  const dx = px - node.x;
  const dy = py - node.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= node.size * scale;
}
