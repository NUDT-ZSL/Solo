/// <reference types="vite/client" />

declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    transparent?: number | null;
    background?: string;
    dither?: string | boolean;
    repeat?: number;
  }

  interface GIFFrame {
    data: ImageData;
    delay: number;
    dispose?: number;
    transparent?: number | null;
  }

  class GIF extends EventTarget {
    constructor(options?: GIFOptions);
    addFrame(imageData: ImageData | HTMLCanvasElement | CanvasRenderingContext2D, options?: { delay?: number; copy?: boolean }): void;
    render(): void;
    abort(): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: 'abort', callback: () => void): void;
    running: boolean;
  }

  export default GIF;
}
