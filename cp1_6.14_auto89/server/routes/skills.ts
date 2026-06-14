import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export type MasteryLevel = 'unlearned' | 'learning' | 'mastered';

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  level: MasteryLevel;
  estimatedHours: number;
  parentId: string | null;
  childrenIds: string[];
  prerequisites: string[];
}

export interface LearningStep {
  nodeId: string;
  name: string;
  description: string;
  estimatedHours: number;
  prerequisites: string[];
  prerequisiteNames: string[];
}

export interface LearningPath {
  steps: LearningStep[];
  totalHours: number;
  remainingHours: number;
}

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

const topologicalSort = (nodes: SkillNode[]): string[] => {
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

  return sorted;
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
  const node: SkillNode = {
    id,
    name,
    description,
    level,
    estimatedHours: Number(estimatedHours) || 0,
    parentId: parentId || null,
    childrenIds: [],
    prerequisites: Array.isArray(prerequisites) ? prerequisites : [],
  };

  store.nodes.set(id, node);

  if (node.parentId) {
    const parent = store.nodes.get(node.parentId);
    if (parent && !parent.childrenIds.includes(id)) {
      parent.childrenIds.push(id);
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

  if (body.prerequisites !== undefined && Array.isArray(body.prerequisites)) {
    node.prerequisites = body.prerequisites;
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

  if (node.parentId) {
    const parent = store.nodes.get(node.parentId);
    if (parent) {
      parent.childrenIds = parent.childrenIds.filter(cid => !toDelete.includes(cid));
    }
  }

  for (const delId of toDelete) {
    store.nodes.delete(delId);
  }

  for (const n of store.nodes.values()) {
    n.prerequisites = n.prerequisites.filter(pre => !toDelete.includes(pre));
  }

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
  node.prerequisites = Array.isArray(prereqs) ? prereqs.filter((p: string) => store.nodes.has(p)) : [];

  res.json(node);
});

router.post('/reset', (_req: Request, res: Response) => {
  store.nodes.clear();
  res.json({ reset: true });
});

router.get('/path', (_req: Request, res: Response) => {
  const nodes = getNodesArray();
  const sortedIds = topologicalSort(nodes);
  const idSet = new Set(sortedIds);
  const nonCycled = nodes.filter(n => idSet.has(n.id));
  const idToNode = new Map(nonCycled.map(n => [n.id, n]));

  const steps: LearningStep[] = sortedIds
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

  const totalHours = nonCycled.reduce((s, n) => s + n.estimatedHours, 0);
  const remainingHours = steps.reduce((s, st) => s + st.estimatedHours, 0);

  const path: LearningPath = { steps, totalHours, remainingHours };
  res.json(path);
});

export default router;
