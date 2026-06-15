import axios from 'axios';
import { NodeData, EdgeData, NodeType } from '@/types';

const API_BASE_URL = '/api';

export const DataService = {
  async fetchNodes(type?: NodeType): Promise<NodeData[]> {
    const params = type ? { type } : {};
    const response = await axios.get<NodeData[]>(`${API_BASE_URL}/nodes`, { params });
    return response.data;
  },

  async fetchEdges(): Promise<EdgeData[]> {
    const response = await axios.get<EdgeData[]>(`${API_BASE_URL}/edges`);
    return response.data;
  },

  async fetchAllData(): Promise<{ nodes: NodeData[]; edges: EdgeData[] }> {
    const [nodes, edges] = await Promise.all([
      this.fetchNodes(),
      this.fetchEdges()
    ]);
    return { nodes, edges };
  }
};
