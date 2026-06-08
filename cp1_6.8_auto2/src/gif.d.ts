declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    background?: string;
    transparent?: string | null;
    dither?: string;
  }

  class GIF extends EventTarget {
    constructor(options: GIFOptions);
    addFrame(canvas: HTMLCanvasElement, options?: { delay?: number; copy?: boolean }): void;
    render(): GIF;
    on(event: 'finished', callback: (blob: Blob) => void): GIF;
    on(event: 'progress', callback: (p: number) => void): GIF;
    abort(): void;
  }

  export default GIF;
}
