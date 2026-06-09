import axios from 'axios';
import type { NodeData, EdgeData, TopSpark, Network } from './types';

const api = axios.create({
  baseURL: '/api',
});

export const nodeApi = {
  createOrUpdate: (node: Partial<NodeData> & { text: string; x: number; y: number }) =>
    api.post<NodeData>('/nodes', node).then((r) => r.data),
  getById: (id: string) => api.get<NodeData>(`/nodes/${id}`).then((r) => r.data),
};

export const edgeApi = {
  create: (from: string, to: string) =>
    api.post<EdgeData>('/edges', { from, to }).then((r) => r.data),
  like: (id: string) =>
    api.post<{ id: string; likes: number }>(`/edges/${id}/like`).then((r) => r.data),
};

export const sparkApi = {
  getTop: () => api.get<TopSpark[]>('/sparks/top').then((r) => r.data),
};

export const networkApi = {
  save: (data: { nodes: NodeData[]; edges: EdgeData[]; creator?: string }) =>
    api.post<Network & { url: string }>('/networks/save', data).then((r) => r.data),
  getById: (id: string) => api.get<Network>(`/networks/${id}`).then((r) => r.data),
};
