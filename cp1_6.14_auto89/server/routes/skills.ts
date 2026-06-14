import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
  MasteryLevel,
  SkillNode,
  LearningStep,
  LearningPath,
  CycleDetectionResult,
  DependencyValidationResult,
} from '../../src/types.js';

interface Store {
  nodes: Map<string, SkillNode>;
}

const router = Router();
let store: Store = { nodes: new Map() };

const getNodesArray = (): SkillNode[] => Array.from(store.nodes.values());

const collectDescendants = (nodeId: string): string[] => {
  const result: string[] = [];
  const node = store.nodes.get(nodeId);
  if (!node) return result;
  for (const childId of node.childrenIds) {
    result.push(childId);
    result.push(...collectDescendants(childId));
  }
  return result;
};

const collectAncestors = (nodeId: string): Set<string> => {
  const ancestors = new Set<string>();
  const node = store.nodes.get(nodeId);
  if (!node || !node.parentId) return ancestors;
  let current = node.parentId;
  while (current) {
    ancestors.add(current);
    const parent = store.nodes.get(current);
    current = parent?.parentId || null;
  }
  return ancestors;
};

const findCyclePathDFS = (): string[] | null => {
  const nodes = getNodesArray();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const n of nodes) {
    color.set(n.id, WHITE);
    parent.set(n.id, null);
  }

  let cycleStart: string | null = null;
  let cycleEnd: string | null = null;

  const dfs = (u: string): boolean => {
    color.set(u, GRAY);
    const node = nodeMap.get(u);
    if (!node) return false;

    for (const v of node.prerequisites) {
      if (!nodeMap.has(v)) continue;
      const c = color.get(v) || WHITE;
      if (c === GRAY) {
        cycleStart = v;
        cycleEnd = u;
        return true;
      }
      if (c === WHITE) {
        parent.set(v, u);
        if (dfs(v)) return true;
      }
    }

    color.set(u, BLACK);
    return false;
  };

  for (const n of nodes) {
    if ((color.get(n.id) || WHITE) === WHITE) {
      if (dfs(n.id)) break;
    }
  }

  if (!cycleStart || !cycleEnd) return null;

  const path: string[] = [cycleStart];
  let current: string | null = cycleEnd;
  while (current !== null && current !== cycleStart) {
    path.unshift(current);
    current = parent.get(current) || null;
  }
  path.unshift(cycleStart);

  return path;
};

const detectCycle = (): CycleDetectionResult => {
  const cyclePath = findCyclePathDFS();
  if (cyclePath) {
    const cycleNodes = Array.from(new Set(cyclePath));
    return { hasCycle: true, cycleNodes, cyclePath };
  }
  return { hasCycle: false, cycleNodes: [] };
};

const kahnTopologicalSort = (nodes: SkillNode[]): { sorted: string[]; cycleNodes: string[]; cyclePath?: string[] } => {
  const cyclePath = findCyclePathDFS();
  if (cyclePath) {
    return { sorted: [], cycleNodes: Array.from(new Set(cyclePath)), cyclePath };
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  }

  for (const n of nodes) {
    for (const pre of n.prerequisites) {
      if (nodeMap.has(pre)) {
        inDegree.set(n.id, (inDegree.get(n.id) || 0) + 1);
        adjacency.get(pre)!.push(n.id);
      }
    }
  }

  const queue: string[] = [];
  for (const n of nodes) {
    if (inDegree.get(n.id) === 0) queue.push(n.id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const next of adjacency.get(id) || []) {
      const deg = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  const sortedSet = new Set(sorted);
  const cycleNodes = nodes.filter(n => !sortedSet.has(n.id)).map(n => n.id);

  return { sorted, cycleNodes };
};

const addDependencyEdges = (fromId: string, toId: string) => {
  const fromNode = store.nodes.get(fromId);
  const toNode = store.nodes.get(toId);
  if (fromNode && !fromNode.dependencies.includes(toId)) {
    fromNode.dependencies.push(toId);
  }
  if (toNode && !toNode.prerequisites.includes(fromId)) {
    toNode.prerequisites.push(fromId);
  }
};

const removeDependencyEdges = (fromId: string, toId: string) => {
  const fromNode = store.nodes.get(fromId);
  const toNode = store.nodes.get(toId);
  if (fromNode) {
    fromNode.dependencies = fromNode.dependencies.filter(d => d !== toId);
  }
  if (toNode) {
    toNode.prerequisites = toNode.prerequisites.filter(p => p !== fromId);
  }
};

const validateDependencyAddition = (
  nodeId: string,
  newPrerequisiteId: string
): DependencyValidationResult => {
  if (nodeId === newPrerequisiteId) {
    return { valid: false, reason: '不能将自己设为前置依赖' };
  }

  if (!store.nodes.has(newPrerequisiteId)) {
    return { valid: false, reason: '前置依赖节点不存在' };
  }

  const descendants = new Set(collectDescendants(nodeId));
  if (descendants.has(newPrerequisiteId)) {
    return {
      valid: false,
      reason: '不能将后代节点设为前置依赖，会形成间接循环',
      cycleNodes: [nodeId, newPrerequisiteId],
      cyclePath: [newPrerequisiteId, nodeId, newPrerequisiteId],
    };
  }

  const ancestors = collectAncestors(newPrerequisiteId);
  if (ancestors.has(nodeId)) {
    return {
      valid: false,
      reason: '不能将祖先节点设为前置依赖，会形成间接循环',
      cycleNodes: [nodeId, newPrerequisiteId],
      cyclePath: [nodeId, newPrerequisiteId, nodeId],
    };
  }

  const node = store.nodes.get(nodeId)!;
  const originalPrereqs = [...node.prerequisites];
  addDependencyEdges(newPrerequisiteId, nodeId);

  const cycleResult = detectCycle();
  if (cycleResult.hasCycle) {
    node.prerequisites = originalPrereqs;
    const preNode = store.nodes.get(newPrerequisiteId);
    if (preNode) {
      preNode.dependencies = preNode.dependencies.filter(d => d !== nodeId);
    }
    return {
      valid: false,
      reason: '添加此前置依赖会形成循环依赖',
      cycleNodes: cycleResult.cycleNodes,
      cyclePath: cycleResult.cyclePath,
    };
  }

  node.prerequisites = originalPrereqs;
  const preNode = store.nodes.get(newPrerequisiteId);
  if (preNode) {
    preNode.dependencies = preNode.dependencies.filter(d => d !== nodeId);
  }

  return { valid: true };
};

const cleanupDeletedDependencies = (deletedIds: string[]) => {
  const deletedSet = new Set(deletedIds);
  for (const n of store.nodes.values()) {
    n.prerequisites = n.prerequisites.filter(pre => !deletedSet.has(pre));
    n.dependencies = n.dependencies.filter(dep => !deletedSet.has(dep));
    n.childrenIds = n.childrenIds.filter(cid => !deletedSet.has(cid));
  }
};

router.get('/', (_req: Request, res: Response) => {
  res.json(getNodesArray());
});

router.post('/', (req: Request, res: Response) => {
  const {
    name = '新技能',
    description = '',
    level = 'unlearned' as MasteryLevel,
    estimatedHours = 0,
    parentId = null,
    prerequisites = [],
  } = req.body || {};

  const id = uuidv4();
  const validPrereqs = Array.isArray(prerequisites)
    ? prerequisites.filter((p: string) => store.nodes.has(p))
    : [];

  const node: SkillNode = {
    id,
    name,
    description,
    level,
    estimatedHours: Number(estimatedHours) || 0,
    parentId: parentId || null,
    childrenIds: [],
    prerequisites: validPrereqs,
    dependencies: [],
  };

  store.nodes.set(id, node);

  if (node.parentId) {
    const parent = store.nodes.get(node.parentId);
    if (parent && !parent.childrenIds.includes(id)) {
      parent.childrenIds.push(id);
    }
  }

  for (const preId of validPrereqs) {
    const preNode = store.nodes.get(preId);
    if (preNode && !preNode.dependencies.includes(id)) {
      preNode.dependencies.push(id);
    }
  }

  res.status(201).json(node);
});

router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const node = store.nodes.get(id);
  if (!node) {
    res.status(404).json({ error: '节点不存在' });
    return;
  }

  const body = req.body || {};
  const fields = ['name', 'description', 'level', 'estimatedHours'] as const;
  for (const key of fields) {
    if (body[key] !== undefined) {
      (node as any)[key] = key === 'estimatedHours' ? Number(body[key]) : body[key];
    }
  }

  if (body.parentId !== undefined) {
    const newParentId: string | null = body.parentId || null;
    if (node.parentId && node.parentId !== newParentId) {
      const oldParent = store.nodes.get(node.parentId);
      if (oldParent) {
        oldParent.childrenIds = oldParent.childrenIds.filter(cid => cid !== id);
      }
    }
    if (newParentId && newParentId !== node.parentId) {
      const newParent = store.nodes.get(newParentId);
      if (newParent && !newParent.childrenIds.includes(id)) {
        newParent.childrenIds.push(id);
      }
    }
    node.parentId = newParentId;
  }

  res.json(node);
});

router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!store.nodes.has(id)) {
    res.status(404).json({ error: '节点不存在' });
    return;
  }

  const node = store.nodes.get(id)!;
  const toDelete = [id, ...collectDescendants(id)];

  for (const delId of toDelete) {
    const delNode = store.nodes.get(delId);
    if (delNode) {
      for (const preId of delNode.prerequisites) {
        removeDependencyEdges(preId, delId);
      }
    }
  }

  if (node.parentId) {
    const parent = store.nodes.get(node.parentId);
    if (parent) {
      parent.childrenIds = parent.childrenIds.filter(cid => !toDelete.includes(cid));
    }
  }

  for (const delId of toDelete) {
    store.nodes.delete(delId);
  }

  cleanupDeletedDependencies(toDelete);

  res.json({ deleted: toDelete });
});

router.put('/:id/prerequisites', (req: Request, res: Response) => {
  const { id } = req.params;
  const node = store.nodes.get(id);
  if (!node) {
    res.status(404).json({ error: '节点不存在' });
    return;
  }

  const prereqs = (req.body && req.body.prerequisites) || [];
  const validPrereqs = Array.isArray(prereqs) ? prereqs.filter((p: string) => store.nodes.has(p)) : [];

  const originalPrereqs = [...node.prerequisites];
  for (const preId of originalPrereqs) {
    removeDependencyEdges(preId, id);
  }

  for (const preId of validPrereqs) {
    addDependencyEdges(preId, id);
  }

  const cycleResult = detectCycle();
  if (cycleResult.hasCycle) {
    for (const preId of validPrereqs) {
      removeDependencyEdges(preId, id);
    }
    for (const preId of originalPrereqs) {
      addDependencyEdges(preId, id);
    }
    const cycleNames = cycleResult.cycleNodes
      .map(cid => store.nodes.get(cid)?.name)
      .filter(Boolean);
    res.status(400).json({
      error: '检测到循环依赖',
      cycleNodes: cycleResult.cycleNodes,
      cycleNames,
      cyclePath: cycleResult.cyclePath,
    });
    return;
  }

  res.json(node);
});

router.post('/validate-dependency', (req: Request, res: Response) => {
  const { nodeId, prerequisiteId } = req.body || {};
  if (!nodeId || !prerequisiteId) {
    res.status(400).json({ valid: false, reason: '缺少nodeId或prerequisiteId参数' });
    return;
  }

  const node = store.nodes.get(nodeId);
  if (!node) {
    res.status(404).json({ valid: false, reason: '目标节点不存在' });
    return;
  }

  const result = validateDependencyAddition(nodeId, prerequisiteId);
  res.json(result);
});

router.post('/reset', (_req: Request, res: Response) => {
  store.nodes.clear();
  res.json({ reset: true });
});

router.get('/path', (_req: Request, res: Response) => {
  const nodes = getNodesArray();
  const { sorted, cycleNodes, cyclePath } = kahnTopologicalSort(nodes);

  if (cycleNodes.length > 0) {
    const cycleNames = cycleNodes
      .map(cid => store.nodes.get(cid)?.name)
      .filter(Boolean);
    res.status(400).json({
      error: '存在循环依赖，无法生成学习路径',
      cycleNodes,
      cycleNames,
      cyclePath,
    });
    return;
  }

  const idToNode = new Map(nodes.map(n => [n.id, n]));

  const steps: LearningStep[] = sorted
    .map(nid => idToNode.get(nid))
    .filter((n): n is SkillNode => !!n && n.level !== 'mastered')
    .map(n => ({
      nodeId: n.id,
      name: n.name,
      description: n.description,
      estimatedHours: n.estimatedHours,
      prerequisites: n.prerequisites.filter(pid => {
        const p = idToNode.get(pid);
        return !p || p.level !== 'mastered';
      }),
      prerequisiteNames: n.prerequisites
        .map(pid => idToNode.get(pid)?.name)
        .filter((pn): pn is string => !!pn),
    }));

  const totalHours = nodes.reduce((s, n) => s + n.estimatedHours, 0);
  const remainingHours = steps.reduce((s, st) => s + st.estimatedHours, 0);

  const path: LearningPath = { steps, totalHours, remainingHours };
  res.json(path);
});

export default router;
