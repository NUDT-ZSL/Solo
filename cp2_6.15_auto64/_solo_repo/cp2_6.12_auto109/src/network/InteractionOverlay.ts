import type { User, Reaction, RippleEffect } from '../../shared/types.js';

interface InteractionOverlayOptions {
  container: HTMLElement;
}

interface CursorState {
  userId: string;
  x: number;
  y: number;
  color: string;
  nickname: string;
  isDrawing: boolean;
  lastUpdate: number;
  element: HTMLElement;
  ripples: RippleEffect[];
}

interface ReactionDisplay {
  id: string;
  userId: string;
  emoji: string;
  startTime: number;
  duration: number;
  element: HTMLElement;
}

class InteractionOverlay {
  private container: HTMLElement;
  private overlay: HTMLElement;
  private reactionContainer: HTMLElement;

  private cursors: Map<string, CursorState> = new Map();
  private users: Map<string, { nickname: string; color: string }> = new Map();

  private reactions: ReactionDisplay[] = [];

  private animationFrameId: number | null = null;

  constructor(options: InteractionOverlayOptions) {
    this.container = options.container;
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 100;
    `;
    this.container.appendChild(this.overlay);

    this.reactionContainer = document.createElement('div');
    this.reactionContainer.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 200;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    `;
    this.overlay.appendChild(this.reactionContainer);

    this.startAnimationLoop();
  }

  updateUsers(users: User[]) {
    this.users.clear();
    for (const user of users) {
      this.users.set(user.id, { nickname: user.nickname, color: user.color });
    }

    for (const [userId, cursor] of this.cursors) {
      const user = this.users.get(userId);
      if (user) {
        cursor.color = user.color;
        cursor.nickname = user.nickname;
        this.updateCursorElement(cursor);
      }
    }
  }

  addUser(userId: string, nickname: string, color: string) {
    this.users.set(userId, { nickname, color });
  }

  removeUser(userId: string) {
    this.users.delete(userId);
    this.removeCursor(userId);
  }

  updateCursor(userId: string, x: number, y: number, isDrawing: boolean) {
    let cursor = this.cursors.get(userId);
    const user = this.users.get(userId);

    if (!cursor) {
      if (!user) return;

      const el = document.createElement('div');
      el.style.cssText = `
        position: absolute;
        pointer-events: none;
        transition: opacity 0.2s ease;
      `;

      const dot = document.createElement('div');
      dot.className = 'cursor-dot';
      dot.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: ${user.color};
        opacity: 0.4;
        box-shadow: 0 0 8px ${user.color};
        transition: transform 0.1s ease;
      `;
      el.appendChild(dot);

      const label = document.createElement('div');
      label.className = 'cursor-label';
      label.style.cssText = `
        position: absolute;
        top: 18px;
        left: 12px;
        font-size: 12px;
        color: #e0e0e0;
        background: rgba(0, 0, 0, 0.7);
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      `;
      label.textContent = user.nickname;
      el.appendChild(label);

      this.overlay.appendChild(el);

      cursor = {
        userId,
        x,
        y,
        color: user.color,
        nickname: user.nickname,
        isDrawing,
        lastUpdate: Date.now(),
        element: el,
        ripples: [],
      };

      this.cursors.set(userId, cursor);
    }

    const wasDrawing = cursor.isDrawing;
    cursor.x = x;
    cursor.y = y;
    cursor.isDrawing = isDrawing;
    cursor.lastUpdate = Date.now();

    if (!wasDrawing && isDrawing) {
      this.addRipple(cursor, x, y);
    }

    this.updateCursorPosition(cursor);
  }

  private updateCursorPosition(cursor: CursorState) {
    const x = cursor.x - 8;
    const y = cursor.y - 8;
    cursor.element.style.transform = `translate(${x}px, ${y}px)`;

    const dot = cursor.element.querySelector('.cursor-dot') as HTMLElement;
    if (dot) {
      dot.style.transform = cursor.isDrawing ? 'scale(1.3)' : 'scale(1)';
    }
  }

  private updateCursorElement(cursor: CursorState) {
    const dot = cursor.element.querySelector('.cursor-dot') as HTMLElement;
    if (dot) {
      dot.style.backgroundColor = cursor.color;
      dot.style.boxShadow = `0 0 8px ${cursor.color}`;
    }

    const label = cursor.element.querySelector('.cursor-label') as HTMLElement;
    if (label) {
      label.textContent = cursor.nickname;
    }
  }

  private removeCursor(userId: string) {
    const cursor = this.cursors.get(userId);
    if (cursor) {
      cursor.element.remove();
      this.cursors.delete(userId);
    }
  }

  private addRipple(cursor: CursorState, x: number, y: number) {
    const rippleEl = document.createElement('div');
    rippleEl.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid ${cursor.color};
      pointer-events: none;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.8;
    `;
    cursor.element.appendChild(rippleEl);

    const ripple: RippleEffect = {
      id: `ripple-${Date.now()}-${Math.random()}`,
      userId: cursor.userId,
      x,
      y,
      startTime: Date.now(),
      duration: 200,
    };

    cursor.ripples.push(ripple);

    setTimeout(() => {
      rippleEl.remove();
      const idx = cursor.ripples.findIndex((r) => r.id === ripple.id);
      if (idx >= 0) {
        cursor.ripples.splice(idx, 1);
      }
    }, ripple.duration);
  }

  showReaction(userId: string, emoji: string, timestamp: number, duration: number) {
    const reactionEl = document.createElement('div');
    reactionEl.style.cssText = `
      font-size: 64px;
      line-height: 1;
      opacity: 0;
      transform: scale(0.5);
      transition: opacity 0.3s ease, transform 0.3s ease;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      user-select: none;
    `;
    reactionEl.textContent = emoji;
    this.reactionContainer.appendChild(reactionEl);

    requestAnimationFrame(() => {
      reactionEl.style.opacity = '1';
      reactionEl.style.transform = 'scale(1)';
    });

    const display: ReactionDisplay = {
      id: `reaction-${Date.now()}-${Math.random()}`,
      userId,
      emoji,
      startTime: timestamp,
      duration,
      element: reactionEl,
    };

    this.reactions.push(display);

    setTimeout(() => {
      reactionEl.style.opacity = '0';
      reactionEl.style.transform = 'scale(1.2)';
      setTimeout(() => {
        reactionEl.remove();
        const idx = this.reactions.findIndex((r) => r.id === display.id);
        if (idx >= 0) {
          this.reactions.splice(idx, 1);
        }
      }, 300);
    }, duration - 300);
  }

  private startAnimationLoop() {
    const loop = () => {
      this.updateRippleAnimations();
      this.cleanupInactiveCursors();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private updateRippleAnimations() {
    const now = Date.now();

    for (const cursor of this.cursors.values()) {
      for (const ripple of cursor.ripples) {
        const elapsed = now - ripple.startTime;
        const progress = elapsed / ripple.duration;

        const rippleEls = cursor.element.querySelectorAll(
          'div:not(.cursor-dot):not(.cursor-label)'
        ) as NodeListOf<HTMLElement>;

        const rippleIndex = cursor.ripples.indexOf(ripple);
        if (rippleEls[rippleIndex]) {
          const scale = 1 + progress * 2;
          const opacity = Math.max(0, 1 - progress);
          rippleEls[rippleIndex].style.width = `${20 * scale}px`;
          rippleEls[rippleIndex].style.height = `${20 * scale}px`;
          rippleEls[rippleIndex].style.opacity = String(opacity);
        }
      }
    }
  }

  private cleanupInactiveCursors() {
    const now = Date.now();
    const inactivityTimeout = 5000;

    for (const [userId, cursor] of this.cursors) {
      if (now - cursor.lastUpdate > inactivityTimeout) {
        cursor.element.style.opacity = '0';
      } else {
        cursor.element.style.opacity = '1';
      }
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

export default InteractionOverlay;
