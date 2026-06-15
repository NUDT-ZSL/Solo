export interface VersionInfo {
  id: string;
  timestamp: number;
  creatorId: string;
  creatorName: string;
}

export interface MindMapNode {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  isRoot: boolean;
  createdAt: number;
}

export interface MindMapEdge {
  id: string;
  from: string;
  to: string;
}

export interface MindMapState {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

class ApiClient {
  private baseUrl = '';

  async getVersions(roomId: string): Promise<VersionInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/versions/${roomId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch versions');
    }
    const data = await response.json();
    return data.versions;
  }

  async rollback(roomId: string, versionId: string, userId: string): Promise<MindMapState> {
    const response = await fetch(`${this.baseUrl}/api/rollback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roomId, versionId, userId })
    });
    if (!response.ok) {
      throw new Error('Failed to rollback');
    }
    const data = await response.json();
    return data.state;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
