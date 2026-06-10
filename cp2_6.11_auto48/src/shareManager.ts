import type { NebulaState, ClusterData, ParticleData, ConnectionData } from './types';

export class ShareManager {
  private static readonly STORAGE_KEY = 'memory_nebula_states';

  public static generateState(
    text: string,
    clusters: ClusterData[],
    particles: ParticleData[],
    connections: ConnectionData[],
    cameraPosition: { x: number; y: number; z: number },
    cameraRotation: { x: number; y: number }
  ): NebulaState {
    return {
      text,
      clusters: JSON.parse(JSON.stringify(clusters)),
      particles: JSON.parse(JSON.stringify(particles)),
      connections: JSON.parse(JSON.stringify(connections)),
      camera: {
        position: { ...cameraPosition },
        rotation: { ...cameraRotation }
      },
      createdAt: Date.now()
    };
  }

  public static stateToJson(state: NebulaState): string {
    return JSON.stringify(state);
  }

  public static jsonToState(json: string): NebulaState | null {
    try {
      const state = JSON.parse(json);
      if (this.validateState(state)) {
        return state;
      }
      return null;
    } catch {
      return null;
    }
  }

  private static validateState(state: unknown): state is NebulaState {
    if (typeof state !== 'object' || state === null) return false;
    
    const s = state as Record<string, unknown>;
    return (
      typeof s.text === 'string' &&
      Array.isArray(s.clusters) &&
      Array.isArray(s.particles) &&
      Array.isArray(s.connections) &&
      typeof s.camera === 'object' &&
      s.camera !== null &&
      typeof s.createdAt === 'number'
    );
  }

  public static generateShareLink(state: NebulaState): string {
    const json = this.stateToJson(state);
    const encoded = this.encodeBase64Url(json);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?nebula=${encoded}`;
  }

  public static parseShareLink(): NebulaState | null {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('nebula');
    
    if (encoded) {
      try {
        const json = this.decodeBase64Url(encoded);
        return this.jsonToState(json);
      } catch {
        return null;
      }
    }
    
    return null;
  }

  public static saveToFile(state: NebulaState): void {
    const json = this.stateToJson(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `memory-nebula-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public static copyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
  }

  public static saveToLocalStorage(state: NebulaState, id: string): void {
    try {
      const saved = this.getAllFromLocalStorage();
      saved[id] = state;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Storage might be full
    }
  }

  public static getFromLocalStorage(id: string): NebulaState | null {
    try {
      const saved = this.getAllFromLocalStorage();
      return saved[id] || null;
    } catch {
      return null;
    }
  }

  private static getAllFromLocalStorage(): Record<string, NebulaState> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private static encodeBase64Url(str: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    const base64 = btoa(binary);
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private static decodeBase64Url(encoded: string): string {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  public static generateShortId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
