export interface GraphNode {
  id: string;
  name: string;
  description: string;
  color: string;
  size: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const base = '/api';

const headers = { 'Content-Type': 'application/json' };

const handle = async (res: Response) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type');
  return ct && ct.includes('application/json') ? res.json() : null;
};

export const api = {
  getGraph: (): Promise<GraphData> =>
    fetch(`${base}/graph`).then(handle),

  replaceGraph: (data: GraphData): Promise<{ success: boolean }> =>
    fetch(`${base}/graph`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    }).then(handle),

  createNode: (data: Omit<GraphNode, 'id'>): Promise<GraphNode> =>
    fetch(`${base}/nodes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    }).then(handle),

  updateNode: (id: string, data: Partial<GraphNode>): Promise<GraphNode> =>
    fetch(`${base}/nodes/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    }).then(handle),

  deleteNode: (id: string): Promise<{ success: boolean }> =>
    fetch(`${base}/nodes/${id}`, { method: 'DELETE' }).then(handle),

  createLink: (data: Omit<GraphLink, 'id'>): Promise<GraphLink> =>
    fetch(`${base}/links`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    }).then(handle),

  updateLink: (id: string, data: Partial<GraphLink>): Promise<GraphLink> =>
    fetch(`${base}/links/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    }).then(handle),

  deleteLink: (id: string): Promise<{ success: boolean }> =>
    fetch(`${base}/links/${id}`, { method: 'DELETE' }).then(handle),

  createSnapshot: (data: GraphData): Promise<{ id: string; url: string }> =>
    fetch(`${base}/snapshots`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    }).then(handle),

  getSnapshot: (id: string): Promise<{ id: string; data: GraphData; createdAt: number }> =>
    fetch(`${base}/snapshots/${id}`).then(handle),
};
