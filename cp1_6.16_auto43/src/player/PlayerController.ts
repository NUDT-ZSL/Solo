import { GameEngine } from '../game/GameEngine';

export interface PlayerKeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
}

const PLAYER1_BINDINGS: PlayerKeyBindings = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd',
};

const PLAYER2_BINDINGS: PlayerKeyBindings = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

const PLAYER3_BINDINGS: PlayerKeyBindings = {
  up: 'i',
  down: 'k',
  left: 'j',
  right: 'l',
};

export class PlayerController {
  private engine: GameEngine;
  private playerIds: string[] = [];
  private keyStates: Map<string, boolean> = new Map();
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleKeyUp: (e: KeyboardEvent) => void;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
  }

  public initialize(playerIds: string[]): void {
    this.playerIds = playerIds;
    this.attachListeners();
  }

  private attachListeners(): void {
    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('keyup', this.boundHandleKeyUp);
  }

  private detachListeners(): void {
    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('keyup', this.boundHandleKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    this.keyStates.set(key, true);
    this.updatePlayerInputs();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keyStates.set(key, false);
    this.updatePlayerInputs();
  }

  private isKeyPressed(binding: string): boolean {
    return this.keyStates.get(binding.toLowerCase()) === true;
  }

  private updatePlayerInputs(): void {
    const bindings = [PLAYER1_BINDINGS, PLAYER2_BINDINGS, PLAYER3_BINDINGS];
    
    this.playerIds.forEach((playerId, index) => {
      const binding = bindings[index];
      if (!binding) return;

      this.engine.setPlayerInput(playerId, {
        up: this.isKeyPressed(binding.up),
        down: this.isKeyPressed(binding.down),
        left: this.isKeyPressed(binding.left),
        right: this.isKeyPressed(binding.right),
      });
    });
  }

  public destroy(): void {
    this.detachListeners();
    this.keyStates.clear();
  }
}
