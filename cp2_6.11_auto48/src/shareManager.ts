import type { NebulaState, ClusterData, ParticleData, ConnectionData } from './types';

const SHORT_API_URL = 'https://api.mcfly.one/api/shorten';
const FALLBACK_SHORT_CODE_LENGTH = 8;
const MAX_LOCAL_SHORT_CODES = 100;

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

  public static async generateShareLink(state: NebulaState): Promise<string> {
    try {
      const shortUrl = await this.shortenWithAPI(state);
      if (shortUrl) {
        return shortUrl;
      }
    } catch {
      // Fall through to local short code
    }

    return this.generateLocalShareLink(state);
  }

  private static async shortenWithAPI(state: NebulaState): Promise<string | null> {
    try {
      const fullUrl = this.generateFullShareLink(state);
      
      const response = await fetch(SHORT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: fullUrl })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.shortUrl || data.short_url || data.url) {
          return data.shortUrl || data.short_url || data.url;
        }
      }
    } catch {
      // API call failed, fall back to local
    }

    return null;
  }

  private static generateLocalShareLink(state: NebulaState): string {
    const shortCode = this.createLocalShortCode(state);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?s=${shortCode}`;
  }

  public static generateFullShareLink(state: NebulaState): string {
    const compressed = this.compressState(state);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?nebula=${compressed}`;
  }

  private static createLocalShortCode(state: NebulaState): string {
    const shortCode = this.generateShortId();
    const shortCodes = this.getAllShortCodes();

    const entries = Object.entries(shortCodes);
    if (entries.length >= MAX_LOCAL_SHORT_CODES) {
      const toRemove = entries.slice(0, entries.length - MAX_LOCAL_SHORT_CODES + 1);
      for (const [key] of toRemove) {
        delete shortCodes[key];
      }
    }

    shortCodes[shortCode] = this.stateToJson(state);

    try {
      localStorage.setItem(this.SHORT_CODE_KEY, JSON.stringify(shortCodes));
    } catch {
      // Storage full - remove old entries
      this.cleanupOldShortCodes();
      const sc = this.getAllShortCodes();
      sc[shortCode] = this.stateToJson(state);
      try {
        localStorage.setItem(this.SHORT_CODE_KEY, JSON.stringify(sc));
      } catch {
        // Still failing, use full URL instead
      }
    }

    return shortCode;
  }

  private static generateShortId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    if (crypto && crypto.getRandomValues) {
      const array = new Uint8Array(FALLBACK_SHORT_CODE_LENGTH);
      crypto.getRandomValues(array);
      for (let i = 0; i < FALLBACK_SHORT_CODE_LENGTH; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      for (let i = 0; i < FALLBACK_SHORT_CODE_LENGTH; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    return 'nb_' + result;
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

      if (keys.length > MAX_LOCAL_SHORT_CODES / 2) {
        const keysToRemove = keys.slice(0, Math.floor(keys.length / 2));
        for (const key of keysToRemove) {
          delete shortCodes[key];
        }
        localStorage.setItem(this.SHORT_CODE_KEY, JSON.stringify(shortCodes));
      }
    } catch {
      // Ignore errors
    }
  }

  public static parseShareLink(): NebulaState | null {
    const params = new URLSearchParams(window.location.search);

    const shortCode = params.get('s');
    if (shortCode && shortCode.startsWith('nb_')) {
      const shortCodes = this.getAllShortCodes();
      const json = shortCodes[shortCode];
      if (json) {
        return this.jsonToState(json);
      }
    }

    const encoded = params.get('nebula');
    if (encoded) {
      try {
        const state = this.decompressState(encoded);
        if (state) {
          return state;
        }
      } catch {
        // Fall through
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

  public static async copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
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
}
