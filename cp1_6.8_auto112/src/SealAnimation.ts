export interface SealState {
  isSealed: boolean;
  isAnimating: boolean;
  sealPosition: { x: number; y: number };
  sealSymbol: string;
  sealRotation: number;
  sealColor: string;
}

const SEAL_SYMBOLS = ['风', '雅', '信', '缘', '念', '书', '心', '意'];

const SEAL_COLORS = [
  '#8b2500',
  '#a03020',
  '#7a1f0a',
  '#6b1c0d',
  '#922b21',
];

export class SealAnimation {
  private state: SealState = {
    isSealed: false,
    isAnimating: false,
    sealPosition: { x: 50, y: 50 },
    sealSymbol: '风',
    sealRotation: 0,
    sealColor: '#8b2500',
  };

  private onStateChange: ((state: SealState) => void) | null = null;
  private foldStep = 0;
  private foldTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(callback: (state: SealState) => void): () => void {
    this.onStateChange = callback;
    return () => { this.onStateChange = null; };
  }

  getState(): SealState {
    return { ...this.state };
  }

  seal(): Promise<SealState> {
    if (this.state.isSealed || this.state.isAnimating) {
      return Promise.resolve(this.state);
    }

    return new Promise((resolve) => {
      this.state = {
        ...this.state,
        isAnimating: true,
        sealPosition: {
          x: 40 + Math.random() * 20,
          y: 40 + Math.random() * 20,
        },
        sealSymbol: SEAL_SYMBOLS[Math.floor(Math.random() * SEAL_SYMBOLS.length)],
        sealRotation: -15 + Math.random() * 30,
        sealColor: SEAL_COLORS[Math.floor(Math.random() * SEAL_COLORS.length)],
      };
      this.foldStep = 0;
      this.notify();

      this.runFoldSequence(() => {
        this.state = {
          ...this.state,
          isAnimating: false,
          isSealed: true,
        };
        this.notify();
        resolve(this.state);
      });
    });
  }

  private runFoldSequence(onComplete: () => void): void {
    this.foldStep = 0;
    const steps = [
      { duration: 400, transform: 'perspective(800px) rotateX(0deg)' },
      { duration: 600, transform: 'perspective(800px) rotateX(-90deg)' },
      { duration: 100, transform: 'perspective(800px) rotateX(-90deg) scale(0.98)' },
      { duration: 500, transform: 'perspective(800px) rotateX(-180deg)' },
    ];

    const executeStep = (index: number) => {
      if (index >= steps.length) {
        onComplete();
        return;
      }

      const step = steps[index];
      this.applyFoldTransform(step.transform);
      this.foldTimer = setTimeout(() => {
        this.foldStep = index + 1;
        executeStep(index + 1);
      }, step.duration);
    };

    executeStep(0);
  }

  private currentFoldTransform = 'perspective(800px) rotateX(0deg)';

  private applyFoldTransform(transform: string): void {
    this.currentFoldTransform = transform;
    this.notify();
  }

  getFoldTransform(): string {
    return this.currentFoldTransform;
  }

  unseal(): void {
    if (this.foldTimer !== null) {
      clearTimeout(this.foldTimer);
      this.foldTimer = null;
    }
    this.currentFoldTransform = 'perspective(800px) rotateX(0deg)';
    this.state = {
      isSealed: false,
      isAnimating: false,
      sealPosition: { x: 50, y: 50 },
      sealSymbol: '风',
      sealRotation: 0,
      sealColor: '#8b2500',
    };
    this.notify();
  }

  reset(): void {
    this.unseal();
    this.foldStep = 0;
  }

  private notify(): void {
    this.onStateChange?.(this.getState());
  }
}
