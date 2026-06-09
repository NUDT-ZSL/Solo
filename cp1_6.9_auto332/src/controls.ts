export type EventHandler = (...args: unknown[]) => void;

export class EventEmitter {
  private events: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.events.get(event);
    if (!handlers) return;
    for (const h of handlers) {
      try {
        h(...args);
      } catch (e) {
        console.error(`Event handler error for "${event}":`, e);
      }
    }
  }
}

export interface ControlEvents {
  emotionChange: (value: number) => void;
  reset: () => void;
}

export class ControlPanel {
  emitter: EventEmitter;
  slider: HTMLInputElement;
  resetBtn: HTMLButtonElement;
  container: HTMLElement;
  currentValue: number = 0;

  constructor(containerId: string = 'controls-panel') {
    this.emitter = new EventEmitter();
    this.container = document.getElementById(containerId) || this.createDefaultPanel();
    this.slider = document.getElementById('emotion-slider') as HTMLInputElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

    if (!this.slider || !this.resetBtn) {
      this.createDefaultPanel();
    }

    this.bindEvents();
  }

  createDefaultPanel(): HTMLElement {
    let panel = document.getElementById('controls-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'controls-panel';
      panel.style.position = 'absolute';
      panel.style.top = '20px';
      panel.style.right = '20px';
      panel.style.zIndex = '100';
      panel.style.background = 'rgba(255, 255, 255, 0.12)';
      panel.style.backdropFilter = 'blur(10px)';
      (panel.style as unknown as Record<string, string>)['webkitBackdropFilter'] = 'blur(10px)';
      panel.style.borderRadius = '8px';
      panel.style.padding = '16px 20px';
      panel.style.minWidth = '180px';
      panel.style.border = '1px solid rgba(255, 255, 255, 0.15)';

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = '情绪';
      label.style.color = '#cccccc';
      label.style.fontSize = '14px';
      label.style.marginBottom = '10px';
      label.style.display = 'block';
      label.style.userSelect = 'none';
      panel.appendChild(label);

      this.slider = document.createElement('input');
      this.slider.id = 'emotion-slider';
      this.slider.type = 'range';
      this.slider.min = '0';
      this.slider.max = '1';
      this.slider.step = '0.01';
      this.slider.value = '0';
      Object.assign(this.slider.style, {
        width: '100%',
        height: '4px',
        appearance: 'none',
        background: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '2px',
        outline: 'none',
        cursor: 'pointer',
        marginBottom: '14px'
      } as unknown as Partial<CSSStyleDeclaration>);
      (this.slider.style as unknown as Record<string, string>)['webkitAppearance'] = 'none';
      panel.appendChild(this.slider);

      this.resetBtn = document.createElement('button');
      this.resetBtn.id = 'reset-btn';
      this.resetBtn.textContent = '重置';
      Object.assign(this.resetBtn.style, {
        width: '100%',
        padding: '8px 0',
        background: 'rgba(255, 255, 255, 0.15)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        borderRadius: '6px',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        userSelect: 'none'
      } as unknown as Partial<CSSStyleDeclaration>);
      panel.appendChild(this.resetBtn);

      document.body.appendChild(panel);
    }
    return panel;
  }

  bindEvents(): void {
    let lastEmitTime = 0;
    const emitInterval = 16;

    this.slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.currentValue = value;

      const now = performance.now();
      if (now - lastEmitTime >= emitInterval) {
        lastEmitTime = now;
        this.emitter.emit('emotionChange', value);
      }
    });

    this.slider.addEventListener('change', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.currentValue = value;
      this.emitter.emit('emotionChange', value);
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetEmotion();
      this.emitter.emit('reset');
    });

    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.background = 'rgba(255, 255, 255, 0.25)';
      this.resetBtn.style.transform = 'translateY(-1px)';
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.background = 'rgba(255, 255, 255, 0.15)';
      this.resetBtn.style.transform = 'translateY(0)';
    });
    this.resetBtn.addEventListener('mousedown', () => {
      this.resetBtn.style.transform = 'translateY(0)';
    });
  }

  resetEmotion(): void {
    this.currentValue = 0;
    this.slider.value = '0';
    this.emitter.emit('emotionChange', 0);
  }

  setEmotion(value: number): void {
    const v = Math.max(0, Math.min(1, value));
    this.currentValue = v;
    this.slider.value = v.toString();
    this.emitter.emit('emotionChange', v);
  }

  onEmotionChange(handler: (value: number) => void): void {
    this.emitter.on('emotionChange', handler as EventHandler);
  }

  onReset(handler: () => void): void {
    this.emitter.on('reset', handler as EventHandler);
  }
}
