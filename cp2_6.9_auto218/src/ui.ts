export interface UIState {
  brushSize: number;
  inkDensity: number;
  scrollColor: string;
  strokeCount: number;
  elapsedTime: number;
  canUndo: boolean;
}

export type UIChangeHandler = (state: Partial<UIState>) => void;
export type UIActionHandler = (action: 'undo' | 'mount') => void;

export class UIManager {
  private state: UIState = {
    brushSize: 8,
    inkDensity: 0.8,
    scrollColor: '#F5E6C8',
    strokeCount: 0,
    elapsedTime: 0,
    canUndo: false
  };

  private changeHandler: UIChangeHandler | null = null;
  private actionHandler: UIActionHandler | null = null;

  private brushSizeInput: HTMLInputElement;
  private inkDensityInput: HTMLInputElement;
  private colorButtons: NodeListOf<HTMLButtonElement>;
  private strokeCountSpan: HTMLSpanElement;
  private timerSpan: HTMLSpanElement;
  private undoBtn: HTMLButtonElement;
  private mountBtn: HTMLButtonElement;
  private toolbar: HTMLDivElement;

  constructor() {
    this.brushSizeInput = document.getElementById('brushSize') as HTMLInputElement;
    this.inkDensityInput = document.getElementById('inkDensity') as HTMLInputElement;
    this.colorButtons = document.querySelectorAll('.color-btn') as NodeListOf<HTMLButtonElement>;
    this.strokeCountSpan = document.getElementById('strokeCount') as HTMLSpanElement;
    this.timerSpan = document.getElementById('timer') as HTMLSpanElement;
    this.undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    this.mountBtn = document.getElementById('mountBtn') as HTMLButtonElement;
    this.toolbar = document.getElementById('toolbar') as HTMLDivElement;

    this.bindEvents();
    this.handleResponsive();
    window.addEventListener('resize', () => this.handleResponsive());
  }

  private bindEvents() {
    this.brushSizeInput.addEventListener('input', () => {
      this.state.brushSize = parseFloat(this.brushSizeInput.value);
      this.emitChange({ brushSize: this.state.brushSize });
    });

    this.inkDensityInput.addEventListener('input', () => {
      this.state.inkDensity = parseFloat(this.inkDensityInput.value);
      this.emitChange({ inkDensity: this.state.inkDensity });
    });

    this.colorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.colorButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.dataset.color || '#F5E6C8';
        this.state.scrollColor = color;
        this.emitChange({ scrollColor: color });
      });
    });

    this.undoBtn.addEventListener('click', () => {
      this.emitAction('undo');
    });

    this.mountBtn.addEventListener('click', () => {
      this.emitAction('mount');
    });
  }

  private handleResponsive() {
    if (window.innerWidth < 900) {
      this.toolbar.classList.remove('toolbar-vertical');
      this.toolbar.classList.add('toolbar-horizontal');
    } else {
      this.toolbar.classList.remove('toolbar-horizontal');
      this.toolbar.classList.add('toolbar-vertical');
    }
  }

  onChange(handler: UIChangeHandler) {
    this.changeHandler = handler;
  }

  onAction(handler: UIActionHandler) {
    this.actionHandler = handler;
  }

  private emitChange(partial: Partial<UIState>) {
    if (this.changeHandler) {
      this.changeHandler(partial);
    }
  }

  private emitAction(action: 'undo' | 'mount') {
    if (this.actionHandler) {
      this.actionHandler(action);
    }
  }

  updateStrokeCount(count: number) {
    this.state.strokeCount = count;
    this.strokeCountSpan.textContent = `笔触 ${count}`;
    this.state.canUndo = count > 0;
    this.undoBtn.disabled = !this.state.canUndo;
  }

  updateTimer(seconds: number) {
    this.state.elapsedTime = seconds;
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    this.timerSpan.textContent = `${mins}:${secs}`;
  }

  getState(): UIState {
    return { ...this.state };
  }
}
