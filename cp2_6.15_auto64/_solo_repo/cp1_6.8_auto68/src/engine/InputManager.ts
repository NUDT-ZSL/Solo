export type KeyAction = 'up' | 'down' | 'left' | 'right' | 'attack';

interface KeyBinding {
  code: string;
  action: KeyAction;
  player: 0 | 1;
}

const BINDINGS: KeyBinding[] = [
  { code: 'KeyW', action: 'up', player: 0 },
  { code: 'KeyS', action: 'down', player: 0 },
  { code: 'KeyA', action: 'left', player: 0 },
  { code: 'KeyD', action: 'right', player: 0 },
  { code: 'Space', action: 'attack', player: 0 },
  { code: 'ArrowUp', action: 'up', player: 1 },
  { code: 'ArrowDown', action: 'down', player: 1 },
  { code: 'ArrowLeft', action: 'left', player: 1 },
  { code: 'ArrowRight', action: 'right', player: 1 },
  { code: 'Enter', action: 'attack', player: 1 },
];

export interface InputState {
  players: [
    Record<KeyAction, boolean>,
    Record<KeyAction, boolean>,
  ];
  justPressed: [
    Record<KeyAction, boolean>,
    Record<KeyAction, boolean>,
  ];
}

export class InputManager {
  private keys: Set<string> = new Set();
  private prevKeys: Set<string> = new Set();
  private state: InputState;

  constructor() {
    this.state = this.createEmptyState();
  }

  private createEmptyState(): InputState {
    return {
      players: [
        { up: false, down: false, left: false, right: false, attack: false },
        { up: false, down: false, left: false, right: false, attack: false },
      ],
      justPressed: [
        { up: false, down: false, left: false, right: false, attack: false },
        { up: false, down: false, left: false, right: false, attack: false },
      ],
    };
  }

  handleKeyDown(code: string) {
    this.keys.add(code);
  }

  handleKeyUp(code: string) {
    this.keys.delete(code);
  }

  update() {
    for (const binding of BINDINGS) {
      const isDown = this.keys.has(binding.code);
      const wasDown = this.prevKeys.has(binding.code);
      this.state.players[binding.player][binding.action] = isDown;
      this.state.justPressed[binding.player][binding.action] = isDown && !wasDown;
    }
    this.prevKeys = new Set(this.keys);
  }

  getState(): InputState {
    return this.state;
  }

  isActionDown(player: 0 | 1, action: KeyAction): boolean {
    return this.state.players[player][action];
  }

  isActionJustPressed(player: 0 | 1, action: KeyAction): boolean {
    return this.state.justPressed[player][action];
  }

  resetJustPressed() {
    for (let p = 0; p < 2; p++) {
      for (const action of ['up', 'down', 'left', 'right', 'attack'] as KeyAction[]) {
        this.state.justPressed[p as 0 | 1][action] = false;
      }
    }
  }
}
