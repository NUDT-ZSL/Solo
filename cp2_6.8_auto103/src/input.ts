export class InputManager {
  public left: boolean = false;
  public right: boolean = false;
  public up: boolean = false;
  public down: boolean = false;
  public space: boolean = false;

  private spacePressed: boolean = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowLeft':
        this.left = true;
        e.preventDefault();
        break;
      case 'ArrowRight':
        this.right = true;
        e.preventDefault();
        break;
      case 'ArrowUp':
        this.up = true;
        e.preventDefault();
        break;
      case 'ArrowDown':
        this.down = true;
        e.preventDefault();
        break;
      case 'Space':
        if (!this.spacePressed) {
          this.space = true;
        }
        this.spacePressed = true;
        e.preventDefault();
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowLeft':
        this.left = false;
        break;
      case 'ArrowRight':
        this.right = false;
        break;
      case 'ArrowUp':
        this.up = false;
        break;
      case 'ArrowDown':
        this.down = false;
        break;
      case 'Space':
        this.spacePressed = false;
        break;
    }
  }

  public consumeSpace(): boolean {
    const pressed = this.space;
    this.space = false;
    return pressed;
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
