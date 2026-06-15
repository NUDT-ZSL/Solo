declare module 'gif.js' {
  interface GIFOptions {
    repeat?: number;
    quality?: number;
    workers?: number;
    workerScript?: string;
    background?: string;
    width?: number;
    height?: number;
    transparent?: number | null;
    dither?: string | boolean;
    debug?: boolean;
  }

  interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  type GIFEventType = 'finished' | 'progress' | 'start' | 'abort' | 'error';

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      image: HTMLImageElement | HTMLCanvasElement | CanvasRenderingContext2D | ImageData,
      options?: AddFrameOptions
    ): void;
    setOptions(options: GIFOptions): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: 'start' | 'abort', callback: () => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    on(event: GIFEventType, callback: (...args: any[]) => void): void;
    render(): void;
    abort(): void;
    running: boolean;
  }

  export default GIF;
}
