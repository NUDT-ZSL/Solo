import { Direction } from './game';

export interface InputHandler {
  onDirection: (dir: Direction) => void;
  onBlink: () => void;
}

export class InputManager {
  private handler: InputHandler;
  private keys = new Set<string>();

  constructor(handler: InputHandler) {
    this.handler = handler;
    this.bind();
  }

  private bind(): void {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key;
    this.keys.add(key);

    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        this.handler.onDirection('up');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        this.handler.onDirection('down');
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        this.handler.onDirection('left');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        this.handler.onDirection('right');
        break;
      case 'Shift':
        e.preventDefault();
        if (!e.repeat) {
          this.handler.onBlink();
        }
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key);
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  destroy(): void {
    window.removeEventListener('keydown', (e) => this.onKeyDown(e));
    window.removeEventListener('keyup', (e) => this.onKeyUp(e));
  }
}
