/**
 * 词络图谱 API 路由
 * 处理图谱生成、节点展开、保存/加载、节点更新等操作
 *
 * 修复问题4：
 * - /graph/save 接口真正写入本地JSON文件持久化
 * - /graph/expand 接口返回关联词的关系类型和权重字段
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import {
  GraphNode,
  GraphEdge,
  KnowledgeGraph,
  GenerateGraphRequest,
  GenerateGraphResponse,
  ExpandNodeRequest,
  ExpandNodeResponse,
  UpdateNodeRequest,
  SaveGraphRequest,
  THEME,
  RelationType,
} from '../../shared/types';
import { getRelatedWords } from '../../shared/wordRelations';

const router = Router();

// ========== 修复问题4：本地JSON文件持久化 ==========
// 数据存储目录
const DATA_DIR = path.join(process.cwd(), 'data');
const GRAPHS_FILE = path.join(DATA_DIR, 'graphs.json');

/** 确保数据目录存在 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`  📁 创建数据目录: ${DATA_DIR}`);
  }
  if (!fs.existsSync(GRAPHS_FILE)) {
    fs.writeFileSync(GRAPHS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    console.log(`  📄 创建图谱存储文件: ${GRAPHS_FILE}`);
  }
}

/** 从JSON文件加载所有图谱 */
function loadGraphsFromFile(): Map<string, KnowledgeGraph> {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(GRAPHS_FILE, 'utf-8');
    const obj = JSON.parse(raw) as { [id: string]: KnowledgeGraph };
    return new Map(Object.entries(obj));
  } catch (error) {
    console.error('  ⚠ 加载图谱文件失败，使用空数据:', error);
    return new Map();
  }
}

/** 将所有图谱保存到JSON文件 */
function saveGraphsToFile(graphs: Map<string, KnowledgeGraph>): void {
  ensureDataDir();
  try {
    const obj = Object.fromEntries(graphs);
    fs.writeFileSync(GRAPHS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (error) {
    console.error('  ❌ 保存图谱文件失败:', error);
  }
}

/** 内存缓存（启动时从文件加载） */
let savedGraphs: Map<string, KnowledgeGraph> = loadGraphsFromFile();

/**
 * 根据层级和关联强度计算节点颜色
 */
function getNodeColor(level: number, relevance: number): string {
  if (level === 0) return THEME.nodeDefault;
  if (level === 1) return THEME.nodeLevel1;
  // 叶节点：根据关联强度在暖色和中性色之间插值
  const t = relevance;
  const r = Math.round(217 * t + 80 * (1 - t));
  const g = Math.round(138 * t + 120 * (1 - t));
  const b = Math.round(74 * t + 150 * (1 - t));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 计算节点大小
 * 关联强度越高，节点越大 (25-50px)
 */
function getNodeSize(relevance: number): number {
  return 25 + relevance * 25;
}

/**
 * 圆形布局算法 - 围绕父节点均匀分布子节点
 */
function calculateRadialPositions(
  parentX: number,
  parentY: number,
  count: number,
  radius: number,
  startAngle: number = -Math.PI / 2
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const angleStep = (Math.PI * 2) / Math.max(count, 1);

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    positions.push({
      x: parentX + Math.cos(angle) * radius,
      y: parentY + Math.sin(angle) * radius,
    });
  }

  return positions;
}

/**
 * ========== 修复问题4：生成带关系类型和权重的边 ==========
 */
function createEdge(
  sourceId: string,
  targetId: string,
  strength: number,
  relationType: RelationType
): GraphEdge {
  return {
    id: uuidv4(),
    sourceId,
    targetId,
    strength,
    weight: strength,
    relationType,
  };
}

/**
 * POST /api/graph/generate
 * 根据主关键词生成初始关联词网络
 */
router.post('/generate', (req: Request<{}, {}, GenerateGraphRequest>, res: Response<GenerateGraphResponse>) => {
  const { keyword } = req.body;

  if (!keyword || keyword.trim().length === 0) {
    res.status(400).json({ nodes: [], edges: [] });
    return;
  }

  const relatedWords = getRelatedWords(keyword);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // 画布中心（前端会重新布局，这里给初始值）
  const centerX = 400;
  const centerY = 300;

  // 创建根节点
  const rootNode: GraphNode = {
    id: uuidv4(),
    word: keyword,
    x: centerX,
    y: centerY,
    level: 0,
    size: getNodeSize(1.0),
    baseSize: getNodeSize(1.0),
    color: getNodeColor(0, 1.0),
    tags: [],
    expanded: false,
    relevance: 1.0,
  };
  nodes.push(rootNode);

  // 计算子节点位置
  const radius = 150;
  const positions = calculateRadialPositions(centerX, centerY, relatedWords.length, radius);

  // 创建子节点和边
  relatedWords.forEach((item, index) => {
    const childNode: GraphNode = {
      id: uuidv4(),
      word: item.word,
      x: positions[index].x,
      y: positions[index].y,
      level: 1,
      size: getNodeSize(item.strength),
      baseSize: getNodeSize(item.strength),
      color: getNodeColor(1, item.strength),
      tags: [],
      expanded: false,
      relevance: item.strength,
      parentId: rootNode.id,
    };
    nodes.push(childNode);

    // 使用带关系类型的边
    edges.push(createEdge(rootNode.id, childNode.id, item.strength, item.relationType));
  });

  res.json({ nodes, edges });
});

/**
 * POST /api/graph/expand
 * 展开指定节点的下一级关联词
 *
 * 修复问题4：返回的边包含relationType和weight字段
 */
router.post('/expand', (req: Request<{}, {}, ExpandNodeRequest>, res: Response<ExpandNodeResponse>) => {
  const { nodeId, word, parentX, parentY, parentLevel } = req.body;

  if (!nodeId || !word) {
    res.status(400).json({ nodes: [], edges: [] });
    return;
  }

  const relatedWords = getRelatedWords(word);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const childLevel = parentLevel + 1;
  // 层级越深，半径越小
  const radius = Math.max(80, 150 - parentLevel * 20);
  const positions = calculateRadialPositions(parentX, parentY, relatedWords.length, radius);

  relatedWords.forEach((item, index) => {
    const childNode: GraphNode = {
      id: uuidv4(),
      word: item.word,
      x: parentX,  // 初始位置与父节点相同，用于展开动画
      y: parentY,
      targetX: positions[index].x,
      targetY: positions[index].y,
      level: childLevel,
      size: getNodeSize(item.strength),
      baseSize: getNodeSize(item.strength),
      color: getNodeColor(childLevel, item.strength),
      tags: [],
      expanded: false,
      relevance: item.strength,
      parentId: nodeId,
      vx: 0,
      vy: 0,
    };
    nodes.push(childNode);

    // 使用带关系类型和权重的边
    edges.push(createEdge(nodeId, childNode.id, item.strength, item.relationType));
  });

  res.json({ nodes, edges });
});

/**
 * GET /api/graph/saved
 * 获取所有已保存图谱列表
 */
router.get('/saved', (_req: Request, res: Response<KnowledgeGraph[]>) => {
  // 重新从文件加载（确保多进程/重启后数据一致）
  savedGraphs = loadGraphsFromFile();
  const graphs = Array.from(savedGraphs.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
  res.json(graphs);
});

/**
 * GET /api/graph/:id
 * 加载指定图谱
 */
router.get('/:id', (req: Request<{ id: string }>, res: Response<KnowledgeGraph | { error: string }>) => {
  const { id } = req.params;
  savedGraphs = loadGraphsFromFile();
  const graph = savedGraphs.get(id);

  if (!graph) {
    res.status(404).json({ error: '图谱不存在' });
    return;
  }

  res.json(graph);
});

/**
 * POST /api/graph/save
 * 保存图谱到本地JSON文件
 *
 * 修复问题4：真正写入data/graphs.json文件持久化
 */
router.post('/save', (req: Request<{}, {}, SaveGraphRequest>, res: Response<{ id: string; success: boolean; message?: string }>) => {
  const { name, rootWord, nodes, edges } = req.body;

  if (!name || !rootWord || !nodes || nodes.length === 0) {
    res.status(400).json({ id: '', success: false, message: '参数不完整' });
    return;
  }

  const now = Date.now();
  const graph: KnowledgeGraph = {
    id: uuidv4(),
    name,
    rootWord,
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
  };

  savedGraphs.set(graph.id, graph);
  saveGraphsToFile(savedGraphs);

  console.log(`  💾 图谱已保存: "${name}" (${graph.id})`);
  res.json({ id: graph.id, success: true, message: '保存成功' });
});

/**
 * PUT /api/graph/save/:id
 * 更新已保存的图谱
 */
router.put('/save/:id', (req: Request<{ id: string }, {}, SaveGraphRequest>, res: Response<{ id: string; success: boolean; message?: string }>) => {
  const { id } = req.params;
  const { name, rootWord, nodes, edges } = req.body;

  savedGraphs = loadGraphsFromFile();
  const existing = savedGraphs.get(id);
  if (!existing) {
    res.status(404).json({ id: '', success: false, message: '图谱不存在' });
    return;
  }

  const updated: KnowledgeGraph = {
    ...existing,
    name: name || existing.name,
    rootWord: rootWord || existing.rootWord,
    nodes: nodes || existing.nodes,
    edges: edges || existing.edges,
    updatedAt: Date.now(),
  };

  savedGraphs.set(id, updated);
  saveGraphsToFile(savedGraphs);

  console.log(`  📝 图谱已更新: "${updated.name}" (${id})`);
  res.json({ id, success: true, message: '更新成功' });
});

/**
 * DELETE /api/graph/:id
 * 删除指定图谱
 */
router.delete('/:id', (req: Request<{ id: string }>, res: Response<{ success: boolean; message?: string }>) => {
  const { id } = req.params;
  savedGraphs = loadGraphsFromFile();
  const deleted = savedGraphs.delete(id);

  if (deleted) {
    saveGraphsToFile(savedGraphs);
    console.log(`  🗑 图谱已删除: ${id}`);
  }

  res.json({ success: deleted, message: deleted ? '删除成功' : '图谱不存在' });
});

/**
 * PUT /api/graph/node/:id
 * 更新节点的笔记和标签
 * 同步持久化到JSON文件
 */
router.put('/node/:id', (req: Request<{ id: string }, {}, UpdateNodeRequest>, res: Response<{ note?: string; tags?: string[]; success: boolean; message?: string }>) => {
  const { id } = req.params;
  const { note, tags } = req.body;

  savedGraphs = loadGraphsFromFile();

  let updated = false;
  let resultNote: string | undefined;
  let resultTags: string[] | undefined;

  for (const graph of savedGraphs.values()) {
    const node = graph.nodes.find(n => n.id === id);
    if (node) {
      if (note !== undefined) {
        node.note = note;
        resultNote = note;
      }
      if (tags !== undefined) {
        node.tags = tags;
        resultTags = tags;
      }
      graph.updatedAt = Date.now();
      updated = true;
      break;
    }
  }

  if (!updated) {
    res.status(404).json({ success: false, message: '节点不存在' });
    return;
  }

  // 同步写入文件
  saveGraphsToFile(savedGraphs);
  res.json({ note: resultNote, tags: resultTags, success: true });
});

export default router;
