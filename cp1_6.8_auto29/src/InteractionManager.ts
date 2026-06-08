import { InkRenderer, CharPosition } from './InkRenderer';
import { getAlternatives, getWordAlternatives, PoemStyle } from './PoemEngine';

export interface ReplacementOption {
  char: string;
  isWord: boolean;
}

export interface InteractionState {
  selectedChar: {
    lineIndex: number;
    charIndex: number;
    char: string;
    position: { x: number; y: number };
  } | null;
  replacementOptions: ReplacementOption[];
  isPanelVisible: boolean;
  isDragging: boolean;
  dragSource: { lineIndex: number; charIndex: number } | null;
  dragTarget: { lineIndex: number; charIndex: number } | null;
}

export type InteractionCallback = (state: InteractionState) => void;

export class InteractionManager {
  private renderer: InkRenderer;
  private state: InteractionState;
  private listeners: InteractionCallback[] = [];
  private style: PoemStyle = '豪放';
  private canvas: HTMLCanvasElement;
  private touchStartPos: { x: number; y: number } | null = null;
  private isMobile: boolean = false;

  constructor(renderer: InkRenderer, canvas: HTMLCanvasElement) {
    this.renderer = renderer;
    this.canvas = canvas;
    this.state = {
      selectedChar: null,
      replacementOptions: [],
      isPanelVisible: false,
      isDragging: false,
      dragSource: null,
      dragTarget: null,
    };
    this.isMobile = window.innerWidth < 768;
    this.bindEvents();
  }

  setStyle(style: PoemStyle) {
    this.style = style;
  }

  private bindEvents() {
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });

    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 768;
    });
  }

  private handleClick = (e: MouseEvent) => {
    const pos = this.renderer.getCharAtPosition(e.clientX, e.clientY);
    if (pos) {
      this.selectChar(pos, e.clientX, e.clientY);
    } else {
      this.deselectChar();
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (!this.touchStartPos) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - this.touchStartPos.x;
    const dy = touch.clientY - this.touchStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      const pos = this.renderer.getCharAtPosition(touch.clientX, touch.clientY);
      if (pos) {
        this.selectChar(pos, touch.clientX, touch.clientY);
      } else {
        this.deselectChar();
      }
    }

    this.touchStartPos = null;
  };

  private selectChar(pos: CharPosition, clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const charAlternatives = getAlternatives(this.style, pos.char);
    const wordAlternatives = getWordAlternatives(this.style, pos.char);

    const options: ReplacementOption[] = [
      ...charAlternatives.map((c) => ({ char: c, isWord: false })),
      ...wordAlternatives.map((w) => ({ char: w, isWord: true })),
    ];

    this.state = {
      ...this.state,
      selectedChar: {
        lineIndex: pos.lineIndex,
        charIndex: pos.charIndex,
        char: pos.char,
        position: { x: canvasX, y: canvasY },
      },
      replacementOptions: options,
      isPanelVisible: true,
    };

    this.notifyListeners();
  }

  private deselectChar() {
    this.state = {
      ...this.state,
      selectedChar: null,
      replacementOptions: [],
      isPanelVisible: false,
    };
    this.notifyListeners();
  }

  replaceWith(newChar: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.state.selectedChar) {
        resolve();
        return;
      }

      const { lineIndex, charIndex } = this.state.selectedChar;

      this.renderer.replaceChar(lineIndex, charIndex, newChar, () => {
        this.state = {
          ...this.state,
          selectedChar: null,
          replacementOptions: [],
          isPanelVisible: false,
        };
        this.notifyListeners();
        resolve();
      });
    });
  }

  closePanel() {
    this.deselectChar();
  }

  getState(): InteractionState {
    return { ...this.state };
  }

  onStateChange(callback: InteractionCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb(this.state));
  }

  getPanelPosition(): { x: number; y: number } | null {
    if (!this.state.selectedChar) return null;

    const { position } = this.state.selectedChar;

    if (this.isMobile) {
      return {
        x: 0,
        y: window.innerHeight * 0.5,
      };
    }

    return {
      x: position.x + 60,
      y: position.y - 100,
    };
  }

  destroy() {
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.listeners = [];
  }
}
