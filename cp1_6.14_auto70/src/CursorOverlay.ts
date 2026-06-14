import { EditorCore, Position } from './EditorCore';

interface CursorState {
  userId: string;
  userName: string;
  color: string;
  pos: number;
  lastUpdate: number;
}

export class CursorOverlay {
  private editorCore: EditorCore;
  private container: HTMLElement;
  private overlay: HTMLElement;
  private cursors: Map<string, CursorState> = new Map();
  private cursorElements: Map<string, HTMLElement> = new Map();
  private labelElements: Map<string, HTMLElement> = new Map();
  private isActive = false;
  private rafId: number | null = null;
  private cursorTimeoutMs = 5000;
  private cleanupInterval: number | null = null;

  private handleRemoteCursor = (event: Event) => {
    const customEvent = event as CustomEvent<Position>;
    this.updateCursor(customEvent.detail);
  };

  private handleScroll = () => {
    this.scheduleRender();
  };

  constructor(editorCore: EditorCore, container: HTMLElement) {
    this.editorCore = editorCore;
    this.container = container;
    this.overlay = document.createElement('div');
  }

  init(): void {
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 10;
      overflow: hidden;
    `;
    this.overlay.className = 'cursor-overlay';
    this.container.appendChild(this.overlay);

    window.addEventListener('remote-cursor', this.handleRemoteCursor);
    
    const scrollContainer = this.editorCore.getScrollContainer();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', this.handleScroll, { passive: true });
    }

    this.isActive = true;
    this.startCursorCleanup();
    this.scheduleRender();
  }

  destroy(): void {
    this.isActive = false;
    
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    window.removeEventListener('remote-cursor', this.handleRemoteCursor);
    
    const scrollContainer = this.editorCore.getScrollContainer();
    if (scrollContainer) {
      scrollContainer.removeEventListener('scroll', this.handleScroll);
    }

    this.cursorElements.forEach(el => el.remove());
    this.labelElements.forEach(el => el.remove());
    this.cursorElements.clear();
    this.labelElements.clear();
    this.cursors.clear();

    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }

  private updateCursor(position: Position): void {
    const now = Date.now();
    this.cursors.set(position.userId, {
      ...position,
      lastUpdate: now
    });
    this.scheduleRender();
  }

  private removeCursor(userId: string): void {
    this.cursors.delete(userId);
    
    const cursorEl = this.cursorElements.get(userId);
    if (cursorEl) {
      cursorEl.remove();
      this.cursorElements.delete(userId);
    }
    
    const labelEl = this.labelElements.get(userId);
    if (labelEl) {
      labelEl.remove();
      this.labelElements.delete(userId);
    }
  }

  private startCursorCleanup(): void {
    this.cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      const toRemove: string[] = [];
      
      this.cursors.forEach((cursor, userId) => {
        if (now - cursor.lastUpdate > this.cursorTimeoutMs) {
          toRemove.push(userId);
        }
      });
      
      toRemove.forEach(userId => this.removeCursor(userId));
    }, 1000);
  }

  private scheduleRender(): void {
    if (!this.isActive || this.rafId !== null) return;
    
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  private render(): void {
    if (!this.isActive) return;

    const scrollContainer = this.editorCore.getScrollContainer();
    if (!scrollContainer) return;

    this.cursors.forEach((cursor) => {
      const coords = this.editorCore.posToCoords(cursor.pos);
      if (!coords) return;

      let cursorEl = this.cursorElements.get(cursor.userId);
      let labelEl = this.labelElements.get(cursor.userId);

      if (!cursorEl) {
        cursorEl = document.createElement('div');
        cursorEl.style.cssText = `
          position: absolute;
          width: 2px;
          background-color: ${cursor.color};
          pointer-events: none;
          transition: opacity 0.3s ease;
        `;
        this.overlay.appendChild(cursorEl);
        this.cursorElements.set(cursor.userId, cursorEl);
      }

      if (!labelEl) {
        labelEl = document.createElement('div');
        labelEl.textContent = cursor.userName;
        labelEl.style.cssText = `
          position: absolute;
          font-size: 11px;
          color: #ffffff;
          background-color: rgba(0, 0, 0, 0.7);
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          pointer-events: none;
          transform: translateX(-50%);
          transition: opacity 0.3s ease;
          z-index: 11;
        `;
        this.overlay.appendChild(labelEl);
        this.labelElements.set(cursor.userId, labelEl);
      }

      const lineHeight = 21;
      const cursorHeight = lineHeight;
      
      cursorEl.style.left = `${coords.left}px`;
      cursorEl.style.top = `${coords.top}px`;
      cursorEl.style.height = `${cursorHeight}px`;
      cursorEl.style.backgroundColor = cursor.color;
      cursorEl.style.opacity = '1';

      labelEl.style.left = `${coords.left}px`;
      labelEl.style.top = `${coords.top - 22}px`;
      labelEl.style.opacity = '1';
    });
  }

  clearAllCursors(): void {
    this.cursors.forEach((_, userId) => this.removeCursor(userId));
  }
}
