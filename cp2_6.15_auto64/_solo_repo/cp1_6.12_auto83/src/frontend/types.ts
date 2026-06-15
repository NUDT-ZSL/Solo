export interface Task {
  _id: string;
  goalId: string;
  parentId: string | null;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  userId: string | null;
  assigneeName?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  deadline?: number;
  timeSpent: number;
  likes: string[];
  attachments: string[];
  order: number;
}

export interface Goal {
  _id: string;
  title: string;
  description: string;
  createdAt: number;
  createdBy: string;
  inviteCode: string;
  color: string;
}

export interface Member {
  _id: string;
  goalId: string;
  userId: string;
  name: string;
  avatar: string;
  joinedAt: number;
}

export interface TreeNode {
  task: Task;
  children: TreeNode[];
  completionRatio: number;
  leafCount: number;
  completedLeafCount: number;
}

export function buildTaskTree(tasks: Task[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  tasks.forEach((t) => {
    map.set(t._id, { task: t, children: [], completionRatio: 0, leafCount: 0, completedLeafCount: 0 });
  });
  tasks.forEach((t) => {
    const node = map.get(t._id)!;
    if (t.parentId && map.has(t.parentId)) {
      map.get(t.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const calc = (n: TreeNode): { lc: number; cc: number; ratio: number } => {
    if (n.children.length === 0) {
      n.leafCount = 1;
      n.completedLeafCount = n.task.status === 'completed' ? 1 : 0;
      n.completionRatio = n.completedLeafCount;
      return { lc: 1, cc: n.completedLeafCount, ratio: n.completionRatio };
    }
    let lc = 0;
    let cc = 0;
    n.children.forEach((c) => {
      const r = calc(c);
      lc += r.lc;
      cc += r.cc;
    });
    n.leafCount = lc;
    n.completedLeafCount = cc;
    n.completionRatio = lc === 0 ? 0 : cc / lc;
    return { lc, cc, ratio: n.completionRatio };
  };
  roots.forEach((r) => calc(r));
  return roots;
}

export function getCurrentUserId(): string {
  let id = localStorage.getItem('gw_user_id');
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('gw_user_id', id);
  }
  return id;
}

export function getCurrentUserName(): string {
  return localStorage.getItem('gw_user_name') || '我';
}

export function setCurrentUserName(name: string): void {
  localStorage.setItem('gw_user_name', name);
}
