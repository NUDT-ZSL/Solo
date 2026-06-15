export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  harvest: boolean;
  buildMode: boolean;
  mouseX: number;
  mouseY: number;
  mousePressed: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  public state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    harvest: false,
    buildMode: false,
    mouseX: 0,
    mouseY: 0,
    mousePressed: false
  };

  private canvas: HTMLCanvasElement;
  private mouseJustPressed: boolean = false;
  private eJustPressed: boolean = false;
  private oneJustPressed: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (!this.keys.has(key)) {
        this.keysPressed.add(key);
        if (key === 'e') this.eJustPressed = true;
        if (key === '1') this.oneJustPressed = true;
      }
      this.keys.add(key);
      if (['w', 'a', 's', 'd', '1', 'e'].includes(key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.keys.delete(key);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.state.mouseX = (e.clientX - rect.left) * scaleX;
      this.state.mouseY = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.state.mousePressed = true;
        this.mouseJustPressed = true;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.state.mousePressed = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  update(): void {
    this.state.up = this.keys.has('w');
    this.state.down = this.keys.has('s');
    this.state.left = this.keys.has('a');
    this.state.right = this.keys.has('d');
    this.keysPressed.clear();
  }

  wasEPressed(): boolean {
    const result = this.eJustPressed;
    this.eJustPressed = false;
    return result;
  }

  wasOnePressed(): boolean {
    const result = this.oneJustPressed;
    this.oneJustPressed = false;
    return result;
  }

  wasMouseClicked(): boolean {
    const result = this.mouseJustPressed;
    this.mouseJustPressed = false;
    return result;
  }

  getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.state.left) x -= 1;
    if (this.state.right) x += 1;
    if (this.state.up) y -= 1;
    if (this.state.down) y += 1;
    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  destroy(): void {
    // Clean up if needed - in practice, listeners persist for the game lifetime
  }
}
