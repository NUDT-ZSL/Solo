import { InputState } from '../types';

export class InputHandler {
  private keys: Set<string> = new Set();
  private justPressed: Set<string> = new Set();

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (!this.keys.has(key)) {
      this.justPressed.add(key);
    }
    this.keys.add(key);
    if (['w', 'a', 's', 'd', 'j', 'k', 'l', ' '].includes(key)) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  public getState(): InputState {
    return {
      left: this.keys.has('a') || this.keys.has('arrowleft'),
      right: this.keys.has('d') || this.keys.has('arrowright'),
      up: this.keys.has('w') || this.keys.has('arrowup'),
      jumpPressed: this.justPressed.has('w') || this.justPressed.has('arrowup'),
      lightPressed: this.justPressed.has('j'),
      heavyPressed: this.justPressed.has('k'),
      dashPressed: this.justPressed.has('l'),
    };
  }

  public clearFrame(): void {
    this.justPressed.clear();
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
