import axios from 'axios'
import type { MindMap, MapNode } from '@/types'

const api = axios.create({
  baseURL: '/api'
})

export const mindMapApi = {
  list: (): Promise<MindMap[]> => api.get('/maps').then((res) => res.data),
  get: (id: string): Promise<MindMap> => api.get(`/maps/${id}`).then((res) => res.data),
  create: (title: string): Promise<MindMap> =>
    api.post('/maps', { title }).then((res) => res.data),
  update: (id: string, data: Partial<MindMap>): Promise<MindMap> =>
    api.put(`/maps/${id}`, data).then((res) => res.data),
  delete: (id: string): Promise<void> => api.delete(`/maps/${id}`).then((res) => res.data),
  invite: (mapId: string, userId: string): Promise<void> =>
    api.post(`/maps/${mapId}/invite`, { userId }).then((res) => res.data)
}

export const nodeApi = {
  list: (mapId: string): Promise<MapNode[]> =>
    api.get(`/maps/${mapId}/nodes`).then((res) => res.data),
  create: (mapId: string, data: Omit<MapNode, 'id' | 'mapId'>): Promise<MapNode> =>
    api.post(`/maps/${mapId}/nodes`, data).then((res) => res.data),
  update: (mapId: string, nodeId: string, data: Partial<MapNode>): Promise<MapNode> =>
    api.put(`/maps/${mapId}/nodes/${nodeId}`, data).then((res) => res.data),
  delete: (mapId: string, nodeId: string): Promise<void> =>
    api.delete(`/maps/${mapId}/nodes/${nodeId}`).then((res) => res.data)
}
