import type { NebulaState, ClusterData, ParticleData, ConnectionData } from './types';

const SHORT_CODE_PREFIX = 'nebula_';
const SHORT_CODE_LENGTH = 8;

export class ShareManager {
  private static readonly STORAGE_KEY = 'memory_nebula_states';
  private static readonly SHORT_CODE_KEY = 'memory_nebula_shortcodes';

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
    const shortCode = this.createShortCode(state);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?s=${shortCode}`;
  }

  public static generateFullShareLink(state: NebulaState): string {
    const json = this.stateToJson(state);
    const encoded = this.encodeBase64Url(json);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?nebula=${encoded}`;
  }

  private static createShortCode(state: NebulaState): string {
    const shortCode = this.generateShortId();
    const shortCodes = this.getAllShortCodes();
    shortCodes[shortCode] = this.stateToJson(state);
    
    try {
      localStorage.setItem(this.SHORT_CODE_KEY, JSON.stringify(shortCodes));
    } catch {
      // Storage full - clean up old entries
      this.cleanupOldShortCodes();
      try {
        const sc = this.getAllShortCodes();
        sc[shortCode] = this.stateToJson(state);
        localStorage.setItem(this.SHORT_CODE_KEY, JSON.stringify(sc));
      } catch {
        // Fallback to full URL encoding
      }
    }
    
    return shortCode;
  }

  private static generateShortId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const array = new Uint8Array(SHORT_CODE_LENGTH);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
      result += chars[array[i] % chars.length];
    }
    
    return SHORT_CODE_PREFIX + result;
  }

  private static getAllShortCodes(): Record<string, string> {
    try {
      const data = localStorage.getItem(this.SHORT_CODE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private static cleanupOldShortCodes(): void {
    try {
      const shortCodes = this.getAllShortCodes();
      const keys = Object.keys(shortCodes);
      
      if (keys.length > 50) {
        const keysToRemove = keys.slice(0, keys.length - 50);
        for (const key of keysToRemove) {
          delete shortCodes[key];
        }
        localStorage.setItem(this.SHORT_CODE_KEY, JSON.stringify(shortCodes));
      }
    } catch {
      // Ignore
    }
  }

  public static parseShareLink(): NebulaState | null {
    const params = new URLSearchParams(window.location.search);
    
    const shortCode = params.get('s');
    if (shortCode && shortCode.startsWith(SHORT_CODE_PREFIX)) {
      const shortCodes = this.getAllShortCodes();
      const json = shortCodes[shortCode];
      if (json) {
        return this.jsonToState(json);
      }
    }
    
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

  public static async generateShortLinkWithAPI(state: NebulaState): Promise<string> {
    const fullLink = this.generateFullShareLink(state);
    
    try {
      const response = await fetch('https://api.mcfly.one/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: fullLink })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.shortUrl || fullLink;
      }
    } catch {
      // Fallback to local short code
    }
    
    return this.generateShareLink(state);
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

  public static compressState(state: NebulaState): string {
    const json = this.stateToJson(state);
    return this.encodeBase64Url(json);
  }

  public static decompressState(compressed: string): NebulaState | null {
    try {
      const json = this.decodeBase64Url(compressed);
      return this.jsonToState(json);
    } catch {
      return null;
    }
  }
}
