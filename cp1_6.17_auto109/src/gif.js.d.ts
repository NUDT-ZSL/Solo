declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    background?: string;
    repeat?: number;
    transparent?: string | null;
    dither?: boolean | string;
  }

  interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      image: CanvasRenderingContext2D | HTMLImageElement | HTMLCanvasElement | ImageData,
      options?: AddFrameOptions
    ): void;
    on(event: 'start' | 'abort', callback: () => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    render(): void;
    abort(): void;
    running: boolean;
  }

  export = GIF;
}
