/**
 * 知识图谱核心类型定义
 * 前后端共享，确保数据结构一致
 */

// ========== 修复问题4：扩展关联关系类型 ==========
/** 关联关系类型：用于区分不同类型的词间关系 */
export type RelationType =
  | 'synonym'      // 同义词
  | 'antonym'      // 反义词
  | 'hyponym'      // 下位词（子类）
  | 'hypernym'     // 上位词（父类）
  | 'related'      // 相关词（通用）
  | 'part_of'      // 组成部分
  | 'instance_of'  // 实例
  | 'attribute';   // 属性

export interface GraphNode {
  id: string;
  word: string;
  x: number;
  y: number;
  level: number;        // 层级：0=根节点, 1=一级, 2+=叶子
  size: number;         // 节点大小，由关联强度决定 (20-50px)
  baseSize: number;     // 原始大小，用于动画计算
  color: string;        // 节点颜色
  note?: string;        // Markdown笔记内容
  tags: string[];       // 标签列表
  parentId?: string;    // 父节点ID
  expanded: boolean;    // 是否已展开下级
  relevance: number;    // 与根节点的关联强度 0-1
  vx?: number;          // 速度x，用于物理布局动画
  vy?: number;          // 速度y
  targetX?: number;     // 目标位置x，用于动画过渡
  targetY?: number;     // 目标位置y
  pulseStartTime?: number; // 点击脉动动画开始时间
  isDragging?: boolean; // 是否正在拖拽
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  strength: number;     // 关联强度 0-1，决定线粗
  // ========== 修复问题4：新增关系类型和权重字段 ==========
  relationType: RelationType;  // 关系类型，前端可用于样式区分
  weight: number;              // 权重值（与strength等价，但语义更明确）
}

export interface KnowledgeGraph {
  id: string;
  name: string;
  rootWord: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  createdAt: number;
  updatedAt: number;
}

export interface GenerateGraphRequest {
  keyword: string;
}

export interface GenerateGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ExpandNodeRequest {
  nodeId: string;
  word: string;
  parentX: number;
  parentY: number;
  parentLevel: number;
}

export interface ExpandNodeResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface UpdateNodeRequest {
  note?: string;
  tags?: string[];
}

export interface SaveGraphRequest {
  name: string;
  rootWord: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ColorTheme {
  backgroundStart: string;  // 深墨绿
  backgroundEnd: string;    // 暗灰蓝
  nodeDefault: string;      // 钴蓝
  nodeLevel1: string;       // 一级节点冷色
  nodeLeaf: string;         // 叶节点暖色
  edgeColor: string;        // 连线半透明白
  textPrimary: string;      // 主文字
  textSecondary: string;    // 次要文字
}

export const THEME: ColorTheme = {
  backgroundStart: '#0D1B2A',
  backgroundEnd: '#1B263B',
  nodeDefault: '#1E3A5F',
  nodeLevel1: '#4A90D9',
  nodeLeaf: '#D98A4A',
  edgeColor: 'rgba(255,255,255,0.3)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
};

export const TAG_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
];

// ========== 修复问题4：关系类型到中文名称的映射 ==========
export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  synonym: '同义词',
  antonym: '反义词',
  hyponym: '下位词',
  hypernym: '上位词',
  related: '相关词',
  part_of: '组成部分',
  instance_of: '实例',
  attribute: '属性',
};
