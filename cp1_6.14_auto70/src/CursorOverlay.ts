import { EditorCore, UserCursor } from './EditorCore';

interface RemoteCursorState {
  userId: string;
  userName: string;
  color: string;
  line: number;
  column: number;
  pos: number;
  lastUpdate: number;
}

export class CursorOverlay {
  private editorCore: EditorCore;
  private container: HTMLElement;
  private overlay: HTMLElement;
  private cursors: Map<string, RemoteCursorState> = new Map();
  private cursorElements: Map<string, HTMLElement> = new Map();
  private labelElements: Map<string, HTMLElement> = new Map();
  private isActive = false;
  private rafId: number | null = null;
  private cursorTimeoutMs = 5000;
  private cleanupInterval: number | null = null;
  private unsubScroll: (() => void) | null = null;

  private handleRemoteCursor = (event: Event) => {
    const customEvent = event as CustomEvent<UserCursor>;
    this.updateCursor(customEvent.detail);
  };

  private handleScroll = (_scrollTop: number, _scrollLeft: number) => {
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

    this.unsubScroll = this.editorCore.onScroll(this.handleScroll);

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

    if (this.unsubScroll) {
      this.unsubScroll();
      this.unsubScroll = null;
    }

    window.removeEventListener('remote-cursor', this.handleRemoteCursor);

    this.cursorElements.forEach(el => el.remove());
    this.labelElements.forEach(el => el.remove());
    this.cursorElements.clear();
    this.labelElements.clear();
    this.cursors.clear();

    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }

  private updateCursor(userCursor: UserCursor): void {
    const now = Date.now();
    this.cursors.set(userCursor.userId, {
      userId: userCursor.userId,
      userName: userCursor.userName,
      color: userCursor.color,
      line: userCursor.position.line,
      column: userCursor.position.column,
      pos: userCursor.position.pos,
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
      const coords = this.editorCore.coordsAtLineColumn(cursor.line, cursor.column);
      if (!coords) {
        const fallbackCoords = this.editorCore.coordsAtPos(cursor.pos);
        if (!fallbackCoords) return;
        this.renderCursorElement(cursor, fallbackCoords.top, fallbackCoords.left);
      } else {
        this.renderCursorElement(cursor, coords.top, coords.left);
      }
    });
  }

  private renderCursorElement(cursor: RemoteCursorState, top: number, left: number): void {
    let cursorEl = this.cursorElements.get(cursor.userId);
    let labelEl = this.labelElements.get(cursor.userId);

    if (!cursorEl) {
      cursorEl = document.createElement('div');
      cursorEl.style.cssText = `
        position: absolute;
        width: 2px;
        background-color: ${cursor.color};
        pointer-events: none;
        transition: top 0.05s linear, left 0.05s linear, opacity 0.3s ease;
        box-shadow: 0 0 4px ${cursor.color};
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
        font-weight: 500;
        color: #ffffff;
        background-color: ${cursor.color};
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
        transform: translateX(-50%);
        transition: top 0.05s linear, left 0.05s linear, opacity 0.3s ease;
        z-index: 11;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        letter-spacing: 0.2px;
      `;
      this.overlay.appendChild(labelEl);
      this.labelElements.set(cursor.userId, labelEl);
    }

    const lineHeight = 21;
    const cursorHeight = lineHeight;

    cursorEl.style.left = `${left}px`;
    cursorEl.style.top = `${top}px`;
    cursorEl.style.height = `${cursorHeight}px`;
    cursorEl.style.backgroundColor = cursor.color;
    cursorEl.style.boxShadow = `0 0 4px ${cursor.color}`;
    cursorEl.style.opacity = '1';

    labelEl.style.left = `${left}px`;
    labelEl.style.top = `${top - 22}px`;
    labelEl.style.backgroundColor = cursor.color;
    labelEl.style.opacity = '1';
  }

  clearAllCursors(): void {
    this.cursors.forEach((_, userId) => this.removeCursor(userId));
  }

  getUserCount(): number {
    return this.cursors.size;
  }
}
