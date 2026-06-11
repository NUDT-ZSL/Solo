export interface JumpInput {
  isJumpPressed: boolean;
  isJumpHeld: boolean;
  holdDuration: number;
  isJumpReleased: boolean;
}

export interface MovementInput {
  left: boolean;
  right: boolean;
}

export type InputSensitivity = 'loose' | 'standard' | 'strict';

export class InputManager {
  private scene: Phaser.Scene;
  private keys: { [key: string]: Phaser.Input.Keyboard.Key };
  private jumpPressed: boolean = false;
  private jumpHeld: boolean = false;
  private jumpReleased: boolean = false;
  private holdStartTime: number = 0;
  private holdDuration: number = 0;
  private debounceTime: number = 50;
  private lastJumpTime: number = 0;
  private pointer: Phaser.Input.Pointer | null = null;
  private pointerDown: boolean = false;
  private sensitivity: InputSensitivity = 'standard';

  private onJumpCallback: (() => void) | null = null;
  private onJumpReleaseCallback: (() => void) | null = null;
  private onMoveLeftCallback: (() => void) | null = null;
  private onMoveRightCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene, sensitivity: InputSensitivity = 'standard') {
    this.scene = scene;
    this.sensitivity = sensitivity;

    this.keys = {
      space: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      a: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      left: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    };

    this.pointer = this.scene.input.activePointer;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.scene.input.keyboard!.on('keydown-SPACE', this.handleJumpStart, this);
    this.scene.input.keyboard!.on('keyup-SPACE', this.handleJumpEnd, this);

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < this.scene.scale.height * 0.7) {
        this.handleJumpStart();
      }
    });

    this.scene.input.on('pointerup', () => {
      if (this.pointerDown) {
        this.handleJumpEnd();
      }
    });
  }

  private handleJumpStart(): void {
    const now = this.scene.time.now;
    if (now - this.lastJumpTime < this.getDebounceTime()) return;

    if (!this.jumpHeld) {
      this.jumpPressed = true;
      this.jumpHeld = true;
      this.holdStartTime = now;
      this.holdDuration = 0;
      this.lastJumpTime = now;
      this.pointerDown = true;

      if (this.onJumpCallback) {
        this.onJumpCallback();
      }
    }
  }

  private handleJumpEnd(): void {
    if (this.jumpHeld) {
      this.jumpReleased = true;
      this.jumpHeld = false;
      this.holdDuration = this.scene.time.now - this.holdStartTime;
      this.pointerDown = false;

      if (this.onJumpReleaseCallback) {
        this.onJumpReleaseCallback();
      }
    }
  }

  private getDebounceTime(): number {
    switch (this.sensitivity) {
      case 'loose':
        return 80;
      case 'strict':
        return 30;
      case 'standard':
      default:
        return 50;
    }
  }

  update(time: number): void {
    if (this.jumpHeld) {
      this.holdDuration = time - this.holdStartTime;
    }

    if (this.jumpPressed) {
      this.jumpPressed = false;
    }
    if (this.jumpReleased) {
      this.jumpReleased = false;
    }
  }

  getJumpInput(): JumpInput {
    return {
      isJumpPressed: this.jumpPressed,
      isJumpHeld: this.jumpHeld,
      holdDuration: this.holdDuration,
      isJumpReleased: this.jumpReleased
    };
  }

  getMovementInput(): MovementInput {
    const left = this.keys.a.isDown || this.keys.left.isDown;
    const right = this.keys.d.isDown || this.keys.right.isDown;

    return { left, right };
  }

  isJumpJustPressed(): boolean {
    return this.jumpPressed;
  }

  isJumpJustReleased(): boolean {
    return this.jumpReleased;
  }

  isJumpHeld(): boolean {
    return this.jumpHeld;
  }

  getHoldDuration(): number {
    return this.holdDuration;
  }

  setSensitivity(sensitivity: InputSensitivity): void {
    this.sensitivity = sensitivity;
  }

  getSensitivity(): InputSensitivity {
    return this.sensitivity;
  }

  setOnJumpCallback(callback: () => void): void {
    this.onJumpCallback = callback;
  }

  setOnJumpReleaseCallback(callback: () => void): void {
    this.onJumpReleaseCallback = callback;
  }

  setOnMoveLeftCallback(callback: () => void): void {
    this.onMoveLeftCallback = callback;
  }

  setOnMoveRightCallback(callback: () => void): void {
    this.onMoveRightCallback = callback;
  }

  reset(): void {
    this.jumpPressed = false;
    this.jumpHeld = false;
    this.jumpReleased = false;
    this.holdDuration = 0;
    this.holdStartTime = 0;
    this.pointerDown = false;
  }

  destroy(): void {
    this.scene.input.keyboard!.off('keydown-SPACE', this.handleJumpStart, this);
    this.scene.input.keyboard!.off('keyup-SPACE', this.handleJumpEnd, this);
    this.onJumpCallback = null;
    this.onJumpReleaseCallback = null;
    this.onMoveLeftCallback = null;
    this.onMoveRightCallback = null;
  }
}
